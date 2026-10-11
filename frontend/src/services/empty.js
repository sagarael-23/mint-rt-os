// Nilai kosong yang dipakai sebelum data pertama dari backend tiba (atau saat
// backend tidak terjangkau), supaya halaman tidak error.

export const EMPTY_PROCESSES = { count: 0, processes: [] }

export const EMPTY_SCHEDULER = {
  simulation: true,
  algorithm: "EDF",
  status: "UNKNOWN",
  cycle: 0,
  cycleMs: 1000,
  simulatedCores: 1,
  jobCount: 0,
  demandMs: 0,
  utilizationPercent: 0,
  met: 0,
  missed: 0,
  totalMet: 0,
  totalMissed: 0,
  currentProcess: null,
  nextProcess: null,
  nextDeadlineMs: null,
  queue: [],
  timeline: [],
}

export const EMPTY_MONITORING = {
  intervalMs: 1000,
  capacity: 120,
  count: 0,
  current: {
    cpuPercent: 0,
    memPercent: 0,
    processCount: 0,
    activeProcesses: 0,
    utilizationPercent: 0,
    deadlinePerformancePercent: null,
    windowMet: 0,
    windowMissed: 0,
  },
  samples: [],
}

export const EMPTY_SETTINGS = {
  algorithm: "EDF",
  cycleMs: 1000,
  cycleMinMs: 500,
  cycleMaxMs: 5000,
  simulatedCores: 1,
  schedulerStatus: "—",
  historyCapacity: 120,
}