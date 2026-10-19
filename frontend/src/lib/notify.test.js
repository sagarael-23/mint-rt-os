import assert from "node:assert/strict"
import test from "node:test"

import { isNotable, selectNotifications } from "./notify.js"

const e = (seq, level, category, message) => ({
  seq,
  time: "10:00:00",
  level,
  category,
  message,
})

test("TC-FE-NTF-01 hanya WARN dan ERROR yang layak diberi notifikasi", () => {
  assert.equal(isNotable(e(1, "WARN", "CPU", "x")), true)
  assert.equal(isNotable(e(2, "ERROR", "SYSTEM", "x")), true)
  assert.equal(isNotable(e(3, "INFO", "PROCESS", "x")), false)
})

test("TC-FE-NTF-02 tanpa entri layak: tanpa notifikasi", () => {
  assert.deepEqual(selectNotifications([]), [])
  assert.deepEqual(selectNotifications([e(1, "INFO", "PROCESS", "sleep detected")]), [])
})

test("TC-FE-NTF-03 satu atau dua entri ditampilkan satu per satu", () => {
  const one = selectNotifications([e(7, "WARN", "CPU", "CPU usage high: 100.0 %")])
  assert.deepEqual(one, [
    { id: "log-7", level: "WARN", title: "WARN · CPU", message: "CPU usage high: 100.0 %" },
  ])

  const two = selectNotifications([e(8, "WARN", "DEADLINE", "a"), e(9, "ERROR", "PROCESS", "b")])
  assert.deepEqual(two.map((t) => t.id), ["log-8", "log-9"])
  assert.deepEqual(two.map((t) => t.title), ["WARN · DEADLINE", "ERROR · PROCESS"])
})

test("TC-FE-NTF-04 lebih dari dua entri diringkas menjadi satu notifikasi", () => {
  const entries = [
    e(10, "WARN", "CPU", "a"),
    e(11, "WARN", "DEADLINE", "b"),
    e(12, "WARN", "SYSTEM", "c"),
  ]
  const out = selectNotifications(entries)
  assert.equal(out.length, 1)
  assert.equal(out[0].id, "log-12-summary")
  assert.equal(out[0].level, "WARN")
  assert.equal(out[0].title, "3 new warning/error events")
  assert.equal(out[0].message, "Latest: c")

  const withError = selectNotifications([...entries, e(13, "ERROR", "PROCESS", "d")])
  assert.equal(withError[0].level, "ERROR")
  assert.equal(withError[0].title, "4 new warning/error events")
})

test("TC-FE-NTF-05 entri INFO di antara WARN diabaikan", () => {
  const out = selectNotifications([
    e(20, "INFO", "PROCESS", "x"),
    e(21, "WARN", "CPU", "y"),
    e(22, "INFO", "PROCESS", "z"),
  ])
  assert.deepEqual(out.map((t) => t.id), ["log-21"])
})