import type { Metadata } from "next"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Globe, HardDrive, Network, Users } from "lucide-react"
import { DeviceList } from "@/components/device-list"
import { NetworkStatus } from "@/components/network-status"
import { RecentActivity } from "@/components/recent-activity"
import { DashboardHeader } from "@/components/dashboard-header"
import { DashboardShell } from "@/components/dashboard-shell"
import { DomainManagement } from "@/components/domain-management"
import { NetworkTools } from "@/components/network-tools"
import { PortScanner } from "@/components/port-scanner"

export const metadata: Metadata = {
  title: "设备管理系统",
  description: "设备和网络管理后台",
}

export default function DashboardPage() {
  return (
    <>
      <DashboardShell>
        <DashboardHeader heading="仪表盘" text="设备和网络管理概览">
          <Button>添加设备</Button>
        </DashboardHeader>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">总设备数</CardTitle>
              <HardDrive className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">24</div>
              <p className="text-xs text-muted-foreground">较上月 +2</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">在线设备</CardTitle>
              <Network className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">18</div>
              <p className="text-xs text-muted-foreground">在线率 75%</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">活跃用户</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">12</div>
              <p className="text-xs text-muted-foreground">较上周 +3</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">域名记录</CardTitle>
              <Globe className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">8</div>
              <p className="text-xs text-muted-foreground">已配置设备 6 台</p>
            </CardContent>
          </Card>
        </div>
        <Tabs defaultValue="overview" className="space-y-4">
          <TabsList>
            <TabsTrigger value="overview">概览</TabsTrigger>
            <TabsTrigger value="devices">设备</TabsTrigger>
            <TabsTrigger value="domains">域名管理</TabsTrigger>
            <TabsTrigger value="wireguard">WireGuard</TabsTrigger>
            <TabsTrigger value="analytics">分析</TabsTrigger>
          </TabsList>
          <TabsContent value="overview" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
              <Card className="col-span-4">
                <CardHeader>
                  <CardTitle>设备状态</CardTitle>
                </CardHeader>
                <CardContent className="pl-2">
                  <NetworkStatus />
                </CardContent>
              </Card>
              <Card className="col-span-3">
                <CardHeader>
                  <CardTitle>近期活动</CardTitle>
                  <CardDescription>过去7天内的系统活动</CardDescription>
                </CardHeader>
                <CardContent>
                  <RecentActivity />
                </CardContent>
              </Card>
            </div>
          </TabsContent>
          <TabsContent value="devices" className="space-y-4">
            <DeviceList />
          </TabsContent>
          <TabsContent value="domains" className="space-y-4">
            <DomainManagement />
          </TabsContent>
          <TabsContent value="wireguard" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>WireGuard 配置</CardTitle>
                <CardDescription>管理 WireGuard VPN 配置和连接</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <h3 className="text-lg font-medium">服务器状态</h3>
                  <div className="flex items-center space-x-2">
                    <div className="h-3 w-3 rounded-full bg-green-500"></div>
                    <span>运行中</span>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">公网 IP</p>
                      <p>203.0.113.1</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">监听端口</p>
                      <p>51820/UDP</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">接口</p>
                      <p>wg0</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">已连接客户端</p>
                      <p>8/12</p>
                    </div>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-medium">对等设备</h3>
                    <Button size="sm">添加设备</Button>
                  </div>
                  <div className="rounded-md border">
                    <div className="grid grid-cols-4 gap-4 p-4 font-medium">
                      <div>名称</div>
                      <div>公钥</div>
                      <div>分配 IP</div>
                      <div>状态</div>
                    </div>
                    <div className="grid grid-cols-4 gap-4 border-t p-4">
                      <div>办公室笔记本</div>
                      <div className="truncate text-sm text-muted-foreground">HhKJ3...Uj4=</div>
                      <div>10.0.0.2/32</div>
                      <div className="flex items-center space-x-2">
                        <div className="h-2 w-2 rounded-full bg-green-500"></div>
                        <span>在线</span>
                      </div>
                    </div>
                    <div className="grid grid-cols-4 gap-4 border-t p-4">
                      <div>移动设备</div>
                      <div className="truncate text-sm text-muted-foreground">Kd8Lp...9j2=</div>
                      <div>10.0.0.3/32</div>
                      <div className="flex items-center space-x-2">
                        <div className="h-2 w-2 rounded-full bg-green-500"></div>
                        <span>在线</span>
                      </div>
                    </div>
                    <div className="grid grid-cols-4 gap-4 border-t p-4">
                      <div>服务器 A</div>
                      <div className="truncate text-sm text-muted-foreground">Jd92K...0kL=</div>
                      <div>10.0.0.4/32</div>
                      <div className="flex items-center space-x-2">
                        <div className="h-2 w-2 rounded-full bg-red-500"></div>
                        <span>离线</span>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
            <div className="mt-4">
              <NetworkTools />
            </div>
            <div className="mt-4">
              <PortScanner />
            </div>
          </TabsContent>
          <TabsContent value="analytics" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>网络流量分析</CardTitle>
                <CardDescription>查看网络流量和使用情况</CardDescription>
              </CardHeader>
              <CardContent className="h-[300px] flex items-center justify-center">
                <p className="text-muted-foreground">流量图表将在此处显示</p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </DashboardShell>
    </>
  )
}

