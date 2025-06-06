import { DashboardHeader } from "@/components/dashboard-header"
import { DashboardShell } from "@/components/dashboard-shell"
import { EnhancedDeviceList } from "@/components/enhanced-device-list"

export default function DevicesPage() {
  return (
    <DashboardShell>
      <DashboardHeader heading="设备管理" text="管理和监控网络中的所有设备" />
      <EnhancedDeviceList />
    </DashboardShell>
  )
}
