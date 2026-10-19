import Panel from "@/components/layout/Panel"
import { formatPercent } from "@/lib/format"
import { cn } from "@/lib/utils"

const TH = "px-3 py-2 font-medium"

export default function CycleHistory({ samples, limit = 12 }) {
  // Yang terbaru di atas.
  const rows = [...samples].reverse().slice(0, limit)

  return (
    <Panel title="Cycle History" subtitle={`Last ${rows.length} cycles, newest first`}>
      {rows.length === 0 ? (
        <p className="py-6 text-center text-sm text-muted-foreground">
          No cycles recorded yet.
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-xs uppercase tracking-wider text-muted-foreground">
              <tr className="border-b border-border">
                <th className={TH}>Time</th>
                <th className={`${TH} text-right`}>Jobs</th>
                <th className={`${TH} text-right`}>Met</th>
                <th className={`${TH} text-right`}>Missed</th>
                <th className={TH}>Utilization</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((s, i) => {
                const over = s.utilization > 100
                return (
                  <tr
                    key={`${s.time}-${i}`}
                    className="border-b border-border/60 last:border-0"
                  >
                    <td className="px-3 py-2 font-mono text-xs tabular-nums text-muted-foreground">
                      {s.time}
                    </td>
                    <td className="px-3 py-2 text-right font-mono tabular-nums">
                      {s.jobs}
                    </td>
                    <td className="px-3 py-2 text-right font-mono tabular-nums text-success">
                      {s.met}
                    </td>
                    <td
                      className={cn(
                        "px-3 py-2 text-right font-mono tabular-nums",
                        s.missed > 0 ? "text-danger" : "text-muted-foreground"
                      )}
                    >
                      {s.missed}
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex items-center gap-3">
                        <div className="h-1.5 w-28 overflow-hidden rounded-full bg-secondary">
                          <div
                            className={cn(
                              "h-full rounded-full",
                              over ? "bg-danger" : "bg-primary"
                            )}
                            style={{ width: `${Math.min(s.utilization, 100)}%` }}
                          />
                        </div>
                        <span
                          className={cn(
                            "font-mono text-xs tabular-nums",
                            over && "text-danger"
                          )}
                        >
                          {formatPercent(s.utilization)}
                        </span>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </Panel>
  )
}