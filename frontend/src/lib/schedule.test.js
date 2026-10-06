import assert from "node:assert/strict"
import test from "node:test"

import { buildSchedule, deadlineFor } from "./schedule.js"

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