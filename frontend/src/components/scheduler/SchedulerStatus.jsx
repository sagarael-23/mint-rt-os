import {
  CircleAlert,
  CircleCheck,
  Gauge,
  Layers,
  Play,
  RotateCcw,
  Square,
  Timer,
} from "lucide-react"

import StatCard from "@/components/dashboard/StatCard"
import LiveToggle from "@/components/layout/LiveToggle"
import Panel from "@/components/layout/Panel"
import StatusBadge from "@/components/layout/StatusBadge"
import { Button } from "@/components/ui/button"
import { formatPercent } from "@/lib/format"

function Info({ label, children }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <div className="mt-1 text-sm">{children}</div>
    </div>
  )
}

function MiniCard({ label, children }) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
        {label}
      </p>
      <div className="mt-2 text-sm">{children}</div>
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

export default function SchedulerStatus({
  scheduler,
  isMock,
  live,
  onLive,
  onStart,
  onStop,
  onReset,
  updatedAt,
}) {
  const running = scheduler.status === "RUNNING"
  const hasMissed = scheduler.missed > 0

  return (
    <div className="space-y-4">
      <Panel>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-x-8 gap-y-3">
            <Info label="Algorithm">
              <span className="font-mono">{scheduler.algorithm}</span>
            </Info>
            <Info label="Status">
              <StatusBadge tone={running ? "success" : "muted"}>
                {scheduler.status}
              </StatusBadge>
            </Info>
            <Info label="Execution cycle">
              <span className="font-mono">
                #{scheduler.cycle} · {scheduler.cycleMs} ms
              </span>
            </Info>
            <Info label="Processor">
              <span className="font-mono">
                {scheduler.simulatedCores} simulated core
              </span>
            </Info>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span className="mr-1 font-mono text-xs text-muted-foreground">
              Updated {updatedAt.toLocaleTimeString("id-ID", { hour12: false })}
            </span>
            <LiveToggle live={live} onChange={onLive} />
            <Button size="sm" className="h-9" onClick={onStart} disabled={running}>
              <Play className="size-4" />
              Start
            </Button>
            <Button
              size="sm"
              variant="destructive"
              className="h-9"
              onClick={onStop}
              disabled={!running}
            >
              <Square className="size-4" />
              Stop
            </Button>
            <Button size="sm" variant="outline" className="h-9" onClick={onReset}>
              <RotateCcw className="size-4" />
              Reset
            </Button>
          </div>
        </div>

        {isMock && (
          <p className="mt-3 text-xs text-muted-foreground">
            Live (contoh): membuat siklus acak tiap detik. Setiap siklus
            kelipatan 9 sengaja berupa beban berat agar status MISSED terlihat.
          </p>
        )}
        <p className="mt-3 text-xs text-muted-foreground">
          Simulasi EDF tingkat aplikasi pada {scheduler.simulatedCores} prosesor
          simulasi. Jadwal dibangun tiap siklus dari CPU time proses nyata;
          deadline = waktu eksekusi × jumlah job, dibatasi panjang siklus.
          Bukan scheduler kernel Linux.
        </p>
      </Panel>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard
          label="Jobs"
          value={scheduler.jobCount}
          hint="Used CPU in this cycle"
          icon={Layers}
          tone="primary"
        />
        <StatCard
          label="CPU demand"
          value={`${scheduler.demandMs} ms`}
          hint={`of ${scheduler.cycleMs} ms cycle`}
          icon={Timer}
          tone="primary"
        />
        <StatCard
          label="Utilization"
          value={formatPercent(scheduler.utilizationPercent)}
          hint="Simulated processor"
          icon={Gauge}
          tone={scheduler.utilizationPercent > 100 ? "danger" : "primary"}
        />
        <StatCard
          label="Met / Missed"
          value={`${scheduler.met} / ${scheduler.missed}`}
          hint="This cycle"
          icon={hasMissed ? CircleAlert : CircleCheck}
          tone={hasMissed ? "danger" : "success"}
        />
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <MiniCard label="Current process (first dispatched)">
          <ProcessRef proc={scheduler.currentProcess} />
        </MiniCard>
        <MiniCard label="Next process">
          <ProcessRef proc={scheduler.nextProcess} />
        </MiniCard>
        <MiniCard label="Next deadline">
          <span className="font-mono">
            {scheduler.nextDeadlineMs == null ? "—" : `${scheduler.nextDeadlineMs} ms`}
          </span>
        </MiniCard>
      </div>
    </div>
  )
}