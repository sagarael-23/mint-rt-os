import Panel from "@/components/layout/Panel"
import StatusBadge from "@/components/layout/StatusBadge"
import { useRecentEvents } from "@/hooks/useEvents"
import { levelTone } from "@/lib/logs"

export default function RecentActivity({ limit = 8 }) {
  const events = useRecentEvents()
  // Yang terbaru di atas.
  const rows = [...events].reverse().slice(0, limit)

  return (
    <Panel title="Recent Activity" subtitle="Latest backend events">
      {rows.length === 0 ? (
        <p className="py-6 text-center text-sm text-muted-foreground">
          No events yet.
        </p>
      ) : (
        <ul className="space-y-3">
          {rows.map((e) => (
            <li key={e.seq} className="flex gap-3">
              <span className="w-[4.5rem] shrink-0 pt-0.5 font-mono text-[11px] tabular-nums text-muted-foreground">
                {e.time}
              </span>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <StatusBadge tone={levelTone(e.level)}>{e.level}</StatusBadge>
                  <span className="font-mono text-[10px] uppercase tracking-wide text-muted-foreground">
                    {e.category}
                  </span>
                </div>
                <p className="mt-1 font-mono text-xs [overflow-wrap:anywhere]">
                  {e.message}
                </p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  )
}