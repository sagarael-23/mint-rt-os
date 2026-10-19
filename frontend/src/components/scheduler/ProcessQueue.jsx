import Panel from "@/components/layout/Panel"
import StatusBadge from "@/components/layout/StatusBadge"
import { slackLabel } from "@/lib/schedule"
import { cn } from "@/lib/utils"

function Row({ label, value, tone }) {
  return (
    <div className="flex items-center justify-between text-xs">
      <span className="text-muted-foreground">{label}</span>
      <span className={cn("font-mono tabular-nums", tone)}>{value}</span>
    </div>
  )
}

// Seberapa dekat waktu selesai dengan deadline: penuh berarti tepat di deadline
// atau terlewat.
function SlackBar({ job }) {
  const ratio =
    job.finishMs == null || job.deadlineMs <= 0
      ? 1
      : Math.min(job.finishMs / job.deadlineMs, 1)
  return (
    <div
      className="mt-3 h-1.5 overflow-hidden rounded-full bg-secondary"
      title="Waktu selesai dibandingkan deadline"
    >
      <div
        className={cn("h-full rounded-full", job.missed ? "bg-danger" : "bg-primary")}
        style={{ width: `${ratio * 100}%` }}
      />
    </div>
  )
}

export default function ProcessQueue({ queue, selectedPid, onSelect }) {
  return (
    <Panel title="Job Queue" subtitle="Sorted by deadline (EDF dispatch order)">
      {queue.length === 0 ? (
        <p className="py-6 text-center text-sm text-muted-foreground">
          No jobs in this cycle.
        </p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {queue.map((job, i) => {
            const selected = job.pid === selectedPid
            return (
              <button
                key={job.pid}
                type="button"
                onClick={() => onSelect(job.pid)}
                aria-pressed={selected}
                className={cn(
                  "rounded-lg border bg-secondary/30 p-4 text-left transition-colors hover:bg-secondary/60",
                  selected
                    ? "border-primary"
                    : job.missed
                      ? "border-danger/40"
                      : "border-border"
                )}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold">
                      <span className="mr-2 font-mono text-xs text-muted-foreground">
                        #{i + 1}
                      </span>
                      {job.name}
                    </p>
                    <p className="font-mono text-[10px] text-muted-foreground">
                      PID {job.pid}
                    </p>
                  </div>
                  <StatusBadge tone={job.missed ? "danger" : "success"}>
                    {job.missed ? "MISSED" : "MET"}
                  </StatusBadge>
                </div>

                <div className="mt-3 space-y-1.5">
                  <Row label="Execution" value={`${job.execMs} ms`} />
                  <Row label="Deadline" value={`${job.deadlineMs} ms`} />
                  <Row
                    label="Finish"
                    value={job.finishMs == null ? "—" : `${job.finishMs} ms`}
                  />
                  <Row
                    label="Slack"
                    value={slackLabel(job)}
                    tone={job.missed ? "text-danger" : "text-success"}
                  />
                </div>

                <SlackBar job={job} />
              </button>
            )
          })}
        </div>
      )}
    </Panel>
  )
}