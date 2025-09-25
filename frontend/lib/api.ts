import axios, {
  type AxiosInstance,
  type AxiosRequestConfig,
  type InternalAxiosRequestConfig,
} from "axios"

const DEFAULT_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://172.17.1.61:8080/api"

type ApiClient = Omit<AxiosInstance, "get" | "post" | "put" | "delete"> & {
  get<T = unknown>(url: string, config?: AxiosRequestConfig): Promise<T>
  post<T = unknown>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<T>
  put<T = unknown>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<T>
  delete<T = unknown>(url: string, config?: AxiosRequestConfig): Promise<T>
}

const axiosInstance = axios.create({
  baseURL: DEFAULT_BASE_URL,
  timeout: 10000,
  headers: {
    "Content-Type": "application/json",
  },
})

axiosInstance.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    if (typeof window !== "undefined") {
      const token = window.localStorage.getItem("token")
      if (token) {
        config.headers.Authorization = `Bearer ${token}`
      } else {
        delete config.headers.Authorization
      }
    }
    return config
  },
  (error) => Promise.reject(error),
)

axiosInstance.interceptors.response.use(
  (response) => response.data,
  (error) => {
    if (error.response) {
      console.error("API Error:", error.response.status, error.response.data)
    } else if (error.request) {
      console.error("API No Response:", error.request)
    } else {
      console.error("API Request Error:", error.message)
    }
    return Promise.reject(error)
  },
)

const api = axiosInstance as ApiClient

export type ApiResp<T = unknown> = {
  success: boolean
  message?: string
  data?: T
  error?: string
  [key: string]: unknown
}

export interface WireGuardInterfaceDto {
  id: string | number
  name: string
  status?: string
  listen_port?: number
  address?: string
  peers?: unknown[]
}

export interface WireGuardPeerDto {
  id: string | number
  name?: string
  public_key?: string
  allowed_ips?: string
  endpoint?: string
  last_handshake?: string
  bytes_received?: number | string
  bytes_sent?: number | string
  persistent_keepalive?: number | string | null
  status?: string
  interface_id?: string | number
}

export interface WireGuardStatusDto {
  wireguard: {
    version: string
    status: string
    interfaces: number
    active_peers: number
    total_peers: number
  }
  system: {
    uptime: string
    cpu_usage: number
    memory_usage: number
    disk_usage: number
  }
  network: {
    bytes_received: number
    bytes_sent: number
    packets_received: number
    packets_sent: number
  }
}

export interface WireGuardConfigDto {
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



type AuthSession = {
  token: string
  user: Record<string, unknown>
}

const getAuthHeaders = () => {
  if (typeof window === "undefined") {
    return {}
  }

  const token = window.localStorage.getItem("token")
  return token ? { Authorization: `Bearer ${token}` } : {}
}

export const authApi = {
  login: (credentials: { username: string; password: string }) =>
    api.post<ApiResp<AuthSession>>("/auth/login", credentials),

  logout: () =>
    api.post<ApiResp<null>>(
      "/auth/logout",
      {},
      {
        headers: getAuthHeaders(),
      },
    ),

  verifyToken: () =>
    api.get<ApiResp<{ valid: boolean }>>("/auth/verify", {
      headers: getAuthHeaders(),
    }),

  refreshToken: () =>
    api.post<ApiResp<AuthSession>>(
      "/auth/refresh",
      {},
      {
        headers: getAuthHeaders(),
      },
    ),
}



export const interfaceApi = {
  getAll: () => api.get<ApiResp<WireGuardInterfaceDto[]>>("/wireguard/interfaces"),

  get: (id: string) => api.get<ApiResp<WireGuardInterfaceDto>>(`/interfaces/${id}`),

  create: (data: Record<string, unknown>) =>
    api.post<ApiResp<WireGuardInterfaceDto>>("/wireguard/interfaces", data),

  update: (id: string, data: Record<string, unknown>) =>
    api.put<ApiResp<WireGuardInterfaceDto>>(`/interfaces/${id}`, data),

  delete: (id: string) => api.delete<ApiResp<null>>(`/wireguard/interfaces/${id}`),

  start: (id: number | string) => api.post<ApiResp<null>>(`/wireguard/interfaces/${id}/start`),

  stop: (id: number | string) => api.post<ApiResp<null>>(`/wireguard/interfaces/${id}/stop`),

  getConfig: (id: number | string) =>
    api.get<string>(`/wireguard/interfaces/${id}/config`, {
      responseType: "text",
      transformResponse: (value) => value,
      headers: { Accept: "text/plain" },
    }),
}


// WireGuard API
export const wireguardApi = {
  getInterfaces: () => api.get<ApiResp<WireGuardInterfaceDto[]>>("/wireguard/interfaces"),

  getPeers: () => api.get<ApiResp<WireGuardPeerDto[]>>("/wireguard/peers"),

  getPeer: (id: string) => api.get<ApiResp<WireGuardPeerDto>>(`/wireguard/peers/${id}`),

  addPeer: (data: Record<string, unknown>) =>
    api.post<ApiResp<WireGuardPeerDto>>("/wireguard/peers", data),

  updatePeer: (id: string | number, data: Record<string, unknown>) =>
    api.put<ApiResp<WireGuardPeerDto>>(`/wireguard/peers/${id}`, data),

  deletePeer: (id: string) => api.delete<ApiResp<null>>(`/wireguard/peers/${id}`),

  getServerStatus: (id: string) =>
    api.get<ApiResp<Record<string, unknown>>>(`/wireguard/interfaces/${id}/status`),

  restartService: () => api.post<ApiResp<null>>("/wireguard/restart"),

  generateClientConfig: (id: string) =>
    api.get<string>(`/wireguard/peers/${id}/config`, {
      responseType: "text",
      transformResponse: (value) => value,
      headers: { Accept: "text/plain" },
    }),

  getSystemStatus: () => api.get<ApiResp<WireGuardStatusDto>>("/wireguard/status"),
}

export const statusApi = {
  getStatus: () =>
    api.get<ApiResp<WireGuardStatusDto> & { config?: WireGuardConfigDto }>("/wireguard/status"),

  getServiceStatus: () =>
    api.get<ApiResp<Record<string, unknown>>>("/status/services"),

  getResources: () =>
    api.get<ApiResp<Record<string, unknown>>>("/status/resources"),
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
