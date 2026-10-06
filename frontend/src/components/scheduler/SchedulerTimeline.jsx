import Panel from "@/components/layout/Panel"

const ROW = "grid grid-cols-[10rem_minmax(0,1fr)] items-center"

// Bagian job yang selesai sebelum deadline berwarna hijau,
// bagian yang melewati deadline berwarna merah.
function barsFor(job, slices) {
  const bars = []
  slices.forEach((s, i) => {
    const okEnd = Math.min(s.endMs, job.deadlineMs)
    if (s.startMs < okEnd) {
      bars.push({ key: `${i}-ok`, from: s.startMs, to: okEnd, late: false })
    }
    if (s.endMs > job.deadlineMs) {
      bars.push({
        key: `${i}-late`,
        from: Math.max(s.startMs, job.deadlineMs),
        to: s.endMs,
        late: true,
      })
    }
  })
  return bars
}

function Legend({ color, children }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={`inline-block h-2.5 w-2.5 rounded-sm ${color}`} />
      {children}
    </span>
  )
}

export default function SchedulerTimeline({ queue, timeline, cycleMs }) {
  if (queue.length === 0) {
    return (
      <Panel title="Timeline" subtitle="EDF execution order within one cycle">
        <p className="py-8 text-center text-sm text-muted-foreground">
          No jobs in this cycle.
        </p>
      </Panel>
    )
  }

  const maxEnd = Math.max(0, ...timeline.map((s) => s.endMs))
  const maxDeadline = Math.max(0, ...queue.map((j) => j.deadlineMs))
  const span = Math.max(cycleMs, maxEnd, maxDeadline)
  const pct = (ms) => `${(ms / span) * 100}%`
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((f) => f * span)

  return (
    <Panel
      title="Timeline"
      subtitle={`EDF execution order · cycle ${cycleMs} ms · axis ${Math.round(span)} ms`}
    >
      <div className="relative">
        <div className="space-y-2">
          {queue.map((job) => {
            const slices = timeline.filter((s) => s.pid === job.pid)
            return (
              <div key={job.pid} className={ROW}>
                <div className="min-w-0 pr-3">
                  <div className="truncate text-sm font-medium">{job.name}</div>
                  <div className="font-mono text-[10px] text-muted-foreground">
                    PID {job.pid}
                  </div>
                </div>
                <div className="relative h-9 rounded-md bg-secondary/40">
                  {barsFor(job, slices).map((bar) => (
                    <div
                      key={bar.key}
                      className={`absolute inset-y-1.5 rounded-sm ${
                        bar.late ? "bg-danger" : "bg-primary"
                      }`}
                      style={{
                        left: pct(bar.from),
                        width: pct(bar.to - bar.from),
                      }}
                      title={`${job.name}: ${bar.from}–${bar.to} ms`}
                    />
                  ))}
                  <div
                    className="absolute inset-y-0 z-10 w-0.5 bg-warning"
                    style={{ left: pct(job.deadlineMs) }}
                    title={`Deadline ${job.deadlineMs} ms`}
                  />
                </div>
              </div>
            )
          })}
        </div>

        {/* Garis bantu dan garis akhir siklus, sejajar dengan kolom batang. */}
        <div className="pointer-events-none absolute inset-y-0 left-40 right-0">
          {ticks.map((t) => (
            <div
              key={t}
              className="absolute inset-y-0 border-l border-dashed border-border"
              style={{ left: pct(t) }}
            />
          ))}
          {span > cycleMs && (
            <div
              className="absolute inset-y-0 border-l-2 border-dashed border-warning/60"
              style={{ left: pct(cycleMs) }}
              title={`End of cycle (${cycleMs} ms)`}
            />
          )}
        </div>
      </div>

      <div className={`${ROW} mt-2`}>
        <div />
        <div className="relative h-4">
          {ticks.map((t) => (
            <span
              key={t}
              className="absolute -translate-x-1/2 font-mono text-[10px] text-muted-foreground"
              style={{ left: pct(t) }}
            >
              {Math.round(t)} ms
            </span>
          ))}
        </div>
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-muted-foreground">
        <Legend color="bg-primary">Finished before deadline</Legend>
        <Legend color="bg-danger">Past deadline (missed)</Legend>
        <Legend color="bg-warning">Deadline</Legend>
        <span className="inline-flex items-center gap-1.5">
          <span className="inline-block h-3 border-l-2 border-dashed border-warning/60" />
          End of cycle
        </span>
      </div>
    </Panel>
  )
}