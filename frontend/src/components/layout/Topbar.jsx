import { useEffect, useState } from "react"

import { useBackendStatus } from "@/hooks/useBackendStatus"
import { cn } from "@/lib/utils"

function formatNow() {
  return new Date().toLocaleTimeString("id-ID", { hour12: false })
}

function ConnectionStatus() {
  const { connected } = useBackendStatus()
  const label =
    connected === null ? "Connecting" : connected ? "Backend online" : "Backend offline"
  const dot =
    connected === null ? "bg-muted-foreground" : connected ? "bg-success" : "bg-danger"

  return (
    <span className="inline-flex items-center gap-2 text-xs text-muted-foreground">
      <span className={cn("size-2 rounded-full", dot)} />
      {label}
    </span>
  )
}

export default function Topbar({ title, subtitle }) {
  const [now, setNow] = useState(formatNow)

  useEffect(() => {
    const timer = setInterval(() => setNow(formatNow()), 1000)
    return () => clearInterval(timer)
  }, [])

  return (
    <header className="flex h-16 shrink-0 items-center justify-between border-b border-border px-8">
      <div>
        <h1 className="text-lg font-semibold leading-tight">{title}</h1>
        <p className="text-xs text-muted-foreground">{subtitle}</p>
      </div>
      <div className="flex items-center gap-5">
        <ConnectionStatus />
        <div className="font-mono text-sm tabular-nums text-muted-foreground">
          {now}
        </div>
      </div>
    </header>
  )
}