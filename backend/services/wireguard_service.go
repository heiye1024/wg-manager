package services

import (
	"backend/ipam"
	"backend/models"
	"context"
	"database/sql"
	"errors"
	"fmt"
	"golang.zx2c4.com/wireguard/wgctrl"
	"golang.zx2c4.com/wireguard/wgctrl/wgtypes"
	"net"
	"os/exec"
	"strings"
	"time"
)

type WireGuardService struct {
	db     *sql.DB
	client *wgctrl.Client
}

func NewWireGuardService(db *sql.DB) *WireGuardService {
	c, _ := wgctrl.New() // 失败时为 nil，调用处会兜底
	return &WireGuardService{db: db, client: c}
}

func (s *WireGuardService) Close() error {
	if s.client != nil {
		return s.client.Close()
	}
	return nil
}

/* -------------------- 工具与公共方法 -------------------- */

// 生成 WireGuard 密钥对（wgtypes 保证规范）
func (s *WireGuardService) GenerateKeyPair() (privateKey, publicKey string, err error) {
	priv, err := wgtypes.GeneratePrivateKey()
	if err != nil {
		return "", "", fmt.Errorf("generate private key: %w", err)
	}
	pub := priv.PublicKey()
	return priv.String(), pub.String(), nil
}

func parseWGPrivateKey(b64 string) (*wgtypes.Key, error) {
	k, err := wgtypes.ParseKey(strings.TrimSpace(b64))
	if err != nil {
		return nil, fmt.Errorf("invalid private key: %w", err)
	}
	return &k, nil
}
func parseWGPublicKey(b64 string) (*wgtypes.Key, error) {
	k, err := wgtypes.ParseKey(strings.TrimSpace(b64))
	if err != nil {
		return nil, fmt.Errorf("invalid public key: %w", err)
	}
	return &k, nil
}

func runShell(cmd string) ([]byte, error) {
	return exec.Command("bash", "-lc", cmd).CombinedOutput()
}

func ipEnsureLink(name string) error {
	// 已存在则忽略错误
	if out, err := runShell(fmt.Sprintf(`ip link show %q`, name)); err == nil && len(out) > 0 {
		return nil
	}
	// 创建 wireguard 链路
	if out, err := runShell(fmt.Sprintf(`ip link add dev %q type wireguard`, name)); err != nil {
		return fmt.Errorf("ip link add %s: %v (%s)", name, err, strings.TrimSpace(string(out)))
	}
	return nil
}

func ipSetMTU(name string, mtu int) error {
	if mtu <= 0 {
		return nil
	}
	if out, err := runShell(fmt.Sprintf(`ip link set dev %q mtu %d`, name, mtu)); err != nil {
		return fmt.Errorf("ip set mtu: %v (%s)", err, strings.TrimSpace(string(out)))
	}
	return nil
}

func ipAddrReplace(name, cidr string) error {
	cidr = strings.TrimSpace(cidr)
	if cidr == "" {
		return nil
	}
	if out, err := runShell(fmt.Sprintf(`ip address replace %s dev %q`, cidr, name)); err != nil {
		return fmt.Errorf("ip addr replace: %v (%s)", err, strings.TrimSpace(string(out)))
	}
	return nil
}

func ipLinkUp(name string) error {
	if out, err := runShell(fmt.Sprintf(`ip link set up dev %q`, name)); err != nil {
		return fmt.Errorf("ip link up: %v (%s)", err, strings.TrimSpace(string(out)))
	}
	return nil
}

func ipLinkDown(name string) error {
	if out, err := runShell(fmt.Sprintf(`ip link set down dev %q`, name)); err != nil {
		return fmt.Errorf("ip link down: %v (%s)", err, strings.TrimSpace(string(out)))
	}
	return nil
}

func ipLinkDel(name string) error {
	if out, err := runShell(fmt.Sprintf(`ip link del dev %q`, name)); err != nil {
		return fmt.Errorf("ip link del: %v (%s)", err, strings.TrimSpace(string(out)))
	}
	return nil
}

func splitCSV(s string) []string {
	s = strings.TrimSpace(s)
	if s == "" {
		return nil
	}
	parts := strings.Split(s, ",")
	for i := range parts {
		parts[i] = strings.TrimSpace(parts[i])
	}
	return parts
}

func parseAllowedIPs(s string) ([]net.IPNet, error) {
	ips := splitCSV(s)
	var res []net.IPNet
	for _, x := range ips {
		_, ipn, err := net.ParseCIDR(x)
		if err != nil {
			return nil, fmt.Errorf("invalid CIDR %q: %w", x, err)
		}
		res = append(res, *ipn)
	}
	return res, nil
}

