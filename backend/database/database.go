package database

import (
	"bufio"
	"database/sql"
	"fmt"
	"log"
	"os"
	"path/filepath"
	"strings"

	_ "github.com/mattn/go-sqlite3"
)

func Initialize(databaseURL string) (*sql.DB, error) {
	db, err := sql.Open("sqlite3", databaseURL)
	if err != nil {
		return nil, fmt.Errorf("failed to open database: %v", err)
	}

	if err := db.Ping(); err != nil {
		return nil, fmt.Errorf("failed to ping database: %v", err)
	}

	if err := createTables(db); err != nil {
		return nil, fmt.Errorf("failed to create tables: %v", err)
	}

	if err := createDefaultUser(db); err != nil {
		log.Printf("Warning: Could not create default user: %v", err)
	}

	// 读取当前服务器 WireGuard 信息并保存到数据库
	if err := syncWireGuardFromSystem(db); err != nil {
		log.Printf("Warning: Could not sync WireGuard info from system: %v", err)
	}

	log.Println("Database initialized successfully")
	return db, nil
}

// 读取系统 WireGuard 信息并保存到数据库
func syncWireGuardFromSystem(db *sql.DB) error {
	// 读取 /etc/wireguard/*.conf 文件
	confDir := "/etc/wireguard"
	files, err := readDir(confDir)
	if err != nil {
		log.Printf("[syncWireGuardFromSystem] 无法读取 %s: %v", confDir, err)
		return nil // 不阻塞初始化
	}

	for _, file := range files {
		if !file.IsDir() && (len(file.Name()) > 5 && file.Name()[len(file.Name())-5:] == ".conf") {
			path := confDir + "/" + file.Name()
			if err := importWireGuardConf(db, path); err != nil {
				log.Printf("[syncWireGuardFromSystem] 导入 %s 失败: %v", path, err)
			}
		}
	}
	return nil
}

// 读取目录内容
func readDir(dirname string) ([]os.DirEntry, error) {
	return os.ReadDir(dirname)
}

// 解析单个 WireGuard 配置文件并写入数据库
func importWireGuardConf(db *sql.DB, path string) error {
	f, err := os.Open(path)
	if err != nil {
		return err
	}
	defer f.Close()

	scanner := bufio.NewScanner(f)
	section := ""
	iface := make(map[string]string)
	var peers []map[string]string
	peer := make(map[string]string)
	for scanner.Scan() {
		line := strings.TrimSpace(scanner.Text())
		if line == "" || strings.HasPrefix(line, "#") || strings.HasPrefix(line, ";") {
			continue
		}
		if strings.HasPrefix(line, "[") && strings.HasSuffix(line, "]") {
			if section == "Peer" && len(peer) > 0 {
				peers = append(peers, peer)
				peer = make(map[string]string)
			}
			section = strings.Trim(line, "[]")
			continue
		}
		kv := strings.SplitN(line, "=", 2)
		if len(kv) != 2 {
			continue
		}
		key := strings.TrimSpace(kv[0])
		val := strings.TrimSpace(kv[1])
		if section == "Interface" {
			iface[key] = val
		} else if section == "Peer" {
			peer[key] = val
		}
	}
	if section == "Peer" && len(peer) > 0 {
		peers = append(peers, peer)
	}

	// 插入 interface
	if iface["PrivateKey"] == "" || iface["Address"] == "" || iface["ListenPort"] == "" {
		return nil // 跳过无效配置
	}
	name := strings.TrimSuffix(filepath.Base(path), ".conf")
	// 检查是否已存在
	var count int
	_ = db.QueryRow("SELECT COUNT(*) FROM wireguard_interfaces WHERE name = ?", name).Scan(&count)
	if count == 0 {
		_, err = db.Exec(`INSERT INTO wireguard_interfaces (name, private_key, public_key, listen_port, address, status) VALUES (?, ?, '', ?, ?, 'inactive')`,
			name, iface["PrivateKey"], iface["ListenPort"], iface["Address"])
		if err != nil {
			log.Printf("[importWireGuardConf] 插入interface失败: %v", err)
		}
	}
	// 获取interface id
	var ifaceID int
	_ = db.QueryRow("SELECT id FROM wireguard_interfaces WHERE name = ?", name).Scan(&ifaceID)

	// 插入 peers
	for _, p := range peers {
		if p["PublicKey"] == "" || p["AllowedIPs"] == "" {
			continue
		}
		// 检查是否已存在
		var peerCount int
		_ = db.QueryRow("SELECT COUNT(*) FROM wireguard_peers WHERE interface_id = ? AND public_key = ?", ifaceID, p["PublicKey"]).Scan(&peerCount)
		if peerCount == 0 {
			_, err = db.Exec(`INSERT INTO wireguard_peers (interface_id, name, public_key, private_key, ip, allowed_ips, status) VALUES (?, ?, ?, '', '', ?, 'inactive')`,
				ifaceID, p["PublicKey"], p["PublicKey"], p["AllowedIPs"])
			if err != nil {
				log.Printf("[importWireGuardConf] 插入peer失败: %v", err)
			}
		}
	}
	return nil
}

