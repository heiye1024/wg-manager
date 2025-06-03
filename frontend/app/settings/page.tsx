import { DashboardHeader } from "@/components/dashboard-header"
import { DashboardShell } from "@/components/dashboard-shell"
import { SystemSettings } from "@/components/system-settings"

export default function SettingsPage() {
  return (
    <DashboardShell>
      <DashboardHeader heading="系统设置" text="配置系统参数和行为" />
      <SystemSettings />
    </DashboardShell>
  )
}
