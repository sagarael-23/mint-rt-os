import assert from "node:assert/strict"
import test from "node:test"

import { countByLevel, filterLogs, levelTone, mergeLogs } from "./logs.js"

const sample = [
  { seq: 1, time: "10:00:00", level: "INFO", category: "SYSTEM", message: "backend started" },
  { seq: 2, time: "10:00:01", level: "INFO", category: "PROCESS", message: "firefox-bin (PID 4014) detected" },
  { seq: 3, time: "10:00:02", level: "WARN", category: "CPU", message: "CPU usage high: 100.0 %" },
  { seq: 4, time: "10:00:03", level: "WARN", category: "DEADLINE", message: "EDF simulation: 2 job(s) missed deadline" },
  { seq: 5, time: "10:00:04", level: "ERROR", category: "PROCESS", message: "cannot scan /proc" },
]

const seqs = (list) => list.map((e) => e.seq)

test("TC-FE-LOG-01 filter level, kategori, dan pencarian", () => {
  assert.deepEqual(seqs(filterLogs(sample, { level: "WARN" })), [3, 4])
  assert.deepEqual(seqs(filterLogs(sample, { level: "ERROR" })), [5])
  assert.deepEqual(seqs(filterLogs(sample, { level: "ALL" })), [1, 2, 3, 4, 5])
  assert.deepEqual(seqs(filterLogs(sample, { category: "PROCESS" })), [2, 5])
  assert.deepEqual(seqs(filterLogs(sample, { category: "DEADLINE" })), [4])
  assert.deepEqual(seqs(filterLogs(sample, { query: "FIREFOX" })), [2])
  assert.deepEqual(seqs(filterLogs(sample, { query: "deadline" })), [4])
  assert.deepEqual(seqs(filterLogs(sample, { query: "   " })), [1, 2, 3, 4, 5])
})

test("TC-FE-LOG-02 gabungan filter", () => {
  assert.deepEqual(seqs(filterLogs(sample, { level: "WARN", category: "CPU" })), [3])
  assert.deepEqual(seqs(filterLogs(sample, { level: "INFO", query: "cannot" })), [])
  assert.deepEqual(
    seqs(filterLogs(sample, { level: "ERROR", category: "PROCESS", query: "/proc" })),
    [5]
  )
})

test("TC-FE-LOG-03 jumlah per level", () => {
  assert.deepEqual(countByLevel(sample), { ALL: 5, INFO: 2, WARN: 2, ERROR: 1 })
  assert.deepEqual(countByLevel([]), { ALL: 0, INFO: 0, WARN: 0, ERROR: 0 })
})

test("TC-FE-LOG-04 penggabungan: duplikat, urutan, kapasitas, tanpa mengubah masukan", () => {
  const existing = sample.slice(0, 3)
  const incoming = [sample[4], sample[3], sample[1], sample[2]]

  assert.deepEqual(seqs(mergeLogs(existing, incoming)), [1, 2, 3, 4, 5])
  assert.deepEqual(seqs(mergeLogs(existing, incoming, 3)), [3, 4, 5])
  assert.deepEqual(seqs(existing), [1, 2, 3])
  assert.deepEqual(seqs(mergeLogs([], sample.slice(0, 2))), [1, 2])

  assert.equal(levelTone("INFO"), "primary")
  assert.equal(levelTone("WARN"), "warning")
  assert.equal(levelTone("ERROR"), "danger")
  assert.equal(levelTone("lain"), "muted")
})