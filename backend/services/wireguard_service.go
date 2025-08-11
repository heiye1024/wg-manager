package services

import (
	"backend/models"
	"bytes"
	"context"
	"crypto/rand"
	"database/sql"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"golang.org/x/crypto/curve25519"
	"golang.zx2c4.com/wireguard/wgctrl"
	"net"
	"os"
	"os/exec"
	"strconv"
	"strings"
	"time"
)

type WireGuardService struct {
	db     *sql.DB
	client *wgctrl.Client
}

func NewWireGuardService(db *sql.DB) *WireGuardService {
	c, _ := wgctrl.New()
	return &WireGuardService{db: db, client: c}
}

func (s *WireGuardService) Close() error {
	if s.client != nil {
		return s.client.Close()
	}
	return nil
}

// 安全解析以逗号分隔的 IP 列表（如 "10.0.0.2/32, 10.0.0.3/32"）
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

// 安全地把字符串转成 int64；解析失败返回 0
func parseInt64Safe(s string) int64 {
	s = strings.TrimSpace(s)
	if s == "" || s == "-" {
		return 0
	}
	v, _ := strconv.ParseInt(s, 10, 64)
	return v
}

func (s *WireGuardService) GetInterfaceStatus(id int) (*models.InterfaceStatus, error) {
	iface, err := s.GetInterface(id)
	if err != nil {
		return nil, err
	}
	name := iface.Name

	// 网卡是否 up
	up := false
	index := 0
	if ifi, _ := net.InterfaceByName(name); ifi != nil {
		up = (ifi.Flags & net.FlagUp) != 0
		index = ifi.Index
	}

	st := &models.InterfaceStatus{
		ID:         id,
		Name:       name,
		Up:         up,
		Index:      index,
		ListenPort: 0,
		Peers:      []models.PeerStatus{},
	}

	// 地址段
	st.AddressCIDRs, _ = ipAddrsJSON(name)

	// 读取 wg 状态
	out, err := exec.Command("bash", "-lc", fmt.Sprintf("wg show %q dump 2>/dev/null", name)).Output()
	if err != nil {
		return st, nil // wg 未启动也返回基本信息
	}
	lines := strings.Split(strings.TrimSpace(string(out)), "\n")
	if len(lines) == 0 {
		return st, nil
	}

	ifFields := strings.Split(lines[0], "\t")
	if len(ifFields) >= 4 {
		st.ListenPort, _ = strconv.Atoi(strings.TrimSpace(ifFields[3]))
	}
	for _, ln := range lines[1:] {
		f := strings.Split(ln, "\t")
		get := func(i int) string {
			if i >= 0 && i < len(f) {
				return f[i]
			}
			return ""
		}
		ps := models.PeerStatus{
			PublicKey:       get(1),
			Endpoint:        get(3),
			AllowedIPs:      splitCSV(get(4)),
			LatestHandshake: parseInt64Safe(get(5)),
			TransferRx:      parseInt64Safe(get(6)),
			TransferTx:      parseInt64Safe(get(7)),
		}
		st.Peers = append(st.Peers, ps)
	}
	st.PeersCount = len(st.Peers)
	return st, nil
}

// WatchInterfaceStatus 周期查询并回调（用于 SSE/WS）
// 回调失败不会中断；ctx 取消后退出
func (s *WireGuardService) WatchInterfaceStatus(ctx context.Context, id int, interval time.Duration, onUpdate func(*models.InterfaceStatus)) {
	if interval <= 0 {
		interval = time.Second
	}
	// 先立即推一次
	if st, err := s.GetInterfaceStatus(id); err == nil && onUpdate != nil {
		onUpdate(st)
	}
	t := time.NewTicker(interval)
	defer t.Stop()

	for {
		select {
		case <-ctx.Done():
			return
		case <-t.C:
			st, err := s.GetInterfaceStatus(id)
			if err != nil {
				continue
			}
			if onUpdate != nil {
				onUpdate(st)
			}
		}
	}
}

// ---------- helpers ----------

func splitNonEmpty(s string) []string {
	var res []string
	for _, ln := range strings.Split(strings.TrimSpace(s), "\n") {
		ln = strings.TrimSpace(ln)
		if ln != "" {
			res = append(res, ln)
		}
	}
	return res
}

