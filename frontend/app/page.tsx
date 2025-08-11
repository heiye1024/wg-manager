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
import { WireguardConfig } from "@/components/wireguard/wireguard-config"

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
            <WireguardConfig />
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

