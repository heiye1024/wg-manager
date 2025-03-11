"use client"

export function NetworkStatus() {
  return (
    <div className="h-[300px] w-full flex items-center justify-center">
      <div className="text-center">
        <div className="relative inline-flex">
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-lg font-medium">75%</span>
          </div>
          <svg className="h-32 w-32" viewBox="0 0 100 100">
            <circle className="text-muted stroke-current" strokeWidth="10" fill="transparent" r="40" cx="50" cy="50" />
            <circle
              className="text-primary stroke-current"
              strokeWidth="10"
              strokeLinecap="round"
              fill="transparent"
              r="40"
              cx="50"
              cy="50"
              strokeDasharray="251.2"
              strokeDashoffset="62.8"
              transform="rotate(-90 50 50)"
            />
          </svg>
        </div>
        <p className="mt-2 text-sm text-muted-foreground">设备在线率</p>
      </div>
    </div>
  )
}

