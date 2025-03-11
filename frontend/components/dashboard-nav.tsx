"use client"

import type React from "react"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Globe, HardDrive, LayoutDashboard, Network, Settings, Shield, Users } from "lucide-react"

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
      icon: <HardDrive className="mr-2 h-4 w-4" />,
    },
    {
      href: "/domains",
      title: "域名管理",
      icon: <Globe className="mr-2 h-4 w-4" />,
    },
    {
      href: "/wireguard",
      title: "WireGuard",
      icon: <Shield className="mr-2 h-4 w-4" />,
    },
    {
      href: "/network",
      title: "网络管理",
      icon: <Network className="mr-2 h-4 w-4" />,
    },
    {
      href: "/users",
      title: "用户管理",
      icon: <Users className="mr-2 h-4 w-4" />,
    },
    {
      href: "/settings",
      title: "系统设置",
      icon: <Settings className="mr-2 h-4 w-4" />,
    },
  ]

  const navItems = items || defaultItems

  return (
    <nav className={cn("flex h-screen w-full flex-col border-r bg-background p-4", className)} {...props}>
      <div className="flex h-14 items-center px-4 py-2">
        <Link href="/" className="flex items-center gap-2 font-semibold">
          <Network className="h-6 w-6" />
          <span>设备管理系统</span>
        </Link>
      </div>
      <div className="flex-1 space-y-1 py-4">
        {navItems.map((item) => (
          <Button
            key={item.href}
            variant={pathname === item.href ? "secondary" : "ghost"}
            className={cn(
              "w-full justify-start",
              pathname === item.href ? "bg-secondary" : "hover:bg-transparent hover:underline",
            )}
            asChild
          >
            <Link href={item.href}>
              {item.icon}
              {item.title}
            </Link>
          </Button>
        ))}
      </div>
      <div className="mt-auto border-t pt-4">
        <div className="flex items-center justify-between px-4">
          <div className="space-y-1">
            <p className="text-sm font-medium">管理员</p>
            <p className="text-xs text-muted-foreground">admin@example.com</p>
          </div>
          <Button variant="outline" size="icon">
            <Settings className="h-4 w-4" />
            <span className="sr-only">设置</span>
          </Button>
        </div>
      </div>
    </nav>
  )
}

