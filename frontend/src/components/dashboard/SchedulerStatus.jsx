import Panel from "@/components/layout/Panel"
import StatusBadge from "@/components/layout/StatusBadge"
import { formatPercent } from "@/lib/format"

function Row({ label, children }) {
  return (
    <div className="flex items-center justify-between gap-4 py-2.5 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right">{children}</span>
    </div>
  )
}

function ProcessRef({ proc }) {
  if (!proc) return <span className="text-muted-foreground">—</span>
  return (
    <>
      {proc.name}{" "}
      <span className="font-mono text-xs text-muted-foreground">PID {proc.pid}</span>
    </>
  )
}

export default function SchedulerStatus({ scheduler, className }) {
  const running = scheduler.status === "RUNNING"
  return (
    <Panel title="Scheduler Status" subtitle="EDF simulation" className={className}>
      <div className="divide-y divide-border">
        <Row label="Algorithm">
          <span className="font-mono">{scheduler.algorithm}</span>
        </Row>
        <Row label="Status">
          <StatusBadge tone={running ? "success" : "muted"}>
            {scheduler.status}
          </StatusBadge>
        </Row>
        <Row label="Current process">
          <ProcessRef proc={scheduler.currentProcess} />
        </Row>
        <Row label="Next process">
          <ProcessRef proc={scheduler.nextProcess} />
        </Row>
        <Row label="Next deadline">
          <span className="font-mono">
            {scheduler.nextDeadlineMs == null ? "—" : `${scheduler.nextDeadlineMs} ms`}
          </span>
        </Row>
        <Row label="Utilization">
          <span className="font-mono">
            {formatPercent(scheduler.utilizationPercent)}
          </span>
        </Row>
      </div>
      <p className="mt-3 text-xs text-muted-foreground">
        Simulasi EDF tingkat aplikasi pada {scheduler.simulatedCores} prosesor
        simulasi. Jadwal dibangun tiap {scheduler.cycleMs} ms dari CPU time
        proses nyata. Bukan scheduler kernel Linux.
      </p>
    </Panel>
  )
}