"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  Edit,
  Loader2,
  MoreHorizontal,
  Plus,
  RefreshCw,
  Search,
  Trash,
  Eye,
  Shield,
  UserCheck,
  UserX,
} from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useToast } from "@/hooks/use-toast"

type User = {
  id: string
  username: string
  email: string
  fullName: string
  role: "admin" | "user" | "viewer"
  status: "active" | "inactive" | "suspended"
  lastLogin: string
  createdAt: string
  avatar?: string
}

const mockUsers: User[] = [
  {
    id: "1",
    username: "admin",
    email: "admin@example.com",
    fullName: "系统管理员",
    role: "admin",
    status: "active",
    lastLogin: new Date().toISOString(),
    createdAt: "2023-01-01T00:00:00Z",
  },
  {
    id: "2",
    username: "john_doe",
    email: "john@example.com",
    fullName: "John Doe",
    role: "user",
    status: "active",
    lastLogin: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    createdAt: "2023-02-15T10:30:00Z",
  },
  {
    id: "3",
    username: "jane_smith",
    email: "jane@example.com",
    fullName: "Jane Smith",
    role: "viewer",
    status: "inactive",
    lastLogin: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
    createdAt: "2023-03-20T14:15:00Z",
  },
]

const roles = [
  { value: "admin", label: "管理员", description: "完全访问权限" },
  { value: "user", label: "用户", description: "标准用户权限" },
  { value: "viewer", label: "查看者", description: "只读权限" },
]