func parseEndpoint(ep string) (*net.UDPAddr, error) {
	ep = strings.TrimSpace(ep)
	if ep == "" {
		return nil, nil
	}
	ua, err := net.ResolveUDPAddr("udp", ep)
	if err != nil {
		return nil, fmt.Errorf("parse endpoint %q: %w", ep, err)
	}
	return ua, nil
}

func boolPtr(b bool) *bool { return &b }
func intPtr(i int) *int    { return &i }
func durationPtrSeconds(sec int) *time.Duration {
	if sec <= 0 {
		return nil
	}
	d := time.Duration(sec) * time.Second
	return &d
}

type ifaceRow struct {
	ID       uint
	Name     string
	CIDR     string
	ServerIP string
}

type Peer struct {
	ID                  uint
	InterfaceID         uint
	Name                string
	IP                  string
	AllowedIPs          string
	Endpoint            sql.NullString
	PersistentKeepalive int
	PublicKey           sql.NullString
	PrivateKey          sql.NullString
}

// 工具：把 *string 转成 sql.NullString（nil/空串 => NULL）
func nullStr(p *string) sql.NullString {
	if p == nil || strings.TrimSpace(*p) == "" {
		return sql.NullString{Valid: false}
	}
	return sql.NullString{String: strings.TrimSpace(*p), Valid: true}
}

// 把 *string 安全取值（nil -> ""）
func strFromPtr(p *string) string {
	if p == nil {
		return ""
	}
	return *p
}

func isUniqueError(err error) bool {
	s := strings.ToLower(err.Error())
	// SQLite
	if strings.Contains(s, "unique constraint failed") {
		return true
	}
	// MySQL
	if strings.Contains(s, "error 1062") || strings.Contains(s, "duplicate entry") {
		return true
	}
	// Postgres
	if strings.Contains(s, "sqlstate 23505") || strings.Contains(s, "duplicate key value violates unique constraint") {
		return true
	}
	return false
}


func containsDefaultRoute(s string) bool {
	// true if 包含 0.0.0.0/0 或 ::/0
	ss := strings.Split(s, ",")
	for _, x := range ss {
		x = strings.TrimSpace(x)
		if x == "0.0.0.0/0" || x == "::/0" {
			return true
		}
	}
	return false
}

/* -------------------- 接口（DB） -------------------- */

func (s *WireGuardService) GetInterfaces() ([]models.WireGuardInterface, error) {
	query := `
		SELECT id, name, private_key, public_key, listen_port, address, 
			   COALESCE(dns, '') as dns, COALESCE(mtu, 1420) as mtu, 
			   COALESCE(status, 'stopped') as status, created_at, updated_at
		FROM wireguard_interfaces
		ORDER BY created_at DESC
	`
	rows, err := s.db.Query(query)
	if err != nil {
		return nil, fmt.Errorf("query interfaces: %w", err)
	}
	defer rows.Close()

	var list []models.WireGuardInterface
	for rows.Next() {
		var it models.WireGuardInterface
		if err := rows.Scan(
			&it.ID, &it.Name, &it.PrivateKey, &it.PublicKey,
			&it.ListenPort, &it.Address, &it.DNS, &it.MTU,
			&it.Status, &it.CreatedAt, &it.UpdatedAt,
		); err != nil {
			return nil, fmt.Errorf("scan interface: %w", err)
		}
		list = append(list, it)
	}
	return list, nil
}

func (s *WireGuardService) GetInterface(id int) (*models.WireGuardInterface, error) {
	query := `
		SELECT id, name, private_key, public_key, listen_port, address,
			   COALESCE(dns, '') as dns, COALESCE(mtu, 1420) as mtu,
			   COALESCE(status, 'stopped') as status, created_at, updated_at
		FROM wireguard_interfaces
		WHERE id = ?
	`
	var it models.WireGuardInterface
	err := s.db.QueryRow(query, id).Scan(
		&it.ID, &it.Name, &it.PrivateKey, &it.PublicKey,
		&it.ListenPort, &it.Address, &it.DNS, &it.MTU,
		&it.Status, &it.CreatedAt, &it.UpdatedAt,
	)
	if err != nil {
		if err == sql.ErrNoRows {
			return nil, fmt.Errorf("interface not found")
		}
		return nil, fmt.Errorf("get interface: %w", err)
	}
	return &it, nil
}

