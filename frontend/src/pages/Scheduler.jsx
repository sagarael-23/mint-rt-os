import { useState } from "react"

import CycleHistory from "@/components/scheduler/CycleHistory"
import JobDetails from "@/components/scheduler/JobDetails"
import ProcessQueue from "@/components/scheduler/ProcessQueue"
import SchedulerStatus from "@/components/scheduler/SchedulerStatus"
import SchedulerTimeline from "@/components/scheduler/SchedulerTimeline"
import { useMonitoring } from "@/hooks/useMonitoring"
import { useScheduler } from "@/hooks/useScheduler"
import { getLiveDefault } from "@/hooks/useSettings"

export default function Scheduler() {
  const [live, setLive] = useState(getLiveDefault)
  const { data, isMock, start, stop, reset, updatedAt } = useScheduler({
    autoRefresh: live,
  })
  const { data: monitoring } = useMonitoring({ autoRefresh: live })

  const [selectedPid, setSelectedPid] = useState(null)
  const [mode, setMode] = useState("cycle")

  // Klik job yang sama sekali lagi membatalkan pilihan.
  function toggleSelect(pid) {
    setSelectedPid((prev) => (prev === pid ? null : pid))
  }

  return (
    <div className="space-y-6">
      <SchedulerStatus
        scheduler={data}
        isMock={isMock}
        live={live}
        onLive={setLive}
        onStart={start}
        onStop={stop}
        onReset={reset}
        updatedAt={updatedAt}
      />

      <SchedulerTimeline
        queue={data.queue}
        timeline={data.timeline}
        cycleMs={data.cycleMs}
        selectedPid={selectedPid}
        onSelect={toggleSelect}
        mode={mode}
        onMode={setMode}
      />

      {selectedPid != null && (
        <JobDetails
          pid={selectedPid}
          queue={data.queue}
          timeline={data.timeline}
          cycleMs={data.cycleMs}
          onClose={() => setSelectedPid(null)}
        />
      )}

      <ProcessQueue
        queue={data.queue}
        selectedPid={selectedPid}
        onSelect={toggleSelect}
      />

      <CycleHistory samples={monitoring.samples} />
    </div>
  )
}