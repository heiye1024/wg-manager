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
} from "@/components/ui/alert-dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import {
  Edit,
  ExternalLink,
  Globe,
  Loader2,
  MoreHorizontal,
  Plus,
  RefreshCw,
  Search,
  Trash,
  Eye,
  Activity,
} from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { deviceApi } from "@/lib/api"
import { useToast } from "@/hooks/use-toast"

type Device = {
  id: string
  name: string
  ip: string
  mac: string
  type: string
  status: "online" | "offline" | "warning"
  lastSeen: string
  domain?: string
  location?: string
  description?: string
  createdAt: string
}

const deviceTypes = ["路由器", "交换机", "接入点", "服务器", "打印机", "IoT设备", "摄像头", "传感器", "其他"]

export function EnhancedDeviceList() {
  const [devices, setDevices] = useState<Device[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedDevice, setSelectedDevice] = useState<Device | null>(null)
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [deleteLoading, setDeleteLoading] = useState(false)
  const [formData, setFormData] = useState({
    name: "",
    ip: "",
    mac: "",
    type: "",
    domain: "",
    location: "",
    description: "",
  })

  const { toast } = useToast()

  // 加载设备列表
  const loadDevices = async () => {
    try {
      setLoading(true)
      const response = await deviceApi.getDevices()
      // Ensure response is an array
      const devicesData = Array.isArray(response) ? response : []
      setDevices(devicesData)
    } catch (error) {
      console.error("Failed to load devices:", error)
      // Set empty array on error
      setDevices([])
      toast({
        title: "加载失败",
        description: "无法加载设备列表",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  // 添加设备
  const handleAddDevice = async () => {
    try {
      // 验证表单
      if (!formData.name || !formData.ip || !formData.mac || !formData.type) {
        toast({
          title: "表单不完整",
          description: "请填写所有必填字段",
          variant: "destructive",
        })
        return
      }

      await deviceApi.addDevice(formData)
      toast({
        title: "添加成功",
        description: "设备已成功添加",
      })

      // 重置表单并关闭对话框
      setFormData({
        name: "",
        ip: "",
        mac: "",
        type: "",
        domain: "",
        location: "",
        description: "",
      })
      setIsAddDialogOpen(false)

      // 重新加载设备列表
      loadDevices()
    } catch (error: any) {
      console.error("Failed to add device:", error)
      toast({
        title: "添加失败",
        description: error.response?.data?.error || "无法添加设备",
        variant: "destructive",
      })
    }
  }

  // 编辑设备
  const handleEditDevice = async () => {
    if (!selectedDevice) return

    try {
      await deviceApi.updateDevice(selectedDevice.id, formData)
      toast({
        title: "更新成功",
        description: "设备信息已成功更新",
      })

      // 关闭对话框并重新加载
      setIsEditDialogOpen(false)
      loadDevices()
    } catch (error: any) {
      console.error("Failed to update device:", error)
      toast({
        title: "更新失败",
        description: error.response?.data?.error || "无法更新设备",
        variant: "destructive",
      })
    }
  }

  // 删除设备
  const handleDeleteDevice = async () => {
    if (!selectedDevice) return

    try {
      setDeleteLoading(true)
      await deviceApi.deleteDevice(selectedDevice.id)
      toast({
        title: "删除成功",
        description: "设备已成功删除",
      })

      // 关闭对话框并重新加载
      setDeleteDialogOpen(false)
      loadDevices()
    } catch (error) {
      console.error("Failed to delete device:", error)
      toast({
        title: "删除失败",
        description: "无法删除设备",
        variant: "destructive",
      })
    } finally {
      setDeleteLoading(false)
    }
  }

  // 打开编辑对话框
  const openEditDialog = (device: Device) => {
    setSelectedDevice(device)
    setFormData({
      name: device.name,
      ip: device.ip,
      mac: device.mac,
      type: device.type,
      domain: device.domain || "",
      location: device.location || "",
      description: device.description || "",
    })
    setIsEditDialogOpen(true)
  }

  // 打开查看对话框
  const openViewDialog = (device: Device) => {
    setSelectedDevice(device)
    setIsViewDialogOpen(true)
  }

  // 打开删除对话框
  const openDeleteDialog = (device: Device) => {
    setSelectedDevice(device)
    setDeleteDialogOpen(true)
  }

  // 过滤设备
  const filteredDevices = devices.filter(
    (device) =>
      device.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      device.ip.includes(searchQuery) ||
      device.mac.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (device.domain && device.domain.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (device.location && device.location.toLowerCase().includes(searchQuery.toLowerCase())),
  )

  // 获取状态徽章
  const getStatusBadge = (status: string) => {
    switch (status) {
      case "online":
        return <Badge className="bg-green-500 hover:bg-green-600">在线</Badge>
      case "offline":
        return <Badge variant="destructive">离线</Badge>
      case "warning":
        return <Badge className="bg-yellow-500 hover:bg-yellow-600">警告</Badge>
      default:
        return <Badge variant="secondary">未知</Badge>
    }
  }

  // 格式化最后在线时间
  const formatLastSeen = (lastSeen: string) => {
    const now = new Date()
    const lastSeenDate = new Date(lastSeen)
    const diffMs = now.getTime() - lastSeenDate.getTime()
    const diffMins = Math.floor(diffMs / (1000 * 60))

    if (diffMins < 1) return "刚刚"
    if (diffMins < 60) return `${diffMins}分钟前`
    if (diffMins < 1440) return `${Math.floor(diffMins / 60)}小时前`
    return `${Math.floor(diffMins / 1440)}天前`
  }

  // 初始加载
  useEffect(() => {
    loadDevices()
  }, [])

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>设备管理</CardTitle>
            <CardDescription>管理和监控网络中的所有设备</CardDescription>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={loadDevices} disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
              <span className="sr-only">刷新</span>
            </Button>

            <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  添加设备
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[600px]">
                <DialogHeader>
                  <DialogTitle>添加新设备</DialogTitle>
                  <DialogDescription>添加新的网络设备到系统中</DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="name">设备名称 *</Label>
                      <Input
                        id="name"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        placeholder="例如：办公室路由器"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="type">设备类型 *</Label>
                      <Select
                        value={formData.type}
                        onValueChange={(value) => setFormData({ ...formData, type: value })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="选择设备类型" />
                        </SelectTrigger>
                        <SelectContent>
                          {deviceTypes.map((type) => (
                            <SelectItem key={type} value={type}>
                              {type}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="ip">IP 地址 *</Label>
                      <Input
                        id="ip"
                        value={formData.ip}
                        onChange={(e) => setFormData({ ...formData, ip: e.target.value })}
                        placeholder="192.168.1.x"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="mac">MAC 地址 *</Label>
                      <Input
                        id="mac"
                        value={formData.mac}
                        onChange={(e) => setFormData({ ...formData, mac: e.target.value })}
                        placeholder="00:1A:2B:3C:4D:5E"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="domain">域名</Label>
                      <Input
                        id="domain"
                        value={formData.domain}
                        onChange={(e) => setFormData({ ...formData, domain: e.target.value })}
                        placeholder="device.local"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="location">位置</Label>
                      <Input
                        id="location"
                        value={formData.location}
                        onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                        placeholder="办公室、机房等"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="description">描述</Label>
                    <Textarea
                      id="description"
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      placeholder="设备的详细描述..."
                      rows={3}
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                    取消
                  </Button>
                  <Button onClick={handleAddDevice}>添加设备</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between mb-4">
          <div className="relative w-64">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="搜索设备..."
              className="pl-8"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm">
              导出
            </Button>
            <Button variant="outline" size="sm">
              筛选
            </Button>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : Array.isArray(filteredDevices) && filteredDevices.length > 0 ? (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>设备名称</TableHead>
                  <TableHead>IP 地址</TableHead>
                  <TableHead>域名</TableHead>
                  <TableHead>类型</TableHead>
                  <TableHead>位置</TableHead>
                  <TableHead>状态</TableHead>
                  <TableHead>最后在线</TableHead>
                  <TableHead className="w-[80px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredDevices.map((device) => (
                  <TableRow key={device.id}>
                    <TableCell className="font-medium">{device.name}</TableCell>
                    <TableCell>{device.ip}</TableCell>
                    <TableCell>
                      {device.domain ? (
                        <div className="flex items-center gap-1">
                          <span>{device.domain}</span>
                          <a
                            href={`http://${device.domain}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-primary hover:text-primary/80"
                          >
                            <ExternalLink className="h-3.5 w-3.5" />
                            <span className="sr-only">访问</span>
                          </a>
                        </div>
                      ) : (
                        <span className="text-muted-foreground text-sm">未配置</span>
                      )}
                    </TableCell>
                    <TableCell>{device.type}</TableCell>
                    <TableCell>{device.location || "-"}</TableCell>
                    <TableCell>{getStatusBadge(device.status)}</TableCell>
                    <TableCell>{formatLastSeen(device.lastSeen)}</TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="h-4 w-4" />
                            <span className="sr-only">打开菜单</span>
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel>操作</DropdownMenuLabel>
                          <DropdownMenuItem onClick={() => openViewDialog(device)}>
                            <Eye className="mr-2 h-4 w-4" />
                            查看详情
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => openEditDialog(device)}>
                            <Edit className="mr-2 h-4 w-4" />
                            编辑
                          </DropdownMenuItem>
                          <DropdownMenuItem>
                            <Globe className="mr-2 h-4 w-4" />
                            配置域名
                          </DropdownMenuItem>
                          <DropdownMenuItem>
                            <Activity className="mr-2 h-4 w-4" />
                            网络诊断
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem className="text-red-600" onClick={() => openDeleteDialog(device)}>
                            <Trash className="mr-2 h-4 w-4" />
                            删除
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            {searchQuery ? "没有找到匹配的设备" : "没有找到设备"}
          </div>
        )}
      </CardContent>

      {/* 编辑对话框 */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>编辑设备</DialogTitle>
            <DialogDescription>修改设备的配置信息</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-name">设备名称 *</Label>
                <Input
                  id="edit-name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-type">设备类型 *</Label>
                <Select value={formData.type} onValueChange={(value) => setFormData({ ...formData, type: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {deviceTypes.map((type) => (
                      <SelectItem key={type} value={type}>
                        {type}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-ip">IP 地址 *</Label>
                <Input
                  id="edit-ip"
                  value={formData.ip}
                  onChange={(e) => setFormData({ ...formData, ip: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-mac">MAC 地址 *</Label>
                <Input
                  id="edit-mac"
                  value={formData.mac}
                  onChange={(e) => setFormData({ ...formData, mac: e.target.value })}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-domain">域名</Label>
                <Input
                  id="edit-domain"
                  value={formData.domain}
                  onChange={(e) => setFormData({ ...formData, domain: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-location">位置</Label>
                <Input
                  id="edit-location"
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-description">描述</Label>
              <Textarea
                id="edit-description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              取消
            </Button>
            <Button onClick={handleEditDevice}>保存更改</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 查看详情对话框 */}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>设备详情</DialogTitle>
            <DialogDescription>{selectedDevice?.name} 的详细信息</DialogDescription>
          </DialogHeader>
          {selectedDevice && (
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">设备名称</Label>
                  <p className="mt-1">{selectedDevice.name}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">设备类型</Label>
                  <p className="mt-1">{selectedDevice.type}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">IP 地址</Label>
                  <p className="mt-1 font-mono">{selectedDevice.ip}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">MAC 地址</Label>
                  <p className="mt-1 font-mono">{selectedDevice.mac}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">域名</Label>
                  <p className="mt-1">{selectedDevice.domain || "未配置"}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">位置</Label>
                  <p className="mt-1">{selectedDevice.location || "未指定"}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">状态</Label>
                  <div className="mt-1">{getStatusBadge(selectedDevice.status)}</div>
                </div>
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">最后在线</Label>
                  <p className="mt-1">{formatLastSeen(selectedDevice.lastSeen)}</p>
                </div>
              </div>
              {selectedDevice.description && (
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">描述</Label>
                  <p className="mt-1">{selectedDevice.description}</p>
                </div>
              )}
              <div>
                <Label className="text-sm font-medium text-muted-foreground">创建时间</Label>
                <p className="mt-1">{new Date(selectedDevice.createdAt).toLocaleString()}</p>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsViewDialogOpen(false)}>
              关闭
            </Button>
            <Button onClick={() => selectedDevice && openEditDialog(selectedDevice)}>
              <Edit className="mr-2 h-4 w-4" />
              编辑
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 删除确认对话框 */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认删除</AlertDialogTitle>
            <AlertDialogDescription>
              您确定要删除设备 "{selectedDevice?.name}" 吗？此操作无法撤销。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteLoading}>取消</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault()
                handleDeleteDevice()
              }}
              disabled={deleteLoading}
              className="bg-red-600 hover:bg-red-700"
            >
              {deleteLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash className="mr-2 h-4 w-4" />}
              删除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  )
}
