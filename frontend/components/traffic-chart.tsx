"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { RefreshCw, Download } from "lucide-react"

type TrafficData = {
  time: string
  upload: number
  download: number
  total: number
}

const generateMockData = (hours: number): TrafficData[] => {
  const data: TrafficData[] = []
  const now = new Date()

  for (let i = hours; i >= 0; i--) {
    const time = new Date(now.getTime() - i * 60 * 60 * 1000)
    const upload = Math.random() * 50 + 10
    const download = Math.random() * 100 + 20
    data.push({
      time: time.toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" }),
      upload,
      download,
      total: upload + download,
    })
  }
  return data
}

export function TrafficChart() {
  const [timeRange, setTimeRange] = useState("24")
  const [data, setData] = useState<TrafficData[]>([])
  const [maxValue, setMaxValue] = useState(0)

  useEffect(() => {
    const hours = Number.parseInt(timeRange)
    const newData = generateMockData(hours)
    setData(newData)
    setMaxValue(Math.max(...newData.map((d) => d.total)))
  }, [timeRange])

  const refreshData = () => {
    const hours = Number.parseInt(timeRange)
    const newData = generateMockData(hours)
    setData(newData)
    setMaxValue(Math.max(...newData.map((d) => d.total)))
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>网络流量分析</CardTitle>
            <CardDescription>实时网络流量监控和分析</CardDescription>
          </div>
          <div className="flex gap-2">
            <Select value={timeRange} onValueChange={setTimeRange}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="6">6小时</SelectItem>
                <SelectItem value="12">12小时</SelectItem>
                <SelectItem value="24">24小时</SelectItem>
                <SelectItem value="72">3天</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" size="sm" onClick={refreshData}>
              <RefreshCw className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="sm">
              <Download className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* 统计信息 */}
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center p-3 bg-muted/50 rounded-lg">
              <div className="text-2xl font-bold text-blue-600">
                {data.length > 0 ? Math.round(data[data.length - 1].download) : 0} Mbps
              </div>
              <div className="text-sm text-muted-foreground">当前下载</div>
            </div>
            <div className="text-center p-3 bg-muted/50 rounded-lg">
              <div className="text-2xl font-bold text-green-600">
                {data.length > 0 ? Math.round(data[data.length - 1].upload) : 0} Mbps
              </div>
              <div className="text-sm text-muted-foreground">当前上传</div>
            </div>
            <div className="text-center p-3 bg-muted/50 rounded-lg">
              <div className="text-2xl font-bold text-purple-600">
                {data.length > 0 ? Math.round(data.reduce((sum, d) => sum + d.total, 0) / data.length) : 0} Mbps
              </div>
              <div className="text-sm text-muted-foreground">平均流量</div>
            </div>
          </div>

          {/* 流量图表 */}
          <div className="relative h-64 border rounded-lg bg-muted/20 p-4">
            <svg width="100%" height="100%" viewBox="0 0 800 200">
              {/* 网格线 */}
              {[0, 1, 2, 3, 4].map((i) => (
                <g key={i}>
                  <line
                    x1="0"
                    y1={i * 50}
                    x2="800"
                    y2={i * 50}
                    stroke="#e5e7eb"
                    strokeWidth="1"
                    strokeDasharray="2,2"
                  />
                  <text x="5" y={i * 50 + 5} fill="#6b7280" fontSize="10">
                    {Math.round((maxValue * (4 - i)) / 4)} Mbps
                  </text>
                </g>
              ))}

              {/* 下载流量线 */}
              <polyline
                fill="none"
                stroke="#3b82f6"
                strokeWidth="2"
                points={data
                  .map((d, i) => `${(i * 800) / Math.max(data.length - 1, 1)},${200 - (d.download / maxValue) * 200}`)
                  .join(" ")}
              />

              {/* 上传流量线 */}
              <polyline
                fill="none"
                stroke="#22c55e"
                strokeWidth="2"
                points={data
                  .map((d, i) => `${(i * 800) / Math.max(data.length - 1, 1)},${200 - (d.upload / maxValue) * 200}`)
                  .join(" ")}
              />

              {/* 数据点 */}
              {data.map((d, i) => (
                <g key={i}>
                  <circle
                    cx={(i * 800) / Math.max(data.length - 1, 1)}
                    cy={200 - (d.download / maxValue) * 200}
                    r="3"
                    fill="#3b82f6"
                  />
                  <circle
                    cx={(i * 800) / Math.max(data.length - 1, 1)}
                    cy={200 - (d.upload / maxValue) * 200}
                    r="3"
                    fill="#22c55e"
                  />
                </g>
              ))}
            </svg>

            {/* 图例 */}
            <div className="absolute top-4 right-4 bg-background/90 backdrop-blur-sm border rounded-lg p-2 space-y-1">
              <div className="flex items-center gap-2 text-xs">
                <div className="w-3 h-0.5 bg-blue-500"></div>
                <span>下载</span>
              </div>
              <div className="flex items-center gap-2 text-xs">
                <div className="w-3 h-0.5 bg-green-500"></div>
                <span>上传</span>
              </div>
            </div>
          </div>

          {/* 时间轴 */}
          <div className="flex justify-between text-xs text-muted-foreground px-4">
            {data.length > 0 && (
              <>
                <span>{data[0].time}</span>
                <span>{data[Math.floor(data.length / 2)]?.time}</span>
                <span>{data[data.length - 1].time}</span>
              </>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
