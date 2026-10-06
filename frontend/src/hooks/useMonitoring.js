import { MOCK_MONITORING } from "@/services/mock"

// Tahap 9: data contoh dengan bentuk yang sama dengan GET /api/monitoring.
// Phase 10 mengganti isi hook ini dengan data nyata dari backend.
export function useMonitoring() {
  return { data: MOCK_MONITORING, isMock: true }
}