import assert from "node:assert/strict"
import test from "node:test"

import {
  axisSpan,
  buildSchedule,
  deadlineFor,
  explainDeadline,
  niceCeil,
  slackLabel,
  slackMs,
} from "./schedule.js"

const job = (pid, name, execMs) => ({ pid, name, execMs })
const names = (queue) => queue.map((j) => j.name)

test("TC-FE-SCH-01 aturan deadline", () => {
  assert.equal(deadlineFor(10, 5, 1000), 50)
  assert.equal(deadlineFor(300, 5, 1000), 1000)
  assert.equal(deadlineFor(1500, 3, 1000), 1500)
  assert.equal(deadlineFor(10, 0, 1000), 10)
})

test("TC-FE-SCH-02 kondisi santai: urutan a, b, c, d dan semua MET", () => {
  const s = buildSchedule(
    [job(10, "c", 30), job(11, "a", 10), job(12, "d", 40), job(13, "b", 20)],
    1000
  )
  assert.deepEqual(names(s.queue), ["a", "b", "c", "d"])
  assert.deepEqual(s.queue.map((j) => j.deadlineMs), [40, 80, 120, 160])
  assert.deepEqual(s.queue.map((j) => j.finishMs), [10, 30, 60, 100])
  assert.equal(s.met, 4)
  assert.equal(s.missed, 0)
  assert.equal(s.demandMs, 100)
})

test("TC-FE-SCH-03 timeline berurutan tanpa celah", () => {
  const s = buildSchedule(
    [job(10, "c", 30), job(11, "a", 10), job(12, "d", 40), job(13, "b", 20)],
    1000
  )
  assert.deepEqual(
    s.timeline.map((t) => [t.name, t.startMs, t.endMs]),
    [["a", 0, 10], ["b", 10, 30], ["c", 30, 60], ["d", 60, 100]]
  )
})

test("TC-FE-SCH-04 overload: small MET, dua hog MISSED", () => {
  const s = buildSchedule(
    [job(20, "hog1", 1000), job(21, "hog2", 1000), job(22, "small", 20)],
    1000
  )
  assert.deepEqual(names(s.queue), ["small", "hog1", "hog2"])
  assert.deepEqual(s.queue.map((j) => j.deadlineMs), [60, 1000, 1000])
  assert.deepEqual(s.queue.map((j) => j.finishMs), [20, 1020, 2020])
  assert.deepEqual(s.queue.map((j) => j.missed), [false, true, true])
  assert.equal(s.met, 1)
  assert.equal(s.missed, 2)
  assert.equal(s.demandMs, 2020)
})

test("TC-FE-SCH-05 tanpa job", () => {
  const s = buildSchedule([], 1000)
  assert.deepEqual(s.queue, [])
  assert.deepEqual(s.timeline, [])
  assert.equal(s.met, 0)
  assert.equal(s.missed, 0)
  assert.equal(s.demandMs, 0)
})

test("TC-FE-SCH-06 dipotong ke 64 job", () => {
  const many = Array.from({ length: 100 }, (_, i) => job(100 + i, "p", 1))
  const s = buildSchedule(many, 1000)
  assert.equal(s.queue.length, 64)
  assert.equal(s.demandMs, 64)
})

test("TC-FE-SCH-07 panjang siklus 2000 dan daftar asli tidak berubah", () => {
  const input = [job(1, "a", 700), job(2, "b", 300)]
  const s = buildSchedule(input, 2000)
  assert.deepEqual(s.queue.map((j) => j.deadlineMs), [600, 1400])
  assert.deepEqual(names(s.queue), ["b", "a"])
  assert.equal(s.met, 2)
  assert.deepEqual(input.map((j) => j.pid), [1, 2])
})

test("TC-FE-SCH-08 niceCeil membulatkan ke angka rapi", () => {
  assert.equal(niceCeil(1), 10)
  assert.equal(niceCeil(100), 100)
  assert.equal(niceCeil(101), 150)
  assert.equal(niceCeil(187), 190)
  assert.equal(niceCeil(200), 200)
  assert.equal(niceCeil(201), 250)
  assert.equal(niceCeil(500), 500)
  assert.equal(niceCeil(501), 600)
  assert.equal(niceCeil(1020), 1100)
})

test("TC-FE-SCH-09 rentang sumbu mode cycle dan fit", () => {
  const light = buildSchedule(
    [job(1, "a", 60), job(2, "b", 40), job(3, "c", 30), job(4, "d", 20)],
    1000
  )
  // Total 150 ms, deadline terbesar 240 ms: jauh di bawah siklus 1000 ms.
  assert.equal(axisSpan(light.queue, light.timeline, 1000, "cycle"), 1000)
  assert.equal(axisSpan(light.queue, light.timeline, 1000, "fit"), 150)

  const heavy = buildSchedule(
    [job(20, "hog1", 1000), job(21, "hog2", 1000), job(22, "small", 20)],
    1000
  )
  // Pekerjaan berakhir di 2020 ms, melewati siklus: kedua mode memuatnya.
  assert.equal(axisSpan(heavy.queue, heavy.timeline, 1000, "cycle"), 2020)
  assert.equal(axisSpan(heavy.queue, heavy.timeline, 1000, "fit"), 2100)

  // Mode bawaan adalah cycle.
  assert.equal(axisSpan(light.queue, light.timeline, 1000), 1000)
})

test("TC-FE-SCH-10 slack dan labelnya", () => {
  const met = { deadlineMs: 90, finishMs: 20 }
  const late = { deadlineMs: 1000, finishMs: 1020 }
  const open = { deadlineMs: 500, finishMs: null }
  assert.equal(slackMs(met), 70)
  assert.equal(slackMs(late), -20)
  assert.equal(slackMs(open), null)
  assert.equal(slackLabel(met), "+70 ms")
  assert.equal(slackLabel(late), "−20 ms")
  assert.equal(slackLabel(open), "—")
})

test("TC-FE-SCH-11 penjelasan deadline cocok dengan hasil buildSchedule", () => {
  const s = buildSchedule(
    [job(1, "a", 40), job(2, "b", 20), job(3, "c", 10)],
    1000
  )
  for (const j of s.queue) {
    const why = explainDeadline(j, s.queue.length, 1000)
    assert.equal(why.matches, true)
    assert.equal(why.jobs, 3)
    assert.equal(why.capped, false)
  }

  const capped = explainDeadline({ execMs: 130, deadlineMs: 1000 }, 9, 1000)
  assert.deepEqual(capped, {
    jobs: 9,
    raw: 1170,
    cap: 1000,
    capped: true,
    computed: 1000,
    matches: true,
  })

  const long = explainDeadline({ execMs: 1500, deadlineMs: 1500 }, 3, 1000)
  assert.equal(long.cap, 1500)
  assert.equal(long.computed, 1500)

  const mismatch = explainDeadline({ execMs: 40, deadlineMs: 999 }, 9, 1000)
  assert.equal(mismatch.matches, false)
})