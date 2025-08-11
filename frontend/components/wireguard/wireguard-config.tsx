"use client"

import { useState, useEffect } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { InterfaceManager } from "@/components/wireguard/interface-manager"
import { PeerManager } from "@/components/wireguard/peer-manager"
import { StatusMonitor } from "@/components/wireguard/status-monitor"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Loader2, Shield, Users, Network } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { LoadingState } from "@/components/common/loading-state"
import { wireguardApi } from "@/lib/api"

interface WireGuardInterface {
  id: string
  name: string
  status: string
  listen_port: number
  address: string
  public_key: string
  peers_count: number
}

interface WireGuardPeer {
  id: string
  interface_id: string
  name: string
  allowed_ips: string
  endpoint: string
  persistent_keepalive: number
  status: string
  last_handshake: string
  bytes_received: number
  bytes_sent: number
}

interface SystemStatus {
  wireguard: {
    version: string
    status: string
    interfaces: number
    active_peers: number
    total_peers: number
  }
  system: {
    uptime: string
    cpu_usage: number
    memory_usage: number
    disk_usage: number
  }
  network: {
    bytes_received: number
    bytes_sent: number
    packets_received: number
    packets_sent: number
  }
}

export function WireguardConfig() {
  const [interfaces, setInterfaces] = useState<WireGuardInterface[]>([])
  const [peers, setPeers] = useState<WireGuardPeer[]>([])
  const [status, setStatus] = useState<SystemStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState("overview")
  const { toast } = useToast()
  const wgStatus = status?.wireguard?.status ?? "unknown"
  const isRunning = wgStatus === "running"
  const cpuUsage = status?.system?.cpu_usage ?? 0
  const wgVersion = status?.wireguard?.version ?? "未知"

  const loadData = async () => {
    try {
      setLoading(true);

      // 1) 先拿接口列表
      const interfacesRes = await wireguardApi.getInterfaces();
      if (!interfacesRes.success) throw new Error(interfacesRes.message || "Failed to load interfaces");
      const interfacesData = interfacesRes.data;
      setInterfaces(interfacesData);

      // 2) 选一个接口 id（比如第一个）。注意把 number 转成 string
      const firstId = interfacesData[0]?.id ? String(interfacesData[0].id) : undefined;

      // 3) 再并发拿 peers 和 对应接口的 status（允许没有接口时优雅降级）
      const [peersRes, statusRes] = await Promise.all([
        wireguardApi.getPeers(),
        firstId ? wireguardApi.getServerStatus(firstId) : Promise.resolve({ success: true, data: null }),
      ]);

      if (!peersRes.success) throw new Error(peersRes.message || "Failed to load peers");
      setPeers(peersRes.data);

      if (statusRes && statusRes.success) {
        setStatus(statusRes.data); // 可能是 null（当没有接口时）
      }
    } catch (error) {
      console.error("Failed to load data:", error);
      toast({
        title: "错误",
        description: `无法加载 WireGuard 配置: ${error instanceof Error ? error.message : String(error)}`,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData()
  }, [])

  const handleDataChange = () => {
    loadData()
  }

  if (loading) {
    return <LoadingState message="正在加载 WireGuard 配置..." />
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">WireGuard 配置</h1>
        <p className="text-muted-foreground">管理 WireGuard VPN 接口和对等设备连接</p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">概览</TabsTrigger>
          <TabsTrigger value="interfaces">接口管理</TabsTrigger>
          <TabsTrigger value="peers">对等设备</TabsTrigger>
          <TabsTrigger value="status">系统状态</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">接口总数</CardTitle>
                <Network className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{interfaces.length}</div>
                <p className="text-xs text-muted-foreground">
                  {interfaces.filter((i) => i.status === "running").length} 个运行中
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">对等设备</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{peers.length}</div>
                <p className="text-xs text-muted-foreground">
                  {peers.filter((p) => p.status === "connected").length} 个已连接
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">服务状态</CardTitle>
                <Shield className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="flex items-center space-x-2">
                  <Badge variant={isRunning ? "default" : "secondary"}>
                    {isRunning ? "运行中" : "已停止"}}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground mt-1">版本 {wgVersion}</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">系统负载</CardTitle>
                <Loader2 className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{cpuUsage}%</div>
                <p className="text-xs text-muted-foreground">CPU 使用率</p>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>最近接口</CardTitle>
                <CardDescription>最新的 WireGuard 接口状态</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {interfaces.slice(0, 3).map((iface) => (
                    <div key={iface.id} className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <div
                          className={`w-2 h-2 rounded-full ${
                            iface.status === "running" ? "bg-green-500" : "bg-gray-400"
                          }`}
                        />
                        <span className="font-medium">{iface.name}</span>
                      </div>
                      <Badge variant={iface.status === "running" ? "default" : "secondary"}>
                        {iface.status === "running" ? "运行中" : "已停止"}
                      </Badge>
                    </div>
                  ))}
                  {interfaces.length === 0 && <p className="text-sm text-muted-foreground">暂无配置的接口</p>}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>活跃对等设备</CardTitle>
                <CardDescription>当前已连接的对等设备</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {peers
                    .filter((p) => p.status === "connected")
                    .slice(0, 3)
                    .map((peer) => (
                      <div key={peer.id} className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <div className="w-2 h-2 rounded-full bg-green-500" />
                          <span className="font-medium">{peer.name}</span>
                        </div>
                        <span className="text-sm text-muted-foreground">{peer.allowed_ips}</span>
                      </div>
                    ))}
                  {peers.filter((p) => p.status === "connected").length === 0 && (
                    <p className="text-sm text-muted-foreground">暂无活跃的对等设备</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="interfaces">
          <InterfaceManager interfaces={interfaces} onInterfacesChange={handleDataChange} />
        </TabsContent>

        <TabsContent value="peers">
          <PeerManager
            interfaces={interfaces.map((i) => ({ id: i.id, name: i.name, public_key: i.public_key }))}
            onPeersChange={handleDataChange}
          />
        </TabsContent>

        <TabsContent value="status">
          <StatusMonitor status={status} />
        </TabsContent>
      </Tabs>
    </div>
  )
}
