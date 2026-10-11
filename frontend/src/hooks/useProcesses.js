import { useApi } from "@/hooks/useApi"
import { EMPTY_PROCESSES } from "@/services/empty"

// Data nyata dari GET /api/processes. Bentuk nilai kembaliannya sama dengan
// data contoh sebelumnya, sehingga halaman tidak perlu diubah.
export function useProcesses({ autoRefresh = false, intervalMs } = {}) {
  const { data, updatedAt, refresh } = useApi("/api/processes", {
    autoRefresh,
    intervalMs,
  })
  return { data: data ?? EMPTY_PROCESSES, isMock: false, refresh, updatedAt }
}