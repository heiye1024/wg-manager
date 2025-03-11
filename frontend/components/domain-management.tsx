"use client"

import { useState } from "react"
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
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Copy, ExternalLink, Plus, RefreshCw, Search, Trash, Edit } from "lucide-react"

type DomainRecord = {
  id: string
  domain: string
  type: "A" | "CNAME" | "MX" | "TXT"
  value: string
  ttl: number
  device?: string
  deviceId?: string
}

const domainRecords: DomainRecord[] = [
  {
    id: "1",
    domain: "server-a.example.com",
    type: "A",
    value: "192.168.1.10",
    ttl: 3600,
    device: "服务器A",
    deviceId: "3",
  },
  {
    id: "2",
    domain: "backup.example.com",
    type: "A",
    value: "192.168.1.11",
    ttl: 3600,
    device: "备份服务器",
    deviceId: "4",
  },
  {
    id: "3",
    domain: "app.example.com",
    type: "A",
    value: "192.168.1.12",
    ttl: 3600,
    device: "Web应用服务器",
    deviceId: "8",
  },
  {
    id: "4",
    domain: "*.iot.local",
    type: "CNAME",
    value: "iot-gateway.local",
    ttl: 3600,
  },
  {
    id: "5",
    domain: "temp-sensor.iot.local",
    type: "A",
    value: "192.168.1.30",
    ttl: 3600,
    device: "温度传感器",
    deviceId: "6",
  },
  {
    id: "6",
    domain: "camera1.iot.local",
    type: "A",
    value: "192.168.1.31",
    ttl: 3600,
    device: "监控摄像头",
    deviceId: "7",
  },
  {
    id: "7",
    domain: "router.local",
    type: "A",
    value: "192.168.1.1",
    ttl: 3600,
    device: "办公室路由器",
    deviceId: "1",
  },
  {
    id: "8",
    domain: "ap-meeting.local",
    type: "A",
    value: "192.168.1.2",
    ttl: 3600,
    device: "会议室AP",
    deviceId: "2",
  },
]

