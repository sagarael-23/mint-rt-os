import { useEffect } from "react"

// Menjalankan load() tiap `interval` saat autoRefresh aktif, dan tiap `retryMs`
// saat sedang mencoba menyambung ulang ke backend yang belum terjangkau.
export function usePolling(load, { autoRefresh, interval, reconnecting, retryMs = 3000 }) {
  useEffect(() => {
    if (!autoRefresh) return undefined
    const timer = setInterval(load, interval)
    return () => clearInterval(timer)
  }, [autoRefresh, interval, load])

  useEffect(() => {
    if (!reconnecting) return undefined
    const timer = setInterval(load, retryMs)
    return () => clearInterval(timer)
  }, [reconnecting, retryMs, load])
}