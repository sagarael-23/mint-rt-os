import { useCallback } from "react"

import { useApi } from "@/hooks/useApi"
import { reportFail, reportOk } from "@/hooks/useBackendStatus"
import { postJson } from "@/services/api"
import { EMPTY_SCHEDULER } from "@/services/empty"

// Data nyata dari GET /api/scheduler. Start, Stop, dan Reset memanggil
// POST /api/scheduler/start|stop|reset; jawabannya berisi status terbaru.
export function useScheduler({ autoRefresh = false, intervalMs } = {}) {
  const { data, updatedAt, refresh, setData } = useApi("/api/scheduler", {
    autoRefresh,
    intervalMs,
  })

  const act = useCallback(
    async (action) => {
      try {
        const body = await postJson(`/api/scheduler/${action}`)
        reportOk()
        setData(body)
      } catch (error) {
        reportFail(error)
      }
    },
    [setData]
  )

  const start = useCallback(() => act("start"), [act])
  const stop = useCallback(() => act("stop"), [act])
  const reset = useCallback(() => act("reset"), [act])

  return {
    data: data ?? EMPTY_SCHEDULER,
    isMock: false,
    refresh,
    start,
    stop,
    reset,
    updatedAt,
  }
}