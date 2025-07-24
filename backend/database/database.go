package database

import (
	"database/sql"
	"fmt"
	"log"

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

	log.Println("Database initialized successfully")
	return db, nil
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
