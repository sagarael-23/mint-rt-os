export const SCHED_MAX_TASKS = 64

// Deadline relatif simulasi: jatah bandwidth sama (1/nJobs), jadi
// deadline = exec * nJobs, dibatasi panjang siklus (atau exec jika exec > siklus).
export function deadlineFor(execMs, nJobs, cycleMs) {
  const n = Math.max(1, nJobs)
  const d = execMs * n
  const cap = Math.max(execMs, cycleMs)
  return Math.min(d, cap)
}

// jobs: [{ pid, name, execMs }]. Semua job tiba di t=0 pada satu prosesor
// simulasi, sehingga EDF menjalankannya berurutan menurut deadline.
// Urutan dan penentuan seri sama dengan backend: job diberi id menurut
// exec menurun lalu PID menaik, dan deadline yang sama diurut menurut id.
export function buildSchedule(jobs, cycleMs) {
  const kept = [...jobs]
    .sort((a, b) => b.execMs - a.execMs || a.pid - b.pid)
    .slice(0, SCHED_MAX_TASKS)
  const n = kept.length

  const items = kept.map((job, id) => ({
    ...job,
    id,
    deadlineMs: deadlineFor(job.execMs, n, cycleMs),
  }))
  items.sort((a, b) => a.deadlineMs - b.deadlineMs || a.id - b.id)

  let clock = 0
  let met = 0
  let missed = 0
  const queue = []
  const timeline = []

  for (const job of items) {
    const startMs = clock
    clock += job.execMs
    const isMissed = clock > job.deadlineMs
    if (isMissed) missed += 1
    else met += 1

    timeline.push({ pid: job.pid, name: job.name, startMs, endMs: clock })
    queue.push({
      pid: job.pid,
      name: job.name,
      execMs: job.execMs,
      deadlineMs: job.deadlineMs,
      finishMs: clock,
      missed: isMissed,
    })
  }

  return { queue, timeline, met, missed, demandMs: clock }
}

// Pembulatan ke atas ke angka "rapi" untuk sumbu: kelipatan 10 sampai 100,
// kelipatan 50 sampai 500, selebihnya kelipatan 100.
export function niceCeil(x) {
  const step = x <= 100 ? 10 : x <= 500 ? 50 : 100
  return Math.ceil(x / step) * step
}

// Panjang sumbu timeline (ms).
// "cycle": paling sedikit sepanjang siklus, sehingga bagian kosong terlihat.
// "fit": hanya sepanjang pekerjaan (dibulatkan), sehingga batang lebih lebar.
// Pada kedua mode, sumbu cukup panjang untuk memuat semua batang.
export function axisSpan(queue, timeline, cycleMs, mode = "cycle") {
  const maxEnd = Math.max(0, ...timeline.map((s) => s.endMs))
  if (mode === "fit") return niceCeil(Math.max(maxEnd, 1))
  const maxDeadline = Math.max(0, ...queue.map((j) => j.deadlineMs))
  return Math.max(cycleMs, maxEnd, maxDeadline)
}

// Sisa waktu sebelum deadline (negatif jika terlambat); null jika belum selesai.
export function slackMs(job) {
  return job.finishMs == null ? null : job.deadlineMs - job.finishMs
}

export function slackLabel(job) {
  const slack = slackMs(job)
  if (slack == null) return "—"
  return `${slack >= 0 ? "+" : "−"}${Math.abs(slack)} ms`
}

// Menghitung ulang deadline sebuah job dari rumusnya, untuk dibandingkan
// dengan nilai dari backend.
export function explainDeadline(job, jobCount, cycleMs) {
  const jobs = Math.max(1, jobCount)
  const raw = job.execMs * jobs
  const cap = Math.max(job.execMs, cycleMs)
  const computed = Math.min(raw, cap)
  return {
    jobs,
    raw,
    cap,
    capped: raw > cap,
    computed,
    matches: computed === job.deadlineMs,
  }
}