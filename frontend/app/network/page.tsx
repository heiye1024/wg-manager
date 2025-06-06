import { DashboardHeader } from "@/components/dashboard-header"
import { DashboardShell } from "@/components/dashboard-shell"
import { NetworkTools } from "@/components/network-tools"
import { PortScanner } from "@/components/port-scanner"
import { NetworkTopology } from "@/components/network-topology"
import { TrafficChart } from "@/components/traffic-chart"
import { SystemMonitor } from "@/components/system-monitor"
import { LogViewer } from "@/components/log-viewer"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

export default function NetworkPage() {
  return (
    <DashboardShell>
      <DashboardHeader heading="网络管理" text="监控和管理网络连接和工具" />

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="overview">网络概览</TabsTrigger>
          <TabsTrigger value="topology">网络拓扑</TabsTrigger>
          <TabsTrigger value="tools">网络工具</TabsTrigger>
          <TabsTrigger value="scanner">端口扫描</TabsTrigger>
          <TabsTrigger value="traffic">流量分析</TabsTrigger>
          <TabsTrigger value="logs">系统日志</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <SystemMonitor />
            <TrafficChart />
          </div>
        </TabsContent>

        <TabsContent value="topology">
          <NetworkTopology />
        </TabsContent>

        <TabsContent value="tools">
          <NetworkTools />
        </TabsContent>

        <TabsContent value="scanner">
          <PortScanner />
        </TabsContent>

        <TabsContent value="traffic">
          <TrafficChart />
        </TabsContent>

        <TabsContent value="logs">
          <LogViewer />
        </TabsContent>
      </Tabs>
    </DashboardShell>
  )
}