func atoiSafe(s string) int {
	v, _ := strconv.Atoi(strings.TrimSpace(s))
	return v
}
func atoi64Safe(s string) int64 {
	v, _ := strconv.ParseInt(strings.TrimSpace(s), 10, 64)
	return v
}
func csvSplit(s string) []string {
	if strings.TrimSpace(s) == "" {
		return nil
	}
	parts := strings.Split(s, ",")
	for i := range parts {
		parts[i] = strings.TrimSpace(parts[i])
	}
	return parts
}

// 解析 `ip -j addr show dev <name>`
func ipAddrsJSON(name string) ([]string, error) {
	cmd := exec.Command("bash", "-lc", fmt.Sprintf("ip -j addr show dev %s", shellQuote(name)))
	out, err := cmd.Output()
	if err != nil {
		return nil, err
	}
	var arr []struct {
		AddrInfo []struct {
			Local     string `json:"local"`
			PrefixLen int    `json:"prefixlen"`
		} `json:"addr_info"`
	}
	if err := json.Unmarshal(out, &arr); err != nil {
		return nil, err
	}
	var res []string
	if len(arr) > 0 {
		for _, a := range arr[0].AddrInfo {
			if a.Local != "" && a.PrefixLen > 0 {
				res = append(res, fmt.Sprintf("%s/%d", a.Local, a.PrefixLen))
			}
		}
	}
	return res, nil
}

func shellQuote(s string) string {
	var b bytes.Buffer
	b.WriteByte('\'')
	for _, r := range s {
		if r == '\'' {
			b.WriteString("'\"'\"'")
		} else {
			b.WriteRune(r)
		}
	}
	b.WriteByte('\'')
	return b.String()
}

// Generate WireGuard key pair
func (s *WireGuardService) GenerateKeyPair() (privateKey, publicKey string, err error) {
	var private [32]byte
	_, err = rand.Read(private[:])
	if err != nil {
		return "", "", fmt.Errorf("failed to generate private key: %v", err)
	}

	// Clamp the private key
	private[0] &= 248
	private[31] &= 127
	private[31] |= 64

	var public [32]byte
	curve25519.ScalarBaseMult(&public, &private)

	privateKey = base64.StdEncoding.EncodeToString(private[:])
	publicKey = base64.StdEncoding.EncodeToString(public[:])

	return privateKey, publicKey, nil
}

// Interface management
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
		return nil, fmt.Errorf("failed to query interfaces: %v", err)
	}
	defer rows.Close()

	var interfaces []models.WireGuardInterface
	for rows.Next() {
		var iface models.WireGuardInterface
		err := rows.Scan(
			&iface.ID, &iface.Name, &iface.PrivateKey, &iface.PublicKey,
			&iface.ListenPort, &iface.Address, &iface.DNS, &iface.MTU,
			&iface.Status, &iface.CreatedAt, &iface.UpdatedAt,
		)
		if err != nil {
			return nil, fmt.Errorf("failed to scan interface: %v", err)
		}

		// Update status from actual WireGuard interface
		actualStatus := s.getInterfaceActualStatus(iface.Name)
		if actualStatus != iface.Status {
			s.updateInterfaceStatus(iface.ID, actualStatus)
			iface.Status = actualStatus
		}

		interfaces = append(interfaces, iface)
	}

	return interfaces, nil
}

