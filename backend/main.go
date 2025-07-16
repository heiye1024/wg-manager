package main

import (
	"log"
	"os/exec"
	"strings"

	"github.com/gin-gonic/gin"
)

// WireGuard 配置结构体
type WireGuardConfig struct {
	InterfaceName  string `json:"interface_name"`
	PrivateKey     string `json:"private_key"`
	PublicKey      string `json:"public_key"`
	Address        string `json:"address"`
	PeerPublicKey  string `json:"peer_public_key"`
	PeerEndpoint   string `json:"peer_endpoint"`
	PeerAllowedIPs string `json:"peer_allowed_ips"`
}

type ConfigResult struct {
	Interface map[string]string   `json:"interface"`
	Peers     []map[string]string `json:"peers"`
}

// 解析 WireGuard 输出
// 解析 wg show 输出
func parseWireGuardOutput(output string) map[string]interface{} {
	result := make(map[string]interface{})
	interfaces := strings.Split(output, "\n\n") // 按接口分割

	for _, iface := range interfaces {
		if iface == "" {
			continue
		}

		lines := strings.Split(iface, "\n")
		interfaceInfo := make(map[string]interface{})
		var peers []map[string]string

		var currentPeer map[string]string
		for i := 0; i < len(lines); i++ {
			line := strings.TrimSpace(lines[i])

			if strings.HasPrefix(line, "interface:") {
				interfaceInfo["Interface"] = strings.TrimPrefix(line, "interface: ")
			} else if strings.HasPrefix(line, "public key:") {
				interfaceInfo["Public Key"] = strings.TrimPrefix(line, "public key: ")
			} else if strings.HasPrefix(line, "listening port:") {
				interfaceInfo["Listening Port"] = strings.TrimPrefix(line, "listening port: ")
			} else if strings.HasPrefix(line, "peer:") {
				// 解析 Peer
				if currentPeer != nil {
					peers = append(peers, currentPeer)
				}
				currentPeer = make(map[string]string)
				currentPeer["Public Key"] = strings.TrimPrefix(line, "peer: ")
			} else if currentPeer != nil {
				// 解析 Peer 其他字段
				if strings.HasPrefix(line, "endpoint:") {
					currentPeer["Endpoint"] = strings.TrimPrefix(line, "endpoint: ")
				} else if strings.HasPrefix(line, "allowed ips:") {
					currentPeer["Allowed IPs"] = strings.TrimPrefix(line, "allowed ips: ")
				} else if strings.HasPrefix(line, "latest handshake:") {
					currentPeer["Latest Handshake"] = strings.TrimPrefix(line, "latest handshake: ")
				} else if strings.HasPrefix(line, "transfer:") {
					currentPeer["Transfer"] = strings.TrimPrefix(line, "transfer: ")
				} else if strings.HasPrefix(line, "persistent keepalive:") {
					currentPeer["Persistent Keepalive"] = strings.TrimPrefix(line, "persistent keepalive: ")
				}
			}
		}

		// 添加最后一个 Peer
		if currentPeer != nil {
			peers = append(peers, currentPeer)
		}

		// 将接口和 Peers 添加到结果中
		interfaceInfo["Peers"] = peers
		if ifaceName, ok := interfaceInfo["Interface"].(string); ok {
			result[ifaceName] = interfaceInfo
		} else {
			log.Println("Error: Interface name missing")
		}
	}

	return result
}

// parsePeerInfo 解析单个 Peer 信息
func parsePeerInfo(lines []string, startIdx int) map[string]string {
	peerInfo := make(map[string]string)
	peerInfo["public_key"] = strings.TrimPrefix(lines[startIdx], "peer: ")

	for j := startIdx + 1; j < len(lines); j++ {
		line := strings.TrimSpace(lines[j])
		if strings.HasPrefix(line, "peer:") || line == "" {
			break
		}

		switch {
		case strings.HasPrefix(line, "endpoint:"):
			peerInfo["endpoint"] = strings.TrimPrefix(line, "endpoint: ")
		case strings.HasPrefix(line, "allowed ips:"):
			peerInfo["allowed_ips"] = strings.TrimPrefix(line, "allowed ips: ")
		case strings.HasPrefix(line, "latest handshake:"):
			peerInfo["latest_handshake"] = strings.TrimPrefix(line, "latest handshake: ")
		case strings.HasPrefix(line, "transfer:"):
			peerInfo["transfer"] = strings.TrimPrefix(line, "transfer: ")
		case strings.HasPrefix(line, "persistent keepalive:"):
			peerInfo["persistent_keepalive"] = strings.TrimPrefix(line, "persistent keepalive: ")
		}
	}
	return peerInfo
}