func (s *WireGuardService) CreateInterface(req models.CreateInterfaceRequest) (*models.WireGuardInterface, error) {
	privateKey := strings.TrimSpace(req.PrivateKey)
	var publicKey string
	var err error

	if privateKey == "" {
		// 未提供私钥：直接生成一对
		privateKey, publicKey, err = s.GenerateKeyPair()
		if err != nil {
			return nil, err
		}
	} else {
		// 已提供私钥：由私钥派生公钥
		k, err := wgtypes.ParseKey(privateKey)
		if err != nil {
			return nil, fmt.Errorf("invalid private key: %w", err)
		}
		publicKey = k.PublicKey().String()
	}

	dns := req.DNS
	if dns == "" {
		dns = "8.8.8.8"
	}
	mtu := req.MTU
	if mtu == 0 {
		mtu = 1420
	}

	query := `
		INSERT INTO wireguard_interfaces (name, private_key, public_key, listen_port, address, dns, mtu, status)
		VALUES (?, ?, ?, ?, ?, ?, ?, 'stopped')
	`
	res, err := s.db.Exec(query, req.Name, privateKey, publicKey, req.ListenPort, req.Address, dns, mtu)
	if err != nil {
		return nil, fmt.Errorf("create interface: %w", err)
	}
	id, _ := res.LastInsertId()
	return s.GetInterface(int(id))
}

func (s *WireGuardService) UpdateInterface(id int, req models.UpdateInterfaceRequest) (*models.WireGuardInterface, error) {
	dns := req.DNS
	if dns == "" {
		dns = "8.8.8.8"
	}
	mtu := req.MTU
	if mtu == 0 {
		mtu = 1420
	}
	query := `
		UPDATE wireguard_interfaces
		SET name=?, listen_port=?, address=?, dns=?, mtu=?, updated_at=CURRENT_TIMESTAMP
		WHERE id=?
	`
	if _, err := s.db.Exec(query, req.Name, req.ListenPort, req.Address, dns, mtu, id); err != nil {
		return nil, fmt.Errorf("update interface: %w", err)
	}
	// 若接口在运行，可选择立即热更新（这里不自动，交由 Start/Restart/Apply）
	return s.GetInterface(id)
}

func (s *WireGuardService) DeleteInterface(id int) error {
	it, err := s.GetInterface(id)
	if err != nil {
		return err
	}
	// 尝试先停掉
	_ = s.StopInterface(id)
	// 删除 DB
	_, err = s.db.Exec(`DELETE FROM wireguard_interfaces WHERE id=?`, id)
	if err != nil {
		return fmt.Errorf("delete interface: %w", err)
	}
	// 删除链路（如果还在）
	_ = ipLinkDel(it.Name)
	return nil
}

/* -------------------- Peer（DB） -------------------- */

func (s *WireGuardService) GetPeers() ([]models.WireGuardPeer, error) {
	// 1) 先把基础信息从 DB 查出来（你已有的 SELECT）
	rows, err := s.db.Query(`
	  SELECT
	    p.id,
	    p.interface_id,
	    i.name                              AS interface_name,
	    p.name,
	    p.ip,
	    p.allowed_ips,
	    COALESCE(p.endpoint, '')            AS endpoint,
	    COALESCE(p.persistent_keepalive, 0) AS persistent_keepalive,
	    COALESCE(p.public_key, '')          AS public_key,
	    COALESCE(p.private_key, '')         AS private_key,
	    COALESCE(p.status, 'disconnected')  AS status,
	    p.last_handshake,
	    COALESCE(p.bytes_received, 0)       AS bytes_received,
	    COALESCE(p.bytes_sent, 0)           AS bytes_sent,
	    p.created_at,
	    p.updated_at
	  FROM wireguard_peers p
	  LEFT JOIN wireguard_interfaces i ON i.id = p.interface_id
	  ORDER BY p.created_at DESC`)
	if err != nil {
		return nil, fmt.Errorf("query peers: %w", err)
	}
	defer rows.Close()

	var list []models.WireGuardPeer
	type itemPtr = *models.WireGuardPeer

	// 2) 先扫描到内存；用 (interface_name + public_key) 做索引，方便覆盖
	idx := make(map[string]itemPtr)
	for rows.Next() {
		var p models.WireGuardPeer
		var last sql.NullTime
		if err := rows.Scan(
			&p.ID,
			&p.InterfaceID,
			&p.InterfaceName,
			&p.Name,
			&p.IP,
			&p.AllowedIPs,
			&p.Endpoint,
			&p.PersistentKeepalive,
			&p.PublicKey,
			&p.PrivateKey,
			&p.Status,
			&last,
			&p.BytesReceived,
			&p.BytesSent,
			&p.CreatedAt,
			&p.UpdatedAt,
		); err != nil {
			return nil, fmt.Errorf("scan peer: %w", err)
		}
		if last.Valid {
			t := last.Time
			p.LastHandshake = &t
		}

		list = append(list, p)
		key := p.InterfaceName + "|" + p.PublicKey
		idx[key] = &list[len(list)-1]
	}

	// 3) 用 wgctrl 获取实时状态，覆盖到返回值
	devs, err := s.client.Devices()
	if err == nil {
		const recent = 180 * time.Second
		now := time.Now()

		for _, d := range devs {
			for _, pr := range d.Peers {
				key := d.Name + "|" + pr.PublicKey.String()
				if it, ok := idx[key]; ok {
					if pr.Endpoint != nil {
						it.Endpoint = pr.Endpoint.String()
					}
					// 最新握手
					if !pr.LastHandshakeTime.IsZero() {
						t := pr.LastHandshakeTime
						it.LastHandshake = &t
					} else {
						it.LastHandshake = nil
					}
					// 流量（uint64 -> int64/你的类型）
					it.BytesReceived = int64(pr.ReceiveBytes)
					it.BytesSent = int64(pr.TransmitBytes)
					// 状态
					if !pr.LastHandshakeTime.IsZero() && now.Sub(pr.LastHandshakeTime) <= recent {
						it.Status = "connected"
					} else {
						it.Status = "disconnected"
					}
				}
			}
		}
	} // 如果 wgctrl 出错，就保留 DB 的值返回

	return list, nil
}

