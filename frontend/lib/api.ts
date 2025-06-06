<<<<<<< HEAD
import axios from 'axios'

// 创建 axios 实例
const api = axios.create({
  baseURL: '/api',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json'
  }
=======
import axios from "axios"

// 创建 axios 实例
const api = axios.create({
  baseURL: "/api",
  timeout: 10000,
  headers: {
    "Content-Type": "application/json",
  },
>>>>>>> 4bc9d33b12aaa727626b3e210671633351fd6d41
})

// 请求拦截器
api.interceptors.request.use(
  (config) => {
    // 可以在这里添加认证令牌等
    return config
  },
  (error) => {
    return Promise.reject(error)
<<<<<<< HEAD
  }
=======
  },
>>>>>>> 4bc9d33b12aaa727626b3e210671633351fd6d41
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
<<<<<<< HEAD
      console.error('API Error:', error.response.status, error.response.data)
    } else if (error.request) {
      // 请求发送但没有收到响应
      console.error('API No Response:', error.request)
    } else {
      // 请求设置出错
      console.error('API Request Error:', error.message)
    }
    return Promise.reject(error)
  }
=======
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
>>>>>>> 4bc9d33b12aaa727626b3e210671633351fd6d41
)

// WireGuard API
export const wireguardApi = {
  // 获取所有对等设备
<<<<<<< HEAD
  getPeers: () => api.get('/wireguard/peers'),
  
  // 获取单个对等设备
  getPeer: (id: string) => api.get(`/wireguard/peers/${id}`),
  
  // 添加对等设备
  addPeer: (data: any) => api.post('/wireguard/peers', data),
  
  // 更新对等设备
  updatePeer: (id: string, data: any) => api.put(`/wireguard/peers/${id}`, data),
  
  // 删除对等设备
  deletePeer: (id: string) => api.delete(`/wireguard/peers/${id}`),
  
  // 获取服务器状态
  getServerStatus: () => api.get('/wireguard/status'),
  
  // 重启 WireGuard 服务
  restartService: () => api.post('/wireguard/restart'),
  
  // 生成客户端配置
  generateClientConfig: (id: string) => api.get(`/wireguard/peers/${id}/config`)
=======
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
  getServerStatus: () => api.get("/wireguard/status"),

  // 重启 WireGuard 服务
  restartService: () => api.post("/wireguard/restart"),

  // 生成客户端配置
  generateClientConfig: (id: string) => api.get(`/wireguard/peers/${id}/config`),
>>>>>>> 4bc9d33b12aaa727626b3e210671633351fd6d41
}

// 设备 API
export const deviceApi = {
  // 获取所有设备
<<<<<<< HEAD
  getDevices: () => api.get('/devices'),
  
  // 获取单个设备
  getDevice: (id: string) => api.get(`/devices/${id}`),
  
  // 添加设备
  addDevice: (data: any) => api.post('/devices', data),
  
  // 更新设备
  updateDevice: (id: string, data: any) => api.put(`/devices/${id}`, data),
  
  // 删除设备
  deleteDevice: (id: string) => api.delete(`/devices/${id}`)
=======
  getDevices: () => api.get("/devices"),

  // 获取单个设备
  getDevice: (id: string) => api.get(`/devices/${id}`),

  // 添加设备
  addDevice: (data: any) => api.post("/devices", data),

  // 更新设备
  updateDevice: (id: string, data: any) => api.put(`/devices/${id}`, data),

  // 删除设备
  deleteDevice: (id: string) => api.delete(`/devices/${id}`),
>>>>>>> 4bc9d33b12aaa727626b3e210671633351fd6d41
}

// 域名 API
export const domainApi = {
  // 获取所有域名记录
<<<<<<< HEAD
  getDomainRecords: () => api.get('/domains/records'),
  
  // 获取单个域名记录
  getDomainRecord: (id: string) => api.get(`/domains/records/${id}`),
  
  // 添加域名记录
  addDomainRecord: (data: any) => api.post('/domains/records', data),
  
  // 更新域名记录
  updateDomainRecord: (id: string, data: any) => api.put(`/domains/records/${id}`, data),
  
  // 删除域名记录
  deleteDomainRecord: (id: string) => api.delete(`/domains/records/${id}`),
  
  // 获取 DNS 配置
  getDnsConfig: () => api.get('/domains/dns-config'),
  
  // 更新 DNS 配置
  updateDnsConfig: (data: any) => api.put('/domains/dns-config', data),
  
  // 获取 SSL 证书
  getCertificates: () => api.get('/domains/certificates'),
  
  // 添加 SSL 证书
  addCertificate: (data: any) => api.post('/domains/certificates', data),
  
  // 删除 SSL 证书
  deleteCertificate: (id: string) => api.delete(`/domains/certificates/${id}`)
=======
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
>>>>>>> 4bc9d33b12aaa727626b3e210671633351fd6d41
}

// 网络工具 API
export const networkToolsApi = {
  // Ping
<<<<<<< HEAD
  ping: (host: string, count: number) => api.post('/network/ping', { host, count }),
  
  // Traceroute
  traceroute: (host: string) => api.post('/network/traceroute', { host }),
  
  // DNS 查询
  dnsLookup: (domain: string, type: string) => api.post('/network/dns-lookup', { domain, type }),
  
  // 端口扫描
  portScan: (host: string, ports: number[]) => api.post('/network/port-scan', { host, ports })
=======
  ping: (host: string, count: number) => api.post("/network/ping", { host, count }),

  // Traceroute
  traceroute: (host: string) => api.post("/network/traceroute", { host }),

  // DNS 查询
  dnsLookup: (domain: string, type: string) => api.post("/network/dns-lookup", { domain, type }),

  // 端口扫描
  portScan: (host: string, ports: number[]) => api.post("/network/port-scan", { host, ports }),
>>>>>>> 4bc9d33b12aaa727626b3e210671633351fd6d41
}

export default api
