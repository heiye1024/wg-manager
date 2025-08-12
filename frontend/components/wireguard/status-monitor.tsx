"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Shield, Cpu, MemoryStick, HardDrive, Network, Clock, Users, RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useToast } from "@/hooks/use-toast"
import { statusApi } from "@/lib/api"
import { LoadingState } from "@/components/common/loading-state"

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
  status?: SystemStatus | null
}

export function StatusMonitor({ status: propStatus }: StatusMonitorProps) {
  const [status, setStatus] = useState<SystemStatus | null>(propStatus || null)
  const [loading, setLoading] = useState(!propStatus)
  const [refreshing, setRefreshing] = useState(false)
  const { toast } = useToast()

  const loadStatus = async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true)
      } else {
        setLoading(true)
      }

      const response = await statusApi.getStatus()

      if (response.data.success) {
        setStatus(response.data.data)
      } else {
        throw new Error(response.data.error || "获取状态失败")
      }
    } catch (error) {
      console.error("Failed to load status:", error)
      toast({
        title: "错误",
        description: "无法获取系统状态",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    if (!propStatus) {
      loadStatus()
    }
  }, [propStatus])

  const handleRefresh = () => {
    loadStatus(true)
  }

  if (loading) {
    return <LoadingState message="正在加载系统状态..." />
  }

  if (!status) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <Shield className="mx-auto h-12 w-12 mb-4" />
        <h3 className="text-lg font-medium mb-2">无法获取系统状态</h3>
        <p className="mb-4">请检查 WireGuard 服务是否运行正常。</p>
        <Button onClick={() => loadStatus()} variant="outline">
          <RefreshCw className="h-4 w-4 mr-2" />
          重试
        </Button>
      </div>
    )
  }

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return "0 B"
    const k = 1024
    const sizes = ["B", "KB", "MB", "GB", "TB"]
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return `${Number.parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">系统状态</h2>
          <p className="text-muted-foreground">WireGuard 服务和系统资源监控</p>
        </div>
        <Button onClick={handleRefresh} variant="outline" disabled={refreshing}>
          <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? "animate-spin" : ""}`} />
          刷新
        </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">WireGuard 服务状态</CardTitle>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold capitalize">{status.wireguard.status}</div>
            <p className="text-xs text-muted-foreground">版本: {status.wireguard.version}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">接口数量</CardTitle>
            <Network className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{status.wireguard.interfaces}</div>
            <p className="text-xs text-muted-foreground">活动接口</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">对等设备数量</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {status.wireguard.active_peers}/{status.wireguard.total_peers}
            </div>
            <p className="text-xs text-muted-foreground">活跃/总数</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>系统资源</CardTitle>
          <CardDescription>服务器的 CPU、内存和磁盘使用情况</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Cpu className="h-5 w-5 text-blue-500" />
              <span className="font-medium">CPU 使用率</span>
            </div>
            <span className="text-lg font-bold">{status.system.cpu_usage}%</span>
          </div>
          <Progress value={status.system.cpu_usage} className="h-2" />

          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <MemoryStick className="h-5 w-5 text-purple-500" />
              <span className="font-medium">内存使用率</span>
            </div>
            <span className="text-lg font-bold">{status.system.memory_usage}%</span>
          </div>
          <Progress value={status.system.memory_usage} className="h-2" />

          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <HardDrive className="h-5 w-5 text-green-500" />
              <span className="font-medium">磁盘使用率</span>
            </div>
            <span className="text-lg font-bold">{status.system.disk_usage}%</span>
          </div>
          <Progress value={status.system.disk_usage} className="h-2" />

          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Clock className="h-5 w-5 text-orange-500" />
              <span className="font-medium">系统运行时间</span>
            </div>
            <span className="text-lg font-bold">{status.system.uptime}</span>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>网络流量</CardTitle>
          <CardDescription>WireGuard 接口的总接收和发送字节数</CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-4 border rounded-lg flex items-center justify-between bg-blue-50 dark:bg-blue-950">
            <div className="flex items-center space-x-3">
              <Network className="h-6 w-6 text-blue-600" />
              <span className="font-medium text-blue-800 dark:text-blue-200">总接收</span>
            </div>
            <span className="text-2xl font-bold text-blue-800 dark:text-blue-200">
              {formatBytes(status.network.bytes_received)}
            </span>
          </div>
          <div className="p-4 border rounded-lg flex items-center justify-between bg-amber-50 dark:bg-amber-950">
            <div className="flex items-center space-x-3">
              <Network className="h-6 w-6 text-amber-600" />
              <span className="font-medium text-amber-800 dark:text-amber-200">总发送</span>
            </div>
            <span className="text-2xl font-bold text-amber-800 dark:text-amber-200">
              {formatBytes(status.network.bytes_sent)}
            </span>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