func (s *WireGuardService) GetPeersByInterface(interfaceID int) ([]models.WireGuardPeer, error) {
	rows, err := s.db.Query(`
		SELECT
		  id, interface_id, name,
		  COALESCE(public_key,'')          AS public_key,
		  COALESCE(private_key,'')         AS private_key,
		  COALESCE(ip,'')                  AS ip,             -- ← 新增
		  COALESCE(allowed_ips,'')         AS allowed_ips,
		  COALESCE(preshared_key,'')       AS preshared_key,  -- ← 需要 PSK 时新增
		  COALESCE(endpoint,'')            AS endpoint,
		  COALESCE(persistent_keepalive,0) AS persistent_keepalive,
		  COALESCE(status,'disconnected')  AS status,
		  last_handshake,
		  COALESCE(bytes_received,0)       AS bytes_received,
		  COALESCE(bytes_sent,0)           AS bytes_sent,
		  created_at, updated_at
		FROM wireguard_peers
		WHERE interface_id = ?
		ORDER BY created_at DESC`, interfaceID)
	if err != nil {
		return nil, fmt.Errorf("query peers by interface: %w", err)
	}
	defer rows.Close()

	var list []models.WireGuardPeer
	for rows.Next() {
		var p models.WireGuardPeer
		var last sql.NullTime

		if err := rows.Scan(
			&p.ID, &p.InterfaceID, &p.Name,
			&p.PublicKey, &p.PrivateKey,
			&p.IP, &p.AllowedIPs,           // ← 对齐新增列
			&p.PresharedKey,                // ← 若没用 PSK，请从 SELECT 和这里都删掉
			&p.Endpoint, &p.PersistentKeepalive,
			&p.Status, &last,
			&p.BytesReceived, &p.BytesSent,
			&p.CreatedAt, &p.UpdatedAt,
		); err != nil {
			return nil, fmt.Errorf("scan peer: %w", err)
		}
		if last.Valid {
			t := last.Time
			p.LastHandshake = &t
		}
		list = append(list, p)
	}
	return list, nil
}

func (s *WireGuardService) GetPeer(id int) (*models.WireGuardPeer, error) {
	var p models.WireGuardPeer
	err := s.db.QueryRow(`
		SELECT id, interface_id, name, public_key, private_key, allowed_ips,
			   COALESCE(endpoint, '') AS endpoint,
			   COALESCE(persistent_keepalive, 0) AS persistent_keepalive,
			   COALESCE(status, 'disconnected') AS status,
			   last_handshake, bytes_received, bytes_sent, created_at, updated_at
		FROM wireguard_peers
		WHERE id = ?`, id).Scan(
		&p.ID, &p.InterfaceID, &p.Name, &p.PublicKey, &p.PrivateKey,
		&p.AllowedIPs, &p.Endpoint, &p.PersistentKeepalive, &p.Status,
		&p.LastHandshake, &p.BytesReceived, &p.BytesSent,
		&p.CreatedAt, &p.UpdatedAt,
	)
	if err != nil {
		if err == sql.ErrNoRows {
			return nil, fmt.Errorf("peer not found")
		}
		return nil, fmt.Errorf("get peer: %w", err)
	}
	return &p, nil
}

