import { useCallback, useEffect, useState } from "react"

import {
  INITIAL_SCHEDULER,
  nextMockCycle,
  resetMock,
  startMock,
  stopMock,
} from "@/services/mockScheduler"

// Tahap 9: data contoh dengan bentuk yang sama dengan GET /api/scheduler.
// Phase 10 mengganti isinya dengan fetch dan POST /api/scheduler/start|stop|reset;
// bentuk nilai kembaliannya tetap sama sehingga halaman tidak perlu diubah.
export function useScheduler({ autoRefresh = false, intervalMs = 1000 } = {}) {
  const [data, setData] = useState(INITIAL_SCHEDULER)
  const [updatedAt, setUpdatedAt] = useState(() => new Date())

  const apply = useCallback((updater) => {
    setData(updater)
    setUpdatedAt(new Date())
  }, [])

  const advance = useCallback(() => apply(nextMockCycle), [apply])
  const start = useCallback(() => apply(startMock), [apply])
  const stop = useCallback(() => apply(stopMock), [apply])
  const reset = useCallback(() => apply(resetMock), [apply])

  useEffect(() => {
    if (!autoRefresh) return undefined
    const timer = setInterval(advance, intervalMs)
    return () => clearInterval(timer)
  }, [autoRefresh, intervalMs, advance])

  return { data, isMock: true, start, stop, reset, updatedAt }
}