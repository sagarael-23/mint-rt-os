import { CircleAlert, CircleCheck, Cpu, Layers } from "lucide-react"

import CpuChart from "@/components/dashboard/CpuChart"
import RecentProcesses from "@/components/dashboard/RecentProcesses"
import SchedulerStatus from "@/components/dashboard/SchedulerStatus"
import StatCard from "@/components/dashboard/StatCard"
import MockNotice from "@/components/layout/MockNotice"
import { useMonitoring } from "@/hooks/useMonitoring"
import { useProcesses } from "@/hooks/useProcesses"
import { useScheduler } from "@/hooks/useScheduler"
import { formatPercent } from "@/lib/format"

export default function Dashboard() {
  const { data: monitoring, isMock } = useMonitoring()
  const { data: scheduler } = useScheduler()
  const { data: processes } = useProcesses()
  const cur = monitoring.current

  return (
    <div className="space-y-6">
      {isMock && <MockNotice />}

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

      <RecentProcesses processes={processes.processes} />
    </div>
  )
}