export function DomainManagement() {
  const [searchQuery, setSearchQuery] = useState("")
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)

  const filteredRecords = domainRecords.filter(
    (record) =>
      record.domain.toLowerCase().includes(searchQuery.toLowerCase()) ||
      record.value.includes(searchQuery) ||
      (record.device && record.device.toLowerCase().includes(searchQuery.toLowerCase())),
  )

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>域名管理</CardTitle>
            <CardDescription>管理设备的域名访问配置</CardDescription>
          </div>
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                添加域名记录
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle>添加新域名记录</DialogTitle>
                <DialogDescription>为设备创建新的域名记录，方便通过域名访问设备</DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="domain" className="text-right">
                    域名
                  </Label>
                  <Input id="domain" placeholder="device.example.com" className="col-span-3" />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="type" className="text-right">
                    记录类型
                  </Label>
                  <Select defaultValue="A">
                    <SelectTrigger className="col-span-3">
                      <SelectValue placeholder="选择记录类型" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="A">A 记录</SelectItem>
                      <SelectItem value="CNAME">CNAME 记录</SelectItem>
                      <SelectItem value="MX">MX 记录</SelectItem>
                      <SelectItem value="TXT">TXT 记录</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="value" className="text-right">
                    记录值
                  </Label>
                  <Input id="value" placeholder="192.168.1.x" className="col-span-3" />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="ttl" className="text-right">
                    TTL (秒)
                  </Label>
                  <Input id="ttl" type="number" defaultValue="3600" className="col-span-3" />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="device" className="text-right">
                    关联设备
                  </Label>
                  <Select>
                    <SelectTrigger className="col-span-3">
                      <SelectValue placeholder="选择设备" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="3">服务器A</SelectItem>
                      <SelectItem value="4">备份服务器</SelectItem>
                      <SelectItem value="6">温度传感器</SelectItem>
                      <SelectItem value="7">监控摄像头</SelectItem>
                      <SelectItem value="8">Web应用服务器</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                  取消
                </Button>
                <Button onClick={() => setIsAddDialogOpen(false)}>保存</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="records" className="space-y-4">
          <TabsList>
            <TabsTrigger value="records">域名记录</TabsTrigger>
            <TabsTrigger value="dns">DNS 配置</TabsTrigger>
            <TabsTrigger value="certificates">SSL 证书</TabsTrigger>
          </TabsList>
          <TabsContent value="records">
            <div className="flex items-center justify-between mb-4">
              <div className="relative w-64">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="搜索域名记录..."
                  className="pl-8"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm">
                  <RefreshCw className="mr-2 h-4 w-4" />
                  刷新
                </Button>
                <Button variant="outline" size="sm">
                  导出
                </Button>
              </div>
            </div>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>域名</TableHead>
                    <TableHead>类型</TableHead>
                    <TableHead>值</TableHead>
                    <TableHead>TTL</TableHead>
                    <TableHead>关联设备</TableHead>
                    <TableHead className="w-[100px]">操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredRecords.map((record) => (
                    <TableRow key={record.id}>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-1">
                          <span>{record.domain}</span>
                          <a
                            href={`http://${record.domain}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-primary hover:text-primary/80"
                          >
                            <ExternalLink className="h-3.5 w-3.5" />
                            <span className="sr-only">访问</span>
                          </a>
                        </div>
                      </TableCell>
                      <TableCell>{record.type}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <span className="font-mono text-sm">{record.value}</span>
                          <Button variant="ghost" size="icon" className="h-5 w-5">
                            <Copy className="h-3.5 w-3.5" />
                            <span className="sr-only">复制</span>
                          </Button>
                        </div>
                      </TableCell>
                      <TableCell>{record.ttl}</TableCell>
                      <TableCell>
                        {record.device ? (
                          <span>{record.device}</span>
                        ) : (
                          <span className="text-muted-foreground text-sm">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <Edit className="h-4 w-4" />
                            <span className="sr-only">编辑</span>
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-red-600">
                            <Trash className="h-4 w-4" />
                            <span className="sr-only">删除</span>
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </TabsContent>
          <TabsContent value="dns">
            <Card>
              <CardHeader>
                <CardTitle>DNS 服务器配置</CardTitle>
                <CardDescription>配置内部和外部 DNS 服务器设置</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>主 DNS 服务器</Label>
                  <div className="flex gap-2">
                    <Input defaultValue="192.168.1.1" className="max-w-xs" />
                    <Button variant="outline">测试</Button>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>备用 DNS 服务器</Label>
                  <div className="flex gap-2">
                    <Input defaultValue="8.8.8.8" className="max-w-xs" />
                    <Button variant="outline">测试</Button>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>本地域名解析</Label>
                  <Select defaultValue="enabled">
                    <SelectTrigger className="max-w-xs">
                      <SelectValue placeholder="选择状态" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="enabled">启用</SelectItem>
                      <SelectItem value="disabled">禁用</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="pt-4">
                  <Button>保存 DNS 配置</Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          <TabsContent value="certificates">
            <Card>
              <CardHeader>
                <CardTitle>SSL 证书管理</CardTitle>
                <CardDescription>管理设备的 SSL 证书，启用 HTTPS 安全访问</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-medium">已配置的证书</h3>
                  <Button>
                    <Plus className="mr-2 h-4 w-4" />
                    添加证书
                  </Button>
                </div>
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>域名</TableHead>
                        <TableHead>颁发者</TableHead>
                        <TableHead>到期日期</TableHead>
                        <TableHead>状态</TableHead>
                        <TableHead className="w-[100px]">操作</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      <TableRow>
                        <TableCell className="font-medium">*.example.com</TableCell>
                        <TableCell>Let's Encrypt</TableCell>
                        <TableCell>2024-12-31</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div className="h-2.5 w-2.5 rounded-full bg-green-500" />
                            <span>有效</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <RefreshCw className="h-4 w-4" />
                              <span className="sr-only">更新</span>
                            </Button>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-red-600">
                              <Trash className="h-4 w-4" />
                              <span className="sr-only">删除</span>
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell className="font-medium">app.example.com</TableCell>
                        <TableCell>Let's Encrypt</TableCell>
                        <TableCell>2024-10-15</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div className="h-2.5 w-2.5 rounded-full bg-green-500" />
                            <span>有效</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <RefreshCw className="h-4 w-4" />
                              <span className="sr-only">更新</span>
                            </Button>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-red-600">
                              <Trash className="h-4 w-4" />
                              <span className="sr-only">删除</span>
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </div>
                <div className="pt-2">
                  <h3 className="text-lg font-medium mb-2">自动证书管理</h3>
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2">
                      <input type="checkbox" id="auto-renew" className="rounded border-gray-300" defaultChecked />
                      <Label htmlFor="auto-renew">自动续期证书</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <input type="checkbox" id="auto-https" className="rounded border-gray-300" defaultChecked />
                      <Label htmlFor="auto-https">为所有域名自动启用 HTTPS</Label>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
}

