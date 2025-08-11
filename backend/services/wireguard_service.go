package services

import (
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
	rows, err := s.db.Query(`
		SELECT id, interface_id, name, public_key, private_key, allowed_ips,
			   COALESCE(endpoint, '') AS endpoint,
			   COALESCE(persistent_keepalive, 0) AS persistent_keepalive,
			   COALESCE(status, 'disconnected') AS status,
			   last_handshake, bytes_received, bytes_sent, created_at, updated_at
		FROM wireguard_peers
		ORDER BY created_at DESC`)
	if err != nil {
		return nil, fmt.Errorf("query peers: %w", err)
	}
	defer rows.Close()

	var list []models.WireGuardPeer
	for rows.Next() {
		var p models.WireGuardPeer
		if err := rows.Scan(
			&p.ID, &p.InterfaceID, &p.Name, &p.PublicKey, &p.PrivateKey,
			&p.AllowedIPs, &p.Endpoint, &p.PersistentKeepalive, &p.Status,
			&p.LastHandshake, &p.BytesReceived, &p.BytesSent,
			&p.CreatedAt, &p.UpdatedAt,
		); err != nil {
			return nil, fmt.Errorf("scan peer: %w", err)
		}
		list = append(list, p)
	}
	return list, nil
}

func (s *WireGuardService) GetPeersByInterface(interfaceID int) ([]models.WireGuardPeer, error) {
	rows, err := s.db.Query(`
		SELECT id, interface_id, name, public_key, private_key, allowed_ips,
			   COALESCE(endpoint, '') AS endpoint,
			   COALESCE(persistent_keepalive, 0) AS persistent_keepalive,
			   COALESCE(status, 'disconnected') AS status,
			   last_handshake, bytes_received, bytes_sent, created_at, updated_at
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
		if err := rows.Scan(
			&p.ID, &p.InterfaceID, &p.Name, &p.PublicKey, &p.PrivateKey,
			&p.AllowedIPs, &p.Endpoint, &p.PersistentKeepalive, &p.Status,
			&p.LastHandshake, &p.BytesReceived, &p.BytesSent,
			&p.CreatedAt, &p.UpdatedAt,
		); err != nil {
			return nil, fmt.Errorf("scan peer: %w", err)
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

func (s *WireGuardService) CreatePeer(req models.CreatePeerRequest) (*models.WireGuardPeer, error) {
	pub := strings.TrimSpace(req.PublicKey)
	priv := "" // CreatePeerRequest 没有 PrivateKey 字段

	var err error
	if pub == "" {
		// 没有提供公钥：内部生成一对（便于之后导出客户端配置）
		priv, pub, err = s.GenerateKeyPair()
		if err != nil {
			return nil, err
		}
	}

	res, err := s.db.Exec(`
		INSERT INTO wireguard_peers (interface_id, name, public_key, private_key, allowed_ips, endpoint, persistent_keepalive, status)
		VALUES (?, ?, ?, ?, ?, ?, ?, 'disconnected')`,
		req.InterfaceID, req.Name, pub, priv, req.AllowedIPs, req.Endpoint, req.PersistentKeepalive)
	if err != nil {
		return nil, fmt.Errorf("create peer: %w", err)
	}
	id, _ := res.LastInsertId()

	// 可选：立即把该接口的最新配置下发到内核（热更新）
	_ = s.ApplyInterfaceConfig(req.InterfaceID)

	return s.GetPeer(int(id))
}

func (s *WireGuardService) UpdatePeer(id int, req models.UpdatePeerRequest) (*models.WireGuardPeer, error) {
	_, err := s.db.Exec(`
		UPDATE wireguard_peers
		SET name=?, allowed_ips=?, endpoint=?, persistent_keepalive=?, updated_at=CURRENT_TIMESTAMP
		WHERE id=?`,
		req.Name, req.AllowedIPs, req.Endpoint, req.PersistentKeepalive, id)
	if err != nil {
		return nil, fmt.Errorf("update peer: %w", err)
	}

	// 找到对应接口，热更新
	p, _ := s.GetPeer(id)
	if p != nil {
		_ = s.ApplyInterfaceConfig(p.InterfaceID)
	}
	return s.GetPeer(id)
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
	fmt.Fprintf(&b, "[Interface]\nPrivateKey = %s\nAddress = %s\nListenPort = %d\n", iface.PrivateKey, iface.Address, iface.ListenPort)
	if iface.MTU > 0 {
		fmt.Fprintf(&b, "MTU = %d\n", iface.MTU)
	}
	if strings.TrimSpace(iface.DNS) != "" {
		fmt.Fprintf(&b, "DNS = %s\n", iface.DNS)
	}

	for _, p := range peers {
		if strings.TrimSpace(p.PublicKey) == "" {
			continue
		}
		fmt.Fprintf(&b, "\n[Peer]\nPublicKey = %s\n", p.PublicKey)
		if strings.TrimSpace(p.AllowedIPs) != "" {
			fmt.Fprintf(&b, "AllowedIPs = %s\n", p.AllowedIPs)
		}
		if strings.TrimSpace(p.Endpoint) != "" {
			fmt.Fprintf(&b, "Endpoint = %s\n", p.Endpoint)
		}
		if p.PersistentKeepalive > 0 {
			fmt.Fprintf(&b, "PersistentKeepalive = %d\n", p.PersistentKeepalive)
		}
	}
	return b.String(), nil
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
	if strings.TrimSpace(peer.PrivateKey) == "" {
		return "", errors.New("peer private key missing for client config")
	}
	// 默认生成全局路由的客户端配置；按需改
	cfg := fmt.Sprintf(`[Interface]
PrivateKey = %s
Address = %s
`, peer.PrivateKey, peer.AllowedIPs)
	if strings.TrimSpace(iface.DNS) != "" {
		cfg += fmt.Sprintf("DNS = %s\n", iface.DNS)
	}
	cfg += fmt.Sprintf(`
[Peer]
PublicKey = %s
AllowedIPs = 0.0.0.0/0, ::/0
Endpoint = your-server-ip:%d
`, iface.PublicKey, iface.ListenPort)
	if peer.PersistentKeepalive > 0 {
		cfg += fmt.Sprintf("PersistentKeepalive = %d\n", peer.PersistentKeepalive)
	}
	return cfg, nil
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
	up, index := false, 0
	if ifi, _ := net.InterfaceByName(iface.Name); ifi != nil {
		up = (ifi.Flags & net.FlagUp) != 0
		index = ifi.Index
	}

	st := &models.InterfaceStatus{
		ID:         id,
		Name:       iface.Name,
		Up:         up,
		Index:      index,
		ListenPort: 0,
		Peers:      []models.PeerStatus{},
	}

	// 地址
	if ifi, _ := net.InterfaceByName(iface.Name); ifi != nil {
		if addrs, _ := ifi.Addrs(); len(addrs) > 0 {
			for _, a := range addrs {
				st.AddressCIDRs = append(st.AddressCIDRs, a.String())
			}
		}
	}

	// 设备/Peers
	c := s.client
	if c == nil {
		var err error
		c, err = wgctrl.New()
		if err != nil {
			// 返回链路层信息即可
			return st, nil
		}
		defer c.Close()
	}
	dev, err := c.Device(iface.Name)
	if err != nil {
		return st, nil // 未创建/未启动
	}
	st.ListenPort = dev.ListenPort
	for _, p := range dev.Peers {
		ps := models.PeerStatus{
			PublicKey: p.PublicKey.String(),
			Endpoint: func() string {
				if p.Endpoint != nil {
					return p.Endpoint.String()
				}
				return ""
			}(),
			LatestHandshake: p.LastHandshakeTime.Unix(),
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
