import { useCallback, useEffect, useRef, useState } from "react"

import { reportFail, reportOk } from "@/hooks/useBackendStatus"
import { usePolling } from "@/hooks/usePolling"
import { useSettings } from "@/hooks/useSettings"
import { getJson } from "@/services/api"

export function useApi(path, { autoRefresh = false, intervalMs } = {}) {
  const { refreshMs } = useSettings()
  const interval = intervalMs ?? refreshMs

  const [state, setState] = useState(() => ({
    data: null,
    offline: false,
    updatedAt: new Date(),
  }))
  const inFlight = useRef(false)
  const alive = useRef(false)

  const load = useCallback(async () => {
    if (inFlight.current) return // jangan menumpuk permintaan
    inFlight.current = true
    try {
      const data = await getJson(path)
      if (!alive.current) return
      reportOk()
      setState({ data, offline: false, updatedAt: new Date() })
    } catch (error) {
      if (!alive.current) return
      reportFail(error)
      setState((prev) => ({ ...prev, offline: Boolean(error.offline) }))
    } finally {
      inFlight.current = false
    }
  }, [path])

  useEffect(() => {
    alive.current = true
    load()
    return () => {
      alive.current = false
    }
  }, [load])

  usePolling(load, { autoRefresh, interval, reconnecting: state.offline })

  // Dipakai setelah POST, yang jawabannya sudah berisi data terbaru.
  const setData = useCallback((data) => {
    setState({ data, offline: false, updatedAt: new Date() })
  }, [])

  return { data: state.data, updatedAt: state.updatedAt, refresh: load, setData }
}