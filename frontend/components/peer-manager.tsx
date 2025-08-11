"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Plus, Edit, Trash2, Download, Users, Wifi, WifiOff, Loader2 } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

interface WireGuardInterface {
  id: number
  name: string
  status: string
  listen_port: number
  address: string
  peers: WireGuardPeer[]
}

interface WireGuardPeer {
  id: number
  interface_id: number
  name: string
  allowed_ips: string
  endpoint: string
  persistent_keepalive: number
  status: string
  last_handshake: string
  bytes_received: number
  bytes_sent: number
}

interface PeerManagerProps {
  interfaces: WireGuardInterface[]
  onPeersChange: () => void
}

export function PeerManager({ interfaces, onPeersChange }: PeerManagerProps) {
  const [peers, setPeers] = useState<WireGuardPeer[]>([])
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [editingPeer, setEditingPeer] = useState<WireGuardPeer | null>(null)
  const [loading, setLoading] = useState(false)
  const [pingLoading, setPingLoading] = useState<number | null>(null)
  const { toast } = useToast()

  const [formData, setFormData] = useState({
    interface_id: 0,
    name: "",
    allowed_ips: "",
    endpoint: "",
    persistent_keepalive: 0,
    public_key: "",
  })

  useEffect(() => {
    loadPeers()
  }, [])

  const loadPeers = async () => {
    try {
      const response = await fetch("/api/peers")
      if (!response.ok) {
        throw new Error("Failed to load peers")
      }
      const data = await response.json()
      if (data.success) {
        setPeers(data.data)
      }
    } catch (error) {
      console.error("Failed to load peers:", error)
    }
  }

  const resetForm = () => {
    setFormData({
      interface_id: 0,
      name: "",
      allowed_ips: "",
      endpoint: "",
      persistent_keepalive: 0,
      public_key: "",
    })
  }

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const response = await fetch("/api/peers", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      })

      const result = await response.json()

      if (response.ok && result.success) {
        toast({
          title: "成功",
          description: "对等设备创建成功",
        })
        setCreateDialogOpen(false)
        resetForm()
        loadPeers()
        onPeersChange()
      } else {
        throw new Error(result.error || "创建对等设备失败")
      }
    } catch (error) {
      toast({
        title: "错误",
        description: error instanceof Error ? error.message : "创建对等设备失败",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingPeer) return

    setLoading(true)

    try {
      const response = await fetch(`/api/peers/${editingPeer.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: formData.name,
          allowed_ips: formData.allowed_ips,
          endpoint: formData.endpoint,
          persistent_keepalive: formData.persistent_keepalive,
        }),
      })

      const result = await response.json()

      if (response.ok && result.success) {
        toast({
          title: "成功",
          description: "对等设备更新成功",
        })
        setEditDialogOpen(false)
        setEditingPeer(null)
        resetForm()
        loadPeers()
        onPeersChange()
      } else {
        throw new Error(result.error || "更新对等设备失败")
      }
    } catch (error) {
      toast({
        title: "错误",
        description: error instanceof Error ? error.message : "更新对等设备失败",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (id: number) => {
    try {
      const response = await fetch(`/api/peers/${id}`, {
        method: "DELETE",
      })

      const result = await response.json()

      if (response.ok && result.success) {
        toast({
          title: "成功",
          description: "对等设备删除成功",
        })
        loadPeers()
        onPeersChange()
      } else {
        throw new Error(result.error || "删除对等设备失败")
      }
    } catch (error) {
      toast({
        title: "错误",
        description: error instanceof Error ? error.message : "删除对等设备失败",
        variant: "destructive",
      })
    }
  }

  const handleDownloadConfig = async (id: number, name: string) => {
    try {
      const response = await fetch(`/api/peers/${id}/config`)

      if (response.ok) {
        const config = await response.text()
        const blob = new Blob([config], { type: "text/plain" })
        const url = URL.createObjectURL(blob)
        const a = document.createElement("a")
        a.href = url
        a.download = `${name}-peer.conf`
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        URL.revokeObjectURL(url)

        toast({
          title: "成功",
          description: "对等设备配置下载成功",
        })
      } else {
        throw new Error("下载配置失败")
      }
    } catch (error) {
      toast({
        title: "错误",
        description: error instanceof Error ? error.message : "下载配置失败",
        variant: "destructive",
      })
    }
  }

  const handlePing = async (id: number, name: string) => {
    setPingLoading(id)
    try {
      const response = await fetch(`/api/peers/${id}/ping`, {
        method: "POST",
      })

      const result = await response.json()

      if (response.ok && result.success) {
        const { reachable, latency } = result.data
        toast({
          title: reachable ? "Ping 成功" : "Ping 失败",
          description: reachable ? `${name} 可达 (${latency})` : `${name} 不可达`,
          variant: reachable ? "default" : "destructive",
        })
      } else {
        throw new Error(result.error || "Ping 对等设备失败")
      }
    } catch (error) {
      toast({
        title: "错误",
        description: error instanceof Error ? error.message : "Ping 对等设备失败",
        variant: "destructive",
      })
    } finally {
      setPingLoading(null)
    }
  }

  const openEditDialog = (peer: WireGuardPeer) => {
    setEditingPeer(peer)
    setFormData({
      interface_id: peer.interface_id,
      name: peer.name,
      allowed_ips: peer.allowed_ips,
      endpoint: peer.endpoint,
      persistent_keepalive: peer.persistent_keepalive,
      public_key: "",
    })
    setEditDialogOpen(true)
  }

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return "0 B"
    const k = 1024
    const sizes = ["B", "KB", "MB", "GB", "TB"]
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return `${Number.parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`
  }

  const formatLastHandshake = (timestamp: string) => {
    if (!timestamp) return "从未"
    const date = new Date(timestamp)
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    const minutes = Math.floor(diff / 60000)

    if (minutes < 1) return "刚刚"
    if (minutes < 60) return `${minutes}分钟前`
    if (minutes < 1440) return `${Math.floor(minutes / 60)}小时前`
    return `${Math.floor(minutes / 1440)}天前`
  }

  const allPeers = peers.map((peer) => ({
    ...peer,
    interface_name: interfaces.find((i) => i.id === peer.interface_id)?.name || "未知",
  }))

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">对等设备管理</h2>
          <p className="text-muted-foreground">管理 WireGuard 对等设备连接</p>
        </div>
        <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button disabled={interfaces.length === 0}>
              <Plus className="h-4 w-4 mr-2" />
              添加对等设备
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>添加新对等设备</DialogTitle>
              <DialogDescription>配置新的 WireGuard 对等设备</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleCreate} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="interface_id">接口</Label>
                <Select
                  value={formData.interface_id.toString()}
                  onValueChange={(value) => setFormData({ ...formData, interface_id: Number.parseInt(value) })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="选择接口" />
                  </SelectTrigger>
                  <SelectContent>
                    {interfaces.map((iface) => (
                      <SelectItem key={iface.id} value={iface.id.toString()}>
                        {iface.name} ({iface.address})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="name">对等设备名称</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="例如：客户端-1"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="allowed_ips">允许的 IP</Label>
                <Input
                  id="allowed_ips"
                  value={formData.allowed_ips}
                  onChange={(e) => setFormData({ ...formData, allowed_ips: e.target.value })}
                  placeholder="10.0.0.2/32"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="endpoint">端点（可选）</Label>
                <Input
                  id="endpoint"
                  value={formData.endpoint}
                  onChange={(e) => setFormData({ ...formData, endpoint: e.target.value })}
                  placeholder="192.168.1.100:51820"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="persistent_keepalive">持续保活（秒）</Label>
                <Input
                  id="persistent_keepalive"
                  type="number"
                  value={formData.persistent_keepalive}
                  onChange={(e) =>
                    setFormData({ ...formData, persistent_keepalive: Number.parseInt(e.target.value) || 0 })
                  }
                  placeholder="25"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="public_key">公钥（可选）</Label>
                <Input
                  id="public_key"
                  value={formData.public_key}
                  onChange={(e) => setFormData({ ...formData, public_key: e.target.value })}
                  placeholder="留空自动生成"
                />
              </div>
              <div className="flex justify-end space-x-2">
                <Button type="button" variant="outline" onClick={() => setCreateDialogOpen(false)}>
                  取消
                </Button>
                <Button type="submit" disabled={loading}>
                  {loading ? "创建中..." : "创建"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4">
        {allPeers.map((peer) => (
          <Card key={peer.id}>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div
                    className={`w-3 h-3 rounded-full ${peer.status === "connected" ? "bg-green-500" : "bg-gray-400"}`}
                  />
                  <div>
                    <h3 className="font-medium">{peer.name}</h3>
                    <p className="text-sm text-muted-foreground">
                      {peer.allowed_ips} • {peer.interface_name}
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <Badge variant={peer.status === "connected" ? "default" : "secondary"}>
                    {peer.status === "connected" ? "已连接" : "未连接"}
                  </Badge>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handlePing(peer.id, peer.name)}
                    disabled={pingLoading === peer.id}
                  >
                    {pingLoading === peer.id ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : peer.status === "connected" ? (
                      <Wifi className="h-4 w-4 mr-2" />
                    ) : (
                      <WifiOff className="h-4 w-4 mr-2" />
                    )}
                    Ping
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => handleDownloadConfig(peer.id, peer.name)}>
                    <Download className="h-4 w-4 mr-2" />
                    配置
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => openEditDialog(peer)}>
                    <Edit className="h-4 w-4 mr-2" />
                    编辑
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button size="sm" variant="outline">
                        <Trash2 className="h-4 w-4 mr-2" />
                        删除
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>删除对等设备</AlertDialogTitle>
                        <AlertDialogDescription>
                          确定要删除对等设备 "{peer.name}" 吗？此操作无法撤销。
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>取消</AlertDialogCancel>
                        <AlertDialogAction onClick={() => handleDelete(peer.id)}>删除</AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>
              <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">最后握手</p>
                  <p className="font-medium">{formatLastHandshake(peer.last_handshake)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">接收</p>
                  <p className="font-medium">{formatBytes(peer.bytes_received)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">发送</p>
                  <p className="font-medium">{formatBytes(peer.bytes_sent)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">端点</p>
                  <p className="font-medium">{peer.endpoint || "无"}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
        {allPeers.length === 0 && (
          <Card>
            <CardContent className="text-center py-12">
              <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">暂无配置的对等设备</h3>
              <p className="text-muted-foreground mb-4">
                {interfaces.length === 0 ? "请先创建接口，然后添加对等设备" : "添加您的第一个对等设备以开始连接客户端"}
              </p>
              {interfaces.length > 0 && (
                <Button onClick={() => setCreateDialogOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  添加对等设备
                </Button>
              )}
            </CardContent>
          </Card>
        )}
      </div>

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>编辑对等设备</DialogTitle>
            <DialogDescription>更新对等设备配置</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleEdit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit_name">对等设备名称</Label>
              <Input
                id="edit_name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit_allowed_ips">允许的 IP</Label>
              <Input
                id="edit_allowed_ips"
                value={formData.allowed_ips}
                onChange={(e) => setFormData({ ...formData, allowed_ips: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit_endpoint">端点</Label>
              <Input
                id="edit_endpoint"
                value={formData.endpoint}
                onChange={(e) => setFormData({ ...formData, endpoint: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit_persistent_keepalive">持续保活（秒）</Label>
              <Input
                id="edit_persistent_keepalive"
                type="number"
                value={formData.persistent_keepalive}
                onChange={(e) =>
                  setFormData({ ...formData, persistent_keepalive: Number.parseInt(e.target.value) || 0 })
                }
              />
            </div>
            <div className="flex justify-end space-x-2">
              <Button type="button" variant="outline" onClick={() => setEditDialogOpen(false)}>
                取消
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? "更新中..." : "更新"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
