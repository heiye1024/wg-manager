"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
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
import {
  Activity,
  Globe,
  MoreHorizontal,
  Plus,
  RefreshCw,
  Server,
  Settings,
  Trash,
  Users,
  Zap,
  Eye,
  Download,
} from "lucide-react"
import { useToast } from "@/hooks/use-toast"

type FrpClient = {
  id: string
  name: string
  serverAddr: string
  status: "connected" | "disconnected" | "error"
  lastSeen: string
  proxies: FrpProxy[]
  traffic: {
    upload: string
    download: string
  }
  version: string
  os: string
}

type FrpProxy = {
  id: string
  clientId: string
  name: string
  type: "tcp" | "udp" | "http" | "https" | "stcp" | "xtcp"
  localIp: string
  localPort: string
  remotePort?: string
  domain?: string
  subdomain?: string
  status: "active" | "inactive" | "error"
  connections: number
  traffic: {
    upload: string
    download: string
  }
}

export function EnhancedFrpManagement() {
  const [clients, setClients] = useState<FrpClient[]>([])
  const [proxies, setProxies] = useState<FrpProxy[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState("overview")
  const [isAddClientOpen, setIsAddClientOpen] = useState(false)
  const [isAddProxyOpen, setIsAddProxyOpen] = useState(false)
  const { toast } = useToast()

  // 加载数据
  const loadData = async () => {
    try {
      setLoading(true)

      // 模拟 API 调用
      await new Promise((resolve) => setTimeout(resolve, 1000))

      const mockClients: FrpClient[] = [
        {
          id: "client-1",
          name: "主服务器客户端",
          serverAddr: "frp.example.com:7000",
          status: "connected",
          lastSeen: new Date().toISOString(),
          proxies: [],
          traffic: { upload: "2.3 GB", download: "5.7 GB" },
          version: "0.52.3",
          os: "Linux",
        },
        {
          id: "client-2",
          name: "办公室客户端",
          serverAddr: "frp.example.com:7000",
          status: "connected",
          lastSeen: new Date().toISOString(),
          proxies: [],
          traffic: { upload: "1.2 GB", download: "3.4 GB" },
          version: "0.52.3",
          os: "Windows",
        },
        {
          id: "client-3",
          name: "家庭客户端",
          serverAddr: "frp.example.com:7000",
          status: "disconnected",
          lastSeen: new Date(Date.now() - 300000).toISOString(),
          proxies: [],
          traffic: { upload: "0.8 GB", download: "1.9 GB" },
          version: "0.52.1",
          os: "macOS",
        },
      ]

      const mockProxies: FrpProxy[] = [
        {
          id: "proxy-1",
          clientId: "client-1",
          name: "web-server",
          type: "http",
          localIp: "127.0.0.1",
          localPort: "8080",
          domain: "web.example.com",
          status: "active",
          connections: 15,
          traffic: { upload: "1.2 GB", download: "3.4 GB" },
        },
        {
          id: "proxy-2",
          clientId: "client-1",
          name: "ssh-server",
          type: "tcp",
          localIp: "127.0.0.1",
          localPort: "22",
          remotePort: "2222",
          status: "active",
          connections: 2,
          traffic: { upload: "45 MB", download: "123 MB" },
        },
        {
          id: "proxy-3",
          clientId: "client-2",
          name: "office-web",
          type: "https",
          localIp: "192.168.1.100",
          localPort: "443",
          subdomain: "office",
          status: "active",
          connections: 8,
          traffic: { upload: "800 MB", download: "2.1 GB" },
        },
        {
          id: "proxy-4",
          clientId: "client-2",
          name: "database",
          type: "tcp",
          localIp: "192.168.1.200",
          localPort: "3306",
          remotePort: "3306",
          status: "inactive",
          connections: 0,
          traffic: { upload: "0 B", download: "0 B" },
        },
        {
          id: "proxy-5",
          clientId: "client-3",
          name: "home-nas",
          type: "http",
          localIp: "192.168.0.100",
          localPort: "5000",
          subdomain: "nas",
          status: "error",
          connections: 0,
          traffic: { upload: "120 MB", download: "450 MB" },
        },
      ]

      // 将代理分配给客户端
      mockClients.forEach((client) => {
        client.proxies = mockProxies.filter((proxy) => proxy.clientId === client.id)
      })

      setClients(mockClients)
      setProxies(mockProxies)
    } catch (error) {
      console.error("Failed to load FRP data:", error)
      toast({
        title: "加载失败",
        description: "无法加载 FRP 数据",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "connected":
      case "active":
        return <Badge className="bg-green-100 text-green-800">运行中</Badge>
      case "disconnected":
      case "inactive":
        return <Badge variant="secondary">已停止</Badge>
      case "error":
        return <Badge variant="destructive">错误</Badge>
      default:
        return <Badge variant="outline">未知</Badge>
    }
  }

  const totalProxies = proxies.length
  const activeProxies = proxies.filter((p) => p.status === "active").length
  const connectedClients = clients.filter((c) => c.status === "connected").length

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">正在加载 FRP 管理数据...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* 状态概览 */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">客户端</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {connectedClients}/{clients.length}
            </div>
            <p className="text-xs text-muted-foreground">{connectedClients} 个在线</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">代理服务</CardTitle>
            <Zap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {activeProxies}/{totalProxies}
            </div>
            <p className="text-xs text-muted-foreground">{activeProxies} 个活跃</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">总连接数</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{proxies.reduce((acc, p) => acc + p.connections, 0)}</div>
            <p className="text-xs text-muted-foreground">活跃连接</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">服务状态</CardTitle>
            <Server className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">运行中</div>
            <p className="text-xs text-muted-foreground">FRP 服务器</p>
          </CardContent>
        </Card>
      </div>

      {/* 主要功能区域 */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <div className="flex items-center justify-between">
          <TabsList className="grid w-full max-w-lg grid-cols-4">
            <TabsTrigger value="overview">概览</TabsTrigger>
            <TabsTrigger value="clients">客户端</TabsTrigger>
            <TabsTrigger value="proxies">代理</TabsTrigger>
            <TabsTrigger value="monitor">监控</TabsTrigger>
          </TabsList>

          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={loadData}>
              <RefreshCw className="mr-2 h-4 w-4" />
              刷新
            </Button>
            <Dialog open={isAddClientOpen} onOpenChange={setIsAddClientOpen}>
              <DialogTrigger asChild>
                <Button size="sm">
                  <Plus className="mr-2 h-4 w-4" />
                  添加客户端
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>添加 FRP 客户端</DialogTitle>
                  <DialogDescription>配置新的 FRP 客户端连接</DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="clientName">客户端名称</Label>
                    <Input id="clientName" placeholder="输入客户端名称" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="serverAddr">服务器地址</Label>
                    <Input id="serverAddr" placeholder="frp.example.com:7000" />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsAddClientOpen(false)}>
                    取消
                  </Button>
                  <Button onClick={() => setIsAddClientOpen(false)}>添加</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-2">
            {/* 客户端状态 */}
            <Card>
              <CardHeader>
                <CardTitle>客户端状态</CardTitle>
                <CardDescription>所有 FRP 客户端的连接状态</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {clients.map((client) => (
                    <div key={client.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center space-x-3">
                        <div className="flex flex-col">
                          <span className="font-medium">{client.name}</span>
                          <span className="text-sm text-muted-foreground">{client.serverAddr}</span>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        {getStatusBadge(client.status)}
                        <span className="text-sm text-muted-foreground">{client.proxies.length} 代理</span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* 代理统计 */}
            <Card>
              <CardHeader>
                <CardTitle>代理统计</CardTitle>
                <CardDescription>按类型分组的代理服务统计</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {["http", "https", "tcp", "udp"].map((type) => {
                    const typeProxies = proxies.filter((p) => p.type === type)
                    const activeCount = typeProxies.filter((p) => p.status === "active").length
                    return (
                      <div key={type} className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <Globe className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium">{type.toUpperCase()}</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <span className="text-sm">
                            {activeCount}/{typeProxies.length}
                          </span>
                          <Badge variant={activeCount > 0 ? "default" : "secondary"}>
                            {activeCount > 0 ? "活跃" : "空闲"}
                          </Badge>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="clients" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>客户端管理</CardTitle>
              <CardDescription>管理所有 FRP 客户端连接</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>客户端名称</TableHead>
                    <TableHead>服务器地址</TableHead>
                    <TableHead>状态</TableHead>
                    <TableHead>代理数量</TableHead>
                    <TableHead>流量</TableHead>
                    <TableHead>版本</TableHead>
                    <TableHead>操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {clients.map((client) => (
                    <TableRow key={client.id}>
                      <TableCell className="font-medium">{client.name}</TableCell>
                      <TableCell>{client.serverAddr}</TableCell>
                      <TableCell>{getStatusBadge(client.status)}</TableCell>
                      <TableCell>{client.proxies.length}</TableCell>
                      <TableCell>
                        <div className="text-xs">
                          <div>↑ {client.traffic.upload}</div>
                          <div>↓ {client.traffic.download}</div>
                        </div>
                      </TableCell>
                      <TableCell>{client.version}</TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-8 w-8 p-0">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem>
                              <Eye className="mr-2 h-4 w-4" />
                              查看详情
                            </DropdownMenuItem>
                            <DropdownMenuItem>
                              <Settings className="mr-2 h-4 w-4" />
                              编辑配置
                            </DropdownMenuItem>
                            <DropdownMenuItem>
                              <Download className="mr-2 h-4 w-4" />
                              下载配置
                            </DropdownMenuItem>
                            <DropdownMenuItem className="text-red-600">
                              <Trash className="mr-2 h-4 w-4" />
                              删除客户端
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
        </TabsContent>

        <TabsContent value="proxies" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>代理管理</CardTitle>
                  <CardDescription>管理所有代理服务配置</CardDescription>
                </div>
                <Dialog open={isAddProxyOpen} onOpenChange={setIsAddProxyOpen}>
                  <DialogTrigger asChild>
                    <Button>
                      <Plus className="mr-2 h-4 w-4" />
                      添加代理
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>添加代理服务</DialogTitle>
                      <DialogDescription>为客户端配置新的代理服务</DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                      <div className="space-y-2">
                        <Label htmlFor="proxyClient">选择客户端</Label>
                        <Select>
                          <SelectTrigger>
                            <SelectValue placeholder="选择客户端" />
                          </SelectTrigger>
                          <SelectContent>
                            {clients
                              .filter((c) => c.status === "connected")
                              .map((client) => (
                                <SelectItem key={client.id} value={client.id}>
                                  {client.name}
                                </SelectItem>
                              ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="proxyName">代理名称</Label>
                        <Input id="proxyName" placeholder="web-server" />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="proxyType">代理类型</Label>
                        <Select>
                          <SelectTrigger>
                            <SelectValue placeholder="选择代理类型" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="http">HTTP</SelectItem>
                            <SelectItem value="https">HTTPS</SelectItem>
                            <SelectItem value="tcp">TCP</SelectItem>
                            <SelectItem value="udp">UDP</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setIsAddProxyOpen(false)}>
                        取消
                      </Button>
                      <Button onClick={() => setIsAddProxyOpen(false)}>添加</Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>代理名称</TableHead>
                    <TableHead>客户端</TableHead>
                    <TableHead>类型</TableHead>
                    <TableHead>本地地址</TableHead>
                    <TableHead>远程访问</TableHead>
                    <TableHead>状态</TableHead>
                    <TableHead>连接数</TableHead>
                    <TableHead>操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {proxies.map((proxy) => {
                    const client = clients.find((c) => c.id === proxy.clientId)
                    return (
                      <TableRow key={proxy.id}>
                        <TableCell className="font-medium">{proxy.name}</TableCell>
                        <TableCell>{client?.name}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{proxy.type.toUpperCase()}</Badge>
                        </TableCell>
                        <TableCell>
                          {proxy.localIp}:{proxy.localPort}
                        </TableCell>
                        <TableCell>{proxy.domain || proxy.subdomain || proxy.remotePort || "-"}</TableCell>
                        <TableCell>{getStatusBadge(proxy.status)}</TableCell>
                        <TableCell>{proxy.connections}</TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" className="h-8 w-8 p-0">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem>
                                <Eye className="mr-2 h-4 w-4" />
                                查看详情
                              </DropdownMenuItem>
                              <DropdownMenuItem>
                                <Settings className="mr-2 h-4 w-4" />
                                编辑配置
                              </DropdownMenuItem>
                              <DropdownMenuItem className="text-red-600">
                                <Trash className="mr-2 h-4 w-4" />
                                删除代理
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="monitor" className="space-y-4">
          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>实时监控</CardTitle>
                <CardDescription>FRP 服务实时状态监控</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8 text-muted-foreground">
                  <Activity className="mx-auto h-12 w-12 mb-4" />
                  <p>实时监控图表</p>
                  <p className="text-sm">显示连接数、流量等实时数据</p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>流量统计</CardTitle>
                <CardDescription>各代理服务的流量使用情况</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {proxies
                    .filter((p) => p.status === "active")
                    .slice(0, 5)
                    .map((proxy) => (
                      <div key={proxy.id} className="flex items-center justify-between">
                        <div>
                          <span className="font-medium">{proxy.name}</span>
                          <span className="text-sm text-muted-foreground ml-2">({proxy.type})</span>
                        </div>
                        <div className="text-right text-sm">
                          <div>↑ {proxy.traffic.upload}</div>
                          <div>↓ {proxy.traffic.download}</div>
                        </div>
                      </div>
                    ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
