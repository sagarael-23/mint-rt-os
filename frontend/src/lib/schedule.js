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