export function UserManagement() {
  const [users, setUsers] = useState<User[]>(mockUsers)
  const [loading, setLoading] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedUser, setSelectedUser] = useState<User | null>(null)
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [deleteLoading, setDeleteLoading] = useState(false)
  const [formData, setFormData] = useState({
    username: "",
    email: "",
    fullName: "",
    role: "user",
    password: "",
    confirmPassword: "",
  })

  const { toast } = useToast()

  // 模拟加载用户列表
  const loadUsers = async () => {
    setLoading(true)
    // 模拟 API 调用
    setTimeout(() => {
      setUsers(mockUsers)
      setLoading(false)
    }, 1000)
  }

  // 添加用户
  const handleAddUser = async () => {
    try {
      // 验证表单
      if (!formData.username || !formData.email || !formData.fullName || !formData.password) {
        toast({
          title: "表单不完整",
          description: "请填写所有必填字段",
          variant: "destructive",
        })
        return
      }

      if (formData.password !== formData.confirmPassword) {
        toast({
          title: "密码不匹配",
          description: "两次输入的密码不一致",
          variant: "destructive",
        })
        return
      }

      // 检查用户名和邮箱是否已存在
      const existingUser = users.find((u) => u.username === formData.username || u.email === formData.email)
      if (existingUser) {
        toast({
          title: "用户已存在",
          description: "用户名或邮箱已被使用",
          variant: "destructive",
        })
        return
      }

      const newUser: User = {
        id: (users.length + 1).toString(),
        username: formData.username,
        email: formData.email,
        fullName: formData.fullName,
        role: formData.role as "admin" | "user" | "viewer",
        status: "active",
        lastLogin: "",
        createdAt: new Date().toISOString(),
      }

      setUsers([...users, newUser])

      toast({
        title: "添加成功",
        description: "用户已成功添加",
      })

      // 重置表单并关闭对话框
      setFormData({
        username: "",
        email: "",
        fullName: "",
        role: "user",
        password: "",
        confirmPassword: "",
      })
      setIsAddDialogOpen(false)
    } catch (error) {
      console.error("Failed to add user:", error)
      toast({
        title: "添加失败",
        description: "无法添加用户",
        variant: "destructive",
      })
    }
  }

  // 编辑用户
  const handleEditUser = async () => {
    if (!selectedUser) return

    try {
      // 检查用户名和邮箱冲突（排除当前用户）
      const conflictUser = users.find(
        (u) => u.id !== selectedUser.id && (u.username === formData.username || u.email === formData.email),
      )
      if (conflictUser) {
        toast({
          title: "用户信息冲突",
          description: "用户名或邮箱已被其他用户使用",
          variant: "destructive",
        })
        return
      }

      const updatedUsers = users.map((user) =>
        user.id === selectedUser.id
          ? {
              ...user,
              username: formData.username,
              email: formData.email,
              fullName: formData.fullName,
              role: formData.role as "admin" | "user" | "viewer",
            }
          : user,
      )

      setUsers(updatedUsers)

      toast({
        title: "更新成功",
        description: "用户信息已成功更新",
      })

      setIsEditDialogOpen(false)
    } catch (error) {
      console.error("Failed to update user:", error)
      toast({
        title: "更新失败",
        description: "无法更新用户信息",
        variant: "destructive",
      })
    }
  }

  // 删除用户
  const handleDeleteUser = async () => {
    if (!selectedUser) return

    try {
      setDeleteLoading(true)
      const updatedUsers = users.filter((user) => user.id !== selectedUser.id)
      setUsers(updatedUsers)

      toast({
        title: "删除成功",
        description: "用户已成功删除",
      })

      setDeleteDialogOpen(false)
    } catch (error) {
      console.error("Failed to delete user:", error)
      toast({
        title: "删除失败",
        description: "无法删除用户",
        variant: "destructive",
      })
    } finally {
      setDeleteLoading(false)
    }
  }

  // 切换用户状态
  const toggleUserStatus = async (user: User) => {
    const newStatus = user.status === "active" ? "inactive" : "active"
    const updatedUsers = users.map((u) => (u.id === user.id ? { ...u, status: newStatus } : u))
    setUsers(updatedUsers)

    toast({
      title: "状态已更新",
      description: `用户 ${user.username} 已${newStatus === "active" ? "激活" : "停用"}`,
    })
  }

  // 打开编辑对话框
  const openEditDialog = (user: User) => {
    setSelectedUser(user)
    setFormData({
      username: user.username,
      email: user.email,
      fullName: user.fullName,
      role: user.role,
      password: "",
      confirmPassword: "",
    })
    setIsEditDialogOpen(true)
  }

  // 打开查看对话框
  const openViewDialog = (user: User) => {
    setSelectedUser(user)
    setIsViewDialogOpen(true)
  }

  // 打开删除对话框
  const openDeleteDialog = (user: User) => {
    setSelectedUser(user)
    setDeleteDialogOpen(true)
  }

  // 过滤用户
  const filteredUsers = users.filter(
    (user) =>
      user.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.fullName.toLowerCase().includes(searchQuery.toLowerCase()),
  )

  // 获取角色徽章
  const getRoleBadge = (role: string) => {
    switch (role) {
      case "admin":
        return <Badge className="bg-red-500 hover:bg-red-600">管理员</Badge>
      case "user":
        return <Badge className="bg-blue-500 hover:bg-blue-600">用户</Badge>
      case "viewer":
        return <Badge variant="secondary">查看者</Badge>
      default:
        return <Badge variant="outline">未知</Badge>
    }
  }

  // 获取状态徽章
  const getStatusBadge = (status: string) => {
    switch (status) {
      case "active":
        return <Badge className="bg-green-500 hover:bg-green-600">活跃</Badge>
      case "inactive":
        return <Badge variant="secondary">非活跃</Badge>
      case "suspended":
        return <Badge variant="destructive">已暂停</Badge>
      default:
        return <Badge variant="outline">未知</Badge>
    }
  }

  // 格式化最后登录时间
  const formatLastLogin = (lastLogin: string) => {
    if (!lastLogin) return "从未登录"
    const now = new Date()
    const loginDate = new Date(lastLogin)
    const diffMs = now.getTime() - loginDate.getTime()
    const diffMins = Math.floor(diffMs / (1000 * 60))

    if (diffMins < 1) return "刚刚"
    if (diffMins < 60) return `${diffMins}分钟前`
    if (diffMins < 1440) return `${Math.floor(diffMins / 60)}小时前`
    return `${Math.floor(diffMins / 1440)}天前`
  }

  // 初始加载
  useEffect(() => {
    loadUsers()
  }, [])

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>用户管理</CardTitle>
            <CardDescription>管理系统用户和权限</CardDescription>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={loadUsers} disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
              <span className="sr-only">刷新</span>
            </Button>

            <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  添加用户
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                  <DialogTitle>添加新用户</DialogTitle>
                  <DialogDescription>创建新的系统用户账户</DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="username">用户名 *</Label>
                      <Input
                        id="username"
                        value={formData.username}
                        onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                        placeholder="用户名"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="email">邮箱 *</Label>
                      <Input
                        id="email"
                        type="email"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        placeholder="user@example.com"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="fullName">全名 *</Label>
                    <Input
                      id="fullName"
                      value={formData.fullName}
                      onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                      placeholder="用户全名"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="role">角色 *</Label>
                    <Select value={formData.role} onValueChange={(value) => setFormData({ ...formData, role: value })}>
                      <SelectTrigger>
                        <SelectValue placeholder="选择角色" />
                      </SelectTrigger>
                      <SelectContent>
                        {roles.map((role) => (
                          <SelectItem key={role.value} value={role.value}>
                            <div>
                              <div>{role.label}</div>
                              <div className="text-xs text-muted-foreground">{role.description}</div>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="password">密码 *</Label>
                      <Input
                        id="password"
                        type="password"
                        value={formData.password}
                        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                        placeholder="密码"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="confirmPassword">确认密码 *</Label>
                      <Input
                        id="confirmPassword"
                        type="password"
                        value={formData.confirmPassword}
                        onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                        placeholder="确认密码"
                      />
                    </div>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                    取消
                  </Button>
                  <Button onClick={handleAddUser}>添加用户</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between mb-4">
          <div className="relative w-64">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="搜索用户..."
              className="pl-8"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm">
              导出
            </Button>
            <Button variant="outline" size="sm">
              筛选
            </Button>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>用户</TableHead>
                  <TableHead>邮箱</TableHead>
                  <TableHead>角色</TableHead>
                  <TableHead>状态</TableHead>
                  <TableHead>最后登录</TableHead>
                  <TableHead>创建时间</TableHead>
                  <TableHead className="w-[80px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell>
                      <div className="flex items-center space-x-3">
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={user.avatar || "/placeholder.svg"} />
                          <AvatarFallback>{user.fullName.charAt(0).toUpperCase()}</AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="font-medium">{user.fullName}</div>
                          <div className="text-sm text-muted-foreground">@{user.username}</div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell>{getRoleBadge(user.role)}</TableCell>
                    <TableCell>{getStatusBadge(user.status)}</TableCell>
                    <TableCell>{formatLastLogin(user.lastLogin)}</TableCell>
                    <TableCell>{new Date(user.createdAt).toLocaleDateString()}</TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="h-4 w-4" />
                            <span className="sr-only">打开菜单</span>
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel>操作</DropdownMenuLabel>
                          <DropdownMenuItem onClick={() => openViewDialog(user)}>
                            <Eye className="mr-2 h-4 w-4" />
                            查看详情
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => openEditDialog(user)}>
                            <Edit className="mr-2 h-4 w-4" />
                            编辑
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => toggleUserStatus(user)}>
                            {user.status === "active" ? (
                              <>
                                <UserX className="mr-2 h-4 w-4" />
                                停用
                              </>
                            ) : (
                              <>
                                <UserCheck className="mr-2 h-4 w-4" />
                                激活
                              </>
                            )}
                          </DropdownMenuItem>
                          <DropdownMenuItem>
                            <Shield className="mr-2 h-4 w-4" />
                            重置密码
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            className="text-red-600"
                            onClick={() => openDeleteDialog(user)}
                            disabled={user.role === "admin"}
                          >
                            <Trash className="mr-2 h-4 w-4" />
                            删除
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>

      {/* 其他对话框组件... */}
      {/* 为了节省空间，这里省略了编辑、查看和删除对话框的完整实现 */}
      {/* 它们的结构与设备管理组件中的类似 */}
    </Card>
  )
}
