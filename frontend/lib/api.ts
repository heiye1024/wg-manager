import axios from "axios"
import { get } from "http"

// 创建 axios 实例
const api = axios.create({
  baseURL: "http://172.17.1.61:8080/api",
  timeout: 10000,
  headers: {
    "Content-Type": "application/json",
  },
})

// 请求拦截器
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token")
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    } else {
      // 没 token 就不要带 Authorization
      delete (config.headers as any).Authorization
    }
    return config
  },
  (error) => Promise.reject(error),
)

// 响应拦截器
api.interceptors.response.use(
  (response) => {
    return response.data
  },
  (error) => {
    // 处理错误响应
    if (error.response) {
      // 服务器返回错误状态码
      console.error("API Error:", error.response.status, error.response.data)
    } else if (error.request) {
      // 请求发送但没有收到响应
      console.error("API No Response:", error.request)
    } else {
      // 请求设置出错
      console.error("API Request Error:", error.message)
    }
    return Promise.reject(error)
  },
)





export type ApiResp<T = unknown> = {
  success: boolean
  message?: string
  data?: T
  error?: string
}



export const authApi = {
  // 用户登录
  login: async (credentials: { username: string; password: string }) => {
    const response = await api.post("/auth/login", credentials)
    return response
  },

  // 用户登出
  logout: async () => {
    const token = localStorage.getItem("token")
    const response = await api.post(
      "/auth/logout",
      {},
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
    )
    return response
  },

  // 验证令牌
  verifyToken: async () => {
    const token = localStorage.getItem("token")
    const response = await api.get("/auth/verify", {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })
    return response
  },

  // 刷新令牌
  refreshToken: async () => {
    const token = localStorage.getItem("token")
    const response = await api.post(
      "/auth/refresh",
      {},
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
    )
    return response
  },
}



export const interfaceApi = {
  // 获取所有接口
  getAll: async () => {
    const response = await api.get("/wireguard/interfaces")
    return response
  },

  // 获取单个接口
  get: async (id: string) => {
    const response = await api.get(`/interfaces/${id}`)
    return response
  },

  // 创建接口
  create: async (data: any) => {
    const response = await api.post("/wireguard/interfaces", data)
    return response
  },

  // 更新接口
  update: async (id: string, data: any) => {
    const response = await api.put(`/interfaces/${id}`, data)
    return response
  },

  // 删除接口
  delete: async (id: string) => {
    const response = await api.delete(`/wireguard/interfaces/${id}`)
    return response
  },

  // 启动接口
  start: async (id: number) => {
    const response = await api.post(`/wireguard/interfaces/${id}/start`)
    return response
  },

  // 停止接口
  stop: async (id: number) => {
    const response = await api.post(`/wireguard/interfaces/${id}/stop`)
    return response
  },

  // 获取接口配置
  getConfig: async (id: number) => {
    const response = await api.get(`/wireguard/interfaces/${id}/config`)
    return response
  },
}


// WireGuard API
export const wireguardApi = {

  // 获取所有 WireGuard 接口
  getInterfaces: () => api.get("/wireguard/interfaces"),

  // 获取所有对等设备
  getPeers: () => api.get("/wireguard/peers"),

  // 获取单个对等设备
  getPeer: (id: string) => api.get(`/wireguard/peers/${id}`),

  // 添加对等设备
  addPeer: (data: any) => api.post("/wireguard/peers", data),

  // 更新对等设备
  updatePeer: (id: string, data: any) => api.put(`/wireguard/peers/${id}`, data),

  // 删除对等设备
  deletePeer: (id: string) => api.delete(`/wireguard/peers/${id}`),

  // 获取服务器状态
  getServerStatus: (id: string) => api.get(`/wireguard/interfaces/${id}/status`),

  // 重启 WireGuard 服务
  restartService: () => api.post("/wireguard/restart"),

  // 生成客户端配置
  //generateClientConfig: (id: string) => api.get(`/wireguard/peers/${id}/config`),

  generateClientConfig: (id: string) =>
  api.get(`/wireguard/peers/${id}/config`, {
    responseType: "text",        // 很关键：告诉 axios 不要当 JSON 解析
    transformResponse: r => r,   // 保留原始文本，避免自动 JSON 解析
    headers: { Accept: "text/plain" },
  }),

  getSystemStatus: () => api.get("/wireguard/status"),
}

export const statusApi = {
  // 获取系统状态
  getStatus: async () => {
    const response = await api.get("wireguard/status")
    return response
  },

  // 获取服务状态
  getServiceStatus: async () => {
    const response = await api.get("/status/services")
    return response
  },

  // 获取系统资源
  getResources: async () => {
    const response = await api.get("/status/resources")
    return response
  },
}

// 系统状态 API
export const systemApi = {
  // 获取系统状态
  getStatus: async () => {
    const response = await api.get("/system/status")
    return response
  },

  // 获取系统告警
  getAlerts: async (params?: { type?: string; limit?: number }) => {
    const response = await api.get("/system/alerts", { params })
    return response
  },

  // 获取系统统计
  getStats: async () => {
    const response = await api.get("/system/stats")
    return response
  },

  // 获取系统资源使用情况
  getResources: async () => {
    const response = await api.get("/system/resources")
    return response
  },
}



// 设备 API
export const deviceApi = {
  // 获取所有设备
  getDevices: () => api.get("/devices"),

  // 获取单个设备
  getDevice: (id: string) => api.get(`/devices/${id}`),

  // 添加设备
  addDevice: (data: any) => api.post("/devices", data),

  // 更新设备
  updateDevice: (id: string, data: any) => api.put(`/devices/${id}`, data),

  // 删除设备
  deleteDevice: (id: string) => api.delete(`/devices/${id}`),
}

// 域名 API
export const domainApi = {
  // 获取所有域名记录
  getDomainRecords: () => api.get("/domains/records"),

  // 获取单个域名记录
  getDomainRecord: (id: string) => api.get(`/domains/records/${id}`),

  // 添加域名记录
  addDomainRecord: (data: any) => api.post("/domains/records", data),

  // 更新域名记录
  updateDomainRecord: (id: string, data: any) => api.put(`/domains/records/${id}`, data),

  // 删除域名记录
  deleteDomainRecord: (id: string) => api.delete(`/domains/records/${id}`),

  // 获取 DNS 配置
  getDnsConfig: () => api.get("/domains/dns-config"),

  // 更新 DNS 配置
  updateDnsConfig: (data: any) => api.put("/domains/dns-config", data),

  // 获取 SSL 证书
  getCertificates: () => api.get("/domains/certificates"),

  // 添加 SSL 证书
  addCertificate: (data: any) => api.post("/domains/certificates", data),

  // 删除 SSL 证书
  deleteCertificate: (id: string) => api.delete(`/domains/certificates/${id}`),
}

// 网络工具 API
export const networkToolsApi = {
  // Ping
  ping: (host: string, count: number) => api.post("/network/ping", { host, count }),

  // Traceroute
  traceroute: (host: string) => api.post("/network/traceroute", { host }),

  // DNS 查询
  dnsLookup: (domain: string, type: string) => api.post("/network/dns-lookup", { domain, type }),

  // 端口扫描
  portScan: (host: string, ports: number[]) => api.post("/network/port-scan", { host, ports }),
}

export default api
