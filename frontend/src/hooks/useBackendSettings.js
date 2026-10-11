import { useCallback } from "react"

import { useApi } from "@/hooks/useApi"
import { reportFail, reportOk } from "@/hooks/useBackendStatus"
import { postJson } from "@/services/api"
import { EMPTY_SETTINGS } from "@/services/empty"

// Pengaturan nyata dari GET /api/settings. apply() mengirim
// POST /api/settings?cycleMs=... dan mengembalikan { ok } atau { ok, error }.
export function useBackendSettings() {
  const { data, setData } = useApi("/api/settings")

  const apply = useCallback(
    async (cycleMs) => {
      try {
        const body = await postJson(`/api/settings?cycleMs=${cycleMs}`)
        reportOk()
        setData(body)
        return { ok: true }
      } catch (error) {
        reportFail(error)
        return { ok: false, error: error.message }
      }
    },
    [setData]
  )

  return { data: data ?? EMPTY_SETTINGS, isMock: false, apply }
}