// 添加 WireGuard 配置
func addWireGuard(c *gin.Context) {
	var wgConfig WireGuardConfig
	if err := c.ShouldBindJSON(&wgConfig); err != nil {
		c.JSON(400, gin.H{"error": "Invalid configuration"})
		return
	}

	// 设置 WireGuard 接口
	cmd := exec.Command("wg", "set", wgConfig.InterfaceName, "private-key", wgConfig.PrivateKey, "address", wgConfig.Address)
	err := cmd.Run()
	if err != nil {
		log.Println("Error adding WireGuard interface:", err)
		c.JSON(500, gin.H{"error": "Failed to add WireGuard interface"})
		return
	}

	// 设置对等端
	cmdPeer := exec.Command("wg", "set", wgConfig.InterfaceName, "peer", wgConfig.PeerPublicKey, "endpoint", wgConfig.PeerEndpoint, "allowed-ips", wgConfig.PeerAllowedIPs)
	errPeer := cmdPeer.Run()
	if errPeer != nil {
		log.Println("Error adding WireGuard peer:", errPeer)
		c.JSON(500, gin.H{"error": "Failed to add WireGuard peer"})
		return
	}

	c.JSON(200, gin.H{"status": "WireGuard interface added successfully"})
}

// 获取 WireGuard 配置信息
func getAllWireGuard(c *gin.Context) {
	// 执行 wg show 命令
	cmd := exec.Command("wg", "show")
	output, err := cmd.CombinedOutput() // 使用 CombinedOutput() 来捕获 stderr 和 stdout
	if err != nil {
		log.Printf("Error retrieving WireGuard interface: %v\nOutput: %s", err, output)
		c.JSON(500, gin.H{"error": "Failed to retrieve WireGuard interface"})
		return
	}

	// 解析输出
	parsedOutput := parseWireGuardOutput(string(output))

	// 返回接口信息
	c.JSON(200, gin.H{"data": parsedOutput})
}

func getWireGuard(c *gin.Context) {
	interfaceName := c.Param("interface_name")
	if interfaceName == "" {
		c.JSON(400, gin.H{"error": "Interface name is required"})
		return
	}

	// 获取 WireGuard 接口信息
	cmd := exec.Command("wg", "show", interfaceName)
	output, err := cmd.CombinedOutput()
	if err != nil {
		log.Printf("Error retrieving WireGuard interface: %v\nOutput: %s", err, string(output))
		c.JSON(500, gin.H{"error": "Failed to retrieve WireGuard interface", "detail": string(output)})
		return
	}

	result := parseWireGuardOutput(string(output))

	// 返回接口信息
	c.JSON(200, gin.H{"data": result})
}

// 更新 WireGuard 配置
func updateWireGuard(c *gin.Context) {
	var wgConfig WireGuardConfig
	if err := c.ShouldBindJSON(&wgConfig); err != nil {
		c.JSON(400, gin.H{"error": "Invalid configuration"})
		return
	}

	// 更新 WireGuard 配置
	cmd := exec.Command("wg", "set", wgConfig.InterfaceName, "private-key", wgConfig.PrivateKey, "address", wgConfig.Address)
	err := cmd.Run()
	if err != nil {
		log.Println("Error updating WireGuard interface:", err)
		c.JSON(500, gin.H{"error": "Failed to update WireGuard interface"})
		return
	}

	// 更新对等端
	cmdPeer := exec.Command("wg", "set", wgConfig.InterfaceName, "peer", wgConfig.PeerPublicKey, "endpoint", wgConfig.PeerEndpoint, "allowed-ips", wgConfig.PeerAllowedIPs)
	errPeer := cmdPeer.Run()
	if errPeer != nil {
		log.Println("Error updating WireGuard peer:", errPeer)
		c.JSON(500, gin.H{"error": "Failed to update WireGuard peer"})
		return
	}

	c.JSON(200, gin.H{"status": "WireGuard interface updated successfully"})
}

// 删除 WireGuard 配置
func deleteWireGuard(c *gin.Context) {
	interfaceName := c.Param("interface_name")
	if interfaceName == "" {
		c.JSON(400, gin.H{"error": "Interface name is required"})
		return
	}

	// 删除 WireGuard 配置
	cmd := exec.Command("wg", "set", interfaceName, "remove")
	err := cmd.Run()
	if err != nil {
		log.Println("Error deleting WireGuard interface:", err)
		c.JSON(500, gin.H{"error": "Failed to delete WireGuard interface"})
		return
	}

	c.JSON(200, gin.H{"status": "WireGuard interface deleted successfully"})
}

func main() {
	r := gin.Default()

	// 添加 WireGuard 配置的 APIbrew
	r.POST("/add-wireguard", addWireGuard)

	// 获取 WireGuard 配置的 API
	r.GET("/get-wireguard", getAllWireGuard)

	// 获取指定 WireGuard 接口的配置信息的 API
	r.GET("/get-wireguard/:interface_name", getWireGuard)

	// 更新 WireGuard 配置的 API
	r.PUT("/update-wireguard", updateWireGuard)

	// 删除 WireGuard 配置的 API
	r.DELETE("/delete-wireguard/:interface_name", deleteWireGuard)

	r.Run(":8080")
}
