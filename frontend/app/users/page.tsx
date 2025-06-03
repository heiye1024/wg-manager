import { DashboardHeader } from "@/components/dashboard-header"
import { DashboardShell } from "@/components/dashboard-shell"
import { UserManagement } from "@/components/user-management"

export default function UsersPage() {
  return (
    <DashboardShell>
      <DashboardHeader heading="用户管理" text="管理系统用户和权限" />
      <UserManagement />
    </DashboardShell>
  )
}
