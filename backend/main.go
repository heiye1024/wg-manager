package main

import (
	"log"
	"os/exec"
)

func main() {
	// 设置 WireGuard 接口
	cmd := exec.Command("wg", "set", "wg0", "private-key", "/etc/wireguard/privatekey")
	err := cmd.Run()
	if err != nil {
		log.Fatalf("Failed to set WireGuard private key: %v", err)
	}

	// 添加对等方配置
	cmd = exec.Command("wg", "set", "wg0", "peer", "PEER_PUBLIC_KEY", "endpoint", "PEER_ENDPOINT", "allowed-ips", "10.0.0.2/32")
	err = cmd.Run()
	if err != nil {
		log.Fatalf("Failed to add WireGuard peer: %v", err)
	}

	// 启动 WireGuard 接口
	cmd = exec.Command("ip", "link", "set", "wg0", "up")
	err = cmd.Run()
	if err != nil {
		log.Fatalf("Failed to bring WireGuard interface up: %v", err)
	}

	log.Println("WireGuard interface wg0 is up and running")
}
