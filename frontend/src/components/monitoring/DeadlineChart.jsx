import Panel from "@/components/layout/Panel"
import { formatPercent } from "@/lib/format"
import { cn } from "@/lib/utils"

function perfTone(percent) {
  if (percent == null) return "text-muted-foreground"
  if (percent >= 95) return "text-success"
  if (percent >= 80) return "text-foreground"
  return "text-danger"
}

export default function DeadlineChart({ samples, current }) {
  const maxJobs = Math.max(1, ...samples.map((s) => s.met + s.missed))
  const percent = current.deadlinePerformancePercent

  return (
    <Panel
      title="Deadline Performance"
      subtitle="Met vs missed deadlines per cycle (EDF simulation)"
    >
      <div className="grid gap-6 lg:grid-cols-[14rem_minmax(0,1fr)]">
        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Performance
          </p>
          <p
            className={cn(
              "mt-2 font-mono text-4xl font-semibold tabular-nums",
              perfTone(percent)
            )}
          >
            {percent == null ? "—" : formatPercent(percent)}
          </p>
          <dl className="mt-4 space-y-2 text-sm">
            <div className="flex items-center justify-between">
              <dt className="text-muted-foreground">Met</dt>
              <dd className="font-mono tabular-nums text-success">
                {current.windowMet}
              </dd>
            </div>
            <div className="flex items-center justify-between">
              <dt className="text-muted-foreground">Missed</dt>
              <dd className="font-mono tabular-nums text-danger">
                {current.windowMissed}
              </dd>
            </div>
          </dl>
          <p className="mt-4 text-xs text-muted-foreground">
            Dihitung dari {samples.length} siklus terakhir.
          </p>
        </div>

        <div>
          <div className="flex gap-3">
            <div className="flex h-40 flex-col justify-between text-right font-mono text-[10px] leading-none text-muted-foreground">
              <span>{maxJobs}</span>
              <span>0</span>
            </div>
            <div className="flex h-40 flex-1 items-end gap-px border-b border-border">
              {samples.map((s, i) => (
                <div
                  key={`${s.time}-${i}`}
                  className="flex h-full flex-1 flex-col justify-end"
                  title={`${s.time}: ${s.met} met, ${s.missed} missed`}
                >
                  {s.missed > 0 && (
                    <div
                      className="bg-danger"
                      style={{ height: `${(s.missed / maxJobs) * 100}%` }}
                    />
                  )}
                  <div
                    className="bg-primary/80"
                    style={{ height: `${(s.met / maxJobs) * 100}%` }}
                  />
                </div>
              ))}
            </div>
          </div>

          <div className="mt-2 flex justify-between pl-8 font-mono text-[10px] text-muted-foreground">
            <span>{samples[0]?.time}</span>
            <span>{samples[samples.length - 1]?.time}</span>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 pl-8 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1.5">
              <span className="inline-block size-2.5 rounded-sm bg-primary/80" />
              Met
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="inline-block size-2.5 rounded-sm bg-danger" />
              Missed
            </span>
            <span>Tinggi batang = jumlah job pada siklus itu</span>
          </div>
        </div>
      </div>
    </Panel>
  )
}