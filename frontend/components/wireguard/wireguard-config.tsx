"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Settings, Download, Save, RefreshCw, Info } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { LoadingState } from "@/components/common/loading-state"
import { statusApi } from "@/lib/api"

interface WireGuardConfig {
  server_config: {
    listen_port: number
    private_key: string
    public_key: string
    address: string
    dns: string
    mtu: number
  }
  global_settings: {
    auto_start: boolean
    log_level: string
    max_peers: number
    keepalive_interval: number
  }
}

export function WireguardConfig() {
  const [config, setConfig] = useState<WireGuardConfig | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const { toast } = useToast()

  const loadConfig = async () => {
    try {
      setLoading(true)
      const response = await statusApi.getStatus()
      console.log("Loaded config:", response)

      if (response.success) {
        setConfig(response.config)
      }
    } catch (error) {
      console.error("Failed to load config:", error)
      toast({
        title: "错误",
        description: "无法加载配置信息",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadConfig()
    
  }, [])

  const handleSave = async () => {
    try {
      setSaving(true)
      // Mock save operation using statusApi
      await new Promise((resolve) => setTimeout(resolve, 1000))

      toast({
        title: "成功",
        description: "配置已保存并应用",
      })
    } catch (error) {
      toast({
        title: "错误",
        description: "保存配置失败",
        variant: "destructive",
      })
    } finally {
      setSaving(false)
    }
  }

  const handleExport = () => {
    if (!config) return

    const configText = `[Interface]
PrivateKey = ${config.server_config.private_key}
Address = ${config.server_config.address}
ListenPort = ${config.server_config.listen_port}
DNS = ${config.server_config.dns}
MTU = ${config.server_config.mtu}

# Global Settings
# AutoStart = ${config.global_settings.auto_start}
# LogLevel = ${config.global_settings.log_level}
# MaxPeers = ${config.global_settings.max_peers}
# KeepaliveInterval = ${config.global_settings.keepalive_interval}`

    const blob = new Blob([configText], { type: "text/plain" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = "wireguard-server.conf"
    a.click()
    URL.revokeObjectURL(url)
  }

  if (loading) {
    return <LoadingState message="正在加载系统配置..." />
  }

  if (!config) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <Settings className="mx-auto h-12 w-12 mb-4" />
        <h3 className="text-lg font-medium mb-2">无法加载系统配置</h3>
        <p className="mb-4">请检查 WireGuard 服务状态。</p>
        <Button onClick={loadConfig} variant="outline">
          <RefreshCw className="h-4 w-4 mr-2" />
          重新加载
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">高级配置管理</h2>
          <p className="text-muted-foreground">配置 WireGuard 服务器参数、网络设置和运行策略</p>
        </div>
        <div className="flex space-x-2">
          <Button onClick={handleExport} variant="outline">
            <Download className="h-4 w-4 mr-2" />
            导出配置
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? <RefreshCw className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
            保存配置
          </Button>
        </div>
      </div>

      <Card className="border-amber-200 bg-amber-50/50">
        <CardContent className="pt-6">
          <div className="flex items-start space-x-3">
            <Info className="h-5 w-5 text-amber-600 mt-0.5" />
            <div className="space-y-1">
              <p className="text-sm font-medium text-amber-900">配置与状态的区别</p>
              <p className="text-sm text-amber-700">
                "服务状态"页面用于监控当前运行状态和资源使用情况；本页面用于修改服务器配置参数。
                修改配置后需要保存并重启服务才能生效。
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Added configuration explanation card to enhance user understanding */}
      <Card className="border-blue-200 bg-blue-50/50">
        <CardContent className="pt-6">
          <div className="flex items-start space-x-3">
            <Info className="h-5 w-5 text-blue-600 mt-0.5" />
            <div className="space-y-1">
              <p className="text-sm font-medium text-blue-900">配置说明</p>
              <p className="text-sm text-blue-700">
                修改配置后需要保存并重启服务才能生效。建议在修改前先导出当前配置作为备份。
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>服务器网络配置</CardTitle>
            <CardDescription>WireGuard 服务器的基本网络参数设置</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="listen-port">监听端口</Label>
                <Input
                  id="listen-port"
                  type="number"
                  value={config.server_config.listen_port}
                  onChange={(e) =>
                    setConfig((prev) =>
                      prev
                        ? {
                            ...prev,
                            server_config: {
                              ...prev.server_config,
                              listen_port: Number.parseInt(e.target.value),
                            },
                          }
                        : null,
                    )
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="mtu">MTU 大小</Label>
                <Input
                  id="mtu"
                  type="number"
                  value={config.server_config.mtu}
                  onChange={(e) =>
                    setConfig((prev) =>
                      prev
                        ? {
                            ...prev,
                            server_config: {
                              ...prev.server_config,
                              mtu: Number.parseInt(e.target.value),
                            },
                          }
                        : null,
                    )
                  }
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="address">服务器地址</Label>
              <Input
                id="address"
                value={config.server_config.address}
                onChange={(e) =>
                  setConfig((prev) =>
                    prev
                      ? {
                          ...prev,
                          server_config: {
                            ...prev.server_config,
                            address: e.target.value,
                          },
                        }
                      : null,
                  )
                }
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="dns">DNS 服务器</Label>
              <Input
                id="dns"
                value={config.server_config.dns}
                onChange={(e) =>
                  setConfig((prev) =>
                    prev
                      ? {
                          ...prev,
                          server_config: {
                            ...prev.server_config,
                            dns: e.target.value,
                          },
                        }
                      : null,
                  )
                }
              />
            </div>

            <div className="space-y-2">
              <Label>服务器密钥</Label>
              <div className="flex items-center space-x-2">
                <Badge variant="secondary">私钥已配置</Badge>
                <Badge variant="secondary">公钥已生成</Badge>
              </div>
              <p className="text-xs text-muted-foreground">出于安全考虑，密钥信息已隐藏</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>服务运行参数</CardTitle>
            <CardDescription>WireGuard 服务的性能和行为配置</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="max-peers">最大客户端数</Label>
                <Input
                  id="max-peers"
                  type="number"
                  value={config.global_settings.max_peers}
                  onChange={(e) =>
                    setConfig((prev) =>
                      prev
                        ? {
                            ...prev,
                            global_settings: {
                              ...prev.global_settings,
                              max_peers: Number.parseInt(e.target.value),
                            },
                          }
                        : null,
                    )
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="keepalive">保活间隔 (秒)</Label>
                <Input
                  id="keepalive"
                  type="number"
                  value={config.global_settings.keepalive_interval}
                  onChange={(e) =>
                    setConfig((prev) =>
                      prev
                        ? {
                            ...prev,
                            global_settings: {
                              ...prev.global_settings,
                              keepalive_interval: Number.parseInt(e.target.value),
                            },
                          }
                        : null,
                    )
                  }
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="log-level">日志级别</Label>
              <select
                id="log-level"
                className="w-full px-3 py-2 border border-input bg-background rounded-md"
                value={config.global_settings.log_level}
                onChange={(e) =>
                  setConfig((prev) =>
                    prev
                      ? {
                          ...prev,
                          global_settings: {
                            ...prev.global_settings,
                            log_level: e.target.value,
                          },
                        }
                      : null,
                  )
                }
              >
                <option value="debug">调试 (Debug)</option>
                <option value="info">信息 (Info)</option>
                <option value="warn">警告 (Warning)</option>
                <option value="error">错误 (Error)</option>
              </select>
            </div>

            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="auto-start"
                checked={config.global_settings.auto_start}
                onChange={(e) =>
                  setConfig((prev) =>
                    prev
                      ? {
                          ...prev,
                          global_settings: {
                            ...prev.global_settings,
                            auto_start: e.target.checked,
                          },
                        }
                      : null,
                  )
                }
                className="rounded border-input"
              />
              <Label htmlFor="auto-start">系统启动时自动启动服务</Label>
            </div>

            {/* Optimized status explanation for clearer service status description */}
            <div className="pt-4 border-t">
              <h4 className="font-medium mb-2">服务状态说明</h4>
              <div className="space-y-1 text-sm text-muted-foreground">
                <p>
                  •{" "}
                  <Badge variant="default" className="mr-1">
                    运行中
                  </Badge>{" "}
                  - 服务正常运行，可接受客户端连接
                </p>
                <p>
                  •{" "}
                  <Badge variant="secondary" className="mr-1">
                    已停止
                  </Badge>{" "}
                  - 服务未启动，无法建立连接
                </p>
                <p>
                  •{" "}
                  <Badge variant="destructive" className="mr-1">
                    配置错误
                  </Badge>{" "}
                  - 配置文件有误或端口冲突
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
