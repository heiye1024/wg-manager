package models

import (
	"time"
)

type User struct {
	ID           int       `json:"id" db:"id"`
	Username     string    `json:"username" db:"username"`
	PasswordHash string    `json:"-" db:"password_hash"`
	CreatedAt    time.Time `json:"created_at" db:"created_at"`
	UpdatedAt    time.Time `json:"updated_at" db:"updated_at"`
}

type WireGuardInterface struct {
	ID         int       `json:"id" db:"id"`
	Name       string    `json:"name" db:"name"`
	PrivateKey string    `json:"private_key" db:"private_key"`
	PublicKey  string    `json:"public_key" db:"public_key"`
	Address    string    `json:"address" db:"address"`
	ListenPort int       `json:"listen_port" db:"listen_port"`
	DNS        string    `json:"dns" db:"dns"`
	MTU        int       `json:"mtu" db:"mtu"`
	Status     string    `json:"status" db:"status"`
	CreatedAt  time.Time `json:"created_at" db:"created_at"`
	UpdatedAt  time.Time `json:"updated_at" db:"updated_at"`
}

type WireGuardPeer struct {
	ID                  int        `json:"id" db:"id"`
	InterfaceID         int        `json:"interface_id" db:"interface_id"`
	Name                string     `json:"name" db:"name"`
	PublicKey           string     `json:"public_key" db:"public_key"`
	PrivateKey          string     `json:"private_key" db:"private_key"`
	AllowedIPs          string     `json:"allowed_ips" db:"allowed_ips"`
	Endpoint            string     `json:"endpoint" db:"endpoint"`
	PersistentKeepalive int        `json:"persistent_keepalive" db:"persistent_keepalive"`
	Status              string     `json:"status" db:"status"`
	LastHandshake       *time.Time `json:"last_handshake" db:"last_handshake"`
	BytesReceived       int64      `json:"bytes_received" db:"bytes_received"`
	BytesSent           int64      `json:"bytes_sent" db:"bytes_sent"`
	CreatedAt           time.Time  `json:"created_at" db:"created_at"`
	UpdatedAt           time.Time  `json:"updated_at" db:"updated_at"`
}

type Device struct {
	ID          int        `json:"id" db:"id"`
	Name        string     `json:"name" db:"name"`
	Type        string     `json:"type" db:"type"`
	IPAddress   string     `json:"ip_address" db:"ip_address"`
	MACAddress  string     `json:"mac_address" db:"mac_address"`
	Status      string     `json:"status" db:"status"`
	LastSeen    *time.Time `json:"last_seen" db:"last_seen"`
	Description string     `json:"description" db:"description"`
	CreatedAt   time.Time  `json:"created_at" db:"created_at"`
	UpdatedAt   time.Time  `json:"updated_at" db:"updated_at"`
}

type FRPClient struct {
	ID         int       `json:"id" db:"id"`
	Name       string    `json:"name" db:"name"`
	ServerAddr string    `json:"server_addr" db:"server_addr"`
	ServerPort int       `json:"server_port" db:"server_port"`
	Token      string    `json:"token" db:"token"`
	Status     string    `json:"status" db:"status"`
	Config     string    `json:"config" db:"config"`
	CreatedAt  time.Time `json:"created_at" db:"created_at"`
	UpdatedAt  time.Time `json:"updated_at" db:"updated_at"`
}

type FRPProxy struct {
	ID            int       `json:"id" db:"id"`
	ClientID      int       `json:"client_id" db:"client_id"`
	Name          string    `json:"name" db:"name"`
	Type          string    `json:"type" db:"type"`
	LocalIP       string    `json:"local_ip" db:"local_ip"`
	LocalPort     int       `json:"local_port" db:"local_port"`
	RemotePort    int       `json:"remote_port" db:"remote_port"`
	CustomDomains string    `json:"custom_domains" db:"custom_domains"`
	Status        string    `json:"status" db:"status"`
	CreatedAt     time.Time `json:"created_at" db:"created_at"`
	UpdatedAt     time.Time `json:"updated_at" db:"updated_at"`
}

// Request/Response models
type LoginRequest struct {
	Username string `json:"username" binding:"required"`
	Password string `json:"password" binding:"required"`
}

type LoginResponse struct {
	Token     string `json:"token"`
	User      User   `json:"user"`
	ExpiresAt int64  `json:"expires_at"`
}

type CreateInterfaceRequest struct {
	Name       string `json:"name" binding:"required"`
	ListenPort int    `json:"listen_port" binding:"required"`
	Address    string `json:"address" binding:"required"`
	PrivateKey string `json:"private_key,omitempty"`
	DNS        string `json:"dns,omitempty"`
	MTU        int    `json:"mtu,omitempty"`
}

type UpdateInterfaceRequest struct {
	Name       string `json:"name"`
	ListenPort int    `json:"listen_port"`
	Address    string `json:"address"`
	DNS        string `json:"dns"`
	MTU        int    `json:"mtu"`
}

type CreatePeerRequest struct {
	InterfaceID         int    `json:"interface_id" binding:"required"`
	Name                string `json:"name" binding:"required"`
	AllowedIPs          string `json:"allowed_ips" binding:"required"`
	Endpoint            string `json:"endpoint,omitempty"`
	PersistentKeepalive int    `json:"persistent_keepalive,omitempty"`
	PublicKey           string `json:"public_key,omitempty"`
}

type UpdatePeerRequest struct {
	Name                string `json:"name"`
	AllowedIPs          string `json:"allowed_ips"`
	Endpoint            string `json:"endpoint"`
	PersistentKeepalive int    `json:"persistent_keepalive"`
}

type APIResponse struct {
	Success bool        `json:"success"`
	Message string      `json:"message,omitempty"`
	Data    interface{} `json:"data,omitempty"`
	Error   string      `json:"error,omitempty"`
	Status  int         `json:"status,omitempty"` // HTTP status code
}

// WebSocket message types
type WSMessage struct {
	Type string      `json:"type"`
	Data interface{} `json:"data"`
}

type WSStatusUpdate struct {
	InterfaceID int    `json:"interface_id"`
	Status      string `json:"status"`
	Timestamp   string `json:"timestamp"`
}

type WSPeerUpdate struct {
	PeerID        int    `json:"peer_id"`
	InterfaceID   int    `json:"interface_id"`
	Status        string `json:"status"`
	LastHandshake string `json:"last_handshake"`
	BytesReceived int64  `json:"bytes_received"`
	BytesSent     int64  `json:"bytes_sent"`
	Timestamp     string `json:"timestamp"`
}