func (s *WireGuardService) CreatePeer(ctx context.Context, req *models.CreatePeerRequest) (*Peer, error) {
	// 0) keepalive 默认 25
	keepalive := 25
	if req.PersistentKeepalive != nil && *req.PersistentKeepalive > 0 {
		keepalive = *req.PersistentKeepalive
	}

	// 生成/获取公钥、私钥
	var pubKeyStr string
	var privKeyNull sql.NullString
	if req.PublicKey != nil && strings.TrimSpace(*req.PublicKey) != "" {
		pubKeyStr = strings.TrimSpace(*req.PublicKey)
		privKeyNull = sql.NullString{Valid: false}
	} else {
		// 自动生成（需 import "golang.zx2c4.com/wireguard/wgctrl/wgtypes"）
		priv, err := wgtypes.GeneratePrivateKey()
		if err != nil {
			return nil, fmt.Errorf("%w: generate private key failed: %v", ErrBadRequest, err)
		}
		pub := priv.PublicKey()
		pubKeyStr = pub.String()
		privKeyNull = sql.NullString{String: priv.String(), Valid: true}
	}

	const maxTries = 5
	for attempt := 0; attempt < maxTries; attempt++ {
		// —— 每一轮新事务（避免 SQLite 快照读看不到别的事务新插入的 IP）——
		tx, err := s.db.BeginTx(ctx, &sql.TxOptions{Isolation: sql.LevelSerializable})
		if err != nil {
			return nil, err
		}

		// 1) 读取接口（带 address/cidr/server_ip）
		var iface struct {
			ID       uint
			Name     string
			Address  sql.NullString
			CIDR     sql.NullString
			ServerIP sql.NullString
		}
		row := tx.QueryRowContext(ctx,
			`SELECT id, name, address, cidr, server_ip FROM wireguard_interfaces WHERE id = ?`,
			req.InterfaceID,
		)
		if err := row.Scan(&iface.ID, &iface.Name, &iface.Address, &iface.CIDR, &iface.ServerIP); err != nil {
			_ = tx.Rollback()
			if errors.Is(err, sql.ErrNoRows) {
				return nil, fmt.Errorf("%w: interface not found", ErrNotFound)
			}
			return nil, err
		}

		cidr := strings.TrimSpace(iface.CIDR.String)
		serverIP := strings.TrimSpace(iface.ServerIP.String)

		// 1.1) 缺失则从 address 推导并回写
		if cidr == "" || serverIP == "" {
			if iface.Address.Valid && strings.Contains(iface.Address.String, "/") {
				if ip, ipNet, perr := net.ParseCIDR(strings.TrimSpace(iface.Address.String)); perr == nil && ipNet != nil {
					cidr = ipNet.String()
					serverIP = ip.String()
					if _, perr := tx.ExecContext(ctx,
						`UPDATE wireguard_interfaces SET cidr = ?, server_ip = ? WHERE id = ?`,
						cidr, serverIP, iface.ID,
					); perr != nil {
						_ = tx.Rollback()
						return nil, perr
					}
				}
			}
		}
		if cidr == "" || serverIP == "" {
			_ = tx.Rollback()
			return nil, fmt.Errorf("%w: interface missing cidr/server_ip", ErrBadRequest)
		}

		// 2) 刷新已用 IP（含 server_ip）
		used := map[string]struct{}{serverIP: {}}
		rows, err := tx.QueryContext(ctx, `SELECT ip FROM wireguard_peers WHERE interface_id = ?`, req.InterfaceID)
		if err != nil {
			_ = tx.Rollback()
			return nil, err
		}
		for rows.Next() {
			var ip string
			if err := rows.Scan(&ip); err != nil {
				rows.Close()
				_ = tx.Rollback()
				return nil, err
			}
			used[ip] = struct{}{}
		}
		if err := rows.Close(); err != nil {
			_ = tx.Rollback()
			return nil, err
		}

		// 3) IPAM 分配
		ipStr, err := ipam.AllocateNextIP(cidr, used, serverIP)
		if err != nil {
			_ = tx.Rollback()
			if errors.Is(err, ipam.ErrNoAvailableIP) {
				return nil, fmt.Errorf("%w: no available ip in %s", ErrConflict, cidr)
			}
			return nil, err
		}

		// 4) allowed_ips 兜底
		allowed := ""
		if req.AllowedIPs != nil && strings.TrimSpace(*req.AllowedIPs) != "" {
			allowed = strings.TrimSpace(*req.AllowedIPs)
		} else {
			if net.ParseIP(ipStr).To4() != nil {
				allowed = fmt.Sprintf("%s/32", ipStr)
			} else {
				allowed = fmt.Sprintf("%s/128", ipStr)
			}
		}

		// 5) 插入（包含 private_key & public_key）
		res, err := tx.ExecContext(ctx,
			`INSERT INTO wireguard_peers
			 (interface_id, name, ip, allowed_ips, endpoint, persistent_keepalive, public_key, private_key)
			 VALUES(?,?,?,?,?,?,?,?)`,
			req.InterfaceID,
			strings.TrimSpace(req.Name),
			ipStr,
			allowed,
			nullStr(req.Endpoint),
			keepalive,
			pubKeyStr,
			privKeyNull,
		)
		if err != nil {
			// 精准识别唯一冲突；NOT NULL/外键等不要误判为冲突
			if isUniqueError(err) {
				_ = tx.Rollback()
				continue // 新事务重试
			}
			_ = tx.Rollback()
			return nil, err
		}

		// 成功
		id64, _ := res.LastInsertId()
		peer := &Peer{
			ID:                  uint(id64),
			InterfaceID:         req.InterfaceID,
			Name:                strings.TrimSpace(req.Name),
			IP:                  ipStr,
			AllowedIPs:          allowed,
			Endpoint:            nullStr(req.Endpoint),
			PersistentKeepalive: keepalive,
			PublicKey:           sql.NullString{String: pubKeyStr, Valid: true},
			PrivateKey:          privKeyNull,
		}
		if err := tx.Commit(); err != nil {
			return nil, err
		}
		// 可选：wgctrl 下发
		// _ = s.applyPeerToKernel(ctx, iface.Name, peer)
		return peer, nil
	}

	return nil, fmt.Errorf("%w: ip already allocated in this interface", ErrConflict)
}

