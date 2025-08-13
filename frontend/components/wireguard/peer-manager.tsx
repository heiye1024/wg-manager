"use client"

import { useState, useEffect, useMemo } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { toast } from "@/hooks/use-toast"
import {
  Plus,
  MoreHorizontal,
  Download,
  Trash2,
  Edit,
  Users,
  Activity,
  RefreshCw,
  List,
  Layers,
  Network,
  Search,
} from "lucide-react"
import { wireguardApi } from "@/lib/api"
import { LoadingState } from "@/components/loading-state"

interface Peer {
  id: string
  name: string
  public_key: string
  allowed_ips: string
  endpoint?: string
  latest_handshake?: string
  transfer_rx: number
  transfer_tx: number
  persistent_keepalive?: number
  status: "connected" | "disconnected" | "unknown"
  interface_id: string
}

interface Interface {
  id: string
  name: string
  status: "active" | "inactive"
}

interface PeerManagerProps {
  interfaces?: Interface[]
  onPeersChange?: () => void
}

export function PeerManager({ interfaces = [], onPeersChange }: PeerManagerProps) {
  const [peers, setPeers] = useState<Peer[]>([])
  const [loading, setLoading] = useState(true)
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [editingPeer, setEditingPeer] = useState<Peer | null>(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedInterface, setSelectedInterface] = useState<string>("all")
  const [viewMode, setViewMode] = useState<"table" | "grouped">("table")
  const [formData, setFormData] = useState({
    name: "",
    allowed_ips: "",
    endpoint: "",
    persistent_keepalive: "",
    interface_id: "",
  })

  // Ensure interfaces始终是数组，避免undefined错误
  const [localIfs, setLocalIfs] = useState<Interface[]>([])

  const safeInterfaces = (interfaces?.length ?? 0) > 0 ? interfaces : localIfs

  const filteredPeers = useMemo(() => {
    let filtered = Array.isArray(peers) ? peers : []

    // 按接口筛选
    if (selectedInterface !== "all") {
      filtered = filtered.filter((peer) => peer.interface_id === selectedInterface)
    }

    // 按搜索词筛选
    if (searchTerm) {
      filtered = filtered.filter(
        (peer) =>
          peer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          peer.allowed_ips.includes(searchTerm) ||
          (peer.endpoint && peer.endpoint.toLowerCase().includes(searchTerm.toLowerCase())),
      )
    }

    return filtered
  }, [peers, selectedInterface, searchTerm])

  const groupedPeers = useMemo(() => {
    const groups: { [key: string]: { interface: Interface; peers: Peer[] } } = {}

    safeInterfaces.forEach((iface) => {
      groups[iface.id] = {
        interface: iface,
        peers: filteredPeers.filter((peer) => peer.interface_id === iface.id),
      }
    })

    return groups
  }, [filteredPeers, safeInterfaces])

  const getInterfaceName = (interfaceId: string) => {
    const iface = safeInterfaces.find((i) => i.id === interfaceId)
    return iface ? iface.name : "未知接口"
  }

  useEffect(() => {
    if ((interfaces?.length ?? 0) === 0) {
      ;(async () => {
        try {
          const res = await wireguardApi.getInterfaces()
          const rows = Array.isArray(res?.data)
            ? res.data
            : Array.isArray(res?.data?.list)
              ? res.data.list
              : Array.isArray(res?.items)
                ? res.items
                : []
          const mapped = rows.map((i: any) => ({
            id: String(i.id),
            name: i.name,
            status: i.status === "running" ? "active" : "inactive",
          }))
          setLocalIfs(mapped)
          console.log("PeerManager fetched interfaces (self):", mapped)
        } catch (e) {
          console.error("PeerManager self-fetch interfaces failed:", e)
        }
      })()
    }
  }, [interfaces])

  const loadPeers = async () => {
    try {
      setLoading(true)
      const response = await wireguardApi.getPeers()
      if (response.success) {
        const rows = Array.isArray(response.data) ? response.data : []

        const mapped: Peer[] = rows.map((r: any) => ({
          id: String(r.id),
          // 名称优先用 r.name，没有就回退用公钥前8位
          name: (r.name && String(r.name)) || (r.public_key ? String(r.public_key).slice(0, 8) : `peer-${r.id}`),
          public_key: r.public_key || "",
          allowed_ips: r.allowed_ips || "",
          endpoint: r.endpoint || "",
          // 后端 last_handshake -> 前端 latest_handshake（字符串或 undefined）
          latest_handshake: r.last_handshake ? String(r.last_handshake) : undefined,
          // 后端 bytes_received/sent -> 前端 transfer_rx/tx（数字，容错为 0）
          transfer_rx: Number.isFinite(Number(r.bytes_received)) ? Number(r.bytes_received) : 0,
          transfer_tx: Number.isFinite(Number(r.bytes_sent)) ? Number(r.bytes_sent) : 0,
          // 容错：undefined/空串不传
          persistent_keepalive: r.persistent_keepalive != null ? Number(r.persistent_keepalive) : undefined,
          // 规范化状态
          status: r.status === "connected" ? "connected" : r.status === "disconnected" ? "disconnected" : "unknown",
          // 统一成 string，便于和下拉筛选/接口列表匹配
          interface_id: String(r.interface_id),
        }))

        setPeers(mapped)
      }
    } catch (error) {
      console.error("Failed to load peers:", error)
      toast({ title: "错误", description: "加载客户端连接失败", variant: "destructive" })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadPeers()
  }, [])

  const handleCreate = async () => {
    // 1) 先组装 payload，做类型与默认值处理
    const payload: any = {
      name: formData.name.trim(),
      allowed_ips: formData.allowed_ips.trim(),
      interface_id: Number(formData.interface_id), // "4" -> 4
      // 空串就不传 endpoint（让后端用默认/忽略）
      ...(formData.endpoint.trim() ? { endpoint: formData.endpoint.trim() } : {}),
      // 留空默认 25，否则转 number
      persistent_keepalive: formData.persistent_keepalive === "" ? 25 : Number(formData.persistent_keepalive),
    }

    // 2) 基本校验
    if (!payload.interface_id) {
      toast({
        title: "缺少接口",
        description: "请选择要绑定的接口。",
        variant: "destructive",
      })
      return
    }
    if (!payload.name || !payload.allowed_ips) {
      toast({
        title: "表单不完整",
        description: "请填写名称和允许的 IP。",
        variant: "destructive",
      })
      return
    }

    try {
      const response = await wireguardApi.addPeer(payload)

      if (response.success) {
        toast({ title: "成功", description: "客户端连接创建成功" })
        setCreateDialogOpen(false)
        resetForm()
        loadPeers()
        onPeersChange?.()
      } else {
        // 3) 这里修正为 response.error
        throw new Error(response.error || "创建客户端连接失败")
      }
    } catch (error) {
      toast({
        title: "错误",
        description: error instanceof Error ? error.message : "创建客户端连接失败",
        variant: "destructive",
      })
    }
  }

  const handleEdit = async () => {
    if (!editingPeer) return

    // 组装 payload：只带有变更且合法的字段
    const payload: any = {}
    const name = formData.name.trim()
    if (name) payload.name = name

    const ips = formData.allowed_ips.trim()
    if (ips) payload.allowed_ips = ips

    const ep = formData.endpoint.trim()
    if (ep) payload.endpoint = ep

    // 关键：为空就不传；有值则转 number
    if (formData.persistent_keepalive !== "") {
      const n = Number(formData.persistent_keepalive)
      if (!Number.isFinite(n) || n < 0) {
        toast({ title: "无效的保活秒数", description: "请输入大于等于 0 的整数", variant: "destructive" })
        return
      }
      payload.persistent_keepalive = n
    }

    try {
      const response = await wireguardApi.updatePeer(editingPeer.id, payload)
      if (response.success) {
        toast({ title: "成功", description: "客户端连接更新成功" })
        setEditDialogOpen(false)
        setEditingPeer(null)
        resetForm()
        loadPeers()
        onPeersChange?.()
      } else {
        throw new Error(response.error || "更新客户端连接失败")
      }
    } catch (error) {
      toast({
        title: "错误",
        description: error instanceof Error ? error.message : "更新客户端连接失败",
        variant: "destructive",
      })
    }
  }

  const handleDelete = async (id: string) => {
    try {
      const response = await wireguardApi.deletePeer(id)

      if (response.success) {
        toast({
          title: "成功",
          description: "客户端连接删除成功",
        })
        loadPeers()
        onPeersChange?.()
      } else {
        throw new Error(response.error || "删除客户端连接失败")
      }
    } catch (error) {
      toast({
        title: "错误",
        description: "删除客户端连接失败",
        variant: "destructive",
      })
    }
  }

  const handleDownloadConfig = async (id: string) => {
    try {
      const res = await wireguardApi.generateClientConfig(id)

      // 统一提取文本：兼容 1) 拦截器返回 "string"；2) AxiosResponse<string>；3) JSON 包裹 { data: "..." }
      const pickText = (r: any): string => {
        if (typeof r === "string") return r
        if (typeof r?.data === "string") return r.data
        if (r && typeof r?.data?.data === "string") return r.data.data
        if (r && r.success && typeof r.data === "string") return r.data
        return ""
      }

      let text = pickText(res)
      if (!text) throw new Error("配置为空或返回结构未识别")

      // 若后端把换行做成了字面量 '\n'，这里还原
      if (text.includes("\\n") && !text.includes("\n")) {
        text = text.replace(/\\r?\\n/g, "\n")
      }

      // 文件名：能读到 Content-Disposition 就用；否则兜底
      const cd = (typeof res === "object" && res?.headers && res.headers["content-disposition"]) || ""
      const m = /filename\*=UTF-8''([^;]+)|filename="?([^"]+)"?/i.exec(cd)
      const filename = decodeURIComponent(m?.[1] || m?.[2] || `peer-${id}.conf`)
      const safeName = filename.endsWith(".conf") ? filename : `${filename}.conf`

      const blob = new Blob([text], { type: "text/plain;charset=utf-8" })
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = safeName
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)

      toast({ title: "成功", description: "配置文件下载成功" })
    } catch (err: any) {
      const msg = err?.response?.data?.error || err?.response?.data?.message || err?.message || "下载配置文件失败"
      toast({ title: "错误", description: msg, variant: "destructive" })
    }
  }

  const handlePing = async (id: string) => {
    try {
      const response = await wireguardApi.getPeer(id)

      if (response.success) {
        toast({
          title: "连接测试",
          description: `客户端连接 ${id} 状态正常`,
        })
      } else {
        throw new Error("连接测试失败")
      }
    } catch (error) {
      toast({
        title: "连接测试失败",
        description: error instanceof Error ? error.message : "无法连接到客户端",
        variant: "destructive",
      })
    }
  }

  const resetForm = () => {
    setFormData({
      name: "",
      allowed_ips: "",
      endpoint: "",
      persistent_keepalive: "",
      interface_id: "",
    })
  }

  const openEditDialog = (peer: Peer) => {
    setEditingPeer(peer)
    setFormData({
      name: peer.name,
      allowed_ips: peer.allowed_ips,
      endpoint: peer.endpoint || "",
      persistent_keepalive: peer.persistent_keepalive?.toString() || "",
      interface_id: peer.interface_id,
    })
    setEditDialogOpen(true)
  }

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return "0 B"
    const k = 1024
    const sizes = ["B", "KB", "MB", "GB", "TB"]
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Number.parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i]
  }

  const formatLastHandshake = (timestamp?: string) => {
    if (!timestamp) return "从未连接"
    const date = new Date(timestamp)
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    const minutes = Math.floor(diff / 60000)

    if (minutes < 1) return "刚刚"
    if (minutes < 60) return `${minutes} 分钟前`
    if (minutes < 1440) return `${Math.floor(minutes / 60)} 小时前`
    return `${Math.floor(minutes / 1440)} 天前`
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "connected":
        return (
          <Badge variant="default" className="bg-green-500">
            已连接
          </Badge>
        )
      case "disconnected":
        return <Badge variant="secondary">已断开</Badge>
      default:
        return <Badge variant="outline">未知</Badge>
    }
  }

  const allPeers = peers || []

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">客户端连接管理</h2>
          <p className="text-muted-foreground">
            管理 WireGuard 客户端连接配置
            {safeInterfaces.length > 0 && (
              <span className="ml-2 text-green-600">(已检测到 {safeInterfaces.length} 个可用接口)</span>
            )}
          </p>
        </div>
        <div className="flex space-x-2">
          <Button onClick={loadPeers} variant="outline" disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
            刷新
          </Button>
          <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button
                disabled={safeInterfaces.length === 0}
                className="bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white border-0 shadow-md hover:shadow-lg transition-all duration-150"
              >
                <Plus className="h-4 w-4 mr-2" />
                添加客户端
                {safeInterfaces.length === 0 && " (需要先创建接口)"}
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>添加客户端连接</DialogTitle>
                <DialogDescription>创建新的 WireGuard 客户端连接配置</DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="name">名称</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="输入客户端连接名称"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="interface">接口</Label>
                  <select
                    id="interface"
                    value={formData.interface_id}
                    onChange={(e) => setFormData({ ...formData, interface_id: e.target.value })}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <option value="">选择接口</option>
                    {safeInterfaces.map((iface) => (
                      <option key={iface.id} value={iface.id}>
                        {iface.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="allowed_ips">允许的 IP</Label>
                  <Input
                    id="allowed_ips"
                    value={formData.allowed_ips}
                    onChange={(e) => setFormData({ ...formData, allowed_ips: e.target.value })}
                    placeholder="例如: 10.0.0.2/32"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="endpoint">端点 (可选)</Label>
                  <Input
                    id="endpoint"
                    value={formData.endpoint}
                    onChange={(e) => setFormData({ ...formData, endpoint: e.target.value })}
                    placeholder="例如: example.com:51820"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="persistent_keepalive">持久保活 (可选)</Label>
                  <Input
                    id="persistent_keepalive"
                    type="number"
                    value={formData.persistent_keepalive}
                    onChange={(e) => setFormData({ ...formData, persistent_keepalive: e.target.value })}
                    placeholder="秒数，例如: 25"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
                  取消
                </Button>
                <Button onClick={handleCreate}>创建</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {peers.length > 0 && (
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
              <div className="flex flex-col sm:flex-row gap-4 flex-1">
                <div className="relative flex-1 max-w-sm">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                  <Input
                    placeholder="搜索客户端名称、IP 或端点..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <select
                  value={selectedInterface}
                  onChange={(e) => setSelectedInterface(e.target.value)}
                  className="flex h-10 w-full sm:w-48 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                >
                  <option value="all">所有接口</option>
                  {safeInterfaces.map((iface) => (
                    <option key={iface.id} value={iface.id}>
                      {iface.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant={viewMode === "table" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setViewMode("table")}
                  className={viewMode === "table" ? "bg-gradient-to-r from-blue-500 to-purple-500 text-white" : ""}
                >
                  <List className="h-4 w-4 mr-2" />
                  列表视图
                </Button>
                <Button
                  variant={viewMode === "grouped" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setViewMode("grouped")}
                  className={viewMode === "grouped" ? "bg-gradient-to-r from-blue-500 to-purple-500 text-white" : ""}
                >
                  <Layers className="h-4 w-4 mr-2" />
                  分组视图
                </Button>
              </div>
            </div>
            {filteredPeers.length !== peers.length && (
              <div className="mt-4 text-sm text-muted-foreground">
                显示 {filteredPeers.length} / {peers.length} 个客户端连接
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {loading ? (
        <LoadingState message="正在加载客户端连接..." />
      ) : peers.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Users className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">暂无配置的客户端连接</h3>
            <p className="text-muted-foreground mb-4 text-center">
              {safeInterfaces.length === 0
                ? "请先创建 WireGuard 接口，然后添加客户端连接"
                : "添加您的第一个客户端连接以开始 VPN 服务"}
            </p>
            {safeInterfaces.length > 0 && (
              <Button
                onClick={() => setCreateDialogOpen(true)}
                className="bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white border-0 shadow-md hover:shadow-lg transition-all duration-150"
              >
                <Plus className="h-4 w-4 mr-2" />
                添加客户端连接
              </Button>
            )}
            <div className="mt-6 p-4 bg-muted/50 rounded-lg text-left max-w-md">
              <h4 className="font-medium mb-2">连接状态说明</h4>
              <div className="space-y-1 text-sm text-muted-foreground">
                <p>
                  •{" "}
                  <Badge variant="default" className="mr-1">
                    已连接
                  </Badge>{" "}
                  - 客户端正常连接，数据传输正常
                </p>
                <p>
                  •{" "}
                  <Badge variant="secondary" className="mr-1">
                    未连接
                  </Badge>{" "}
                  - 客户端配置正确但未建立连接
                </p>
                <p>
                  •{" "}
                  <Badge variant="destructive" className="mr-1">
                    配置错误
                  </Badge>{" "}
                  - 客户端配置有误或密钥不匹配
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : viewMode === "grouped" ? (
        /* 分组视图 */
        <div className="space-y-4">
          {Object.entries(groupedPeers).map(([interfaceId, group]) => (
            <Card key={interfaceId}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <Network className="h-5 w-5" />
                      {group.interface.name}
                      <Badge variant={group.interface.status === "active" ? "default" : "secondary"}>
                        {group.interface.status === "active" ? "活跃" : "非活跃"}
                      </Badge>
                    </CardTitle>
                    <CardDescription>{group.peers.length} 个客户端连接</CardDescription>
                  </div>
                </div>
              </CardHeader>
              {group.peers.length > 0 && (
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>名称</TableHead>
                        <TableHead>状态</TableHead>
                        <TableHead>允许的 IP</TableHead>
                        <TableHead>端点</TableHead>
                        <TableHead>最后握手</TableHead>
                        <TableHead>传输数据</TableHead>
                        <TableHead className="text-right">操作</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {group.peers.map((peer) => (
                        <TableRow key={peer.id}>
                          <TableCell className="font-medium">{peer.name}</TableCell>
                          <TableCell>{getStatusBadge(peer.status)}</TableCell>
                          <TableCell className="font-mono text-sm">{peer.allowed_ips}</TableCell>
                          <TableCell className="font-mono text-sm">{peer.endpoint || "-"}</TableCell>
                          <TableCell>{formatLastHandshake(peer.latest_handshake)}</TableCell>
                          <TableCell>
                            <div className="text-sm">
                              <div>↓ {formatBytes(peer.transfer_rx)}</div>
                              <div>↑ {formatBytes(peer.transfer_tx)}</div>
                            </div>
                          </TableCell>
                          <TableCell className="text-right">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" className="h-8 w-8 p-0">
                                  <span className="sr-only">打开菜单</span>
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => openEditDialog(peer)}>
                                  <Edit className="h-4 w-4 mr-2" />
                                  编辑
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleDownloadConfig(peer.id)}>
                                  <Download className="h-4 w-4 mr-2" />
                                  下载配置
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handlePing(peer.id)}>
                                  <Activity className="h-4 w-4 mr-2" />
                                  连接测试
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleDelete(peer.id)} className="text-destructive">
                                  <Trash2 className="h-4 w-4 mr-2" />
                                  删除
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              )}
            </Card>
          ))}
        </div>
      ) : (
        /* 表格视图，添加接口列 */
        <Card>
          <CardHeader>
            <CardTitle>客户端连接列表</CardTitle>
            <CardDescription>当前配置的所有 WireGuard 客户端连接</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>名称</TableHead>
                  <TableHead>所属接口</TableHead>
                  <TableHead>状态</TableHead>
                  <TableHead>允许的 IP</TableHead>
                  <TableHead>端点</TableHead>
                  <TableHead>最后握手</TableHead>
                  <TableHead>传输数据</TableHead>
                  <TableHead className="text-right">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredPeers.map((peer) => (
                  <TableRow key={peer.id}>
                    <TableCell className="font-medium">{peer.name}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{getInterfaceName(peer.interface_id)}</Badge>
                    </TableCell>
                    <TableCell>{getStatusBadge(peer.status)}</TableCell>
                    <TableCell className="font-mono text-sm">{peer.allowed_ips}</TableCell>
                    <TableCell className="font-mono text-sm">{peer.endpoint || "-"}</TableCell>
                    <TableCell>{formatLastHandshake(peer.latest_handshake)}</TableCell>
                    <TableCell>
                      <div className="text-sm">
                        <div>↓ {formatBytes(peer.transfer_rx)}</div>
                        <div>↑ {formatBytes(peer.transfer_tx)}</div>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-8 w-8 p-0">
                            <span className="sr-only">打开菜单</span>
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => openEditDialog(peer)}>
                            <Edit className="h-4 w-4 mr-2" />
                            编辑
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleDownloadConfig(peer.id)}>
                            <Download className="h-4 w-4 mr-2" />
                            下载配置
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handlePing(peer.id)}>
                            <Activity className="h-4 w-4 mr-2" />
                            连接测试
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleDelete(peer.id)} className="text-destructive">
                            <Trash2 className="h-4 w-4 mr-2" />
                            删除
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* 编辑对话框 */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>编辑客户端连接</DialogTitle>
            <DialogDescription>修改客户端连接配置信息</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="edit-name">名称</Label>
              <Input
                id="edit-name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="输入客户端连接名称"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-allowed_ips">允许的 IP</Label>
              <Input
                id="edit-allowed_ips"
                value={formData.allowed_ips}
                onChange={(e) => setFormData({ ...formData, allowed_ips: e.target.value })}
                placeholder="例如: 10.0.0.2/32"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-endpoint">端点 (可选)</Label>
              <Input
                id="edit-endpoint"
                value={formData.endpoint}
                onChange={(e) => setFormData({ ...formData, endpoint: e.target.value })}
                placeholder="例如: example.com:51820"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-persistent_keepalive">持久保活 (可选)</Label>
              <Input
                id="edit-persistent_keepalive"
                type="number"
                value={formData.persistent_keepalive}
                onChange={(e) => setFormData({ ...formData, persistent_keepalive: e.target.value })}
                placeholder="秒数，例如: 25"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
              取消
            </Button>
            <Button onClick={handleEdit}>保存</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