func createTables(db *sql.DB) error {
	queries := []string{
		`CREATE TABLE IF NOT EXISTS users (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			username TEXT UNIQUE NOT NULL,
			password_hash TEXT NOT NULL,
			created_at DATETIME DEFAULT CURRENT_TIMESTAMP
		)`,
		`CREATE TABLE IF NOT EXISTS wireguard_interfaces (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			name TEXT UNIQUE NOT NULL,
			private_key TEXT NOT NULL,
			public_key TEXT NOT NULL,
			listen_port INTEGER NOT NULL,
			address TEXT NOT NULL,
			status TEXT DEFAULT 'inactive',
			created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
			updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
		)`,
		`CREATE TABLE IF NOT EXISTS wireguard_peers (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			interface_id INTEGER NOT NULL,
			name TEXT NOT NULL,
			public_key TEXT NOT NULL,
			private_key TEXT,
			ip TEXT NOT NULL,
			allowed_ips TEXT NOT NULL,
			status TEXT DEFAULT 'inactive',
			last_handshake DATETIME,
			bytes_received INTEGER DEFAULT 0,
			bytes_sent INTEGER DEFAULT 0,
			created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
			updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
			FOREIGN KEY (interface_id) REFERENCES wireguard_interfaces(id) ON DELETE CASCADE
		)`,
		`CREATE TABLE IF NOT EXISTS devices (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			name TEXT NOT NULL,
			type TEXT NOT NULL,
			ip_address TEXT,
			mac_address TEXT,
			status TEXT DEFAULT 'offline',
			last_seen DATETIME,
			created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
			updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
		)`,
		`CREATE TABLE IF NOT EXISTS frp_clients (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			name TEXT UNIQUE NOT NULL,
			server_addr TEXT NOT NULL,
			server_port INTEGER NOT NULL,
			token TEXT,
			status TEXT DEFAULT 'inactive',
			config TEXT,
			created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
			updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
		)`,
		`CREATE TABLE IF NOT EXISTS frp_proxies (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			client_id INTEGER NOT NULL,
			name TEXT NOT NULL,
			type TEXT NOT NULL,
			local_ip TEXT NOT NULL,
			local_port INTEGER NOT NULL,
			remote_port INTEGER,
			custom_domains TEXT,
			status TEXT DEFAULT 'inactive',
			created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
			updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
			FOREIGN KEY (client_id) REFERENCES frp_clients(id) ON DELETE CASCADE
		)`,
		`CREATE TABLE IF NOT EXISTS domains (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			domain TEXT UNIQUE NOT NULL,
			target_ip TEXT NOT NULL,
			target_port INTEGER NOT NULL,
			ssl_enabled BOOLEAN DEFAULT FALSE,
			status TEXT DEFAULT 'active',
			created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
			updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
		)`,
	}

	for _, query := range queries {
		if _, err := db.Exec(query); err != nil {
			return fmt.Errorf("failed to execute query: %s, error: %v", query, err)
		}
	}

	return nil
}

func createDefaultUser(db *sql.DB) error {
	// Check if admin user already exists
	var count int
	err := db.QueryRow("SELECT COUNT(*) FROM users WHERE username = ?", "admin").Scan(&count)
	if err != nil {
		return err
	}

	if count > 0 {
		return nil // User already exists
	}

	// Create default admin user with password "admin123"
	hashedPassword := "$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi" // bcrypt hash of "admin123"

	_, err = db.Exec(
		"INSERT INTO users (username, password_hash) VALUES (?, ?)",
		"admin", hashedPassword,
	)

	if err == nil {
		log.Println("Default admin user created (username: admin, password: admin123)")
	}

	return err
}