func (s *WireGuardService) UpdatePeer(ctx context.Context, id int, req *models.UpdatePeerRequest) (*Peer, error) {
	// 动态拼 UPDATE
	set := []string{}
	args := []any{}

	if req.Name != nil {
		set = append(set, "name = ?")
		args = append(args, strings.TrimSpace(*req.Name))
	}
	if req.AllowedIPs != nil {
		set = append(set, "allowed_ips = ?")
		args = append(args, strings.TrimSpace(*req.AllowedIPs))
	}
	if req.Endpoint != nil {
		set = append(set, "endpoint = ?")
		args = append(args, nullStr(req.Endpoint))
	}
	if req.PersistentKeepalive != nil && *req.PersistentKeepalive > 0 {
		set = append(set, "persistent_keepalive = ?")
		args = append(args, *req.PersistentKeepalive)
	}

	if len(set) == 0 {
		// 没有要更新的字段，直接返回当前
		return s.getPeerByID(ctx, id)
	}

	args = append(args, id)

	q := "UPDATE wireguard_peers SET " + strings.Join(set, ", ") + " WHERE id = ?"
	if _, err := s.db.ExecContext(ctx, q, args...); err != nil {
		return nil, err
	}
	return s.getPeerByID(ctx, id)
}

func (s *WireGuardService) getPeerByID(ctx context.Context, id int) (*Peer, error) {
	row := s.db.QueryRowContext(ctx, `
	SELECT id, interface_id, name, ip, allowed_ips,
			COALESCE(endpoint,''), persistent_keepalive,
			COALESCE(public_key,''), COALESCE(private_key,'')
	FROM wireguard_peers WHERE id = ?`, id)

	var p Peer // 这里 Peer 的 endpoint/public_key/private_key 都是 string
	if err := row.Scan(
		&p.ID, &p.InterfaceID, &p.Name, &p.IP, &p.AllowedIPs,
		&p.Endpoint, &p.PersistentKeepalive, &p.PublicKey, &p.PrivateKey,
	); err != nil { /* ... */
	}
	return &p, nil
}

func (s *WireGuardService) DeletePeer(id int) error {
	p, err := s.GetPeer(id)
	if err != nil {
		return err
	}
	_, err = s.db.Exec(`DELETE FROM wireguard_peers WHERE id=?`, id)
	if err != nil {
		return fmt.Errorf("delete peer: %w", err)
	}
	// 热更新：从内核清理
	_ = s.ApplyInterfaceConfig(p.InterfaceID)
	return nil
}

/* -------------------- 配置导出（.conf 文本） -------------------- */



