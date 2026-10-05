import { useEffect, useState } from "react"

function formatNow() {
  return new Date().toLocaleTimeString("id-ID", { hour12: false })
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
      <div className="font-mono text-sm tabular-nums text-muted-foreground">
        {now}
      </div>
    </header>
  )
}