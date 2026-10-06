import { useCallback, useEffect, useState } from "react"

import { MOCK_PROCESSES, jitterProcesses } from "@/services/mock"

// Tahap 9: data contoh dengan bentuk yang sama dengan GET /api/processes.
// Phase 10 mengganti isi hook ini dengan data nyata dari backend; bentuk
// nilai kembaliannya tetap sama sehingga halaman tidak perlu diubah.
export function useProcesses({ autoRefresh = false, intervalMs = 1000 } = {}) {
  const [data, setData] = useState(MOCK_PROCESSES)
  const [updatedAt, setUpdatedAt] = useState(() => new Date())

  const refresh = useCallback(() => {
    setData((prev) => jitterProcesses(prev))
    setUpdatedAt(new Date())
  }, [])

  useEffect(() => {
    if (!autoRefresh) return undefined
    const timer = setInterval(refresh, intervalMs)
    return () => clearInterval(timer)
  }, [autoRefresh, intervalMs, refresh])

  return { data, isMock: true, refresh, updatedAt }
}