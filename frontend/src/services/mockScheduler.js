import { buildSchedule } from "@/lib/schedule"

// DATA CONTOH (mock). Bentuknya meniru JSON GET /api/scheduler.
// Angka di sini BUKAN data nyata.

const CYCLE_MS = 1000

// Proses yang bergantian "memakai CPU" pada tiap siklus contoh.
const POOL = [
  { pid: 1365, name: "cinnamon", base: 40 },
  { pid: 847, name: "Xorg", base: 60 },
  { pid: 4014, name: "firefox-bin", base: 20 },
  { pid: 3870, name: "code", base: 30 },
  { pid: 1634, name: "gnome-terminal-", base: 10 },
  { pid: 8566, name: "mint-rt-backend", base: 10 },
  { pid: 4295, name: "Privileged Cont", base: 20 },
  { pid: 1388, name: "VBoxService", base: 10 },
  { pid: 1384, name: "VBoxClient", base: 10 },
  { pid: 803, name: "pulseaudio", base: 10 },
]

// Dua proses pemakan CPU, muncul pada siklus beban berat.
const HOGS = [
  { pid: 9187, name: "yes" },
  { pid: 9188, name: "yes" },
]

const INITIAL_JOBS = [
  { pid: 847, name: "Xorg", execMs: 60 },
  { pid: 1365, name: "cinnamon", execMs: 40 },
  { pid: 3870, name: "code", execMs: 30 },
  { pid: 4014, name: "firefox-bin", execMs: 20 },
  { pid: 4295, name: "Privileged Cont", execMs: 20 },
  { pid: 1388, name: "VBoxService", execMs: 10 },
  { pid: 1634, name: "gnome-terminal-", execMs: 10 },
  { pid: 8566, name: "mint-rt-backend", execMs: 10 },
]

function build({ cycle, status, jobs, totalMet, totalMissed, addTotals }) {
  const s = buildSchedule(jobs, CYCLE_MS)
  const first = s.queue[0] ?? null
  const second = s.queue[1] ?? null

  return {
    simulation: true,
    algorithm: "EDF",
    status,
    cycle,
    cycleMs: CYCLE_MS,
    simulatedCores: 1,
    jobCount: s.queue.length,
    demandMs: s.demandMs,
    utilizationPercent: Math.round((s.demandMs / CYCLE_MS) * 1000) / 10,
    met: s.met,
    missed: s.missed,
    totalMet: totalMet + (addTotals ? s.met : 0),
    totalMissed: totalMissed + (addTotals ? s.missed : 0),
    currentProcess: first ? { pid: first.pid, name: first.name } : null,
    nextProcess: second ? { pid: second.pid, name: second.name } : null,
    nextDeadlineMs: first ? first.deadlineMs : null,
    queue: s.queue,
    timeline: s.timeline,
  }
}

export const INITIAL_SCHEDULER = build({
  cycle: 120,
  status: "RUNNING",
  jobs: INITIAL_JOBS,
  totalMet: 489,
  totalMissed: 6,
  addTotals: false,
})

function randomJobs(overload) {
  const count = 5 + Math.floor(Math.random() * 5)
  const picked = [...POOL].sort(() => Math.random() - 0.5).slice(0, count)
  const jobs = picked.map((p) => ({
    pid: p.pid,
    name: p.name,
    execMs: Math.max(10, Math.round((p.base * (0.5 + Math.random())) / 10) * 10),
  }))
  if (overload) {
    for (const h of HOGS) {
      jobs.push({
        pid: h.pid,
        name: h.name,
        execMs: 850 + Math.floor(Math.random() * 15) * 10,
      })
    }
  }
  return jobs
}

// Siklus baru. Setiap siklus kelipatan 9 adalah siklus beban berat.
export function nextMockCycle(prev) {
  if (prev.status !== "RUNNING") return prev
  const cycle = prev.cycle + 1
  return build({
    cycle,
    status: "RUNNING",
    jobs: randomJobs(cycle % 9 === 0),
    totalMet: prev.totalMet,
    totalMissed: prev.totalMissed,
    addTotals: true,
  })
}

// Meniru backend: Start menjalankan scheduler dan siklus baru segera muncul.
export function startMock(prev) {
  return nextMockCycle({ ...prev, status: "RUNNING" })
}

// Meniru backend: Stop mengosongkan job, tetapi total tetap tersimpan.
export function stopMock(prev) {
  return {
    ...prev,
    status: "STOPPED",
    jobCount: 0,
    demandMs: 0,
    utilizationPercent: 0,
    met: 0,
    missed: 0,
    currentProcess: null,
    nextProcess: null,
    nextDeadlineMs: null,
    queue: [],
    timeline: [],
  }
}

// Meniru backend: Reset hanya mengosongkan penghitung.
export function resetMock(prev) {
  return { ...prev, cycle: 0, totalMet: 0, totalMissed: 0 }
}