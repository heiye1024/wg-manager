import type React from "react"
import "@/app/globals.css"
import { Inter } from "next/font/google"
import { ThemeProvider } from "@/components/theme-provider"
import { Toaster } from "@/components/toaster"
import { AuthWrapper } from "@/components/auth/auth-wrapper"
import type { Metadata } from "next"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: {
    default: "设备管理系统",
    template: "%s | 设备管理系统",
  },
  description: "企业级网络设备管理平台",
  keywords: ["设备管理", "网络管理", "WireGuard", "域名管理"],
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="zh-CN" suppressHydrationWarning>
      <body className={inter.className}>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
          <AuthWrapper>{children}</AuthWrapper>
          <Toaster /> 
        </ThemeProvider>
      </body>
    </html>
  )
}
