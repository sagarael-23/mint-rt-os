import { useApi } from "@/hooks/useApi"
import { EMPTY_MONITORING } from "@/services/empty"

// Data nyata dari GET /api/monitoring (riwayat 120 siklus dari backend).
export function useMonitoring({ autoRefresh = false, intervalMs } = {}) {
  const { data, updatedAt, refresh } = useApi("/api/monitoring", {
    autoRefresh,
    intervalMs,
  })
  return { data: data ?? EMPTY_MONITORING, isMock: false, refresh, updatedAt }
}