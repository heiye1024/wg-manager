"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Loader2, ArrowRight } from "lucide-react"

type PortScanResult = {
  id: number
  port: number
  service: string
  status: "open" | "closed" | "filtered"
}

const commonPorts = [
  { port: 22, service: "SSH" },
  { port: 80, service: "HTTP" },
  { port: 443, service: "HTTPS" },
  { port: 21, service: "FTP" },
  { port: 25, service: "SMTP" },
  { port: 53, service: "DNS" },
  { port: 3389, service: "RDP" },
  { port: 8080, service: "HTTP Alternate" },
  { port: 1194, service: "OpenVPN" },
  { port: 51820, service: "WireGuard" },
]

export function PortScanner() {
  const [host, setHost] = useState("")
  const [customPort, setCustomPort] = useState("")
  const [isScanning, setIsScanning] = useState(false)
  const [scanResults, setScanResults] = useState<PortScanResult[]>([])

  const handleScan = () => {
    if (!host) return

    setIsScanning(true)
    setScanResults([])

    // 模拟端口扫描
    setTimeout(() => {
      const results: PortScanResult[] = []

      commonPorts.forEach((portInfo, index) => {
        // 随机生成扫描结果
        const random = Math.random()
        const status = random > 0.7 ? "open" : random > 0.4 ? "closed" : "filtered"

        results.push({
          id: index,
          port: portInfo.port,
          service: portInfo.service,
          status,
        })
      })

      // 如果有自定义端口，添加到结果中
      if (customPort) {
        const portNumber = Number.parseInt(customPort)
        if (!isNaN(portNumber)) {
          results.push({
            id: results.length,
            port: portNumber,
            service: "未知",
            status: Math.random() > 0.5 ? "open" : "closed",
          })
        }
      }

      // 按端口号排序
      results.sort((a, b) => a.port - b.port)

      setScanResults(results)
      setIsScanning(false)
    }, 2000)
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>端口扫描</CardTitle>
        <CardDescription>扫描主机开放的网络端口</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-end gap-4">
          <div className="flex-1 space-y-2">
            <Label htmlFor="scan-host">主机名或 IP 地址</Label>
            <Input
              id="scan-host"
              placeholder="example.com 或 192.168.1.1"
              value={host}
              onChange={(e) => setHost(e.target.value)}
            />
          </div>
          <div className="w-32 space-y-2">
            <Label htmlFor="custom-port">自定义端口 (可选)</Label>
            <Input
              id="custom-port"
              placeholder="例如: 8443"
              value={customPort}
              onChange={(e) => setCustomPort(e.target.value)}
            />
          </div>
          <Button onClick={handleScan} disabled={isScanning || !host}>
            {isScanning ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                正在扫描
              </>
            ) : (
              <>
                <ArrowRight className="mr-2 h-4 w-4" />
                开始扫描
              </>
            )}
          </Button>
        </div>

        <div className="rounded-md border">
          <div className="p-4 bg-muted/30">
            <div className="text-sm font-medium">端口扫描结果</div>
            <div className="text-xs text-muted-foreground">
              {host ? `主机: ${host}` : "输入主机名或 IP 地址开始扫描"}
            </div>
          </div>

          {isScanning ? (
            <div className="flex items-center justify-center p-8">
              <div className="flex flex-col items-center gap-2">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="text-sm text-muted-foreground">正在扫描端口，请稍候...</p>
              </div>
            </div>
          ) : scanResults.length > 0 ? (
            <div className="p-0">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="px-4 py-3 text-left text-sm font-medium">端口</th>
                    <th className="px-4 py-3 text-left text-sm font-medium">服务</th>
                    <th className="px-4 py-3 text-left text-sm font-medium">状态</th>
                  </tr>
                </thead>
                <tbody>
                  {scanResults.map((result) => (
                    <tr key={result.id} className="border-b">
                      <td className="px-4 py-3 text-sm">{result.port}</td>
                      <td className="px-4 py-3 text-sm">{result.service}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          {result.status === "open" ? (
                            <>
                              <div className="h-2 w-2 rounded-full bg-green-500"></div>
                              <span className="text-sm text-green-600">开放</span>
                            </>
                          ) : result.status === "closed" ? (
                            <>
                              <div className="h-2 w-2 rounded-full bg-red-500"></div>
                              <span className="text-sm text-red-600">关闭</span>
                            </>
                          ) : (
                            <>
                              <div className="h-2 w-2 rounded-full bg-yellow-500"></div>
                              <span className="text-sm text-yellow-600">已过滤</span>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="flex items-center justify-center p-8 text-muted-foreground">
              {host ? '点击"开始扫描"按钮开始扫描端口' : "请输入主机名或 IP 地址"}
            </div>
          )}
        </div>

        <div className="text-xs text-muted-foreground">
          注意: 端口扫描可能会被某些网络视为恶意活动。请确保您有权限扫描目标主机。
        </div>
      </CardContent>
    </Card>
  )
}

