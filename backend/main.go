package main

import (
	"log"
	"os"
	"os/exec"
	"strings"

	"github.com/gin-gonic/gin"
)

type PeerConfig struct {
	PublicKey      string `json:"peer_public_key"`
	Endpoint       string `json:"peer_endpoint"`
	AllowedIPs     string `json:"peer_allowed_ips"`
	PersistentKeep string `json:"peer_persistent_keepalive,omitempty"` // 可选
}

// WireGuard 配置结构体
type WireGuardConfig struct {
	InterfaceName  string       `json:"interface_name"`
	PrivateKey     string       `json:"private_key"`
	PublicKey      string       `json:"public_key"`
	Address        string       `json:"address"`
	PeerPublicKey  string       `json:"peer_public_key"`
	PeerEndpoint   string       `json:"peer_endpoint"`
	PeerAllowedIPs string       `json:"peer_allowed_ips"`
	Peers          []PeerConfig `json:"peers"`
}

// 解析 WireGuard 输出
func parseWireGuardOutput(output string) map[string]interface{} {
	result := make(map[string]interface{})

	// 先把整个输出分成多个块，每块代表一个 interface 加它下面的 peer
	blocks := strings.Split(output, "\n\n")

	for _, blk := range blocks {
		blk = strings.TrimSpace(blk)
		if blk == "" {
			continue
		}

		lines := strings.Split(blk, "\n")
		interfaceInfo := make(map[string]interface{})

		// 初始化 peers 列表
		peers := make([]map[string]string, 0)
		var currentPeer map[string]string

		for _, raw := range lines {
			line := strings.TrimSpace(raw)

			switch {
			case strings.HasPrefix(line, "interface:"):
				// 如果上一个 peer 还没添加，就先加进去
				if currentPeer != nil {
					peers = append(peers, currentPeer)
					currentPeer = nil
				}
				interfaceInfo["Interface"] = strings.TrimSpace(strings.TrimPrefix(line, "interface:"))

			case strings.HasPrefix(line, "public key:"):
				interfaceInfo["Public Key"] = strings.TrimSpace(strings.TrimPrefix(line, "public key:"))

			case strings.HasPrefix(line, "listening port:"):
				interfaceInfo["Listening Port"] = strings.TrimSpace(strings.TrimPrefix(line, "listening port:"))

			case strings.HasPrefix(line, "peer:"):
				// 新开一个 peer 结构，先把上一个加进去
				if currentPeer != nil {
					peers = append(peers, currentPeer)
				}
				currentPeer = map[string]string{
					"Public Key": strings.TrimSpace(strings.TrimPrefix(line, "peer:")),
				}

			default:
				// 如果正在解析一个 peer，就继续往里填字段
				if currentPeer != nil {
					switch {
					case strings.HasPrefix(line, "endpoint:"):
						currentPeer["Endpoint"] = strings.TrimSpace(strings.TrimPrefix(line, "endpoint:"))
					case strings.HasPrefix(line, "allowed ips:"):
						currentPeer["Allowed IPs"] = strings.TrimSpace(strings.TrimPrefix(line, "allowed ips:"))
					case strings.HasPrefix(line, "latest handshake:"):
						currentPeer["Latest Handshake"] = strings.TrimSpace(strings.TrimPrefix(line, "latest handshake:"))
					case strings.HasPrefix(line, "transfer:"):
						currentPeer["Transfer"] = strings.TrimSpace(strings.TrimPrefix(line, "transfer:"))
					case strings.HasPrefix(line, "persistent keepalive:"):
						currentPeer["Persistent Keepalive"] = strings.TrimSpace(strings.TrimPrefix(line, "persistent keepalive:"))
					}
				}
			}
		}

		// 循环结束后，别忘了把最后一个 peer 加进去
		if currentPeer != nil {
			peers = append(peers, currentPeer)
		}

		// 把 peers 放到接口信息里
		interfaceInfo["Peers"] = peers

		// 用接口名作为 key
		if name, ok := interfaceInfo["Interface"].(string); ok && name != "" {
			result[name] = interfaceInfo
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

//  解析 wg show 的输出
func parseWireGuardDump(output string) map[string]interface{} {
	result := make(map[string]interface{})
	peers := make([]map[string]string, 0)

	lines := strings.Split(strings.TrimSpace(output), "\n")
	for idx, line := range lines {
		cols := strings.Fields(line)
		// 跳过接口自身的那一行（通常只有 4 列），只解析 Peer（至少 8 列）
		if idx == 0 || len(cols) < 8 {
			continue
		}
		// 解析 Peer
		peer := map[string]string{
			"PublicKey":           cols[0],
			"PresharedKey":        cols[1],
			"Endpoint":            cols[2],
			"AllowedIPs":          cols[3],
			"LatestHandshake":     cols[4], // Unix 时间戳
			"ReceiveBytes":        cols[5],
			"TransmitBytes":       cols[6],
			"PersistentKeepalive": cols[7],
		}
		peers = append(peers, peer)
	}

	result["Peers"] = peers
	return result
}

// 添加 WireGuard 配置
func addWireGuard(c *gin.Context) {
	var wgConfig WireGuardConfig
	if err := c.ShouldBindJSON(&wgConfig); err != nil {
		c.JSON(400, gin.H{"error": "Invalid configuration"})
		return
	}

	iface := wgConfig.InterfaceName

	// 1. 新建 WireGuard 接口
	if out, err := exec.Command("ip", "link", "add", "dev", iface, "type", "wireguard").CombinedOutput(); err != nil {
		log.Printf("ip link add 错误: %v\n输出: %s", err, string(out))
		c.JSON(500, gin.H{"error": "Failed to create interface", "detail": string(out)})
		return
	}

	// 2. 分配地址
	if out, err := exec.Command("ip", "address", "add", wgConfig.Address, "dev", iface).CombinedOutput(); err != nil {
		log.Printf("ip addr add 错误: %v\n输出: %s", err, string(out))
		c.JSON(500, gin.H{"error": "Failed to assign address", "detail": string(out)})
		return
	}

	// 3. 将接口置为 up
	if out, err := exec.Command("ip", "link", "set", "up", "dev", iface).CombinedOutput(); err != nil {
		log.Printf("ip link set up 错误: %v\n输出: %s", err, string(out))
		c.JSON(500, gin.H{"error": "Failed to bring interface up", "detail": string(out)})
		return
	}

	// 4. 写私钥到临时文件，供 wg set 使用
	tmpFile, err := os.CreateTemp("", iface+"-key-*.tmp")
	if err != nil {
		log.Println("CreateTemp 错误:", err)
		c.JSON(500, gin.H{"error": "Internal server error"})
		return
	}
	defer func() {
		tmpFile.Close()
		os.Remove(tmpFile.Name())
	}()
	if _, err := tmpFile.WriteString(wgConfig.PrivateKey); err != nil {
		log.Println("写私钥文件错误:", err)
		c.JSON(500, gin.H{"error": "Internal server error"})
		return
	}

	// 5. 设置私钥
	if out, err := exec.Command("wg", "set", iface,
		"private-key", tmpFile.Name()).CombinedOutput(); err != nil {
		log.Printf("wg set private-key 错误: %v\n输出: %s", err, string(out))
		c.JSON(500, gin.H{"error": "Failed to set private key", "detail": string(out)})
		return
	}

	// 6. 设置对端 Peer
	if out, err := exec.Command("wg", "set", iface,
		"peer", wgConfig.PeerPublicKey,
		"endpoint", wgConfig.PeerEndpoint,
		"allowed-ips", wgConfig.PeerAllowedIPs,
	).CombinedOutput(); err != nil {
		log.Printf("wg set peer 错误: %v\n输出: %s", err, string(out))
		c.JSON(500, gin.H{"error": "Failed to add peer", "detail": string(out)})
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
	iface := c.Param("interface_name")
	if iface == "" {
		c.JSON(400, gin.H{"error": "Interface name is required"})
		return
	}

	// 1. 用 wg show 拿接口状态
	outStatus, err := exec.Command("wg", "show", iface).CombinedOutput()
	if err != nil {
		log.Printf("wg show %s 错误: %v\n输出: %s", iface, err, string(outStatus))
		c.JSON(500, gin.H{"error": "Failed to retrieve interface status", "detail": string(outStatus)})
		return
	}
	// parseWireGuardOutput 返回的是 map[string]interface{}，key 是接口名
	statusMapAll := parseWireGuardOutput(string(outStatus))
	// 拿到 statusMap，例如 statusMapAll["wg0"]
	statusMapIface, ok := statusMapAll[iface].(map[string]interface{})
	if !ok {
		c.JSON(500, gin.H{"error": "Failed to parse interface status"})
		return
	}

	// 2. 用 wg show dump 拿 Peers
	outDump, err := exec.Command("wg", "show", iface, "dump").CombinedOutput()
	if err != nil {
		log.Printf("wg show %s dump 错误: %v\n输出: %s", iface, err, string(outDump))
		// 出错时仍返回状态，只把 Peers 设成空
		statusMapIface["Peers"] = []map[string]string{}
	} else {
		dumpMap := parseWireGuardDump(string(outDump))
		statusMapIface["Peers"] = dumpMap["Peers"]
	}

	// 3. 把这个接口的结果放到 data 下
	c.JSON(200, gin.H{
		"data": map[string]interface{}{
			iface: statusMapIface,
		},
	})
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
