import { useState } from "react"

import Panel from "@/components/layout/Panel"
import SegmentedControl from "@/components/layout/SegmentedControl"
import { axisSpan, slackLabel } from "@/lib/schedule"
import { cn } from "@/lib/utils"

const ROW = "grid grid-cols-[10rem_minmax(0,1fr)] items-center"

const MODES = [
  { value: "cycle", label: "Full cycle" },
  { value: "fit", label: "Fit jobs" },
]

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

export default function SchedulerTimeline({
  queue,
  timeline,
  cycleMs,
  selectedPid,
  onSelect,
  mode,
  onMode,
}) {
  const [hoverPid, setHoverPid] = useState(null)

  const axisControl = (
    <SegmentedControl
      label="Timeline axis"
      options={MODES}
      value={mode}
      onChange={onMode}
    />
  )

  if (queue.length === 0) {
    return (
      <Panel
        title="Timeline"
        subtitle="EDF execution order within one cycle"
        action={axisControl}
      >
        <p className="py-8 text-center text-sm text-muted-foreground">
          No jobs in this cycle.
        </p>
      </Panel>
    )
  }

  const span = axisSpan(queue, timeline, cycleMs, mode)
  const pct = (ms) => `${(ms / span) * 100}%`
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((f) => f * span)
  const hovered = queue.find((j) => j.pid === hoverPid)

  return (
    <Panel
      title="Timeline"
      subtitle={`EDF execution order · cycle ${cycleMs} ms · axis ${Math.round(span)} ms`}
      action={axisControl}
    >
      <p className="mb-3 min-h-5 font-mono text-xs text-muted-foreground">
        {hovered
          ? `${hovered.name} (PID ${hovered.pid}) · exec ${hovered.execMs} ms · deadline ${hovered.deadlineMs} ms · finish ${hovered.finishMs ?? "—"} ms · slack ${slackLabel(hovered)} · ${hovered.missed ? "MISSED" : "MET"}`
          : "Arahkan mouse ke sebuah baris untuk melihat rincian, klik untuk memilih."}
      </p>

      <div className="relative">
        <div className="space-y-1">
          {queue.map((job) => {
            const slices = timeline.filter((s) => s.pid === job.pid)
            const selected = job.pid === selectedPid
            return (
              <div
                key={job.pid}
                role="button"
                tabIndex={0}
                aria-pressed={selected}
                onClick={() => onSelect(job.pid)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault()
                    onSelect(job.pid)
                  }
                }}
                onMouseEnter={() => setHoverPid(job.pid)}
                onMouseLeave={() => setHoverPid(null)}
                className={cn(
                  ROW,
                  "cursor-pointer rounded-md py-0.5 outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring/40",
                  selected ? "bg-primary/5" : "hover:bg-secondary/40"
                )}
              >
                <div className="min-w-0 pl-1 pr-3">
                  <div
                    className={cn(
                      "truncate text-sm",
                      selected ? "font-semibold" : "font-medium"
                    )}
                  >
                    {job.name}
                  </div>
                  <div className="font-mono text-[10px] text-muted-foreground">
                    PID {job.pid}
                  </div>
                </div>
                <div
                  className={cn(
                    "relative h-9 rounded-md bg-secondary/40",
                    selected && "ring-1 ring-primary/60"
                  )}
                >
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
                    />
                  ))}
                  {job.deadlineMs <= span && (
                    <div
                      className="absolute inset-y-0 z-10 w-0.5 bg-warning"
                      style={{ left: pct(job.deadlineMs) }}
                    />
                  )}
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
        {mode === "fit" && (
          <span>Penanda deadline di luar sumbu tidak digambar.</span>
        )}
      </div>
    </Panel>
  )
}