"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Search, Download, RefreshCw } from "lucide-react"

type LogEntry = {
  id: string
  timestamp: string
  level: "info" | "warning" | "error" | "debug"
  source: string
  message: string
  details?: string
}

const mockLogs: LogEntry[] = [
  {
    id: "1",
    timestamp: new Date().toISOString(),
    level: "info",
    source: "system",
    message: "系统启动完成",
    details: "所有服务已成功启动",
  },
  {
    id: "2",
    timestamp: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
    level: "warning",
    source: "network",
    message: "设备连接超时",
    details: "设备 192.168.1.100 连接超时，正在重试",
  },
  {
    id: "3",
    timestamp: new Date(Date.now() - 10 * 60 * 1000).toISOString(),
    level: "error",
    source: "auth",
    message: "登录失败",
    details: "用户 admin 登录失败，密码错误",
  },
  {
    id: "4",
    timestamp: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
    level: "info",
    source: "wireguard",
    message: "新客户端连接",
    details: "客户端 office-laptop 已连接到 VPN",
  },
  {
    id: "5",
    timestamp: new Date(Date.now() - 20 * 60 * 1000).toISOString(),
    level: "debug",
    source: "api",
    message: "API 请求处理",
    details: "GET /api/devices - 200 OK (125ms)",
  },
]

export function LogViewer() {
  const [logs, setLogs] = useState<LogEntry[]>(mockLogs)
  const [filteredLogs, setFilteredLogs] = useState<LogEntry[]>(mockLogs)
  const [searchQuery, setSearchQuery] = useState("")
  const [levelFilter, setLevelFilter] = useState("all")
  const [sourceFilter, setSourceFilter] = useState("all")

  useEffect(() => {
    let filtered = logs

    if (searchQuery) {
      filtered = filtered.filter(
        (log) =>
          log.message.toLowerCase().includes(searchQuery.toLowerCase()) ||
          log.details?.toLowerCase().includes(searchQuery.toLowerCase()),
      )
    }

    if (levelFilter !== "all") {
      filtered = filtered.filter((log) => log.level === levelFilter)
    }

    if (sourceFilter !== "all") {
      filtered = filtered.filter((log) => log.source === sourceFilter)
    }

    setFilteredLogs(filtered)
  }, [logs, searchQuery, levelFilter, sourceFilter])

  const getLevelBadge = (level: string) => {
    switch (level) {
      case "error":
        return <Badge variant="destructive">错误</Badge>
      case "warning":
        return <Badge className="bg-yellow-500 hover:bg-yellow-600">警告</Badge>
      case "info":
        return <Badge className="bg-blue-500 hover:bg-blue-600">信息</Badge>
      case "debug":
        return <Badge variant="secondary">调试</Badge>
      default:
        return <Badge variant="outline">未知</Badge>
    }
  }

  const refreshLogs = () => {
    // 模拟新日志
    const newLog: LogEntry = {
      id: Date.now().toString(),
      timestamp: new Date().toISOString(),
      level: ["info", "warning", "error", "debug"][Math.floor(Math.random() * 4)] as any,
      source: ["system", "network", "auth", "wireguard", "api"][Math.floor(Math.random() * 5)],
      message: "新的系统事件",
      details: "这是一个模拟的日志条目",
    }
    setLogs([newLog, ...logs])
  }

  const exportLogs = () => {
    const logText = filteredLogs
      .map((log) => `[${log.timestamp}] [${log.level.toUpperCase()}] [${log.source}] ${log.message}`)
      .join("\n")

    const blob = new Blob([logText], { type: "text/plain" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `logs-${new Date().toISOString().split("T")[0]}.txt`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>系统日志</CardTitle>
            <CardDescription>查看和分析系统运行日志</CardDescription>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={refreshLogs}>
              <RefreshCw className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="sm" onClick={exportLogs}>
              <Download className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* 过滤器 */}
        <div className="flex gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="搜索日志..."
              className="pl-8"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <Select value={levelFilter} onValueChange={setLevelFilter}>
            <SelectTrigger className="w-32">
              <SelectValue placeholder="级别" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">所有级别</SelectItem>
              <SelectItem value="error">错误</SelectItem>
              <SelectItem value="warning">警告</SelectItem>
              <SelectItem value="info">信息</SelectItem>
              <SelectItem value="debug">调试</SelectItem>
            </SelectContent>
          </Select>
          <Select value={sourceFilter} onValueChange={setSourceFilter}>
            <SelectTrigger className="w-32">
              <SelectValue placeholder="来源" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">所有来源</SelectItem>
              <SelectItem value="system">系统</SelectItem>
              <SelectItem value="network">网络</SelectItem>
              <SelectItem value="auth">认证</SelectItem>
              <SelectItem value="wireguard">WireGuard</SelectItem>
              <SelectItem value="api">API</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* 日志列表 */}
        <ScrollArea className="h-[400px] border rounded-lg">
          <div className="p-4 space-y-2">
            {filteredLogs.map((log) => (
              <div key={log.id} className="border rounded-lg p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {getLevelBadge(log.level)}
                    <Badge variant="outline">{log.source}</Badge>
                    <span className="text-sm text-muted-foreground">{new Date(log.timestamp).toLocaleString()}</span>
                  </div>
                </div>
                <div className="text-sm font-medium">{log.message}</div>
                {log.details && <div className="text-xs text-muted-foreground">{log.details}</div>}
              </div>
            ))}
          </div>
        </ScrollArea>

        {/* 统计信息 */}
        <div className="flex justify-between text-sm text-muted-foreground">
          <span>显示 {filteredLogs.length} 条日志</span>
          <span>最后更新: {new Date().toLocaleTimeString()}</span>
        </div>
      </CardContent>
    </Card>
  )
}
