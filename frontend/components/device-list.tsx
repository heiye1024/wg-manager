"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Edit, ExternalLink, Globe, MoreHorizontal, Plus, Search, Trash } from "lucide-react"

type Device = {
  id: string
  name: string
  ip: string
  mac: string
  type: string
  status: "online" | "offline" | "warning"
  lastSeen: string
  domain?: string
}

const devices: Device[] = [
  {
    id: "1",
    name: "红花岭",
    ip: "192.168.1.1",
    mac: "00:1A:2B:3C:4D:5E",
    type: "盒子",
    status: "online",
    lastSeen: "刚刚",
    domain: "router.local",
  },
  {
    id: "2",
    name: "盒子",
    ip: "192.168.1.2",
    mac: "00:2B:3C:4D:5E:6F",
    type: "接入点",
    status: "online",
    lastSeen: "5分钟前",
    domain: "ap-meeting.local",
  },
  {
    id: "3",
    name: "服务器A",
    ip: "192.168.1.10",
    mac: "00:3C:4D:5E:6F:7G",
    type: "服务器",
    status: "online",
    lastSeen: "10分钟前",
    domain: "server-a.example.com",
  },
  {
    id: "4",
    name: "备份服务器",
    ip: "192.168.1.11",
    mac: "00:4D:5E:6F:7G:8H",
    type: "服务器",
    status: "offline",
    lastSeen: "2小时前",
    domain: "backup.example.com",
  },
  {
    id: "5",
    name: "盒子",
    ip: "192.168.1.20",
    mac: "00:5E:6F:7G:8H:9I",
    type: "盒子",
    status: "warning",
    lastSeen: "30分钟前",
  },
  {
    id: "6",
    name: "温度传感器",
    ip: "192.168.1.30",
    mac: "00:6F:7G:8H:9I:0J",
    type: "IoT设备",
    status: "online",
    lastSeen: "1分钟前",
    domain: "temp-sensor.iot.local",
  },
  {
    id: "7",
    name: "监控摄像头",
    ip: "192.168.1.31",
    mac: "00:7G:8H:9I:0J:1K",
    type: "IoT设备",
    status: "online",
    lastSeen: "刚刚",
    domain: "camera1.iot.local",
  },
  {
    id: "8",
    name: "Web应用服务器",
    ip: "192.168.1.12",
    mac: "00:8H:9I:0J:1K:2L",
    type: "服务器",
    status: "online",
    lastSeen: "3分钟前",
    domain: "app.example.com",
  },
]

export function DeviceList() {
  const [searchQuery, setSearchQuery] = useState("")

  const filteredDevices = devices.filter(
    (device) =>
      device.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      device.ip.includes(searchQuery) ||
      device.mac.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (device.domain && device.domain.toLowerCase().includes(searchQuery.toLowerCase())),
  )

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>设备列表</CardTitle>
            <CardDescription>管理和监控网络中的所有设备</CardDescription>
          </div>
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            添加设备
          </Button>
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
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>设备名称</TableHead>
                <TableHead>IP 地址</TableHead>
                <TableHead>域名</TableHead>
                <TableHead>类型</TableHead>
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
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <div
                        className={`h-2.5 w-2.5 rounded-full ${
                          device.status === "online"
                            ? "bg-green-500"
                            : device.status === "warning"
                              ? "bg-yellow-500"
                              : "bg-red-500"
                        }`}
                      />
                      <span>{device.status === "online" ? "在线" : device.status === "warning" ? "警告" : "离线"}</span>
                    </div>
                  </TableCell>
                  <TableCell>{device.lastSeen}</TableCell>
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
                        <DropdownMenuItem>
                          <Edit className="mr-2 h-4 w-4" />
                          编辑
                        </DropdownMenuItem>
                        <DropdownMenuItem>查看详情</DropdownMenuItem>
                        <DropdownMenuItem>
                          <Globe className="mr-2 h-4 w-4" />
                          配置域名
                        </DropdownMenuItem>
                        <DropdownMenuItem>重启设备</DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem className="text-red-600">
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
      </CardContent>
    </Card>
  )
}

