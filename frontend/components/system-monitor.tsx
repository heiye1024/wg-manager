"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { RefreshCw, AlertTriangle, CheckCircle, Activity } from "lucide-react"

type SystemMetrics = {
  cpu: {
    usage: number
    cores: number
    temperature: number
  }
  memory: {
    used: number
    total: number
    usage: number
  }
  disk: {
    used: number
    total: number
    usage: number
  }
  network: {
    upload: number
    download: number
    connections: number
  }
  uptime: string
  loadAverage: number[]
}

export function SystemMonitor() {
  const [metrics, setMetrics] = useState<SystemMetrics>({
    cpu: { usage: 0, cores: 8, temperature: 0 },
    memory: { used: 0, total: 16, usage: 0 },
    disk: { used: 0, total: 500, usage: 0 },
    network: { upload: 0, download: 0, connections: 0 },
    uptime: "0天 0小时 0分钟",
    loadAverage: [0, 0, 0],
  })

  const [loading, setLoading] = useState(false)

  const generateMockMetrics = (): SystemMetrics => {
    const cpuUsage = Math.random() * 80 + 10
    const memoryUsed = Math.random() * 12 + 2
    const diskUsed = Math.random() * 300 + 100

    return {
      cpu: {
        usage: cpuUsage,
        cores: 8,
        temperature: Math.random() * 20 + 45,
      },
      memory: {
        used: memoryUsed,
        total: 16,
        usage: (memoryUsed / 16) * 100,
      },
      disk: {
        used: diskUsed,
        total: 500,
        usage: (diskUsed / 500) * 100,
      },
      network: {
        upload: Math.random() * 50 + 5,
        download: Math.random() * 100 + 10,
        connections: Math.floor(Math.random() * 200) + 50,
      },
      uptime: "15天 8小时 32分钟",
      loadAverage: [Math.random() * 2 + 0.5, Math.random() * 2 + 0.5, Math.random() * 2 + 0.5],
    }
  }

  const refreshMetrics = async () => {
    setLoading(true)
    // 模拟API调用延迟
    setTimeout(() => {
      setMetrics(generateMockMetrics())
      setLoading(false)
    }, 1000)
  }

  useEffect(() => {
    // 初始加载
    setMetrics(generateMockMetrics())

    // 每30秒自动刷新
    const interval = setInterval(() => {
      setMetrics(generateMockMetrics())
    }, 30000)

    return () => clearInterval(interval)
  }, [])

  const getStatusColor = (usage: number) => {
    if (usage < 50) return "text-green-500"
    if (usage < 80) return "text-yellow-500"
    return "text-red-500"
  }

  const getStatusIcon = (usage: number) => {
    if (usage < 50) return <CheckCircle className="h-4 w-4 text-green-500" />
    if (usage < 80) return <AlertTriangle className="h-4 w-4 text-yellow-500" />
    return <AlertTriangle className="h-4 w-4 text-red-500" />
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              系统监控
            </CardTitle>
            <CardDescription>实时系统性能监控</CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={refreshMetrics} disabled={loading}>
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* CPU 监控 */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="font-medium">CPU 使用率</span>
              {getStatusIcon(metrics.cpu.usage)}
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline">{metrics.cpu.cores} 核心</Badge>
              <span className={`font-mono ${getStatusColor(metrics.cpu.usage)}`}>{metrics.cpu.usage.toFixed(1)}%</span>
            </div>
          </div>
          <Progress value={metrics.cpu.usage} className="h-2" />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>温度: {metrics.cpu.temperature.toFixed(1)}°C</span>
            <span>负载: {metrics.loadAverage.map((l) => l.toFixed(2)).join(", ")}</span>
          </div>
        </div>

        {/* 内存监控 */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="font-medium">内存使用</span>
              {getStatusIcon(metrics.memory.usage)}
            </div>
            <span className={`font-mono ${getStatusColor(metrics.memory.usage)}`}>
              {metrics.memory.used.toFixed(1)} / {metrics.memory.total} GB
            </span>
          </div>
          <Progress value={metrics.memory.usage} className="h-2" />
          <div className="text-xs text-muted-foreground">使用率: {metrics.memory.usage.toFixed(1)}%</div>
        </div>

        {/* 磁盘监控 */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="font-medium">磁盘使用</span>
              {getStatusIcon(metrics.disk.usage)}
            </div>
            <span className={`font-mono ${getStatusColor(metrics.disk.usage)}`}>
              {metrics.disk.used.toFixed(0)} / {metrics.disk.total} GB
            </span>
          </div>
          <Progress value={metrics.disk.usage} className="h-2" />
          <div className="text-xs text-muted-foreground">使用率: {metrics.disk.usage.toFixed(1)}%</div>
        </div>

        {/* 网络监控 */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="font-medium">网络流量</span>
            <Badge variant="outline">{metrics.network.connections} 连接</Badge>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="text-center p-2 bg-muted/50 rounded">
              <div className="text-lg font-bold text-blue-600">{metrics.network.download.toFixed(1)} Mbps</div>
              <div className="text-xs text-muted-foreground">下载</div>
            </div>
            <div className="text-center p-2 bg-muted/50 rounded">
              <div className="text-lg font-bold text-green-600">{metrics.network.upload.toFixed(1)} Mbps</div>
              <div className="text-xs text-muted-foreground">上传</div>
            </div>
          </div>
        </div>

        {/* 系统信息 */}
        <div className="pt-4 border-t">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-muted-foreground">系统运行时间:</span>
              <div className="font-mono">{metrics.uptime}</div>
            </div>
            <div>
              <span className="text-muted-foreground">最后更新:</span>
              <div className="font-mono">{new Date().toLocaleTimeString()}</div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
