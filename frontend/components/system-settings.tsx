"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import {
  Save,
  RefreshCw,
  Download,
  Upload,
  CheckCircle,
  Settings,
  Shield,
  Bell,
  Database,
  Network,
  Monitor,
} from "lucide-react"
import { useToast } from "@/hooks/use-toast"

export function SystemSettings() {
  const [loading, setLoading] = useState(false)
  const [systemInfo, setSystemInfo] = useState({
    version: "1.2.3",
    buildDate: "2023-06-20",
    uptime: "15天 8小时 32分钟",
    cpuUsage: "25%",
    memoryUsage: "68%",
    diskUsage: "45%",
  })

  const [generalSettings, setGeneralSettings] = useState({
    systemName: "设备管理系统",
    description: "企业级网络设备管理平台",
    timezone: "Asia/Shanghai",
    language: "zh-CN",
    autoBackup: true,
    maintenanceMode: false,
  })

  const [networkSettings, setNetworkSettings] = useState({
    hostname: "device-manager.local",
    domain: "example.com",
    dnsServers: "8.8.8.8, 8.8.4.4",
    ntpServers: "pool.ntp.org",
    httpPort: "80",
    httpsPort: "443",
    sshPort: "22",
    enableSSL: true,
    enableIPv6: false,
  })

  const [securitySettings, setSecuritySettings] = useState({
    passwordPolicy: "strong",
    sessionTimeout: "30",
    maxLoginAttempts: "5",
    enableTwoFactor: false,
    enableAuditLog: true,
    enableFirewall: true,
    allowedIPs: "192.168.1.0/24",
  })

  const [notificationSettings, setNotificationSettings] = useState({
    emailNotifications: true,
    smsNotifications: false,
    webhookNotifications: false,
    alertThresholds: {
      cpuUsage: "80",
      memoryUsage: "85",
      diskUsage: "90",
    },
    emailServer: "smtp.example.com",
    emailPort: "587",
    emailUsername: "alerts@example.com",
    webhookUrl: "",
  })

  const { toast } = useToast()

  const handleSaveSettings = async (section: string) => {
    setLoading(true)
    try {
      // 模拟保存设置
      await new Promise((resolve) => setTimeout(resolve, 1000))

      toast({
        title: "设置已保存",
        description: `${section}设置已成功保存`,
      })
    } catch (error) {
      toast({
        title: "保存失败",
        description: "无法保存设置，请重试",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleBackupSystem = async () => {
    setLoading(true)
    try {
      // 模拟备份操作
      await new Promise((resolve) => setTimeout(resolve, 2000))

      toast({
        title: "备份完成",
        description: "系统配置已成功备份",
      })
    } catch (error) {
      toast({
        title: "备份失败",
        description: "无法创建系统备份",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleRestoreSystem = async () => {
    setLoading(true)
    try {
      // 模拟恢复操作
      await new Promise((resolve) => setTimeout(resolve, 2000))

      toast({
        title: "恢复完成",
        description: "系统配置已成功恢复",
      })
    } catch (error) {
      toast({
        title: "恢复失败",
        description: "无法恢复系统配置",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* 系统状态概览 */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">系统版本</CardTitle>
            <Monitor className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{systemInfo.version}</div>
            <p className="text-xs text-muted-foreground">构建日期: {systemInfo.buildDate}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">系统运行时间</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-lg font-bold">{systemInfo.uptime}</div>
            <p className="text-xs text-muted-foreground">系统稳定运行</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">CPU 使用率</CardTitle>
            <Badge variant="secondary">{systemInfo.cpuUsage}</Badge>
          </CardHeader>
          <CardContent>
            <div className="text-sm">内存: {systemInfo.memoryUsage}</div>
            <div className="text-sm">磁盘: {systemInfo.diskUsage}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">系统状态</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-lg font-bold text-green-600">正常</div>
            <p className="text-xs text-muted-foreground">所有服务运行正常</p>
          </CardContent>
        </Card>
      </div>

      {/* 设置选项卡 */}
      <Tabs defaultValue="general" className="space-y-4">
        <TabsList>
          <TabsTrigger value="general">
            <Settings className="mr-2 h-4 w-4" />
            常规设置
          </TabsTrigger>
          <TabsTrigger value="network">
            <Network className="mr-2 h-4 w-4" />
            网络设置
          </TabsTrigger>
          <TabsTrigger value="security">
            <Shield className="mr-2 h-4 w-4" />
            安全设置
          </TabsTrigger>
          <TabsTrigger value="notifications">
            <Bell className="mr-2 h-4 w-4" />
            通知设置
          </TabsTrigger>
          <TabsTrigger value="backup">
            <Database className="mr-2 h-4 w-4" />
            备份恢复
          </TabsTrigger>
        </TabsList>

        {/* 常规设置 */}
        <TabsContent value="general">
          <Card>
            <CardHeader>
              <CardTitle>常规设置</CardTitle>
              <CardDescription>配置系统的基本信息和行为</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="systemName">系统名称</Label>
                  <Input
                    id="systemName"
                    value={generalSettings.systemName}
                    onChange={(e) => setGeneralSettings({ ...generalSettings, systemName: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="timezone">时区</Label>
                  <Select
                    value={generalSettings.timezone}
                    onValueChange={(value) => setGeneralSettings({ ...generalSettings, timezone: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Asia/Shanghai">Asia/Shanghai (UTC+8)</SelectItem>
                      <SelectItem value="UTC">UTC (UTC+0)</SelectItem>
                      <SelectItem value="America/New_York">America/New_York (UTC-5)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">系统描述</Label>
                <Textarea
                  id="description"
                  value={generalSettings.description}
                  onChange={(e) => setGeneralSettings({ ...generalSettings, description: e.target.value })}
                  rows={3}
                />
              </div>
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>自动备份</Label>
                  <div className="text-sm text-muted-foreground">每日自动备份系统配置</div>
                </div>
                <Switch
                  checked={generalSettings.autoBackup}
                  onCheckedChange={(checked) => setGeneralSettings({ ...generalSettings, autoBackup: checked })}
                />
              </div>
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>维护模式</Label>
                  <div className="text-sm text-muted-foreground">启用后将限制系统访问</div>
                </div>
                <Switch
                  checked={generalSettings.maintenanceMode}
                  onCheckedChange={(checked) => setGeneralSettings({ ...generalSettings, maintenanceMode: checked })}
                />
              </div>
              <div className="pt-4">
                <Button onClick={() => handleSaveSettings("常规")} disabled={loading}>
                  <Save className="mr-2 h-4 w-4" />
                  保存设置
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 网络设置 */}
        <TabsContent value="network">
          <Card>
            <CardHeader>
              <CardTitle>网络设置</CardTitle>
              <CardDescription>配置系统的网络参数</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="hostname">主机名</Label>
                  <Input
                    id="hostname"
                    value={networkSettings.hostname}
                    onChange={(e) => setNetworkSettings({ ...networkSettings, hostname: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="domain">域名</Label>
                  <Input
                    id="domain"
                    value={networkSettings.domain}
                    onChange={(e) => setNetworkSettings({ ...networkSettings, domain: e.target.value })}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="dnsServers">DNS 服务器</Label>
                  <Input
                    id="dnsServers"
                    value={networkSettings.dnsServers}
                    onChange={(e) => setNetworkSettings({ ...networkSettings, dnsServers: e.target.value })}
                    placeholder="8.8.8.8, 8.8.4.4"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="ntpServers">NTP 服务器</Label>
                  <Input
                    id="ntpServers"
                    value={networkSettings.ntpServers}
                    onChange={(e) => setNetworkSettings({ ...networkSettings, ntpServers: e.target.value })}
                  />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="httpPort">HTTP 端口</Label>
                  <Input
                    id="httpPort"
                    value={networkSettings.httpPort}
                    onChange={(e) => setNetworkSettings({ ...networkSettings, httpPort: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="httpsPort">HTTPS 端口</Label>
                  <Input
                    id="httpsPort"
                    value={networkSettings.httpsPort}
                    onChange={(e) => setNetworkSettings({ ...networkSettings, httpsPort: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="sshPort">SSH 端口</Label>
                  <Input
                    id="sshPort"
                    value={networkSettings.sshPort}
                    onChange={(e) => setNetworkSettings({ ...networkSettings, sshPort: e.target.value })}
                  />
                </div>
              </div>
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>启用 SSL/TLS</Label>
                  <div className="text-sm text-muted-foreground">强制使用 HTTPS 连接</div>
                </div>
                <Switch
                  checked={networkSettings.enableSSL}
                  onCheckedChange={(checked) => setNetworkSettings({ ...networkSettings, enableSSL: checked })}
                />
              </div>
              <div className="pt-4">
                <Button onClick={() => handleSaveSettings("网络")} disabled={loading}>
                  <Save className="mr-2 h-4 w-4" />
                  保存设置
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 安全设置 */}
        <TabsContent value="security">
          <Card>
            <CardHeader>
              <CardTitle>安全设置</CardTitle>
              <CardDescription>配置系统安全策略和访问控制</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="passwordPolicy">密码策略</Label>
                  <Select
                    value={securitySettings.passwordPolicy}
                    onValueChange={(value) => setSecuritySettings({ ...securitySettings, passwordPolicy: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="weak">弱 (6位以上)</SelectItem>
                      <SelectItem value="medium">中等 (8位，包含字母数字)</SelectItem>
                      <SelectItem value="strong">强 (12位，包含特殊字符)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="sessionTimeout">会话超时 (分钟)</Label>
                  <Input
                    id="sessionTimeout"
                    value={securitySettings.sessionTimeout}
                    onChange={(e) => setSecuritySettings({ ...securitySettings, sessionTimeout: e.target.value })}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="allowedIPs">允许的 IP 地址范围</Label>
                <Input
                  id="allowedIPs"
                  value={securitySettings.allowedIPs}
                  onChange={(e) => setSecuritySettings({ ...securitySettings, allowedIPs: e.target.value })}
                  placeholder="192.168.1.0/24, 10.0.0.0/8"
                />
              </div>
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>启用双因素认证</Label>
                  <div className="text-sm text-muted-foreground">为管理员账户启用 2FA</div>
                </div>
                <Switch
                  checked={securitySettings.enableTwoFactor}
                  onCheckedChange={(checked) => setSecuritySettings({ ...securitySettings, enableTwoFactor: checked })}
                />
              </div>
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>启用审计日志</Label>
                  <div className="text-sm text-muted-foreground">记录所有管理操作</div>
                </div>
                <Switch
                  checked={securitySettings.enableAuditLog}
                  onCheckedChange={(checked) => setSecuritySettings({ ...securitySettings, enableAuditLog: checked })}
                />
              </div>
              <div className="pt-4">
                <Button onClick={() => handleSaveSettings("安全")} disabled={loading}>
                  <Save className="mr-2 h-4 w-4" />
                  保存设置
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 通知设置 */}
        <TabsContent value="notifications">
          <Card>
            <CardHeader>
              <CardTitle>通知设置</CardTitle>
              <CardDescription>配置系统告警和通知方式</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>邮件通知</Label>
                    <div className="text-sm text-muted-foreground">通过邮件发送系统告警</div>
                  </div>
                  <Switch
                    checked={notificationSettings.emailNotifications}
                    onCheckedChange={(checked) =>
                      setNotificationSettings({ ...notificationSettings, emailNotifications: checked })
                    }
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Webhook 通知</Label>
                    <div className="text-sm text-muted-foreground">通过 HTTP 回调发送通知</div>
                  </div>
                  <Switch
                    checked={notificationSettings.webhookNotifications}
                    onCheckedChange={(checked) =>
                      setNotificationSettings({ ...notificationSettings, webhookNotifications: checked })
                    }
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>告警阈值</Label>
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-1">
                    <Label className="text-sm">CPU 使用率 (%)</Label>
                    <Input
                      value={notificationSettings.alertThresholds.cpuUsage}
                      onChange={(e) =>
                        setNotificationSettings({
                          ...notificationSettings,
                          alertThresholds: { ...notificationSettings.alertThresholds, cpuUsage: e.target.value },
                        })
                      }
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-sm">内存使用率 (%)</Label>
                    <Input
                      value={notificationSettings.alertThresholds.memoryUsage}
                      onChange={(e) =>
                        setNotificationSettings({
                          ...notificationSettings,
                          alertThresholds: { ...notificationSettings.alertThresholds, memoryUsage: e.target.value },
                        })
                      }
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-sm">磁盘使用率 (%)</Label>
                    <Input
                      value={notificationSettings.alertThresholds.diskUsage}
                      onChange={(e) =>
                        setNotificationSettings({
                          ...notificationSettings,
                          alertThresholds: { ...notificationSettings.alertThresholds, diskUsage: e.target.value },
                        })
                      }
                    />
                  </div>
                </div>
              </div>

              <div className="pt-4">
                <Button onClick={() => handleSaveSettings("通知")} disabled={loading}>
                  <Save className="mr-2 h-4 w-4" />
                  保存设置
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 备份恢复 */}
        <TabsContent value="backup">
          <Card>
            <CardHeader>
              <CardTitle>备份与恢复</CardTitle>
              <CardDescription>管理系统配置的备份和恢复</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">创建备份</CardTitle>
                    <CardDescription>备份当前系统配置</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Button onClick={handleBackupSystem} disabled={loading} className="w-full">
                      {loading ? (
                        <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <Download className="mr-2 h-4 w-4" />
                      )}
                      创建备份
                    </Button>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">恢复备份</CardTitle>
                    <CardDescription>从备份文件恢复配置</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Button onClick={handleRestoreSystem} disabled={loading} variant="outline" className="w-full">
                      {loading ? (
                        <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <Upload className="mr-2 h-4 w-4" />
                      )}
                      恢复备份
                    </Button>
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">备份历史</CardTitle>
                  <CardDescription>查看和管理历史备份</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <div className="font-medium">系统配置备份 - 2023-06-20</div>
                        <div className="text-sm text-muted-foreground">大小: 2.3 MB</div>
                      </div>
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline">
                          <Download className="h-4 w-4" />
                        </Button>
                        <Button size="sm" variant="outline">
                          恢复
                        </Button>
                      </div>
                    </div>
                    <div className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <div className="font-medium">系统配置备份 - 2023-06-19</div>
                        <div className="text-sm text-muted-foreground">大小: 2.1 MB</div>
                      </div>
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline">
                          <Download className="h-4 w-4" />
                        </Button>
                        <Button size="sm" variant="outline">
                          恢复
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
