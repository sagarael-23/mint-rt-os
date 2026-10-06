// DATA CONTOH (mock). Bentuknya meniru JSON dari backend C:
// GET /api/monitoring, GET /api/scheduler, GET /api/processes.
// Angka di sini BUKAN data nyata.

const SAMPLE_COUNT = 60

const pad = (n) => String(n).padStart(2, "0")
const clamp = (v, lo, hi) => Math.min(Math.max(v, lo), hi)
const round1 = (v) => Math.round(v * 10) / 10

function buildSamples() {
  const samples = []
  for (let i = 0; i < SAMPLE_COUNT; i++) {
    const cpu = round1(
      clamp(35 + 18 * Math.sin(i / 7) + 9 * Math.sin(i / 2.1), 3, 95)
    )
    samples.push({
      time: `12:00:${pad(i)}`,
      cpu,
      mem: round1(48 + i * 0.03),
      processes: 221,
      jobs: 9,
      met: 9,
      missed: 0,
      utilization: round1(cpu * 0.8),
    })
  }
  return samples
}

const samples = buildSamples()
const last = samples[samples.length - 1]

export const MOCK_MONITORING = {
  intervalMs: 1000,
  capacity: 120,
  count: samples.length,
  current: {
    cpuPercent: last.cpu,
    memPercent: last.mem,
    processCount: 221,
    activeProcesses: 12,
    utilizationPercent: 28.0,
    deadlinePerformancePercent: 98.8,
    windowMet: 489,
    windowMissed: 6,
  },
  samples,
}

export const MOCK_SCHEDULER = {
  simulation: true,
  algorithm: "EDF",
  status: "RUNNING",
  cycle: 120,
  cycleMs: 1000,
  simulatedCores: 1,
  jobCount: 9,
  demandMs: 280,
  utilizationPercent: 28.0,
  met: 9,
  missed: 0,
  totalMet: 18,
  totalMissed: 2,
  currentProcess: { pid: 1365, name: "cinnamon" },
  nextProcess: { pid: 847, name: "Xorg" },
  nextDeadlineMs: 90,
  queue: [],
  timeline: [],
}

const STATE_CODE = {
  RUNNING: "R",
  SLEEPING: "S",
  DISK_WAIT: "D",
  STOPPED: "T",
  ZOMBIE: "Z",
  IDLE: "I",
}

