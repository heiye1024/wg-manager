"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
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
import { Plus, Play, Square, Edit, Trash2, Download, Settings, RefreshCw } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { interfaceApi } from "@/lib/api"
import { LoadingState } from "@/components/common/loading-state"

interface WireGuardInterface {
  id: number
  name: string
  status: string
  listen_port: number
  address: string
  peers: any[]
}

interface InterfaceManagerProps {
  interfaces?: WireGuardInterface[]
  onInterfacesChange?: () => void
}

export function InterfaceManager({ interfaces: propInterfaces, onInterfacesChange }: InterfaceManagerProps) {
  const [interfaces, setInterfaces] = useState<WireGuardInterface[]>(propInterfaces || [])
  const [loading, setLoading] = useState(!propInterfaces)
  const [refreshing, setRefreshing] = useState(false)
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [editingInterface, setEditingInterface] = useState<WireGuardInterface | null>(null)
  const [actionLoading, setActionLoading] = useState(false)
  const { toast } = useToast()

  const [formData, setFormData] = useState({
    name: "",
    listen_port: 51820,
    address: "",
    private_key: "",
  })

  const loadInterfaces = async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true)
      } else {
        setLoading(true)
      }

      const response = await interfaceApi.getAll()
      console.log

      if (response.success) {
        setInterfaces(response.data)
        if (onInterfacesChange) {
          onInterfacesChange()
        }
      } else {
        throw new Error(response.error || "获取接口列表失败")
      }
    } catch (error) {
      console.error("Failed to load interfaces:", error)
      toast({
        title: "错误",
        description: "无法加载接口列表",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    if (!propInterfaces) {
      loadInterfaces()
    }
  }, [propInterfaces])

  const handleRefresh = () => {
    loadInterfaces(true)
  }

  const resetForm = () => {
    setFormData({
      name: "",
      listen_port: 51820,
      address: "",
      private_key: "",
    })
  }

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    setActionLoading(true)

    try {
      const response = await interfaceApi.create(formData)

      if (response.success) {
        toast({
          title: "成功",
          description: "接口创建成功",
        })
        setCreateDialogOpen(false)
        resetForm()
        loadInterfaces()
      } else {
        throw new Error(response.error || "创建接口失败")
      }
    } catch (error) {
      toast({
        title: "错误",
        description: error instanceof Error ? error.message : "创建接口失败",
        variant: "destructive",
      })
    } finally {
      setActionLoading(false)
    }
  }

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingInterface) return

    setActionLoading(true)

    try {
      const response = await interfaceApi.update(editingInterface.id.toString(), {
        name: formData.name,
        listen_port: formData.listen_port,
        address: formData.address,
      })

      if (response.success) {
        toast({
          title: "成功",
          description: "接口更新成功",
        })
        setEditDialogOpen(false)
        setEditingInterface(null)
        resetForm()
        loadInterfaces()
      } else {
        throw new Error(response.data.error || "更新接口失败")
      }
    } catch (error) {
      toast({
        title: "错误",
        description: error instanceof Error ? error.message : "更新接口失败",
        variant: "destructive",
      })
    } finally {
      setActionLoading(false)
    }
  }

  const handleStart = async (id: number) => {
    try {
      const response = await interfaceApi.start(id)

      if (response.success) {
        toast({
          title: "成功",
          description: "接口启动成功",
        })
        loadInterfaces()
      } else {
        throw new Error(response.error || "启动接口失败")
      }
    } catch (error) {
      toast({
        title: "错误",
        description: error instanceof Error ? error.message : "启动接口失败",
        variant: "destructive",
      })
    }
  }

  const handleStop = async (id: number) => {
    try {
      const response = await interfaceApi.stop(id)

      if (response.success) {
        toast({
          title: "成功",
          description: "接口停止成功",
        })
        loadInterfaces()
      } else {
        throw new Error(response.error || "停止接口失败")
      }
    } catch (error) {
      toast({
        title: "错误",
        description: error instanceof Error ? error.message : "停止接口失败",
        variant: "destructive",
      })
    }
  }

  const handleDelete = async (id: number) => {
    try {
      const response = await interfaceApi.delete(id.toString())

      if (response.success) {
        toast({
          title: "成功",
          description: "接口删除成功",
        })
        loadInterfaces()
      } else {
        throw new Error(response.data.error || "删除接口失败")
      }
    } catch (error) {
      toast({
        title: "错误",
        description: error instanceof Error ? error.message : "删除接口失败",
        variant: "destructive",
      })
    }
  }

  const handleDownloadConfig = async (id: number, name: string) => {
    try {
      const response = await interfaceApi.getConfig(id.toString())

      if (response.status === 200) {
        const config = response.data
        const blob = new Blob([config], { type: "text/plain" })
        const url = URL.createObjectURL(blob)
        const a = document.createElement("a")
        a.href = url
        a.download = `${name}.conf`
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        URL.revokeObjectURL(url)

        toast({
          title: "成功",
          description: "配置文件下载成功",
        })
      } else {
        throw new Error("下载配置文件失败")
      }
    } catch (error) {
      toast({
        title: "错误",
        description: error instanceof Error ? error.message : "下载配置文件失败",
        variant: "destructive",
      })
    }
  }

  const openEditDialog = (iface: WireGuardInterface) => {
    setEditingInterface(iface)
    setFormData({
      name: iface.name,
      listen_port: iface.listen_port,
      address: iface.address,
      private_key: "",
    })
    setEditDialogOpen(true)
  }

  if (loading) {
    return <LoadingState message="正在加载接口列表..." />
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">接口管理</h2>
          <p className="text-muted-foreground">创建和管理 WireGuard 接口</p>
        </div>
        <div className="flex items-center space-x-2">
          <Button onClick={handleRefresh} variant="outline" disabled={refreshing}>
            <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? "animate-spin" : ""}`} />
            刷新
          </Button>
          <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                创建接口
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>创建新接口</DialogTitle>
                <DialogDescription>配置新的 WireGuard 接口</DialogDescription>
              </DialogHeader>
              <form onSubmit={handleCreate} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">接口名称</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="例如：wg0"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="listen_port">监听端口</Label>
                  <Input
                    id="listen_port"
                    type="number"
                    value={formData.listen_port}
                    onChange={(e) => setFormData({ ...formData, listen_port: Number.parseInt(e.target.value) })}
                    placeholder="51820"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="address">地址</Label>
                  <Input
                    id="address"
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    placeholder="10.0.0.1/24"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="private_key">私钥（可选）</Label>
                  <Input
                    id="private_key"
                    value={formData.private_key}
                    onChange={(e) => setFormData({ ...formData, private_key: e.target.value })}
                    placeholder="留空自动生成"
                  />
                </div>
                <div className="flex justify-end space-x-2">
                  <Button type="button" variant="outline" onClick={() => setCreateDialogOpen(false)}>
                    取消
                  </Button>
                  <Button type="submit" disabled={actionLoading}>
                    {actionLoading ? "创建中..." : "创建"}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="grid gap-6">
        {interfaces.map((iface) => (
          <Card key={iface.id}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div
                    className={`w-3 h-3 rounded-full ${iface.status === "running" ? "bg-green-500" : "bg-gray-400"}`}
                  />
                  <div>
                    <CardTitle className="text-lg">{iface.name}</CardTitle>
                    <CardDescription>
                      {iface.address} • 端口 {iface.listen_port}
                    </CardDescription>
                  </div>
                </div>
                <Badge variant={iface.status === "running" ? "default" : "secondary"}>
                  {iface.status === "running" ? "运行中" : "已停止"}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">对等设备</p>
                    <p className="font-medium">{iface.peers?.length || 0}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">状态</p>
                    <p className="font-medium">{iface.status === "running" ? "运行中" : "已停止"}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">端口</p>
                    <p className="font-medium">{iface.listen_port}</p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  {iface.status === "running" ? (
                    <Button size="sm" variant="outline" onClick={() => handleStop(iface.id)}>
                      <Square className="h-4 w-4 mr-2" />
                      停止
                    </Button>
                  ) : (
                    <Button size="sm" variant="outline" onClick={() => handleStart(iface.id)}>
                      <Play className="h-4 w-4 mr-2" />
                      启动
                    </Button>
                  )}
                  <Button size="sm" variant="outline" onClick={() => handleDownloadConfig(iface.id, iface.name)}>
                    <Download className="h-4 w-4 mr-2" />
                    配置
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => openEditDialog(iface)}>
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
                        <AlertDialogTitle>删除接口</AlertDialogTitle>
                        <AlertDialogDescription>
                          确定要删除接口 "{iface.name}" 吗？此操作无法撤销，同时会删除所有关联的对等设备。
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>取消</AlertDialogCancel>
                        <AlertDialogAction onClick={() => handleDelete(iface.id)}>删除</AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
        {interfaces.length === 0 && (
          <Card>
            <CardContent className="text-center py-12">
              <Settings className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">暂无配置的接口</h3>
              <p className="text-muted-foreground mb-4">创建您的第一个 WireGuard 接口以开始使用</p>
              <Button onClick={() => setCreateDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                创建接口
              </Button>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>编辑接口</DialogTitle>
            <DialogDescription>更新接口配置</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleEdit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit_name">接口名称</Label>
              <Input
                id="edit_name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit_listen_port">监听端口</Label>
              <Input
                id="edit_listen_port"
                type="number"
                value={formData.listen_port}
                onChange={(e) => setFormData({ ...formData, listen_port: Number.parseInt(e.target.value) })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit_address">地址</Label>
              <Input
                id="edit_address"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                required
              />
            </div>
            <div className="flex justify-end space-x-2">
              <Button type="button" variant="outline" onClick={() => setEditDialogOpen(false)}>
                取消
              </Button>
              <Button type="submit" disabled={actionLoading}>
                {actionLoading ? "更新中..." : "更新"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
