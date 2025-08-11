"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Activity, Cpu, HardDrive, MemoryStick, Network, Clock } from "lucide-react"

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

interface StatusMonitorProps {
  status: SystemStatus | null
}

export function StatusMonitor({ status }: StatusMonitorProps) {
  const formatBytes = (bytes: number) => {
    if (bytes === 0) return "0 B"
    const k = 1024
    const sizes = ["B", "KB", "MB", "GB", "TB"]
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return `${Number.parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`
  }

  if (!status) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground">无法加载系统状态</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">系统状态</h2>
        <p className="text-muted-foreground">监控 WireGuard 服务和系统性能</p>
      </div>

      {/* WireGuard Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Network className="h-5 w-5" />
            <span>WireGuard 服务</span>
          </CardTitle>
          <CardDescription>VPN 服务状态和统计信息</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">服务状态</p>
              <Badge variant={status.wireguard.status === "running" ? "default" : "secondary"}>
                {status.wireguard.status === "running" ? "运行中" : "已停止"}
              </Badge>
            </div>
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">版本</p>
              <p className="font-mono text-sm">{status.wireguard.version}</p>
            </div>
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">接口数量</p>
              <p className="text-2xl font-bold">{status.wireguard.interfaces}</p>
            </div>
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">活跃对等设备</p>
              <p className="text-2xl font-bold">
                {status.wireguard.active_peers}/{status.wireguard.total_peers}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* System Performance */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Activity className="h-5 w-5" />
            <span>系统性能</span>
          </CardTitle>
          <CardDescription>服务器资源使用情况</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            <div className="space-y-3">
              <div className="flex items-center space-x-2">
                <Cpu className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">CPU 使用率</span>
              </div>
              <Progress value={status.system.cpu_usage} className="h-2" />
              <p className="text-sm text-muted-foreground">{status.system.cpu_usage}%</p>
            </div>
            <div className="space-y-3">
              <div className="flex items-center space-x-2">
                <MemoryStick className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">内存使用率</span>
              </div>
              <Progress value={status.system.memory_usage} className="h-2" />
              <p className="text-sm text-muted-foreground">{status.system.memory_usage}%</p>
            </div>
            <div className="space-y-3">
              <div className="flex items-center space-x-2">
                <HardDrive className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">磁盘使用率</span>
              </div>
              <Progress value={status.system.disk_usage} className="h-2" />
              <p className="text-sm text-muted-foreground">{status.system.disk_usage}%</p>
            </div>
          </div>
          <div className="mt-6 pt-6 border-t">
            <div className="flex items-center space-x-2 mb-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">系统运行时间</span>
            </div>
            <p className="text-lg font-mono">{status.system.uptime}</p>
          </div>
        </CardContent>
      </Card>

      {/* Network Statistics */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Network className="h-5 w-5" />
            <span>网络统计</span>
          </CardTitle>
          <CardDescription>网络流量和数据包统计</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">接收字节</p>
              <p className="text-xl font-bold">{formatBytes(status.network.bytes_received)}</p>
            </div>
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">发送字节</p>
              <p className="text-xl font-bold">{formatBytes(status.network.bytes_sent)}</p>
            </div>
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">接收数据包</p>
              <p className="text-xl font-bold">{status.network.packets_received.toLocaleString()}</p>
            </div>
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">发送数据包</p>
              <p className="text-xl font-bold">{status.network.packets_sent.toLocaleString()}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
