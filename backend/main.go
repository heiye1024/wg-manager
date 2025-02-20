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

// 解析 WireGuard 输出
func parseWireGuardOutput(output string) map[string]interface{} {
	// 存储接口的相关数据
	result := make(map[string]interface{})
	interfaces := strings.Split(output, "\n\n") // 按接口分割

	// 解析每个接口的相关信息
	for _, iface := range interfaces {
		if iface == "" {
			continue
		}

		// 分割每个接口的行
		lines := strings.Split(iface, "\n")
		interfaceInfo := make(map[string]interface{}) // 使用 interface{} 来支持不同类型
		var peers []map[string]string                 // 用来存储对等端信息

		// 解析接口的字段
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
				peerInfo := make(map[string]string)
				peerInfo["Peer Public Key"] = strings.TrimPrefix(line, "peer: ")

				// 继续读取接下来的对等端信息
				for j := i + 1; j < len(lines); j++ {
					peerLine := strings.TrimSpace(lines[j])

					// 找到下一个 peer，退出当前 peer 的解析
					if strings.HasPrefix(peerLine, "peer:") {
						break
					}

					if strings.HasPrefix(peerLine, "endpoint:") {
						peerInfo["Peer Endpoint"] = strings.TrimPrefix(peerLine, "endpoint: ")
					} else if strings.HasPrefix(peerLine, "allowed ips:") {
						peerInfo["Allowed IPs"] = strings.TrimPrefix(peerLine, "allowed ips: ")
					} else if strings.HasPrefix(peerLine, "latest handshake:") {
						peerInfo["Latest Handshake"] = strings.TrimPrefix(peerLine, "latest handshake: ")
					} else if strings.HasPrefix(peerLine, "transfer:") {
						peerInfo["Transfer"] = strings.TrimPrefix(peerLine, "transfer: ")
					} else if strings.HasPrefix(peerLine, "persistent keepalive:") {
						peerInfo["Persistent Keepalive"] = strings.TrimPrefix(peerLine, "persistent keepalive: ")
					}
				}
				peers = append(peers, peerInfo)
			}
		}

		// 将接口信息和 Peer 信息一起加入到 result 中
		interfaceInfo["Peers"] = peers

		// 检查接口名称是否存在，如果没有则跳过
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
	output, err := cmd.Output()
	if err != nil {
		log.Println("Error retrieving WireGuard interface:", err)
		c.JSON(500, gin.H{"error": "Failed to retrieve WireGuard interface"})
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