func (s *WireGuardService) GetInterfaceConfig(id int) (string, error) {
	iface, err := s.GetInterface(id)
	if err != nil {
		return "", err
	}
	if strings.TrimSpace(iface.PrivateKey) == "" {
		return "", errors.New("interface private key missing")
	}
	if iface.ListenPort == 0 {
		return "", errors.New("listen port required")
	}
	if strings.TrimSpace(iface.Address) == "" {
		return "", errors.New("address required")
	}

	peers, err := s.GetPeersByInterface(id)
	if err != nil {
		return "", err
	}

	var b strings.Builder
	fmt.Fprintf(&b, "[Interface]\nPrivateKey = %s\nAddress = %s\nListenPort = %d\n",
		strings.TrimSpace(iface.PrivateKey),
		strings.TrimSpace(iface.Address),
		iface.ListenPort,
	)
	if iface.MTU > 0 {
		fmt.Fprintf(&b, "MTU = %d\n", iface.MTU)
	}
	if strings.TrimSpace(iface.DNS) != "" {
		// DNS 主要用于客户端；这里保留兼容 wg-quick 的行为
		fmt.Fprintf(&b, "DNS = %s\n", strings.TrimSpace(iface.DNS))
	}

	for _, p := range peers {
		pk := strings.TrimSpace(p.PublicKey)
		if pk == "" {
			continue
		}
		fmt.Fprintf(&b, "\n[Peer]\nPublicKey = %s\n", pk)

		// —— AllowedIPs（服务端：应为每个客户端本机隧道地址）——
		allowed := strings.TrimSpace(p.AllowedIPs)
		if allowed == "" || containsDefaultRoute(allowed) {
			ip := strings.TrimSpace(p.IP) // 你表里已有 ip 字段
			if ip != "" {
				if net.ParseIP(ip).To4() != nil {
					allowed = ip + "/32"
				} else {
					allowed = ip + "/128"
				}
			} else {
				// 没有 ip 就不要写 AllowedIPs（让配置更安全）
				allowed = ""
			}
		}
		if allowed != "" {
			fmt.Fprintf(&b, "AllowedIPs = %s\n", allowed)
		}

		if ps := strings.TrimSpace(p.PresharedKey); ps != "" {
			fmt.Fprintf(&b, "PresharedKey = %s\n", ps)
		}
		if ep := strings.TrimSpace(p.Endpoint); ep != "" {
			// 服务端通常不需要 Endpoint（除非是站点间静态对接）
			fmt.Fprintf(&b, "Endpoint = %s\n", ep)
		}
		if p.PersistentKeepalive > 0 {
			// Keepalive 设置在哪一侧生效取决于谁需要“主动打洞”
			fmt.Fprintf(&b, "PersistentKeepalive = %d\n", p.PersistentKeepalive)
		}
	}

	return b.String(), nil
}

/* -------------------- 核心：应用配置到内核（wgctrl） -------------------- */

// 把 DB 中的 interface+peers 一次性下发到内核（幂等，ReplacePeers）
func (s *WireGuardService) ApplyInterfaceConfig(interfaceID int) error {
	if s.client == nil {
		c, err := wgctrl.New()
		if err != nil {
			return fmt.Errorf("wgctrl new: %w", err)
		}
		s.client = c
	}

	iface, err := s.GetInterface(interfaceID)
	if err != nil {
		return err
	}
	if strings.TrimSpace(iface.PrivateKey) == "" {
		return errors.New("interface private key missing")
	}
	priv, err := parseWGPrivateKey(iface.PrivateKey)
	if err != nil {
		return err
	}
	// 若 DB 公钥为空，用私钥派生并回写一次
	if strings.TrimSpace(iface.PublicKey) == "" {
		_, _ = s.db.Exec(`UPDATE wireguard_interfaces SET public_key=?, updated_at=CURRENT_TIMESTAMP WHERE id=?`, priv.PublicKey().String(), iface.ID)
	}

	// 1) 确保链路存在
	if err := ipEnsureLink(iface.Name); err != nil {
		return err
	}

	// 2) 组装 PeerConfig
	peers, err := s.GetPeersByInterface(interfaceID)
	if err != nil {
		return err
	}
	var peerCfgs []wgtypes.PeerConfig
	for _, p := range peers {
		if strings.TrimSpace(p.PublicKey) == "" {
			continue
		}
		pub, err := parseWGPublicKey(p.PublicKey)
		if err != nil {
			return fmt.Errorf("peer %d pubkey: %w", p.ID, err)
		}
		allowed, err := parseAllowedIPs(p.AllowedIPs)
		if err != nil {
			return fmt.Errorf("peer %d allowedIPs: %w", p.ID, err)
		}
		var eps *net.UDPAddr
		if strings.TrimSpace(p.Endpoint) != "" {
			eps, err = parseEndpoint(p.Endpoint)
			if err != nil {
				return fmt.Errorf("peer %d endpoint: %w", p.ID, err)
			}
		}
		pc := wgtypes.PeerConfig{
			PublicKey:                   *pub,
			Remove:                      false,
			ReplaceAllowedIPs:           true,
			AllowedIPs:                  allowed,
			PersistentKeepaliveInterval: durationPtrSeconds(p.PersistentKeepalive),
			Endpoint:                    eps,
		}
		peerCfgs = append(peerCfgs, pc)
	}

	// 3) 写入设备配置（私钥、监听端口、peers）
	cfg := wgtypes.Config{
		PrivateKey:   priv,
		ListenPort:   intPtr(iface.ListenPort),
		ReplacePeers: true,
		Peers:        peerCfgs,
	}
	if err := s.client.ConfigureDevice(iface.Name, cfg); err != nil {
		return fmt.Errorf("configure device: %w", err)
	}

	// 4) 地址/MTU & up
	if err := ipAddrReplace(iface.Name, iface.Address); err != nil {
		return err
	}
	if err := ipSetMTU(iface.Name, iface.MTU); err != nil {
		return err
	}
	if err := ipLinkUp(iface.Name); err != nil {
		return err
	}

	_, _ = s.db.Exec(`UPDATE wireguard_interfaces SET status='running', updated_at=CURRENT_TIMESTAMP WHERE id=?`, interfaceID)
	return nil
}