// [pid, name, stateName, cpu%, memoryMb, threads, priority, edf, ppid]
const PROCESS_ROWS = [
  [1, "systemd", "SLEEPING", 0.0, 13.0, 1, 20, false, 0],
  [2, "kthreadd", "SLEEPING", 0.0, 0, 1, 20, false, 0],
  [17, "ksoftirqd/0", "SLEEPING", 0.5, 0, 1, 20, false, 2],
  [18, "rcu_preempt", "IDLE", 0.0, 0, 1, 20, false, 2],
  [91, "kswapd0", "SLEEPING", 0.0, 0, 1, 20, false, 2],
  [212, "jbd2/sda1-8", "DISK_WAIT", 0.1, 0, 1, 20, false, 2],
  [330, "systemd-journal", "SLEEPING", 0.1, 52.4, 1, 20, false, 1],
  [372, "systemd-udevd", "SLEEPING", 0.0, 9.8, 1, 20, false, 1],
  [780, "NetworkManager", "SLEEPING", 0.1, 17.6, 3, 20, false, 1],
  [795, "rtkit-daemon", "SLEEPING", 0.0, 3.1, 3, 21, false, 1],
  [803, "pulseaudio", "SLEEPING", 0.3, 32.4, 4, 9, false, 1210],
  [847, "Xorg", "SLEEPING", 2.1, 177.5, 2, 20, true, 780],
  [911, "irq/24-vmwgfx", "SLEEPING", 0.0, 0, 1, -51, false, 2],
  [1210, "cinnamon-sessio", "SLEEPING", 0.0, 24.7, 3, 20, false, 1],
  [1342, "upowerd", "SLEEPING", 0.1, 8.4, 4, 20, false, 1],
  [1365, "cinnamon", "SLEEPING", 4.7, 323.3, 15, 20, true, 1210],
  [1384, "VBoxClient", "SLEEPING", 0.4, 5.9, 3, 20, true, 1383],
  [1388, "VBoxService", "SLEEPING", 0.3, 4.2, 9, 20, true, 1],
  [1634, "gnome-terminal-", "SLEEPING", 0.6, 38.0, 6, 20, false, 1210],
  [1682, "bash", "SLEEPING", 0.0, 9.2, 1, 20, false, 1634],
  [3798, "code", "SLEEPING", 0.5, 192.2, 43, 20, false, 3770],
  [3832, "code", "SLEEPING", 0.2, 160.9, 13, 20, false, 3798],
  [3870, "code", "RUNNING", 0.9, 438.1, 13, 20, false, 3798],
  [3920, "code", "SLEEPING", 0.1, 137.1, 18, 20, false, 3798],
  [4014, "firefox-bin", "SLEEPING", 1.1, 372.2, 74, 20, true, 1210],
  [4181, "Isolated Web Co", "SLEEPING", 0.2, 174.0, 18, 20, false, 4014],
  [4225, "Isolated Web Co", "SLEEPING", 0.1, 97.7, 16, 20, false, 4014],
  [4295, "Privileged Cont", "SLEEPING", 0.4, 123.8, 18, 20, false, 4014],
  [4456, "copilot-runtime", "SLEEPING", 0.3, 88.0, 12, 20, false, 3798],
  [5221, "snapd", "SLEEPING", 0.0, 21.9, 8, 20, false, 1],
  [5390, "cupsd", "SLEEPING", 0.0, 6.5, 2, 20, false, 1],
  [6120, "apt-check", "DISK_WAIT", 0.8, 54.3, 1, 30, false, 1210],
  [7301, "tracker-miner-fs", "SLEEPING", 0.1, 71.2, 5, 39, false, 1210],
  [7544, "sleep", "SLEEPING", 0.0, 2.2, 1, 20, false, 1682],
  [8566, "mint-rt-backend", "RUNNING", 1.1, 1.8, 1, 20, true, 1682],
  [9042, "dd", "STOPPED", 0.0, 2.6, 1, 20, false, 1682],
  [9120, "defunct-demo", "ZOMBIE", 0.0, 0, 1, 20, false, 1682],
  [9187, "python3", "SLEEPING", 0.2, 14.6, 1, 20, false, 1682],
]

function toProcess([pid, name, stateName, cpu, memoryMb, threads, priority, edf, ppid]) {
  const rtExec = Math.max(10, Math.round(cpu) * 10)
  return {
    pid,
    ppid,
    name,
    state: STATE_CODE[stateName],
    stateName,
    cpu,
    memoryKb: Math.round(memoryMb * 1024),
    threads,
    priority,
    cpuTimeSec: Math.round((cpu * 37 + (pid % 90) + 1) * 100) / 100,
    rtStatus: edf ? "EDF SIMULATION" : "NORMAL",
    rtExecMs: edf ? rtExec : null,
    rtDeadlineMs: edf ? Math.min(rtExec * 9, 1000) : null,
  }
}

const processes = PROCESS_ROWS.map(toProcess)

export const MOCK_PROCESSES = {
  count: processes.length,
  processes,
}

// Menggeser CPU% sedikit agar tombol Refresh dan Live terlihat bekerja pada
// data contoh. Hanya dipakai oleh data mock, bukan oleh backend.
export function jitterProcesses(prev) {
  const next = prev.processes.map((p) => {
    if (p.stateName === "ZOMBIE" || p.stateName === "STOPPED") return p
    const cpu = round1(clamp(p.cpu + (Math.random() - 0.5) * 1.6, 0, 30))
    return {
      ...p,
      cpu,
      cpuTimeSec: Math.round((p.cpuTimeSec + cpu / 100) * 100) / 100,
    }
  })
  return { ...prev, processes: next }
}