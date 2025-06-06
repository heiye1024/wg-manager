import { EnhancedFrpManagement } from "@/components/enhanced-frp-management"

export default function FrpPage() {
  return (
    <div className="container mx-auto py-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">FRP 内网穿透</h1>
        <p className="text-muted-foreground">管理 FRP 服务器和客户端，配置内网穿透代理</p>
      </div>
      <EnhancedFrpManagement />
    </div>
  )
}
