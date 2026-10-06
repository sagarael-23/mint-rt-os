import { RefreshCw, Search } from "lucide-react"

import { Button } from "@/components/ui/button"
import { RT_OPTIONS, STATE_OPTIONS } from "@/lib/process"
import { cn } from "@/lib/utils"

const FIELD =
  "h-9 rounded-md border border-input bg-card px-3 text-sm outline-none transition-colors [color-scheme:dark] focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30"

export default function ProcessFilters({
  query,
  onQuery,
  state,
  onState,
  rt,
  onRt,
  live,
  onLive,
  onRefresh,
  updatedAt,
}) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <input
          type="search"
          value={query}
          onChange={(e) => onQuery(e.target.value)}
          placeholder="Search name or PID"
          aria-label="Search processes"
          className={cn(FIELD, "w-64 pl-9")}
        />
      </div>

      <select
        value={state}
        onChange={(e) => onState(e.target.value)}
        aria-label="Filter by state"
        className={FIELD}
      >
        {STATE_OPTIONS.map((s) => (
          <option key={s} value={s}>
            {s === "ALL" ? "All states" : s}
          </option>
        ))}
      </select>

      <select
        value={rt}
        onChange={(e) => onRt(e.target.value)}
        aria-label="Filter by scheduling"
        className={FIELD}
      >
        {RT_OPTIONS.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>

      <div className="ml-auto flex items-center gap-3">
        <span className="font-mono text-xs text-muted-foreground">
          Updated {updatedAt.toLocaleTimeString("id-ID", { hour12: false })}
        </span>

        <button
          type="button"
          onClick={() => onLive(!live)}
          aria-pressed={live}
          className={cn(
            "inline-flex h-9 items-center gap-2 rounded-md border px-3 text-sm font-medium transition-colors",
            live
              ? "border-success/40 bg-success/10 text-success"
              : "border-input bg-card text-muted-foreground hover:text-foreground"
          )}
        >
          <span
            className={cn(
              "size-2 rounded-full",
              live ? "animate-pulse bg-success" : "bg-muted-foreground"
            )}
          />
          Live
        </button>

        <Button variant="outline" size="sm" onClick={onRefresh} className="h-9">
          <RefreshCw className="size-4" />
          Refresh
        </Button>
      </div>
    </div>
  )
}