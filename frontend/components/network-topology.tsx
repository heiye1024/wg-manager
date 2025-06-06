"use client"

import { useRef, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { RefreshCw, ZoomIn, ZoomOut, Maximize2 } from "lucide-react"

type NetworkNode = {
  id: string
  name: string
  type: "router" | "switch" | "server" | "device" | "ap"
  x: number
  y: number
  status: "online" | "offline" | "warning"
  ip: string
  connections: string[]
}

type NetworkLink = {
  source: string
  target: string
  type: "ethernet" | "wifi" | "fiber"
  status: "active" | "inactive"
}

const mockNodes: NetworkNode[] = [
  {
    id: "router-1",
    name: "主路由器",
    type: "router",
    x: 400,
    y: 200,
    status: "online",
    ip: "192.168.1.1",
    connections: ["switch-1", "ap-1", "server-1"],
  },
  {
    id: "switch-1",
    name: "核心交换机",
    type: "switch",
    x: 200,
    y: 300,
    status: "online",
    ip: "192.168.1.2",
    connections: ["router-1", "server-2", "device-1"],
  },
  {
    id: "ap-1",
    name: "无线AP",
    type: "ap",
    x: 600,
    y: 300,
    status: "online",
    ip: "192.168.1.3",
    connections: ["router-1", "device-2", "device-3"],
  },
  {
    id: "server-1",
    name: "Web服务器",
    type: "server",
    x: 400,
    y: 100,
    status: "online",
    ip: "192.168.1.10",
    connections: ["router-1"],
  },
  {
    id: "server-2",
    name: "数据库服务器",
    type: "server",
    x: 100,
    y: 400,
    status: "warning",
    ip: "192.168.1.11",
    connections: ["switch-1"],
  },
  {
    id: "device-1",
    name: "办公电脑1",
    type: "device",
    x: 200,
    y: 450,
    status: "online",
    ip: "192.168.1.20",
    connections: ["switch-1"],
  },
  {
    id: "device-2",
    name: "移动设备1",
    type: "device",
    x: 650,
    y: 400,
    status: "online",
    ip: "192.168.1.21",
    connections: ["ap-1"],
  },
  {
    id: "device-3",
    name: "移动设备2",
    type: "device",
    x: 550,
    y: 450,
    status: "offline",
    ip: "192.168.1.22",
    connections: ["ap-1"],
  },
]

const mockLinks: NetworkLink[] = [
  { source: "router-1", target: "switch-1", type: "ethernet", status: "active" },
  { source: "router-1", target: "ap-1", type: "ethernet", status: "active" },
  { source: "router-1", target: "server-1", type: "ethernet", status: "active" },
  { source: "switch-1", target: "server-2", type: "ethernet", status: "active" },
  { source: "switch-1", target: "device-1", type: "ethernet", status: "active" },
  { source: "ap-1", target: "device-2", type: "wifi", status: "active" },
  { source: "ap-1", target: "device-3", type: "wifi", status: "inactive" },
]

export function NetworkTopology() {
  const svgRef = useRef<SVGSVGElement>(null)
  const [selectedNode, setSelectedNode] = useState<NetworkNode | null>(null)
  const [zoom, setZoom] = useState(1)
  const [pan, setPan] = useState({ x: 0, y: 0 })

  const getNodeColor = (status: string) => {
    switch (status) {
      case "online":
        return "#22c55e"
      case "warning":
        return "#f59e0b"
      case "offline":
        return "#ef4444"
      default:
        return "#6b7280"
    }
  }

  const getNodeIcon = (type: string) => {
    switch (type) {
      case "router":
        return "R"
      case "switch":
        return "S"
      case "server":
        return "SV"
      case "ap":
        return "AP"
      case "device":
        return "D"
      default:
        return "?"
    }
  }

  const getLinkColor = (type: string, status: string) => {
    if (status === "inactive") return "#6b7280"
    switch (type) {
      case "ethernet":
        return "#3b82f6"
      case "wifi":
        return "#8b5cf6"
      case "fiber":
        return "#f59e0b"
      default:
        return "#6b7280"
    }
  }

  const handleZoomIn = () => {
    setZoom((prev) => Math.min(prev * 1.2, 3))
  }

  const handleZoomOut = () => {
    setZoom((prev) => Math.max(prev / 1.2, 0.5))
  }

  const handleReset = () => {
    setZoom(1)
    setPan({ x: 0, y: 0 })
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>网络拓扑图</CardTitle>
            <CardDescription>实时网络设备连接拓扑</CardDescription>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={handleZoomOut}>
              <ZoomOut className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="sm" onClick={handleZoomIn}>
              <ZoomIn className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="sm" onClick={handleReset}>
              <Maximize2 className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="sm">
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="relative">
          <svg
            ref={svgRef}
            width="100%"
            height="500"
            viewBox={`${-pan.x} ${-pan.y} ${800 / zoom} ${500 / zoom}`}
            className="border rounded-lg bg-muted/20"
          >
            {/* 绘制连接线 */}
            {mockLinks.map((link, index) => {
              const sourceNode = mockNodes.find((n) => n.id === link.source)
              const targetNode = mockNodes.find((n) => n.id === link.target)
              if (!sourceNode || !targetNode) return null

              return (
                <g key={index}>
                  <line
                    x1={sourceNode.x}
                    y1={sourceNode.y}
                    x2={targetNode.x}
                    y2={targetNode.y}
                    stroke={getLinkColor(link.type, link.status)}
                    strokeWidth={link.status === "active" ? 2 : 1}
                    strokeDasharray={link.type === "wifi" ? "5,5" : "none"}
                    opacity={link.status === "active" ? 1 : 0.5}
                  />
                  {/* 连接类型标签 */}
                  <text
                    x={(sourceNode.x + targetNode.x) / 2}
                    y={(sourceNode.y + targetNode.y) / 2 - 5}
                    fill="#6b7280"
                    fontSize="10"
                    textAnchor="middle"
                    className="pointer-events-none"
                  >
                    {link.type}
                  </text>
                </g>
              )
            })}

            {/* 绘制节点 */}
            {mockNodes.map((node) => (
              <g
                key={node.id}
                className="cursor-pointer"
                onClick={() => setSelectedNode(node)}
                transform={`translate(${node.x}, ${node.y})`}
              >
                {/* 节点圆圈 */}
                <circle
                  r="25"
                  fill={getNodeColor(node.status)}
                  stroke="#ffffff"
                  strokeWidth="2"
                  className="drop-shadow-sm"
                />
                {/* 节点图标 */}
                <text
                  textAnchor="middle"
                  dy="5"
                  fill="white"
                  fontSize="12"
                  fontWeight="bold"
                  className="pointer-events-none"
                >
                  {getNodeIcon(node.type)}
                </text>
                {/* 节点名称 */}
                <text
                  textAnchor="middle"
                  dy="45"
                  fill="#374151"
                  fontSize="12"
                  fontWeight="500"
                  className="pointer-events-none"
                >
                  {node.name}
                </text>
                {/* 状态指示器 */}
                <circle cx="20" cy="-20" r="5" fill={getNodeColor(node.status)} stroke="#ffffff" strokeWidth="1" />
              </g>
            ))}
          </svg>

          {/* 图例 */}
          <div className="absolute top-4 right-4 bg-background/90 backdrop-blur-sm border rounded-lg p-3 space-y-2">
            <div className="text-sm font-medium">图例</div>
            <div className="space-y-1 text-xs">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-green-500"></div>
                <span>在线</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                <span>警告</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-red-500"></div>
                <span>离线</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-0.5 bg-blue-500"></div>
                <span>以太网</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-0.5 bg-purple-500 border-dashed border-t"></div>
                <span>WiFi</span>
              </div>
            </div>
          </div>

          {/* 缩放控制 */}
          <div className="absolute bottom-4 left-4 bg-background/90 backdrop-blur-sm border rounded-lg p-2">
            <div className="text-xs text-muted-foreground">缩放: {Math.round(zoom * 100)}%</div>
          </div>
        </div>

        {/* 节点详情面板 */}
        {selectedNode && (
          <div className="mt-4 p-4 border rounded-lg bg-muted/50">
            <div className="flex items-center justify-between mb-2">
              <h4 className="font-medium">{selectedNode.name}</h4>
              <Badge variant={selectedNode.status === "online" ? "default" : "destructive"}>
                {selectedNode.status === "online" ? "在线" : selectedNode.status === "warning" ? "警告" : "离线"}
              </Badge>
            </div>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">类型:</span> {selectedNode.type}
              </div>
              <div>
                <span className="text-muted-foreground">IP地址:</span> {selectedNode.ip}
              </div>
              <div>
                <span className="text-muted-foreground">连接数:</span> {selectedNode.connections.length}
              </div>
              <div>
                <span className="text-muted-foreground">位置:</span> ({selectedNode.x}, {selectedNode.y})
              </div>
            </div>
            <Button variant="outline" size="sm" className="mt-2" onClick={() => setSelectedNode(null)}>
              关闭
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
