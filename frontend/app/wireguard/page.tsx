"use client"

import { useState, useEffect } from "react"
import { DashboardShell } from "@/components/layout/dashboard-shell"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { InterfaceManager } from "@/components/wireguard/interface-manager"
import { PeerManager } from "@/components/wireguard/peer-manager"
import { StatusMonitor } from "@/components/wireguard/status-monitor"
import { WireguardConfig } from "@/components/wireguard/wireguard-config"
import { interfaceApi } from "@/lib/api"

interface WireGuardInterface {
  id: number
  name: string
  status: string
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

    const handleInterfacesChange = () => {
        loadInterfaces()
    }

  return (
    <DashboardShell>
      <div className="flex items-center justify-between space-y-2">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">WireGuard 管理</h2>
          <p className="text-muted-foreground">管理 VPN 接口、客户端连接和系统配置</p>
        </div>
      </div>

      <Tabs defaultValue="status" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="status">服务状态</TabsTrigger> 
          <TabsTrigger value="interfaces">网络接口</TabsTrigger>
          <TabsTrigger value="peers">客户端连接</TabsTrigger>
          <TabsTrigger value="config">高级配置</TabsTrigger>
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

        <TabsContent value="config" className="space-y-6">
          <WireguardConfig />
        </TabsContent>
      </Tabs>
    </DashboardShell>
  )
}
