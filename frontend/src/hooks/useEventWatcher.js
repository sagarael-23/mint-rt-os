import { useCallback, useEffect, useRef } from "react"

import {
  reportFail,
  reportOk,
  useBackendStatus,
} from "@/hooks/useBackendStatus"
import { addEvents, replaceEvents } from "@/hooks/useEvents"
import { getSettings, useSettings } from "@/hooks/useSettings"
import { pushToast } from "@/hooks/useToasts"
import { selectNotifications } from "@/lib/notify"
import { getJson } from "@/services/api"

const OFFLINE_RETRY_MS = 3000

// Dipanggil sekali di App. Mengambil log baru dengan kursor seq. Pengambilan
// pertama (dan setelah backend dimulai ulang) hanya menjadi titik awal: log lama
// tidak dijadikan notifikasi.
export function useEventWatcher() {
  const { refreshMs } = useSettings()
  const { connected } = useBackendStatus()
  const interval =
    connected === false ? Math.max(refreshMs, OFFLINE_RETRY_MS) : refreshMs

  const cursor = useRef(null) // null = belum ada titik awal
  const inFlight = useRef(false)
  const alive = useRef(false)

  const load = useCallback(async () => {
    if (inFlight.current) return
    inFlight.current = true
    try {
      const since = cursor.current
      let body = await getJson(since ? `/api/logs?since=${since}` : "/api/logs")

      // Backend dimulai ulang: nomor urut kembali dari 1. Mulai titik awal baru.
      const restarted = since !== null && since > 0 && body.lastSeq < since
      if (restarted) body = await getJson("/api/logs")
      if (!alive.current) return

      const isBaseline = since === null || restarted
      cursor.current = body.cursor
      reportOk()

      if (isBaseline) {
        replaceEvents(body.entries)
        return
      }
      if (body.entries.length === 0) return

      addEvents(body.entries)
      if (getSettings().notifications) {
        selectNotifications(body.entries).forEach(pushToast)
      }
    } catch (error) {
      if (alive.current) reportFail(error)
    } finally {
      inFlight.current = false
    }
  }, [])

  useEffect(() => {
    alive.current = true
    load()
    const timer = setInterval(load, interval)
    return () => {
      alive.current = false
      clearInterval(timer)
    }
  }, [load, interval])
}