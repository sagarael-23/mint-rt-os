import { useCallback, useEffect, useRef, useState } from "react"

import { reportFail, reportOk } from "@/hooks/useBackendStatus"
import { usePolling } from "@/hooks/usePolling"
import { useSettings } from "@/hooks/useSettings"
import { mergeLogs } from "@/lib/logs"
import { getJson } from "@/services/api"

const CAPACITY = 500

// Log nyata dari GET /api/logs. Pembaruan memakai kursor: hanya entri yang
// lebih baru dari seq terakhir yang diminta.
export function useLogs({ autoRefresh = false, intervalMs } = {}) {
  const { refreshMs } = useSettings()
  const interval = intervalMs ?? refreshMs

  const [state, setState] = useState(() => ({
    entries: [],
    offline: false,
    updatedAt: new Date(),
  }))
  const cursorRef = useRef(0)
  const inFlight = useRef(false)
  const alive = useRef(false)

  const load = useCallback(async () => {
    if (inFlight.current) return
    inFlight.current = true
    try {
      const since = cursorRef.current
      let body = await getJson(since > 0 ? `/api/logs?since=${since}` : "/api/logs")

      // Backend dimulai ulang: nomor urut kembali dari 1. Ambil ulang dari awal.
      const restarted = body.lastSeq < since
      if (restarted) body = await getJson("/api/logs")
      if (!alive.current) return

      cursorRef.current = body.cursor
      reportOk()
      setState((prev) => ({
        entries: mergeLogs(restarted ? [] : prev.entries, body.entries, CAPACITY),
        offline: false,
        updatedAt: new Date(),
      }))
    } catch (error) {
      if (!alive.current) return
      reportFail(error)
      setState((prev) => ({ ...prev, offline: Boolean(error.offline) }))
    } finally {
      inFlight.current = false
    }
  }, [])

  useEffect(() => {
    alive.current = true
    load()
    return () => {
      alive.current = false
    }
  }, [load])

  usePolling(load, { autoRefresh, interval, reconnecting: state.offline })

  // Hanya membersihkan tampilan; kursor tetap, jadi entri lama tidak muncul lagi.
  const clear = useCallback(() => {
    setState((prev) => ({ ...prev, entries: [] }))
  }, [])

  return {
    entries: state.entries,
    isMock: false,
    refresh: load,
    clear,
    updatedAt: state.updatedAt,
  }
}