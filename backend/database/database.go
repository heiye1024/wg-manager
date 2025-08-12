package database

import (
	"bufio"
	"context"
	"database/sql"
	"fmt"
	"log"
	"net"
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
	// SQLite: 开启外键（其他数据库无影响）
	_, _ = db.Exec(`PRAGMA foreign_keys = ON`)

	// 1) 基础表（新库会直接带上 cidr/server_ip、endpoint、persistent_keepalive）
	creates := []string{
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
		  listen_port INTEGER NOT NULL UNIQUE,
		  address TEXT NOT NULL,
		  dns TEXT DEFAULT '',
		  mtu INTEGER DEFAULT 1420,
		  status TEXT DEFAULT 'inactive',
		  cidr TEXT,                 -- 接口子网（如 10.8.0.0/24）
		  server_ip TEXT,            -- 隧道内服务端 IP（如 10.8.0.1）
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
			preshared_key TEXT,
			endpoint TEXT DEFAULT '',
			persistent_keepalive INTEGER DEFAULT 25,
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
	if err := execMany(db, creates); err != nil {
		return fmt.Errorf("create base tables: %w", err)
	}

	// 2) 老库兼容：缺列就补（SQLite 无 IF NOT EXISTS，需检查后 ALTER）
	ensure := func(tbl, col, typ string) {
		if !columnExists(db, tbl, col) {
			if _, err := db.Exec(fmt.Sprintf(`ALTER TABLE %s ADD COLUMN %s %s`, tbl, col, typ)); err != nil {
				log.Printf("[createTables] add %s.%s failed: %v", tbl, col, err)
			}
		}
	}
	ensure("wireguard_interfaces", "dns", "TEXT DEFAULT ''")
	ensure("wireguard_interfaces", "mtu", "INTEGER DEFAULT 1420")
	ensure("wireguard_interfaces", "cidr", "TEXT")
	ensure("wireguard_interfaces", "server_ip", "TEXT")

	ensure("wireguard_peers", "endpoint", "TEXT DEFAULT ''")
	ensure("wireguard_peers", "persistent_keepalive", "INTEGER DEFAULT 25")

	// 3) 索引：同一接口下 IP 唯一 + 查询加速
	indexes := []string{
		`CREATE UNIQUE INDEX IF NOT EXISTS idx_peer_interface_ip ON wireguard_peers(interface_id, ip)`,
		`CREATE INDEX IF NOT EXISTS idx_peer_interface ON wireguard_peers(interface_id)`,
	}
	if err := execMany(db, indexes); err != nil {
		return fmt.Errorf("create indexes: %w", err)
	}

	// 4) 从 address 回填 cidr/server_ip（仅当为空时）
	if err := migrateInterfaceCIDR(db); err != nil {
		return fmt.Errorf("migrate interface cidr/server_ip: %w", err)
	}

	return nil
}

// 执行多条 SQL
func execMany(db *sql.DB, queries []string) error {
	for _, q := range queries {
		if _, err := db.Exec(q); err != nil {
			return fmt.Errorf("exec %q: %w", q, err)
		}
	}
	return nil
}

// 判断表字段是否存在
func columnExists(db *sql.DB, table, column string) bool {
	rows, err := db.Query("PRAGMA table_info(" + table + ")")
	if err != nil {
		return false
	}
	defer rows.Close()
	for rows.Next() {
		var cid int
		var name, ctype string
		var notnull, pk int
		var dfltValue interface{}
		if err := rows.Scan(&cid, &name, &ctype, &notnull, &dfltValue, &pk); err == nil {
			if name == column {
				return true
			}
		}
	}
	return false
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

// 从 address（如 "10.8.0.1/24" 或 "fd00::1/64"）回填 cidr/server_ip（仅在为空时）
func migrateInterfaceCIDR(db *sql.DB) error {
	ctx := context.Background()

	type row struct {
		id       int
		address  sql.NullString
		cidr     sql.NullString
		serverIP sql.NullString
	}
	rows, err := db.QueryContext(ctx, `SELECT id, address, cidr, server_ip FROM wireguard_interfaces`)
	if err != nil {
		return err
	}
	defer rows.Close()

	var rs []row
	for rows.Next() {
		var r row
		if err := rows.Scan(&r.id, &r.address, &r.cidr, &r.serverIP); err != nil {
			return err
		}
		rs = append(rs, r)
	}
	if err := rows.Err(); err != nil {
		return err
	}

	tx, err := db.BeginTx(ctx, &sql.TxOptions{Isolation: sql.LevelSerializable})
	if err != nil {
		return err
	}
	defer func() { _ = tx.Rollback() }()

	stmt, err := tx.PrepareContext(ctx, `UPDATE wireguard_interfaces SET cidr = ?, server_ip = ? WHERE id = ?`)
	if err != nil {
		return err
	}
	defer stmt.Close()

	for _, r := range rs {
		// 已经有值就跳过
		if r.cidr.Valid && strings.TrimSpace(r.cidr.String) != "" &&
			r.serverIP.Valid && strings.TrimSpace(r.serverIP.String) != "" {
			continue
		}
		if !r.address.Valid {
			continue
		}
		addr := strings.TrimSpace(r.address.String)
		if addr == "" || !strings.Contains(addr, "/") {
			continue
		}

		ip, ipNet, err := net.ParseCIDR(addr)
		if err != nil || ip == nil || ipNet == nil {
			continue
		}

		cidr := ipNet.String()  // 网络段，如 10.8.0.0/24
		serverIP := ip.String() // 服务器 IP，如 10.8.0.1

		if _, err := stmt.ExecContext(ctx, cidr, serverIP, r.id); err != nil {
			return err
		}
	}

	return tx.Commit()
}
