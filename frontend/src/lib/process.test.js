import assert from "node:assert/strict"
import test from "node:test"

import { filterProcesses, paginate, sortProcesses, summarize } from "./process.js"

const sample = [
  { pid: 10, name: "firefox-bin", stateName: "SLEEPING", rtStatus: "EDF SIMULATION", cpu: 2.5 },
  { pid: 20, name: "code", stateName: "RUNNING", rtStatus: "NORMAL", cpu: 9.1 },
  { pid: 30, name: "Code Helper", stateName: "SLEEPING", rtStatus: "NORMAL", cpu: 9.1 },
  { pid: 1365, name: "cinnamon", stateName: "ZOMBIE", rtStatus: "NORMAL", cpu: 0 },
]

const pids = (list) => list.map((p) => p.pid)

test("TC-FE-LIB-01 filter nama tanpa membedakan huruf besar/kecil", () => {
  assert.deepEqual(pids(filterProcesses(sample, { query: "CODE" })), [20, 30])
})

test("TC-FE-LIB-02 filter PID sebagian angka", () => {
  assert.deepEqual(pids(filterProcesses(sample, { query: "136" })), [1365])
})

test("TC-FE-LIB-03 filter state", () => {
  assert.deepEqual(pids(filterProcesses(sample, { state: "ZOMBIE" })), [1365])
  assert.deepEqual(pids(filterProcesses(sample, { state: "ALL" })), [10, 20, 30, 1365])
})

test("TC-FE-LIB-04 filter penjadwalan EDF dan NORMAL", () => {
  assert.deepEqual(pids(filterProcesses(sample, { rt: "EDF" })), [10])
  assert.deepEqual(pids(filterProcesses(sample, { rt: "NORMAL" })), [20, 30, 1365])
})

test("TC-FE-LIB-05 gabungan pencarian dan state", () => {
  assert.deepEqual(
    pids(filterProcesses(sample, { query: "code", state: "RUNNING" })),
    [20]
  )
})

test("TC-FE-LIB-06 urut numerik menurun, nilai sama menurut PID", () => {
  assert.deepEqual(pids(sortProcesses(sample, "cpu", "desc")), [20, 30, 10, 1365])
  assert.deepEqual(pids(sortProcesses(sample, "cpu", "asc")), [1365, 10, 20, 30])
})

test("TC-FE-LIB-07 urut teks menaik tanpa membedakan huruf besar/kecil", () => {
  assert.deepEqual(pids(sortProcesses(sample, "name", "asc")), [1365, 20, 30, 10])
})

test("TC-FE-LIB-08 pengurutan tidak mengubah daftar asli", () => {
  const before = pids(sample)
  sortProcesses(sample, "cpu", "desc")
  assert.deepEqual(pids(sample), before)
})

test("TC-FE-LIB-09 paginasi dan penjepitan halaman", () => {
  assert.deepEqual(paginate(38, 1, 12), { page: 1, pages: 4, start: 0, end: 12 })
  assert.deepEqual(paginate(38, 4, 12), { page: 4, pages: 4, start: 36, end: 38 })
  assert.equal(paginate(38, 99, 12).page, 4)
  assert.equal(paginate(38, 0, 12).page, 1)
  assert.deepEqual(paginate(0, 1, 12), { page: 1, pages: 1, start: 0, end: 0 })
})

test("TC-FE-LIB-10 ringkasan jumlah proses", () => {
  assert.deepEqual(summarize(sample), { total: 4, running: 1, sleeping: 2, edf: 1 })
})