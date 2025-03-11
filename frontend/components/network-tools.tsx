"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ArrowRight, Loader2, Terminal } from "lucide-react"

type PingResult = {
  id: number
  host: string
  time: string
  status: "success" | "timeout" | "error"
  latency?: string
  message?: string
}

type TraceResult = {
  id: number
  hop: number
  host: string
  ip: string
  latency: string
  status: "success" | "timeout" | "error"
}

type DnsResult = {
  id: number
  record: string
  type: string
  value: string
  ttl: string
}

export function NetworkTools() {
  const [activeTab, setActiveTab] = useState("ping")
  const [pingHost, setPingHost] = useState("")
  const [pingCount, setPingCount] = useState("4")
  const [traceHost, setTraceHost] = useState("")
  const [dnsHost, setDnsHost] = useState("")
  const [dnsType, setDnsType] = useState("A")

  const [pingResults, setPingResults] = useState<PingResult[]>([])
  const [traceResults, setTraceResults] = useState<TraceResult[]>([])
  const [dnsResults, setDnsResults] = useState<DnsResult[]>([])

  const [isPinging, setIsPinging] = useState(false)
  const [isTracing, setIsTracing] = useState(false)
  const [isLookingUp, setIsLookingUp] = useState(false)

  // 模拟 ping 操作
  const handlePing = () => {
    if (!pingHost) return

    setIsPinging(true)
    setPingResults([])

    // 模拟 ping 结果
    const count = Number.parseInt(pingCount)
    const mockPing = () => {
      const results: PingResult[] = []
      for (let i = 0; i < count; i++) {
        setTimeout(() => {
          const success = Math.random() > 0.2
          const latency = success ? `${Math.floor(Math.random() * 100) + 10}ms` : undefined
          const result: PingResult = {
            id: Date.now() + i,
            host: pingHost,
            time: new Date().toLocaleTimeString(),
            status: success ? "success" : "timeout",
            latency,
            message: success ? `来自 ${pingHost} 的回复: 时间=${latency}` : `请求超时`,
          }

          setPingResults((prev) => [...prev, result])

          if (i === count - 1) {
            setIsPinging(false)
          }
        }, i * 1000)
      }
    }

    mockPing()
  }

  // 模拟 traceroute 操作
  const handleTrace = () => {
    if (!traceHost) return

    setIsTracing(true)
    setTraceResults([])

    // 模拟 traceroute 结果
    const hops = Math.floor(Math.random() * 8) + 5
    const mockTrace = () => {
      for (let i = 1; i <= hops; i++) {
        setTimeout(() => {
          const success = Math.random() > 0.1
          const result: TraceResult = {
            id: Date.now() + i,
            hop: i,
            host: i === hops ? traceHost : `router-${i}.example.com`,
            ip: i === hops ? "203.0.113." + (i + 10) : "192.168.1." + i,
            latency: `${Math.floor(Math.random() * 50) + i * 10}ms`,
            status: success ? "success" : "timeout",
          }

          setTraceResults((prev) => [...prev, result])

          if (i === hops) {
            setIsTracing(false)
          }
        }, i * 800)
      }
    }

    mockTrace()
  }

  // 模拟 DNS 查询
  const handleDnsLookup = () => {
    if (!dnsHost) return

    setIsLookingUp(true)
    setDnsResults([])

    // 模拟 DNS 查询结果
    setTimeout(() => {
      const results: DnsResult[] = []

      if (dnsType === "A" || dnsType === "ALL") {
        results.push({
          id: 1,
          record: dnsHost,
          type: "A",
          value: "203.0.113.10",
          ttl: "3600",
        })
      }

      if (dnsType === "AAAA" || dnsType === "ALL") {
        results.push({
          id: 2,
          record: dnsHost,
          type: "AAAA",
          value: "2001:db8::1428:57ab",
          ttl: "3600",
        })
      }

      if (dnsType === "MX" || dnsType === "ALL") {
        results.push({
          id: 3,
          record: dnsHost,
          type: "MX",
          value: "10 mail.example.com",
          ttl: "3600",
        })
      }

      if (dnsType === "TXT" || dnsType === "ALL") {
        results.push({
          id: 4,
          record: dnsHost,
          type: "TXT",
          value: "v=spf1 include:_spf.example.com ~all",
          ttl: "3600",
        })
      }

      setDnsResults(results)
      setIsLookingUp(false)
    }, 1500)
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>网络诊断工具</CardTitle>
        <CardDescription>使用常用网络工具诊断连接问题</CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList>
            <TabsTrigger value="ping">Ping</TabsTrigger>
            <TabsTrigger value="traceroute">Traceroute</TabsTrigger>
            <TabsTrigger value="dns">DNS 查询</TabsTrigger>
          </TabsList>

          <TabsContent value="ping" className="space-y-4">
            <div className="flex items-end gap-4">
              <div className="flex-1 space-y-2">
                <Label htmlFor="ping-host">主机名或 IP 地址</Label>
                <Input
                  id="ping-host"
                  placeholder="example.com 或 192.168.1.1"
                  value={pingHost}
                  onChange={(e) => setPingHost(e.target.value)}
                />
              </div>
              <div className="w-24 space-y-2">
                <Label htmlFor="ping-count">Ping 次数</Label>
                <Select value={pingCount} onValueChange={setPingCount}>
                  <SelectTrigger id="ping-count">
                    <SelectValue placeholder="次数" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="4">4</SelectItem>
                    <SelectItem value="8">8</SelectItem>
                    <SelectItem value="16">16</SelectItem>
                    <SelectItem value="32">32</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button onClick={handlePing} disabled={isPinging || !pingHost}>
                {isPinging ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    正在 Ping
                  </>
                ) : (
                  <>
                    <ArrowRight className="mr-2 h-4 w-4" />
                    开始 Ping
                  </>
                )}
              </Button>
            </div>

            <div className="rounded-md border bg-muted/50 p-4 font-mono text-sm">
              <div className="mb-2">
                {pingResults.length === 0 && !isPinging ? (
                  <div className="text-muted-foreground">Ping 结果将显示在这里</div>
                ) : (
                  <div className="flex items-center gap-2 text-sm font-medium">
                    <Terminal className="h-4 w-4" />
                    <span>Ping {pingHost}</span>
                  </div>
                )}
              </div>
              <div className="space-y-1 max-h-[300px] overflow-y-auto">
                {pingResults.map((result) => (
                  <div key={result.id} className="flex items-center gap-2">
                    <span className="text-muted-foreground">[{result.time}]</span>
                    <span className={result.status === "success" ? "text-green-500" : "text-red-500"}>
                      {result.message}
                    </span>
                  </div>
                ))}
                {isPinging && pingResults.length === 0 && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Loader2 className="h-3 w-3 animate-spin" />
                    <span>正在发送 Ping 请求...</span>
                  </div>
                )}
              </div>

              {pingResults.length > 0 && !isPinging && (
                <div className="mt-4 pt-4 border-t">
                  <div className="text-sm font-medium">Ping 统计:</div>
                  <div className="text-sm">
                    <span>已发送 = {pingCount}, </span>
                    <span>已接收 = {pingResults.filter((r) => r.status === "success").length}, </span>
                    <span>丢失 = {pingResults.filter((r) => r.status !== "success").length} </span>
                    <span>
                      (
                      {Math.round(
                        (pingResults.filter((r) => r.status !== "success").length / Number.parseInt(pingCount)) * 100,
                      )}
                      % 丢失)
                    </span>
                  </div>
                  {pingResults.filter((r) => r.status === "success").length > 0 && (
                    <div className="text-sm mt-1">
                      <span>平均延迟 = </span>
                      <span>
                        {Math.round(
                          pingResults
                            .filter((r) => r.status === "success")
                            .map((r) => Number.parseInt(r.latency!))
                            .reduce((a, b) => a + b, 0) / pingResults.filter((r) => r.status === "success").length,
                        )}
                        ms
                      </span>
                    </div>
                  )}
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="traceroute" className="space-y-4">
            <div className="flex items-end gap-4">
              <div className="flex-1 space-y-2">
                <Label htmlFor="trace-host">目标主机名或 IP 地址</Label>
                <Input
                  id="trace-host"
                  placeholder="example.com 或 192.168.1.1"
                  value={traceHost}
                  onChange={(e) => setTraceHost(e.target.value)}
                />
              </div>
              <Button onClick={handleTrace} disabled={isTracing || !traceHost}>
                {isTracing ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    正在跟踪
                  </>
                ) : (
                  <>
                    <ArrowRight className="mr-2 h-4 w-4" />
                    开始跟踪
                  </>
                )}
              </Button>
            </div>

            <div className="rounded-md border bg-muted/50 p-4 font-mono text-sm">
              <div className="mb-2">
                {traceResults.length === 0 && !isTracing ? (
                  <div className="text-muted-foreground">Traceroute 结果将显示在这里</div>
                ) : (
                  <div className="flex items-center gap-2 text-sm font-medium">
                    <Terminal className="h-4 w-4" />
                    <span>Traceroute 到 {traceHost}</span>
                  </div>
                )}
              </div>

              {(traceResults.length > 0 || isTracing) && (
                <div className="space-y-1 max-h-[300px] overflow-y-auto">
                  <div className="grid grid-cols-12 gap-2 text-xs text-muted-foreground mb-1">
                    <div className="col-span-1">跳数</div>
                    <div className="col-span-3">主机名</div>
                    <div className="col-span-3">IP 地址</div>
                    <div className="col-span-5">延迟</div>
                  </div>

                  {traceResults.map((result) => (
                    <div key={result.id} className="grid grid-cols-12 gap-2 py-1 border-t border-muted">
                      <div className="col-span-1">{result.hop}</div>
                      <div className="col-span-3 truncate">{result.host}</div>
                      <div className="col-span-3">{result.ip}</div>
                      <div className="col-span-5">
                        <span className={result.status === "success" ? "text-green-500" : "text-red-500"}>
                          {result.status === "success" ? result.latency : "* * *"}
                        </span>
                      </div>
                    </div>
                  ))}

                  {isTracing && (
                    <div className="flex items-center gap-2 text-muted-foreground mt-2">
                      <Loader2 className="h-3 w-3 animate-spin" />
                      <span>正在跟踪路由...</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="dns" className="space-y-4">
            <div className="flex items-end gap-4">
              <div className="flex-1 space-y-2">
                <Label htmlFor="dns-host">域名</Label>
                <Input
                  id="dns-host"
                  placeholder="example.com"
                  value={dnsHost}
                  onChange={(e) => setDnsHost(e.target.value)}
                />
              </div>
              <div className="w-32 space-y-2">
                <Label htmlFor="dns-type">记录类型</Label>
                <Select value={dnsType} onValueChange={setDnsType}>
                  <SelectTrigger id="dns-type">
                    <SelectValue placeholder="类型" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="A">A</SelectItem>
                    <SelectItem value="AAAA">AAAA</SelectItem>
                    <SelectItem value="MX">MX</SelectItem>
                    <SelectItem value="TXT">TXT</SelectItem>
                    <SelectItem value="ALL">所有</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button onClick={handleDnsLookup} disabled={isLookingUp || !dnsHost}>
                {isLookingUp ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    正在查询
                  </>
                ) : (
                  <>
                    <ArrowRight className="mr-2 h-4 w-4" />
                    查询
                  </>
                )}
              </Button>
            </div>

            <div className="rounded-md border bg-muted/50 p-4 font-mono text-sm">
              <div className="mb-2">
                {dnsResults.length === 0 && !isLookingUp ? (
                  <div className="text-muted-foreground">DNS 查询结果将显示在这里</div>
                ) : (
                  <div className="flex items-center gap-2 text-sm font-medium">
                    <Terminal className="h-4 w-4" />
                    <span>
                      DNS 查询 {dnsHost} ({dnsType})
                    </span>
                  </div>
                )}
              </div>

              {isLookingUp && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  <span>正在查询 DNS 记录...</span>
                </div>
              )}

              {dnsResults.length > 0 && (
                <div className="space-y-1 max-h-[300px] overflow-y-auto">
                  <div className="grid grid-cols-12 gap-2 text-xs text-muted-foreground mb-1">
                    <div className="col-span-4">记录</div>
                    <div className="col-span-2">类型</div>
                    <div className="col-span-5">值</div>
                    <div className="col-span-1">TTL</div>
                  </div>

                  {dnsResults.map((result) => (
                    <div key={result.id} className="grid grid-cols-12 gap-2 py-1 border-t border-muted">
                      <div className="col-span-4 truncate">{result.record}</div>
                      <div className="col-span-2">{result.type}</div>
                      <div className="col-span-5 truncate">{result.value}</div>
                      <div className="col-span-1">{result.ttl}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
}

