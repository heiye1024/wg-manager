"use client"

import { DialogDescription } from "@/components/ui/dialog"

import { Badge } from "@/components/ui/badge"

import type React from "react"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { PlusCircle, Edit, Trash2, Play, StopCircle } from "lucide-react"
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
import { LoadingState } from "@/components/common/loading-state"
import { EmptyState } from "@/components/common/empty-state"
import { wireguardApi } from "@/lib/api"

interface WireGuardInterface {
  id: string
  name: string
  status: "running" | "stopped" | "unknown"
  listen_port: number
  address: string
  public_key: string
  private_key?: string // Should not be exposed normally
  peers_count: number
}

interface InterfaceManagerProps {
  interfaces: WireGuardInterface[]
  onInterfacesChange: () => void
}

export function InterfaceManager({ interfaces: initialInterfaces, onInterfacesChange }: InterfaceManagerProps) {
  const [interfaces, setInterfaces] = useState<WireGuardInterface[]>(initialInterfaces)
  const [loading, setLoading] = useState(false) // Assume initial load is done by parent
  const [isAddEditDialogOpen, setIsAddEditDialogOpen] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [currentInterface, setCurrentInterface] = useState<WireGuardInterface | null>(null)
  const { toast } = useToast()

  useEffect(() => {
    setInterfaces(initialInterfaces)
  }, [initialInterfaces])

  const handleAddInterface = () => {
    setCurrentInterface(null)
    setIsAddEditDialogOpen(true)
  }

  const handleEditInterface = (iface: WireGuardInterface) => {
    setCurrentInterface(iface)
    setIsAddEditDialogOpen(true)
  }

  const handleDeleteInterface = (iface: WireGuardInterface) => {
    setCurrentInterface(iface)
    setIsDeleteDialogOpen(true)
  }

    const handleToggleInterface = async (iface: WireGuardInterface, action: "start" | "stop") => {
    try {
        setLoading(true);
        const data = await wireguardApi.getInterfaces(iface.id, action);

        if (data.success) {
        toast({
            title: "操作成功",
            description: `接口 ${iface.name} 已${action === "start" ? "启动" : "停止"}。`,
        });
        onInterfacesChange(); // 刷新父组件数据
        } else {
        throw new Error(data.message || `Failed to ${action} interface`);
        }
    } catch (error) {
        console.error(`Failed to ${action} interface:`, error);
        toast({
        title: "操作失败",
        description: `接口 ${iface.name} ${action === "start" ? "启动" : "停止"}失败: ${
            error instanceof Error ? error.message : String(error)
        }`,
        variant: "destructive",
        });
    } finally {
        setLoading(false);
    }
    }


  const handleSaveInterface = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const formData = new FormData(event.currentTarget)
    const data = {
      name: formData.get("name") as string,
      listen_port: Number.parseInt(formData.get("listen_port") as string),
      address: formData.get("address") as string,
      private_key: formData.get("private_key") as string,
    }

    try {
      setLoading(true)
      let response
      if (currentInterface) {
        response = await fetch(`/api/interfaces/${currentInterface.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        })
        toast({
          title: "接口更新成功",
          description: `接口 ${data.name} 已更新。`,
        })
      } else {
        response = await fetch("/api/interfaces", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        })
        toast({
          title: "接口添加成功",
          description: `新接口 ${data.name} 已添加。`,
        })
      }

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || "Failed to save interface")
      }

      setIsAddEditDialogOpen(false)
      onInterfacesChange() // Notify parent to refresh data
    } catch (error) {
      console.error("Failed to save interface:", error)
      toast({
        title: "操作失败",
        description: `保存接口时发生错误: ${error instanceof Error ? error.message : String(error)}`,
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleConfirmDelete = async () => {
    if (currentInterface) {
      try {
        setLoading(true)
        const response = await fetch(`/api/interfaces/${currentInterface.id}`, {
          method: "DELETE",
        })
        if (!response.ok) {
          throw new Error("Failed to delete interface")
        }
        const data = await response.json()
        if (data.success) {
          toast({
            title: "接口删除成功",
            description: `接口 ${currentInterface.name} 已删除。`,
          })
          setIsDeleteDialogOpen(false)
          onInterfacesChange() // Notify parent to refresh data
        } else {
          throw new Error(data.message || "Failed to delete interface")
        }
      } catch (error) {
        console.error("Failed to delete interface:", error)
        toast({
          title: "操作失败",
          description: `删除接口时发生错误: ${error instanceof Error ? error.message : String(error)}`,
          variant: "destructive",
        })
      } finally {
        setLoading(false)
      }
    }
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <div>
          <CardTitle>WireGuard 接口管理</CardTitle>
          <CardDescription>配置和管理 WireGuard VPN 接口。</CardDescription>
        </div>
        <Button onClick={handleAddInterface}>
          <PlusCircle className="mr-2 h-4 w-4" /> 添加接口
        </Button>
      </CardHeader>
      <CardContent>
        {loading ? (
          <LoadingState message="正在执行操作..." />
        ) : interfaces.length === 0 ? (
          <EmptyState title="暂无接口" description="点击“添加接口”按钮创建您的第一个 WireGuard 接口。" />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>名称</TableHead>
                <TableHead>状态</TableHead>
                <TableHead>监听端口</TableHead>
                <TableHead>地址</TableHead>
                <TableHead>公钥</TableHead>
                <TableHead className="text-right">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {interfaces.map((iface) => (
                <TableRow key={iface.id}>
                  <TableCell className="font-medium">{iface.name}</TableCell>
                  <TableCell>
                    <Badge variant={iface.status === "running" ? "default" : "secondary"}>
                      {iface.status === "running" ? "运行中" : "已停止"}
                    </Badge>
                  </TableCell>
                  <TableCell>{iface.listen_port}</TableCell>
                  <TableCell>{iface.address}</TableCell>
                  <TableCell className="font-mono text-xs max-w-[150px] truncate">{iface.public_key}</TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleToggleInterface(iface, iface.status === "running" ? "stop" : "start")}
                      className="mr-2"
                    >
                      {iface.status === "running" ? <StopCircle className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                      <span className="sr-only">{iface.status === "running" ? "停止" : "启动"}</span>
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => handleEditInterface(iface)} className="mr-2">
                      <Edit className="h-4 w-4" />
                      <span className="sr-only">编辑</span>
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => handleDeleteInterface(iface)}>
                      <Trash2 className="h-4 w-4" />
                      <span className="sr-only">删除</span>
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>

      {/* Add/Edit Interface Dialog */}
      <Dialog open={isAddEditDialogOpen} onOpenChange={setIsAddEditDialogOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>{currentInterface ? "编辑接口" : "添加新接口"}</DialogTitle>
            <DialogDescription>
              {currentInterface ? "修改接口信息。" : "添加一个新的 WireGuard 接口。"}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSaveInterface} className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="name" className="text-right">
                名称
              </Label>
              <Input
                id="name"
                name="name"
                defaultValue={currentInterface?.name || ""}
                className="col-span-3"
                required
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="listen_port" className="text-right">
                监听端口
              </Label>
              <Input
                id="listen_port"
                name="listen_port"
                type="number"
                defaultValue={currentInterface?.listen_port || 51820}
                className="col-span-3"
                required
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="address" className="text-right">
                接口地址
              </Label>
              <Input
                id="address"
                name="address"
                defaultValue={currentInterface?.address || "10.0.0.1/24"}
                placeholder="例如: 10.0.0.1/24"
                className="col-span-3"
                required
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="private_key" className="text-right">
                私钥
              </Label>
              <Input
                id="private_key"
                name="private_key"
                defaultValue={currentInterface?.private_key || ""}
                placeholder="留空自动生成"
                className="col-span-3"
                type="password"
              />
            </div>
            <DialogFooter>
              <Button type="submit" disabled={loading}>
                {loading ? "保存中..." : currentInterface ? "保存更改" : "添加接口"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确定要删除此接口吗？</AlertDialogTitle>
            <AlertDialogDescription>
              此操作无法撤销。这将永久删除接口 <span className="font-semibold">{currentInterface?.name}</span>{" "}
              及其所有相关配置和对等设备。
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
    </Card>
  )
}