func (s *WireGuardService) updateInterfaceStatus(id int, status string) error {
	_, err := s.db.Exec(
		`UPDATE wireguard_interfaces SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
		status, id,
	)
	return err
}

func (s *WireGuardService) GetInterface(id int) (*models.WireGuardInterface, error) {
	query := `
		SELECT id, name, private_key, public_key, listen_port, address,
			   COALESCE(dns, '') as dns, COALESCE(mtu, 1420) as mtu,
			   COALESCE(status, 'stopped') as status, created_at, updated_at
		FROM wireguard_interfaces
		WHERE id = ?
	`

	var iface models.WireGuardInterface
	err := s.db.QueryRow(query, id).Scan(
		&iface.ID, &iface.Name, &iface.PrivateKey, &iface.PublicKey,
		&iface.ListenPort, &iface.Address, &iface.DNS, &iface.MTU,
		&iface.Status, &iface.CreatedAt, &iface.UpdatedAt,
	)
	if err != nil {
		if err == sql.ErrNoRows {
			return nil, fmt.Errorf("interface not found")
		}
		return nil, fmt.Errorf("failed to get interface: %v", err)
	}

	return &iface, nil
}

func (s *WireGuardService) CreateInterface(req models.CreateInterfaceRequest) (*models.WireGuardInterface, error) {
	var privateKey, publicKey string
	var err error

	if req.PrivateKey != "" {
		privateKey = req.PrivateKey
		// Generate public key from private key
		privateBytes, err := base64.StdEncoding.DecodeString(privateKey)
		if err != nil {
			return nil, fmt.Errorf("invalid private key: %v", err)
		}
		if len(privateBytes) != 32 {
			return nil, fmt.Errorf("invalid private key length")
		}

		var private, public [32]byte
		copy(private[:], privateBytes)
		curve25519.ScalarBaseMult(&public, &private)
		publicKey = base64.StdEncoding.EncodeToString(public[:])
	} else {
		privateKey, publicKey, err = s.GenerateKeyPair()
		if err != nil {
			return nil, fmt.Errorf("failed to generate key pair: %v", err)
		}
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

	result, err := s.db.Exec(query, req.Name, privateKey, publicKey, req.ListenPort, req.Address, dns, mtu)
	if err != nil {
		return nil, fmt.Errorf("failed to create interface: %v", err)
	}

	id, err := result.LastInsertId()
	if err != nil {
		return nil, fmt.Errorf("failed to get interface ID: %v", err)
	}

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
		SET name = ?, listen_port = ?, address = ?, dns = ?, mtu = ?, updated_at = CURRENT_TIMESTAMP
		WHERE id = ?
	`

	_, err := s.db.Exec(query, req.Name, req.ListenPort, req.Address, dns, mtu, id)
	if err != nil {
		return nil, fmt.Errorf("failed to update interface: %v", err)
	}

	return s.GetInterface(id)
}

func (s *WireGuardService) DeleteInterface(id int) error {
	query := "DELETE FROM wireguard_interfaces WHERE id = ?"
	result, err := s.db.Exec(query, id)
	if err != nil {
		return fmt.Errorf("failed to delete interface: %v", err)
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return fmt.Errorf("failed to get rows affected: %v", err)
	}

	if rowsAffected == 0 {
		return fmt.Errorf("interface not found")
	}

	return nil
}

func (s *WireGuardService) StartInterface(id int) error {
	// 1. 先查接口信息
	iface, err := s.GetInterface(id)
	if err != nil {
		return fmt.Errorf("failed to get interface: %v", err)
	}

	// 2. 生成配置内容（包含所有 peer）
	cfg, err := s.GetInterfaceConfig(id)
	if err != nil {
		return fmt.Errorf("failed to get config: %v", err)
	}

	// 3. 写入到 /etc/wireguard/<name>.conf
	confPath := fmt.Sprintf("/etc/wireguard/%s.conf", iface.Name)
	if err := os.WriteFile(confPath, []byte(cfg), 0600); err != nil {
		return fmt.Errorf("failed to write config: %v", err)
	}

	// 4. 调用 wg-quick up 启动接口
	cmd := exec.Command("wg-quick", "up", iface.Name)
	if out, err := cmd.CombinedOutput(); err != nil {
		return fmt.Errorf("failed to start interface: %v, output: %s", err, out)
	}

	// 5. 更新数据库状态
	query := "UPDATE wireguard_interfaces SET status = 'running', updated_at = CURRENT_TIMESTAMP WHERE id = ?"
	if _, err := s.db.Exec(query, id); err != nil {
		return fmt.Errorf("failed to update DB: %v", err)
	}

	return nil
}

func (s *WireGuardService) StopInterface(id int) error {
	iface, err := s.GetInterface(id)
	if err != nil {
		return fmt.Errorf("failed to get interface: %v", err)
	}

	// 调用 wg-quick down 停止接口
	cmd := exec.Command("wg-quick", "down", iface.Name)
	if out, err := cmd.CombinedOutput(); err != nil {
		return fmt.Errorf("failed to stop interface: %v, output: %s", err, out)
	}

	query := "UPDATE wireguard_interfaces SET status = 'stopped', updated_at = CURRENT_TIMESTAMP WHERE id = ?"
	if _, err := s.db.Exec(query, id); err != nil {
		return fmt.Errorf("failed to update DB: %v", err)
	}

	return nil
}

// Peer management
func (s *WireGuardService) GetPeers() ([]models.WireGuardPeer, error) {
	query := `
		SELECT id, interface_id, name, public_key, private_key, allowed_ips, 
			   COALESCE(endpoint, '') as endpoint,
			   COALESCE(persistent_keepalive, 0) as persistent_keepalive,
			   COALESCE(status, 'disconnected') as status,
			   last_handshake, bytes_received, bytes_sent, created_at, updated_at
		FROM wireguard_peers
		ORDER BY created_at DESC
	`

	rows, err := s.db.Query(query)
	if err != nil {
		return nil, fmt.Errorf("failed to query peers: %v", err)
	}
	defer rows.Close()

	var peers []models.WireGuardPeer
	for rows.Next() {
		var peer models.WireGuardPeer
		err := rows.Scan(
			&peer.ID, &peer.InterfaceID, &peer.Name, &peer.PublicKey, &peer.PrivateKey,
			&peer.AllowedIPs, &peer.Endpoint, &peer.PersistentKeepalive, &peer.Status,
			&peer.LastHandshake, &peer.BytesReceived, &peer.BytesSent,
			&peer.CreatedAt, &peer.UpdatedAt,
		)
		if err != nil {
			return nil, fmt.Errorf("failed to scan peer: %v", err)
		}
		peers = append(peers, peer)
	}

	return peers, nil
}

func (s *WireGuardService) GetPeersByInterface(interfaceID int) ([]models.WireGuardPeer, error) {
	query := `
		SELECT id, interface_id, name, public_key, private_key, allowed_ips,
			   COALESCE(endpoint, '') as endpoint,
			   COALESCE(persistent_keepalive, 0) as persistent_keepalive,
			   COALESCE(status, 'disconnected') as status,
			   last_handshake, bytes_received, bytes_sent, created_at, updated_at
		FROM wireguard_peers
		WHERE interface_id = ?
		ORDER BY created_at DESC
	`

	rows, err := s.db.Query(query, interfaceID)
	if err != nil {
		return nil, fmt.Errorf("failed to query peers: %v", err)
	}
	defer rows.Close()

	var peers []models.WireGuardPeer
	for rows.Next() {
		var peer models.WireGuardPeer
		err := rows.Scan(
			&peer.ID, &peer.InterfaceID, &peer.Name, &peer.PublicKey, &peer.PrivateKey,
			&peer.AllowedIPs, &peer.Endpoint, &peer.PersistentKeepalive, &peer.Status,
			&peer.LastHandshake, &peer.BytesReceived, &peer.BytesSent,
			&peer.CreatedAt, &peer.UpdatedAt,
		)
		if err != nil {
			return nil, fmt.Errorf("failed to scan peer: %v", err)
		}
		peers = append(peers, peer)
	}

	return peers, nil
}

func (s *WireGuardService) GetPeer(id int) (*models.WireGuardPeer, error) {
	query := `
		SELECT id, interface_id, name, public_key, private_key, allowed_ips,
			   COALESCE(endpoint, '') as endpoint,
			   COALESCE(persistent_keepalive, 0) as persistent_keepalive,
			   COALESCE(status, 'disconnected') as status,
			   last_handshake, bytes_received, bytes_sent, created_at, updated_at
		FROM wireguard_peers
		WHERE id = ?
	`

	var peer models.WireGuardPeer
	err := s.db.QueryRow(query, id).Scan(
		&peer.ID, &peer.InterfaceID, &peer.Name, &peer.PublicKey, &peer.PrivateKey,
		&peer.AllowedIPs, &peer.Endpoint, &peer.PersistentKeepalive, &peer.Status,
		&peer.LastHandshake, &peer.BytesReceived, &peer.BytesSent,
		&peer.CreatedAt, &peer.UpdatedAt,
	)
	if err != nil {
		if err == sql.ErrNoRows {
			return nil, fmt.Errorf("peer not found")
		}
		return nil, fmt.Errorf("failed to get peer: %v", err)
	}

	return &peer, nil
}

func (s *WireGuardService) CreatePeer(req models.CreatePeerRequest) (*models.WireGuardPeer, error) {
	var privateKey, publicKey string
	var err error

	if req.PublicKey != "" {
		publicKey = req.PublicKey
		// For client peers, we might not have the private key
		privateKey = ""
	} else {
		privateKey, publicKey, err = s.GenerateKeyPair()
		if err != nil {
			return nil, fmt.Errorf("failed to generate key pair: %v", err)
		}
	}

	query := `
		INSERT INTO wireguard_peers (interface_id, name, public_key, private_key, allowed_ips, endpoint, persistent_keepalive, status)
		VALUES (?, ?, ?, ?, ?, ?, ?, 'disconnected')
	`

	result, err := s.db.Exec(query, req.InterfaceID, req.Name, publicKey, privateKey, req.AllowedIPs, req.Endpoint, req.PersistentKeepalive)
	if err != nil {
		return nil, fmt.Errorf("failed to create peer: %v", err)
	}

	id, err := result.LastInsertId()
	if err != nil {
		return nil, fmt.Errorf("failed to get peer ID: %v", err)
	}

	return s.GetPeer(int(id))
}

func (s *WireGuardService) UpdatePeer(id int, req models.UpdatePeerRequest) (*models.WireGuardPeer, error) {
	query := `
		UPDATE wireguard_peers 
		SET name = ?, allowed_ips = ?, endpoint = ?, persistent_keepalive = ?, updated_at = CURRENT_TIMESTAMP
		WHERE id = ?
	`

	_, err := s.db.Exec(query, req.Name, req.AllowedIPs, req.Endpoint, req.PersistentKeepalive, id)
	if err != nil {
		return nil, fmt.Errorf("failed to update peer: %v", err)
	}

	return s.GetPeer(id)
}

func (s *WireGuardService) DeletePeer(id int) error {
	query := "DELETE FROM wireguard_peers WHERE id = ?"
	result, err := s.db.Exec(query, id)
	if err != nil {
		return fmt.Errorf("failed to delete peer: %v", err)
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return fmt.Errorf("failed to get rows affected: %v", err)
	}

	if rowsAffected == 0 {
		return fmt.Errorf("peer not found")
	}

	return nil
}

// Configuration generation
func (s *WireGuardService) GetInterfaceConfig(id int) (string, error) {
	// 1) 读取接口
	iface, err := s.GetInterface(id)
	if err != nil {
		return "", err
	}

	// 基本校验
	if iface.PrivateKey == "" || iface.PublicKey == "" {
		return "", fmt.Errorf("interface keypair is missing")
	}
	if strings.TrimSpace(iface.Address) == "" {
		return "", fmt.Errorf("interface address is required (e.g. 10.6.0.1/24)")
	}
	if iface.ListenPort == 0 {
		return "", fmt.Errorf("listen port is required")
	}

	// 2) 读取该接口下所有 peers
	peers, err := s.GetPeersByInterface(id)
	if err != nil {
		return "", err
	}

	var b strings.Builder

	// 3) [Interface]（服务器侧）
	fmt.Fprintf(&b, "[Interface]\n")
	fmt.Fprintf(&b, "PrivateKey = %s\n", iface.PrivateKey)
	fmt.Fprintf(&b, "Address = %s\n", iface.Address)
	fmt.Fprintf(&b, "ListenPort = %d\n", iface.ListenPort)
	if iface.MTU > 0 {
		fmt.Fprintf(&b, "MTU = %d\n", iface.MTU)
	}
	// 一般 DNS 只下发给客户端，这里可不写；若你需要也可写：
	if strings.TrimSpace(iface.DNS) != "" {
		fmt.Fprintf(&b, "DNS = %s\n", iface.DNS)
	}

	// 4) [Peer] 列出所有对端（服务端视角）
	for _, p := range peers {
		if strings.TrimSpace(p.PublicKey) == "" {
			continue
		}
		fmt.Fprintf(&b, "\n[Peer]\n")
		fmt.Fprintf(&b, "PublicKey = %s\n", p.PublicKey)

		// 服务器侧 AllowedIPs：通常填该 peer 的隧道地址（最小路由）
		allowed := strings.TrimSpace(p.IP)
		if allowed == "" && strings.TrimSpace(p.AllowedIPs) != "" {
			// 如果你想用自定义更大网段，就用 allowed_ips
			allowed = p.AllowedIPs
		}
		if allowed != "" {
			fmt.Fprintf(&b, "AllowedIPs = %s\n", allowed)
		}
		// 你的 schema 没有 peer 的 endpoint，这里就不写 Endpoint
	}

	return b.String(), nil
}

func (s *WireGuardService) getInterfaceActualStatus(name string) string {
	// A. 尝试 wgctrl：能拿到设备说明接口已创建（通常也在 up 状态）
	if s.client != nil {
		if _, err := s.client.Device(name); err == nil {
			return "running"
		}
		// 继续降级，用于进一步判断
	}
	return "running"
}

func (s *WireGuardService) GetPeerConfig(id int) (string, error) {
	peer, err := s.GetPeer(id)
	if err != nil {
		return "", err
	}

	iface, err := s.GetInterface(peer.InterfaceID)
	if err != nil {
		return "", err
	}

	config := fmt.Sprintf(`[Interface]
PrivateKey = %s
Address = %s
`, peer.PrivateKey, peer.AllowedIPs)

	if iface.DNS != "" {
		config += fmt.Sprintf("DNS = %s\n", iface.DNS)
	}

	config += fmt.Sprintf(`
[Peer]
PublicKey = %s
AllowedIPs = 0.0.0.0/0
Endpoint = your-server-ip:%d
`, iface.PublicKey, iface.ListenPort)

	if peer.PersistentKeepalive > 0 {
		config += fmt.Sprintf("PersistentKeepalive = %d\n", peer.PersistentKeepalive)
	}

	return config, nil
}

// Status updates (simulate real WireGuard status)
func (s *WireGuardService) UpdatePeerStatus() error {
	// This would normally read from actual WireGuard status
	// For now, we'll simulate some status updates
	peers, err := s.GetPeers()
	if err != nil {
		return err
	}

	for _, peer := range peers {
		// Simulate random status updates
		if peer.Status == "connected" {
			// Update last handshake and traffic
			now := time.Now()
			query := `
				UPDATE wireguard_peers 
				SET last_handshake = ?, bytes_received = bytes_received + ?, bytes_sent = bytes_sent + ?
				WHERE id = ?
			`
			_, err := s.db.Exec(query, &now, 1024+int64(peer.ID)*100, 512+int64(peer.ID)*50, peer.ID)
			if err != nil {
				return fmt.Errorf("failed to update peer status: %v", err)
			}
		}
	}

	return nil
}

// RestartService 尝试整体重启 wg-quick 服务；失败则逐接口 down/up 兜底
func (s *WireGuardService) RestartService() error {
	// 方案 A：systemd 一键重启（存在则成功最省事）
	if out, err := exec.Command("bash", "-lc",
		`systemctl daemon-reload >/dev/null 2>&1 || true; `+
			`systemctl restart 'wg-quick@*.service' 2>&1 || systemctl restart wg-quick@wg0.service 2>&1`).CombinedOutput(); err == nil {
		return nil
	} else {
		// 不中断，继续兜底
		_ = out
	}

	// 方案 B 兜底：对数据库里记录的接口逐一 down/up
	ifaces, err := s.GetInterfaces()
	if err != nil {
		return fmt.Errorf("restart fallback: list interfaces: %w", err)
	}

	var errs []string
	for _, iface := range ifaces {
		// 如果你只想重启“已运行”的，可以判断 iface.Status == "running"
		// 先尝试 down（即使没启动也无所谓）
		if out, err := exec.Command("bash", "-lc", fmt.Sprintf("wg-quick down %q", iface.Name)).CombinedOutput(); err != nil {
			// 不是致命错误，记录后继续
			errs = append(errs, fmt.Sprintf("down %s: %v (%s)", iface.Name, err, strings.TrimSpace(string(out))))
		}
		// 再 up
		if out, err := exec.Command("bash", "-lc", fmt.Sprintf("wg-quick up %q", iface.Name)).CombinedOutput(); err != nil {
			errs = append(errs, fmt.Sprintf("up %s: %v (%s)", iface.Name, err, strings.TrimSpace(string(out))))
			continue
		}

		// 可选：更新 DB 状态为 running
		if _, err := s.db.Exec(`UPDATE wireguard_interfaces SET status='running', updated_at=CURRENT_TIMESTAMP WHERE id=?`, iface.ID); err != nil {
			errs = append(errs, fmt.Sprintf("db update %s: %v", iface.Name, err))
		}
	}

	if len(errs) > 0 {
		return fmt.Errorf("restart fallback finished with errors: %s", strings.Join(errs, "; "))
	}
	return nil
}
