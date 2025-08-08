package services

import (
	"backend/models"
	"crypto/rand"
	"database/sql"
	"encoding/base64"
	"fmt"
	"golang.org/x/crypto/curve25519"
	"strings"
	"time"
)

type WireGuardService struct {
	db *sql.DB
}

func NewWireGuardService(db *sql.DB) *WireGuardService {
	return &WireGuardService{db: db}
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

		interfaces = append(interfaces, iface)
	}

	return interfaces, nil
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
	query := "UPDATE wireguard_interfaces SET status = 'running', updated_at = CURRENT_TIMESTAMP WHERE id = ?"
	_, err := s.db.Exec(query, id)
	if err != nil {
		return fmt.Errorf("failed to start interface: %v", err)
	}
	return nil
}

func (s *WireGuardService) StopInterface(id int) error {
	query := "UPDATE wireguard_interfaces SET status = 'stopped', updated_at = CURRENT_TIMESTAMP WHERE id = ?"
	_, err := s.db.Exec(query, id)
	if err != nil {
		return fmt.Errorf("failed to stop interface: %v", err)
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
