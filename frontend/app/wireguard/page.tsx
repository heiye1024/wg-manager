"use client"

import { useState, useEffect } from "react"
import { DashboardShell } from "@/components/layout/dashboard-shell"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { InterfaceManager } from "@/components/wireguard/interface-manager"
import { PeerManager } from "@/components/wireguard/peer-manager"
import { StatusMonitor } from "@/components/wireguard/status-monitor"
import { WireguardConfig } from "@/components/wireguard/wireguard-config"
import { interfaceApi } from "@/lib/api"
import { Activity, Network, Users, Settings } from "lucide-react"

interface WireGuardInterface {
  id: string
  name: string
  status: 'active' | 'inactive';
  listen_port: number
  address: string
  peers: any[]
}

export default function WireGuardPage() {
  const [interfaces, setInterfaces] = useState<WireGuardInterface[]>([])
  const [interfacesLoading, setInterfacesLoading] = useState(true)

  const loadInterfaces = async () => {
    try {
      setInterfacesLoading(true)
      const response = await interfaceApi.getAll()
      if (response.data.success) {
        setInterfaces(response.data.data)
      }
    } catch (error) {
      console.error("Failed to load interfaces:", error)
    } finally {
      setInterfacesLoading(false)
    }
  }

  useEffect(() => {
    loadInterfaces()
  }, [])

  const handleInterfacesChange = () => {
    loadInterfaces()
  }

  return (
    <DashboardShell>
      <div className="flex items-center justify-between space-y-2 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-950/50 dark:to-purple-950/50 p-6 rounded-lg border border-blue-100 dark:border-blue-900">
        <div>
          <h2 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            WireGuard 管理
          </h2>
          <p className="text-slate-600 dark:text-slate-400 font-medium">管理 VPN 接口、客户端连接和系统配置</p>
        </div>
      </div>

      <Tabs defaultValue="status" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="status" className="flex items-center gap-2">
            <Activity className="h-4 w-4" />
            服务状态
          </TabsTrigger>
          <TabsTrigger value="interfaces" className="flex items-center gap-2">
            <Network className="h-4 w-4" />
            网络接口
          </TabsTrigger>
          <TabsTrigger value="peers" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            客户端管理
          </TabsTrigger>
          <TabsTrigger value="config" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            高级配置
          </TabsTrigger>
        </TabsList>

        <TabsContent value="status" className="space-y-6">
          <StatusMonitor />
        </TabsContent>

        <TabsContent value="interfaces" className="space-y-6">
          <InterfaceManager />
        </TabsContent>

        <TabsContent value="peers" className="space-y-6">
          <PeerManager interfaces={interfaces} onPeersChange={handleInterfacesChange} />
        </TabsContent>

        <TabsContent value="config" className="space-y-6 bg-background rounded-md p-4">
          <WireguardConfig />
        </TabsContent>
      </Tabs>
    </DashboardShell>
  )
}
