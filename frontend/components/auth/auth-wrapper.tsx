"use client"

import type React from "react"

import { useEffect, useState } from "react"
import { useRouter, usePathname } from "next/navigation"
import { authApi } from "@/lib/api"
import { LoadingState } from "@/components/common/loading-state"

interface AuthWrapperProps {
  children: React.ReactNode
}

export function AuthWrapper({ children }: AuthWrapperProps) {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    const checkAuth = async () => {
      const token = localStorage.getItem("token")

      if (!token) {
        setIsAuthenticated(false)
        setIsLoading(false)
        return
      }

      try {
        const response = await authApi.verifyToken()
        if (response.data.success) {
          setIsAuthenticated(true)
        } else {
          localStorage.removeItem("token")
          localStorage.removeItem("user")
          setIsAuthenticated(false)
        }
      } catch (error) {
        console.error("Token verification failed:", error)
        localStorage.removeItem("token")
        localStorage.removeItem("user")
        setIsAuthenticated(false)
      } finally {
        setIsLoading(false)
      }
    }

    checkAuth()
  }, [])

  useEffect(() => {
    if (isLoading) return

    if (!isAuthenticated && pathname !== "/login") {
      router.push("/login")
    } else if (isAuthenticated && pathname === "/login") {
      router.push("/")
    }
  }, [isAuthenticated, isLoading, pathname, router])

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-blue-50">
        <LoadingState message="验证登录状态..." />
      </div>
    )
  }

  if (!isAuthenticated && pathname !== "/login") {
    return null
  }

  return <>{children}</>
}