/* -------------------- 启停（不再用 wg-quick） -------------------- */

func (s *WireGuardService) StartInterface(id int) error {
	return s.ApplyInterfaceConfig(id)
}

func (s *WireGuardService) StopInterface(id int) error {
	iface, err := s.GetInterface(id)
	if err != nil {
		return err
	}
	// 先 link down，再删设备（更干净）
	_ = ipLinkDown(iface.Name)
	_ = ipLinkDel(iface.Name)

	_, _ = s.db.Exec(`UPDATE wireguard_interfaces SET status='stopped', updated_at=CURRENT_TIMESTAMP WHERE id=?`, id)
	return nil
}

func (s *WireGuardService) RestartInterface(id int) error {
	_ = s.StopInterface(id)
	time.Sleep(200 * time.Millisecond)
	return s.StartInterface(id)
}

func (s *WireGuardService) RestartService() error {
	ifaces, err := s.GetInterfaces()
	if err != nil {
		return err
	}
	var errs []string
	for _, it := range ifaces {
		if err := s.RestartInterface(it.ID); err != nil {
			errs = append(errs, fmt.Sprintf("%s: %v", it.Name, err))
		}
	}
	if len(errs) > 0 {
		return fmt.Errorf("restart finished with errors: %s", strings.Join(errs, "; "))
	}
	return nil
}

/* -------------------- 实时状态（wgctrl） -------------------- */

func (s *WireGuardService) GetInterfaceStatus(id int) (*models.InterfaceStatus, error) {
	iface, err := s.GetInterface(id)
	if err != nil {
		return nil, err
	}

	var (
		ifi        *net.Interface
		up         bool
		index      int
		foundIface bool
	)
	ifi, _ = net.InterfaceByName(iface.Name)
	if ifi != nil {
		up = (ifi.Flags & net.FlagUp) != 0
		index = ifi.Index
		foundIface = true
	}

	st := &models.InterfaceStatus{
		ID:           id,
		Name:         iface.Name,
		Up:           up,
		Index:        index,
		ListenPort:   0,
		Peers:        []models.PeerStatus{},
		AddressCIDRs: []string{},
		Status:       "unknown", // 默认 unknown
	}

	// 地址
	if ifi != nil {
		if addrs, _ := ifi.Addrs(); len(addrs) > 0 {
			for _, a := range addrs {
				st.AddressCIDRs = append(st.AddressCIDRs, a.String())
			}
		}
	}

	// wgctrl 设备信息
	c := s.client
	if c == nil {
		var err error
		c, err = wgctrl.New()
		if err != nil {
			// 拿不到 wgctrl，就保持默认的 "unknown"
			return st, nil
		}
		defer c.Close()
	}

	dev, err := c.Device(iface.Name)
	if err != nil {
		// 没有对应的 wireguard 设备：如果网卡名存在，则认为服务未启动
		if foundIface {
			st.Status = "stopped"
		}
		return st, nil
	}

	// 有设备即视为运行中（ListenPort 可能为 0，但设备存在更有说服力）
	st.ListenPort = dev.ListenPort
	st.Status = "running"

	for _, p := range dev.Peers {
		ps := models.PeerStatus{
			PublicKey: p.PublicKey.String(),
			Endpoint: func() string {
				if p.Endpoint != nil {
					return p.Endpoint.String()
				}
				return ""
			}(),
			LatestHandshake: p.LastHandshakeTime.Unix(), // 秒级
			TransferRx:      int64(p.ReceiveBytes),
			TransferTx:      int64(p.TransmitBytes),
			AllowedIPs:      make([]string, 0, len(p.AllowedIPs)),
		}
		for _, ipn := range p.AllowedIPs {
			ps.AllowedIPs = append(ps.AllowedIPs, ipn.String())
		}
		st.Peers = append(st.Peers, ps)
	}
	st.PeersCount = len(st.Peers)

	return st, nil
}

/* -------------------- 可选：状态推送（供 SSE/WS 用） -------------------- */

func (s *WireGuardService) WatchInterfaceStatus(ctx context.Context, id int, interval time.Duration, onUpdate func(*models.InterfaceStatus)) {
	if interval <= 0 {
		interval = time.Second
	}
	push := func() {
		if st, err := s.GetInterfaceStatus(id); err == nil && onUpdate != nil {
			onUpdate(st)
		}
	}
	push()
	t := time.NewTicker(interval)
	defer t.Stop()
	for {
		select {
		case <-ctx.Done():
			return
		case <-t.C:
			push()
		}
	}
}
