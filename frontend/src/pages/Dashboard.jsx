import { useState } from "react"
import { CircleAlert, CircleCheck, Cpu, Layers } from "lucide-react"

import CpuChart from "@/components/dashboard/CpuChart"
import RecentActivity from "@/components/dashboard/RecentActivity"
import RecentProcesses from "@/components/dashboard/RecentProcesses"
import SchedulerStatus from "@/components/dashboard/SchedulerStatus"
import StatCard from "@/components/dashboard/StatCard"
import LiveToggle from "@/components/layout/LiveToggle"
import { useMonitoring } from "@/hooks/useMonitoring"
import { useProcesses } from "@/hooks/useProcesses"
import { useScheduler } from "@/hooks/useScheduler"
import { getLiveDefault } from "@/hooks/useSettings"
import { formatPercent } from "@/lib/format"

export default function Dashboard() {
  const [live, setLive] = useState(getLiveDefault)
  const { data: monitoring, updatedAt } = useMonitoring({ autoRefresh: live })
  const { data: scheduler } = useScheduler({ autoRefresh: live })
  const { data: processes } = useProcesses({ autoRefresh: live })
  const cur = monitoring.current

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-end gap-3">
        <span className="font-mono text-xs text-muted-foreground">
          Updated {updatedAt.toLocaleTimeString("id-ID", { hour12: false })}
        </span>
        <LiveToggle live={live} onChange={setLive} />
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard
          label="CPU Usage"
          value={formatPercent(cur.cpuPercent)}
          hint={`${cur.processCount} processes in total`}
          icon={Cpu}
          tone="primary"
        />
        <StatCard
          label="Active Processes"
          value={cur.activeProcesses}
          hint="Used CPU in the last cycle"
          icon={Layers}
          tone="primary"
        />
        <StatCard
          label="Deadline Met"
          value={scheduler.totalMet}
          hint="EDF simulation"
          icon={CircleCheck}
          tone="success"
        />
        <StatCard
          label="Deadline Missed"
          value={scheduler.totalMissed}
          hint="EDF simulation"
          icon={CircleAlert}
          tone={scheduler.totalMissed > 0 ? "danger" : "default"}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <CpuChart samples={monitoring.samples} className="lg:col-span-2" />
        <SchedulerStatus scheduler={scheduler} />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <RecentProcesses processes={processes.processes} />
        </div>
        <RecentActivity />
      </div>
    </div>
  )
}