"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
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
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Download, Loader2, Plus, RefreshCw, Settings, Trash, Edit, QrCode, Copy, CheckCircle, XCircle } from 'lucide-react'
import { wireguardApi } from "@/lib/api"
import { useToast } from "@/hooks/use-toast"

type Peer = {
  id: string
  name: string
  publicKey: string
  allowedIPs: string
  endpoint: string
  status: "online" | "offline"
  createdAt: string
  lastHandshake: string
}

type ServerStatus = {
  running: boolean
  publicIp: string
  listenPort: number
  interface: string
  connectedPeers: number
  totalPeers: number
  uptime: string
  transferRx: string
  transferTx: string
  lastUpdated: string
}

export function WireguardConfig() {
  const [peers, setPeers] = useState<Peer[]>([])
  const [serverStatus, setServerStatus] = useState<ServerStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [statusLoading, setStatusLoading] = useState(true)
  const [restartLoading, setRestartLoading] = useState(false)
  const [selectedPeer, setSelectedPeer] = useState<Peer | null>(null)
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [isConfigDialogOpen, setIsConfigDialogOpen] = useState(false)
  const [peerConfig, setPeerConfig] = useState("")
  const [configLoading, setConfigLoading] = useState(false)
  const [formData, setFormData] = useState({
    name: "",
    publicKey: "",
    allowedIPs: "",
    endpoint: ""
  })
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [deleteLoading, setDeleteLoading] = useState(false)
  
  const { toast } = useToast()

  // 加载对等设备列表
  const loadPeers = async () => {
    try {
      setLoading(true)
      const response = await wireguardApi.getPeers()
      setPeers(response)
    } catch (error) {
      console.error("Failed to load peers:", error)
      toast({
        title: "加载失败",
        description: "无法加载对等设备列表",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  // 加载服务器状态
  const loadServerStatus = async () => {
    try {
      setStatusLoading(true)
      const response = await wireguardApi.getServerStatus()
      setServerStatus(response)
    } catch (error) {
      console.error("Failed to load server status:", error)
      toast({
        title: "加载失败",
        description: "无法加载服务器状态",
        variant: "destructive"
      })
    } finally {
      setStatusLoading(false)
    }
  }

  // 重启 WireGuard 服务
  const handleRestartService = async () => {
    try {
      setRestartLoading(true)
      await wireguardApi.restartService()
      toast({
        title: "重启成功",
        description: "WireGuard 服务已成功重启"
      })
      // 重新加载状态
      loadServerStatus()
    } catch (error) {
      console.error("Failed to restart service:", error)
      toast({
        title: "重启失败",
        description: "无法重启 WireGuard 服务",
        variant: "destructive"
      })
    } finally {
      setRestartLoading(false)
    }
  }

  // 添加对等设备
  const handleAddPeer = async () => {
    try {
      // 验证表单
      if (!formData.name || !formData.publicKey || !formData.allowedIPs) {
        toast({
          title: "表单不完整",
          description: "请填写所有必填字段",
          variant: "destructive"
        })
        return
      }
      
      await wireguardApi.addPeer(formData)
      toast({
        title: "添加成功",
        description: "对等设备已成功添加"
      })
      
      // 重置表单并关闭对话框
      setFormData({
        name: "",
        publicKey: "",
        allowedIPs: "",
        endpoint: ""
      })
      setIsAddDialogOpen(false)
      
      // 重新加载对等设备列表
      loadPeers()
    } catch (error) {
      console.error("Failed to add peer:", error)
      toast({
        title: "添加失败",
        description: "无法添加对等设备",
        variant: "destructive"
      })
    }
  }

  // 编辑对等设备
  const handleEditPeer = async () => {
    if (!selectedPeer) return
    
    try {
      await wireguardApi.updatePeer(selectedPeer.id, formData)
      toast({
        title: "更新成功",
        description: "对等设备已成功更新"
      })
      
      // 关闭对话框并重新加载
      setIsEditDialogOpen(false)
      loadPeers()
    } catch (error) {
      console.error("Failed to update peer:", error)
      toast({
        title: "更新失败",
        description: "无法更新对等设备",
        variant: "destructive"
      })
    }
  }

  // 删除对等设备
  const handleDeletePeer = async () => {
    if (!selectedPeer) return
    
    try {
      setDeleteLoading(true)
      await wireguardApi.deletePeer(selectedPeer.id)
      toast({
        title: "删除成功",
        description: "对等设备已成功删除"
      })
      
      // 关闭对话框并重新加载
      setDeleteDialogOpen(false)
      loadPeers()
    } catch (error) {
      console.error("Failed to delete peer:", error)
      toast({
        title: "删除失败",
        description: "无法删除对等设备",
        variant: "destructive"
      })
    } finally {
      setDeleteLoading(false)
    }
  }

  // 获取客户端配置
  const handleGetConfig = async (peer: Peer) => {
    setSelectedPeer(peer)
    setConfigLoading(true)
    setIsConfigDialogOpen(true)
    
    try {
      const response = await wireguardApi.generateClientConfig(peer.id)
      setPeerConfig(response.config)
    } catch (error) {
      console.error("Failed to get config:", error)
      toast({
        title: "获取配置失败",
        description: "无法获取客户端配置",
        variant: "destructive"
      })
    } finally {
      setConfigLoading(false)
    }
  }

  // 复制配置到剪贴板
  const handleCopyConfig = () => {
    navigator.clipboard.writeText(peerConfig)
    toast({
      title: "复制成功",
      description: "配置已复制到剪贴板"
    })
  }

  // 下载配置文件
  const handleDownloadConfig = () => {
    const blob = new Blob([peerConfig], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${selectedPeer?.name || 'wireguard'}.conf`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  // 打开编辑对话框
  const openEditDialog = (peer: Peer) => {
    setSelectedPeer(peer)
    setFormData({
      name: peer.name,
      publicKey: peer.publicKey,
      allowedIPs: peer.allowedIPs,
      endpoint: peer.endpoint
    })
    setIsEditDialogOpen(true)
  }

  // 打开删除对话框
  const openDeleteDialog = (peer: Peer) => {
    setSelectedPeer(peer)
    setDeleteDialogOpen(true)
  }

  // 初始加载
  useEffect(() => {
    loadPeers()
    loadServerStatus()
  }, [])

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>WireGuard 服务器状态</CardTitle>
            <CardDescription>监控和管理 WireGuard VPN 服务器</CardDescription>
          </div>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={loadServerStatus}
            disabled={statusLoading}
          >
            {statusLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
            <span className="sr-only">刷新</span>
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          {statusLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : serverStatus ? (
            <>
              <div className="flex items-center space-x-2">
                {serverStatus.running ? (
                  <>
                    <div className="h-3 w-3 rounded-full bg-green-500"></div>
                    <span className="font-medium">运行中</span>
                  </>
                ) : (
                  <>
                    <div className="h-3 w-3 rounded-full bg-red-500"></div>
                    <span className="font-medium">已停止</span>
                  </>
                )}
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="ml-auto"
                  onClick={handleRestartService}
                  disabled={restartLoading}
                >
                  {restartLoading ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <RefreshCw className="mr-2 h-4 w-4" />
                  )}
                  重启服务
                </Button>
              </div>
              
              <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">公网 IP</p>
                  <p>{serverStatus.publicIp}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">监听端口</p>
                  <p>{serverStatus.listenPort}/UDP</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">接口</p>
                  <p>{serverStatus.interface}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">已连接客户端</p>
                  <p>{serverStatus.connectedPeers}/{serverStatus.totalPeers}</p>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">运行时间</p>
                  <p>{serverStatus.uptime}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">接收流量</p>
                  <p>{serverStatus.transferRx}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">发送流量</p>
                  <p>{serverStatus.transferTx}</p>
                </div>
              </div>
              
              <div className="text-xs text-muted-foreground">
                最后更新: {new Date(serverStatus.lastUpdated).toLocaleString()}
              </div>
            </>
          ) : (
            <div className="text-center py-4 text-muted-foreground">
              无法加载服务器状态
            </div>
          )}
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>对等设备</CardTitle>
            <CardDescription>管理 WireGuard VPN 对等设备连接</CardDescription>
          </div>
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={loadPeers}
              disabled={loading}
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
              <span className="sr-only">刷新</span>
            </Button>
            
            <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm">
                  <Plus className="mr-2 h-4 w-4" />
                  添加设备
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                  <DialogTitle>添加新对等设备</DialogTitle>
                  <DialogDescription>
                    添加新的 WireGuard 对等设备连接
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="name" className="text-right">
                      设备名称
                    </Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="col-span-3"
                    />
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="publicKey" className="text-right">
                      公钥
                    </Label>
                    <Input
                      id="publicKey"
                      value={formData.publicKey}
                      onChange={(e) => setFormData({ ...formData, publicKey: e.target.value })}
                      className="col-span-3"
                    />
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="allowedIPs" className="text-right">
                      分配 IP
                    </Label>
                    <Input
                      id="allowedIPs"
                      placeholder="10.0.0.x/32"
                      value={formData.allowedIPs}
                      onChange={(e) => setFormData({ ...formData, allowedIPs: e.target.value })}
                      className="col-span-3"
                    />
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="endpoint" className="text-right">
                      终端点
                    </Label>
                    <Input
                      id="endpoint"
                      placeholder="可选"
                      value={formData.endpoint}
                      onChange={(e) => setFormData({ ...formData, endpoint: e.target.value })}
                      className="col-span-3"
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                    取消
                  </Button>
                  <Button onClick={handleAddPeer}>添加</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : peers.length > 0 ? (
            <div className="rounded-md border">
              <div className="grid grid-cols-12 gap-4 p-4 font-medium">
                <div className="col-span-2">名称</div>
                <div className="col-span-3">公钥</div>
                <div className="col-span-2">分配 IP</div>
                <div className="col-span-2">状态</div>
                <div className="col-span-3">操作</div>
              </div>
              {peers.map((peer) => (
                <div key={peer.id} className="grid grid-cols-12 gap-4 border-t p-4">
                  <div className="col-span-2 font-medium">{peer.name}</div>
                  <div className="col-span-3 truncate text-sm text-muted-foreground">
                    {peer.publicKey.substring(0, 8)}...{peer.publicKey.substring(peer.publicKey.length - 4)}
                  </div>
                  <div className="col-span-2">{peer.allowedIPs}</div>
                  <div className="col-span-2">
                    <div className="flex items-center space-x-2">
                      <div className={`h-2 w-2 rounded-full ${peer.status === "online" ? "bg-green-500" : "bg-red-500"}`}></div>
                      <span>{peer.status === "online" ? "在线" : "离线"}</span>
                    </div>
                  </div>
                  <div className="col-span-3 flex items-center space-x-2">
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => handleGetConfig(peer)}
                    >
                      <Download className="h-4 w-4" />
                      <span className="sr-only">下载配置</span>
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => openEditDialog(peer)}
                    >
                      <Edit className="h-4 w-4" />
                      <span className="sr-only">编辑</span>
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm"
                      className="text-red-600 hover:text-red-700"
                      onClick={() => openDeleteDialog(peer)}
                    >
                      <Trash className="h-4 w-4" />
                      <span className="sr-only">删除</span>
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              没有找到对等设备
            </div>
          )}
        </CardContent>
      </Card>
      
      {/* 编辑对话框 */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>编辑对等设备</DialogTitle>
            <DialogDescription>
              修改 WireGuard 对等设备的配置
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="edit-name" className="text-right">
                设备名称
              </Label>
              <Input
                id="edit-name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="edit-publicKey" className="text-right">
                公钥
              </Label>
              <Input
                id="edit-publicKey"
                value={formData.publicKey}
                onChange={(e) => setFormData({ ...formData, publicKey: e.target.value })}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="edit-allowedIPs" className="text-right">
                分配 IP
              </Label>
              <Input
                id="edit-allowedIPs"
                value={formData.allowedIPs}
                onChange={(e) => setFormData({ ...formData, allowedIPs: e.target.value })}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="edit-endpoint" className="text-right">
                终端点
              </Label>
              <Input
                id="edit-endpoint"
                value={formData.endpoint}
                onChange={(e) => setFormData({ ...formData, endpoint: e.target.value })}
                className="col-span-3"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              取消
            </Button>
            <Button onClick={handleEditPeer}>保存更改</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* 配置对话框 */}
      <Dialog open={isConfigDialogOpen} onOpenChange={setIsConfigDialogOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>WireGuard 客户端配置</DialogTitle>
            <DialogDescription>
              {selectedPeer?.name} 的 WireGuard 配置
            </DialogDescription>
          </DialogHeader>
          
          {configLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <Tabs defaultValue="config" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="config">配置文件</TabsTrigger>
                <TabsTrigger value="qrcode">二维码</TabsTrigger>
              </TabsList>
              <TabsContent value="config" className="space-y-4 py-4">
                <div className="relative">
                  <pre className="rounded-md bg-muted p-4 overflow-auto text-sm font-mono">
                    {peerConfig}
                  </pre>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="absolute top-2 right-2"
                    onClick={handleCopyConfig}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
                <div className="flex justify-end space-x-2">
                  <Button variant="outline" onClick={() => setIsConfigDialogOpen(false)}>
                    关闭
                  </Button>
                  <Button onClick={handleDownloadConfig}>
                    <Download className="mr-2 h-4 w-4" />
                    下载配置
                  </Button>
                </div>
              </TabsContent>
              <TabsContent value="qrcode" className="py-4">
                <div className="flex justify-center py-4">
                  <div className="bg-white p-4 rounded-md">
                    {/* 这里应该是实际的二维码，这里用占位符代替 */}
                    <div className="w-64 h-64 bg-muted flex items-center justify-center">
                      <QrCode className="h-32 w-32 text-muted-foreground" />
                    </div>
                  </div>
                </div>
                <p className="text-center text-sm text-muted-foreground">
                  使用 WireGuard 移动应用扫描此二维码
                </p>
              </TabsContent>
            </Tabs>
          )}
        </DialogContent>
      </Dialog>
      
      {/* 删除确认对话框 */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认删除</AlertDialogTitle>
            <AlertDialogDescription>
              您确定要删除对等设备 "{selectedPeer?.name}" 吗？此操作无法撤销。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteLoading}>取消</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault()
                handleDeletePeer()
              }}
              disabled={deleteLoading}
              className="bg-red-600 hover:bg-red-700"
            >
              {deleteLoading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Trash className="mr-2 h-4 w-4" />
              )}
              删除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
