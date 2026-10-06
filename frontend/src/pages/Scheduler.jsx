import { useState } from "react"

import MockNotice from "@/components/layout/MockNotice"
import ProcessQueue from "@/components/scheduler/ProcessQueue"
import SchedulerStatus from "@/components/scheduler/SchedulerStatus"
import SchedulerTimeline from "@/components/scheduler/SchedulerTimeline"
import { useScheduler } from "@/hooks/useScheduler"

export default function Scheduler() {
  const [live, setLive] = useState(false)
  const { data, isMock, start, stop, reset, updatedAt } = useScheduler({
    autoRefresh: live,
  })

  return (
    <div className="space-y-6">
      {isMock && <MockNotice />}

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
      />

      <ProcessQueue queue={data.queue} />
    </div>
  )
}