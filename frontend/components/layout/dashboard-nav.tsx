"use client"

import type React from "react"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { ThemeToggle } from "@/components/layout/theme-toggle"
import { Shield, LayoutDashboard, Settings, Server, Zap, Globe, Users, Network, Activity } from "lucide-react"

interface NavProps extends React.HTMLAttributes<HTMLElement> {
  items?: {
    href: string
    title: string
    icon: React.ReactNode
  }[]
}

export function DashboardNav({ className, items, ...props }: NavProps) {
  const pathname = usePathname()

  const defaultItems = [
    {
      href: "/",
      title: "仪表盘",
      icon: <LayoutDashboard className="mr-2 h-4 w-4" />,
    },
    {
      href: "/devices",
      title: "设备管理",
      icon: <Server className="mr-2 h-4 w-4" />,
    },
    {
      href: "/wireguard",
      title: "WireGuard",
      icon: <Shield className="mr-2 h-4 w-4" />,
    },
    {
      href: "/frp",
      title: "FRP 管理",
      icon: <Zap className="mr-2 h-4 w-4" />,
    },
    {
      href: "/domains",
      title: "域名管理",
      icon: <Globe className="mr-2 h-4 w-4" />,
    },
    {
      href: "/network",
      title: "网络工具",
      icon: <Network className="mr-2 h-4 w-4" />,
    },
    {
      href: "/users",
      title: "用户管理",
      icon: <Users className="mr-2 h-4 w-4" />,
    },
    {
      href: "/system",
      title: "系统概览",
      icon: <Activity className="mr-2 h-4 w-4" />,
    },
    {
      href: "/settings",
      title: "系统设置",
      icon: <Settings className="mr-2 h-4 w-4" />,
    },
  ]

  const navItems = items || defaultItems

  return (
    <nav
      className={cn(
        "flex h-screen w-full flex-col border-r bg-gradient-to-b from-background to-muted/20 p-4",
        className,
      )}
      {...props}
    >
      <div className="flex h-14 items-center justify-between px-4 py-2">
        <Link
          href="/"
          className="flex items-center gap-2 font-bold text-lg bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent transition-all duration-150 hover:from-blue-500 hover:to-purple-500"
        >
          <Shield className="h-6 w-6 text-blue-600" />
          <span>设备管理系统</span>
        </Link>
        <ThemeToggle />
      </div>
      <div className="flex-1 space-y-1 py-4">
        {navItems.map((item) => (
          <Button
            key={item.href}
            variant={pathname === item.href ? "secondary" : "ghost"}
            className={cn(
              "w-full justify-start transition-all duration-150 ease-out group relative overflow-hidden",
              pathname === item.href
                ? "bg-gradient-to-r from-blue-500/10 to-purple-500/10 text-blue-700 dark:text-blue-300 shadow-sm border-l-2 border-blue-500"
                : "hover:bg-gradient-to-r hover:from-blue-50 hover:to-purple-50 dark:hover:from-blue-950/50 dark:hover:to-purple-950/50 hover:text-blue-700 dark:hover:text-blue-300 hover:translate-x-0.5 hover:shadow-sm",
            )}
            asChild
          >
            <Link href={item.href}>
              <span className="transition-all duration-150 ease-out group-hover:scale-105 group-hover:text-blue-600">
                {item.icon}
              </span>
              <span className="font-medium">{item.title}</span>
              {pathname === item.href && (
                <div className="absolute inset-0 bg-gradient-to-r from-blue-500/5 to-purple-500/5 rounded-md" />
              )}
            </Link>
          </Button>
        ))}
      </div>
      <div className="mt-auto border-t pt-4 bg-gradient-to-r from-slate-50 to-blue-50 dark:from-slate-900 dark:to-blue-950 rounded-lg p-3">
        <div className="flex items-center justify-between px-2">
          <div className="space-y-1">
            <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">管理员</p>
            <p className="text-xs text-blue-600 dark:text-blue-400">admin@example.com</p>
          </div>
          <Button
            variant="outline"
            size="icon"
            className="transition-all duration-150 hover:bg-blue-100 dark:hover:bg-blue-900 hover:text-blue-700 dark:hover:text-blue-300 hover:scale-105 bg-transparent border-blue-200 dark:border-blue-800"
          >
            <Settings className="h-4 w-4" />
            <span className="sr-only">设置</span>
          </Button>
        </div>
      </div>
    </nav>
  )
}
