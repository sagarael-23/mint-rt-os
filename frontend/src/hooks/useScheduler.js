import { MOCK_SCHEDULER } from "@/services/mock"

// Tahap 9: data contoh dengan bentuk yang sama dengan GET /api/scheduler.
export function useScheduler() {
  return { data: MOCK_SCHEDULER, isMock: true }
}