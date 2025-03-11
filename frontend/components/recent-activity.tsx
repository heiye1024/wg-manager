import { Activity, AlertTriangle, ArrowDown, ArrowUp, Shield } from "lucide-react"

export function RecentActivity() {
  return (
    <div className="space-y-8">
      <div className="flex items-center">
        <div className="flex items-center justify-center w-9 h-9 rounded-full bg-primary/10 mr-3">
          <Shield className="h-5 w-5 text-primary" />
        </div>
        <div className="space-y-1">
          <p className="text-sm font-medium leading-none">WireGuard 服务已更新</p>
          <p className="text-sm text-muted-foreground">2小时前</p>
        </div>
      </div>
      <div className="flex items-center">
        <div className="flex items-center justify-center w-9 h-9 rounded-full bg-red-500/10 mr-3">
          <AlertTriangle className="h-5 w-5 text-red-500" />
        </div>
        <div className="space-y-1">
          <p className="text-sm font-medium leading-none">备份服务器离线</p>
          <p className="text-sm text-muted-foreground">2小时前</p>
        </div>
      </div>
      <div className="flex items-center">
        <div className="flex items-center justify-center w-9 h-9 rounded-full bg-green-500/10 mr-3">
          <ArrowUp className="h-5 w-5 text-green-500" />
        </div>
        <div className="space-y-1">
          <p className="text-sm font-medium leading-none">新设备已连接: 移动设备</p>
          <p className="text-sm text-muted-foreground">3小时前</p>
        </div>
      </div>
      <div className="flex items-center">
        <div className="flex items-center justify-center w-9 h-9 rounded-full bg-yellow-500/10 mr-3">
          <Activity className="h-5 w-5 text-yellow-500" />
        </div>
        <div className="space-y-1">
          <p className="text-sm font-medium leading-none">打印机状态异常</p>
          <p className="text-sm text-muted-foreground">5小时前</p>
        </div>
      </div>
      <div className="flex items-center">
        <div className="flex items-center justify-center w-9 h-9 rounded-full bg-red-500/10 mr-3">
          <ArrowDown className="h-5 w-5 text-red-500" />
        </div>
        <div className="space-y-1">
          <p className="text-sm font-medium leading-none">设备断开连接: 服务器 A</p>
          <p className="text-sm text-muted-foreground">1天前</p>
        </div>
      </div>
    </div>
  )
}

