import { useState } from "react"
import { Cpu, Layers, MemoryStick, Target } from "lucide-react"

import StatCard from "@/components/dashboard/StatCard"
import LiveToggle from "@/components/layout/LiveToggle"
import MockNotice from "@/components/layout/MockNotice"
import CpuChart from "@/components/monitoring/CpuChart"
import DeadlineChart from "@/components/monitoring/DeadlineChart"
import MemoryChart from "@/components/monitoring/MemoryChart"
import { useMonitoring } from "@/hooks/useMonitoring"
import { formatPercent } from "@/lib/format"

function perfCardTone(percent) {
  if (percent == null) return "default"
  if (percent >= 95) return "success"
  if (percent >= 80) return "primary"
  return "danger"
}

export default function Monitoring() {
  const [live, setLive] = useState(false)
  const { data, isMock, updatedAt } = useMonitoring({ autoRefresh: live })
  const { current, samples } = data
  const percent = current.deadlinePerformancePercent

  return (
    <div className="space-y-6">
      {isMock && <MockNotice />}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="font-mono text-xs text-muted-foreground">
          Window: last {samples.length} s · interval {data.intervalMs} ms
        </p>
        <div className="flex items-center gap-3">
          <span className="font-mono text-xs text-muted-foreground">
            Updated {updatedAt.toLocaleTimeString("id-ID", { hour12: false })}
          </span>
          <LiveToggle live={live} onChange={setLive} />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard
          label="CPU Usage"
          value={formatPercent(current.cpuPercent)}
          hint="Whole machine, all cores"
          icon={Cpu}
          tone="primary"
        />
        <StatCard
          label="Memory Usage"
          value={formatPercent(current.memPercent)}
          hint="Used = total − available"
          icon={MemoryStick}
          tone="primary"
        />
        <StatCard
          label="Active Processes"
          value={current.activeProcesses}
          hint={`of ${current.processCount} total`}
          icon={Layers}
          tone="primary"
        />
        <StatCard
          label="Deadline Performance"
          value={percent == null ? "—" : formatPercent(percent)}
          hint={`${current.windowMet} met · ${current.windowMissed} missed`}
          icon={Target}
          tone={perfCardTone(percent)}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <CpuChart samples={samples} />
        <MemoryChart samples={samples} />
      </div>

      <DeadlineChart samples={samples} current={current} />
    </div>
  )
}