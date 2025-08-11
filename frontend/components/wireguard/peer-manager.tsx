"use client"

import { DialogDescription } from "@/components/ui/dialog"

import type React from "react"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { PlusCircle, Edit, Trash2, Download, Copy } from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { useToast } from "@/hooks/use-toast"
import { wireguardApi } from "@/lib/api"
import { LoadingState } from "@/components/common/loading-state"
import { EmptyState } from "@/components/common/empty-state"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"

interface WireGuardInterface {
  id: string
  name: string
  public_key: string
}

interface WireGuardPeer {
  id: string
  interface_id: string
  name: string
  public_key: string
  private_key?: string // Should not be exposed normally
  preshared_key?: string
  allowed_ips: string
  endpoint: string
  persistent_keepalive: number
  status: "connected" | "disconnected" | "unknown"
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
  const [loading, setLoading] = useState(false) // Assume initial load is done by parent
  const [isAddEditDialogOpen, setIsAddEditDialogOpen] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [currentPeer, setCurrentPeer] = useState<WireGuardPeer | null>(null)
  const [configContent, setConfigContent] = useState<string>("")
  const [isConfigDialogOpen, setIsConfigDialogOpen] = useState(false)
  const { toast } = useToast()

  const fetchPeers = async () => {
    try {
      setLoading(true)
      const response = await wireguardApi.getPeers()
      if (response.success) {
        setPeers(response.data)
      } else {
        throw new Error(response.message || "Failed to fetch peers")
      }
    } catch (error) {
      console.error("Error fetching peers:", error)
      toast({
        title: "错误",
        description: "无法加载 WireGuard 对等设备。",
        variant: "destructive",
      })
      setPeers([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchPeers() // Fetch peers when component mounts or on refresh
    const interval = setInterval(fetchPeers, 10000) // Refresh every 10 seconds
    return () => clearInterval(interval)
  }, [])

  const handleAddPeer = () => {
    setCurrentPeer(null)
    setIsAddEditDialogOpen(true)
  }

  const handleEditPeer = (peer: WireGuardPeer) => {
    setCurrentPeer(peer)
    setIsAddEditDialogOpen(true)
  }

  const handleDeletePeer = (peer: WireGuardPeer) => {
    setCurrentPeer(peer)
    setIsDeleteDialogOpen(true)
  }

  const handleSavePeer = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const formData = new FormData(event.currentTarget)
    const data = {
      name: formData.get("name") as string,
      interface_id: formData.get("interface_id") as string,
      public_key: formData.get("public_key") as string,
      preshared_key: formData.get("preshared_key") as string,
      allowed_ips: formData.get("allowed_ips") as string,
      endpoint: formData.get("endpoint") as string,
      persistent_keepalive: Number.parseInt(formData.get("persistent_keepalive") as string),
    }

    try {
      setLoading(true)
      let response
      if (currentPeer) {
        response = await wireguardApi.updatePeer(currentPeer.id, data)
        toast({
          title: "对等设备更新成功",
          description: `对等设备 ${data.name} 已更新。`,
        })
      } else {
        response = await wireguardApi.addPeer(data)
        toast({
          title: "对等设备添加成功",
          description: `新对等设备 ${data.name} 已添加。`,
        })
      }

      if (!response.success) {
        throw new Error(response.message || "Failed to save peer")
      }

      setIsAddEditDialogOpen(false)
      onPeersChange() // Notify parent to refresh data
      fetchPeers() // Refresh local peer list
    } catch (error) {
      console.error("Failed to save peer:", error)
      toast({
        title: "操作失败",
        description: `保存对等设备时发生错误: ${error instanceof Error ? error.message : String(error)}`,
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleConfirmDelete = async () => {
    if (currentPeer) {
      try {
        setLoading(true)
        const response = await wireguardApi.deletePeer(currentPeer.id)
        if (response.success) {
          toast({
            title: "对等设备删除成功",
            description: `对等设备 ${currentPeer.name} 已删除。`,
          })
          setIsDeleteDialogOpen(false)
          onPeersChange() // Notify parent to refresh data
          fetchPeers() // Refresh local peer list
        } else {
          throw new Error(response.message || "Failed to delete peer")
        }
      } catch (error) {
        console.error("Failed to delete peer:", error)
        toast({
          title: "操作失败",
          description: `删除对等设备时发生错误: ${error instanceof Error ? error.message : String(error)}`,
          variant: "destructive",
        })
      } finally {
        setLoading(false)
      }
    }
  }

  const handleGenerateConfig = async (peerId: string) => {
    try {
      const response = await wireguardApi.generateClientConfig(peerId)
      if (response.success) {
        setConfigContent(response.data.config)
        setIsConfigDialogOpen(true)
        toast({
          title: "配置生成成功",
          description: "WireGuard 客户端配置已生成。",
        })
      } else {
        throw new Error(response.message || "Failed to generate config")
      }
    } catch (error) {
      console.error("Failed to generate config:", error)
      toast({
        title: "生成失败",
        description: `生成客户端配置时发生错误: ${error instanceof Error ? error.message : String(error)}`,
        variant: "destructive",
      })
    }
  }

  const handleCopyConfig = () => {
    navigator.clipboard.writeText(configContent)
    toast({
      title: "已复制",
      description: "WireGuard 配置已复制到剪贴板。",
    })
  }

  if (loading) {
    return <LoadingState message="正在执行操作..." />
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <div>
          <CardTitle>WireGuard 对等设备</CardTitle>
          <CardDescription>管理 WireGuard VPN 对等连接。</CardDescription>
        </div>
        <Button onClick={handleAddPeer}>
          <PlusCircle className="mr-2 h-4 w-4" /> 添加对等设备
        </Button>
      </CardHeader>
      <CardContent>
        {peers.length === 0 ? (
          <EmptyState title="暂无对等设备" description="点击“添加对等设备”按钮创建您的第一个 WireGuard 对等连接。" />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>名称</TableHead>
                <TableHead>接口</TableHead>
                <TableHead>允许IPs</TableHead>
                <TableHead>端点</TableHead>
                <TableHead>状态</TableHead>
                <TableHead>流量 (入/出)</TableHead>
                <TableHead className="text-right">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {peers.map((peer) => (
                <TableRow key={peer.id}>
                  <TableCell className="font-medium">{peer.name}</TableCell>
                  <TableCell>{interfaces.find((i) => i.id === peer.interface_id)?.name || "未知接口"}</TableCell>
                  <TableCell>{peer.allowed_ips}</TableCell>
                  <TableCell>{peer.endpoint || "N/A"}</TableCell>
                  <TableCell>
                    <Badge variant={peer.status === "connected" ? "default" : "secondary"}>
                      {peer.status === "connected" ? "已连接" : "未连接"}
                    </Badge>                    
                  </TableCell>
                  <TableCell>
                    {peer.bytes_received} / {peer.bytes_sent} bytes
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="sm" onClick={() => handleEditPeer(peer)} className="mr-2">
                      <Edit className="h-4 w-4" />
                      <span className="sr-only">编辑</span>
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => handleDeletePeer(peer)} className="mr-2">
                      <Trash2 className="h-4 w-4" />
                      <span className="sr-only">删除</span>
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => handleGenerateConfig(peer.id)}>
                      <Download className="h-4 w-4" />
                      <span className="sr-only">生成配置</span>
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>

      {/* Add/Edit Peer Dialog */}
      <Dialog open={isAddEditDialogOpen} onOpenChange={setIsAddEditDialogOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>{currentPeer ? "编辑对等设备" : "添加新对等设备"}</DialogTitle>
            <DialogDescription>
              {currentPeer ? "修改对等设备信息。" : "添加一个新的 WireGuard 对等连接。"}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSavePeer} className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="name" className="text-right">
                名称
              </Label>
              <Input id="name" name="name" defaultValue={currentPeer?.name || ""} className="col-span-3" required />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="interface_id" className="text-right">
                所属接口
              </Label>
              <Select name="interface_id" defaultValue={currentPeer?.interface_id || interfaces[0]?.id} required>
                <SelectTrigger className="col-span-3">
                  <SelectValue placeholder="选择 WireGuard 接口" />
                </SelectTrigger>
                <SelectContent>
                  {interfaces.map((iface) => (
                    <SelectItem key={iface.id} value={iface.id}>
                      {iface.name} ({iface.public_key.substring(0, 8)}...)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="public_key" className="text-right">
                公钥
              </Label>
              <Input
                id="public_key"
                name="public_key"
                defaultValue={currentPeer?.public_key || ""}
                className="col-span-3"
                required
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="preshared_key" className="text-right">
                预共享密钥 (可选)
              </Label>
              <Input
                id="preshared_key"
                name="preshared_key"
                defaultValue={currentPeer?.preshared_key || ""}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="allowed_ips" className="text-right">
                允许IPs
              </Label>
              <Input
                id="allowed_ips"
                name="allowed_ips"
                defaultValue={currentPeer?.allowed_ips || ""}
                placeholder="例如: 10.0.0.2/32, 192.168.1.0/24"
                className="col-span-3"
                required
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="endpoint" className="text-right">
                端点 (可选)
              </Label>
              <Input
                id="endpoint"
                name="endpoint"
                defaultValue={currentPeer?.endpoint || ""}
                placeholder="例如: example.com:51820 或 1.2.3.4:51820"
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="persistent_keepalive" className="text-right">
                持久心跳 (秒, 0为禁用)
              </Label>
              <Input
                id="persistent_keepalive"
                name="persistent_keepalive"
                type="number"
                defaultValue={currentPeer?.persistent_keepalive || 25}
                className="col-span-3"
              />
            </div>
            <DialogFooter>
              <Button type="submit" disabled={loading}>
                {loading ? "保存中..." : currentPeer ? "保存更改" : "添加对等设备"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确定要删除此对等设备吗？</AlertDialogTitle>
            <AlertDialogDescription>
              此操作无法撤销。这将永久删除对等设备 <span className="font-semibold">{currentPeer?.name}</span>{" "}
              及其所有相关配置。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              删除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Config Display Dialog */}
      <Dialog open={isConfigDialogOpen} onOpenChange={setIsConfigDialogOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>WireGuard 客户端配置</DialogTitle>
            <DialogDescription>将以下内容复制到您的 WireGuard 客户端配置文件中 (.conf)。</DialogDescription>
          </DialogHeader>
          <div className="relative">
            <Textarea value={configContent} readOnly className="h-64 font-mono text-xs resize-none" />
            <Button
              variant="outline"
              size="sm"
              className="absolute top-2 right-2 bg-transparent"
              onClick={handleCopyConfig}
            >
              <Copy className="h-4 w-4 mr-1" /> 复制
            </Button>
          </div>
          <DialogFooter>
            <Button onClick={() => setIsConfigDialogOpen(false)}>关闭</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  )
}
