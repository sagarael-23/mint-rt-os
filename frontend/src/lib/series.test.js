import assert from "node:assert/strict"
import test from "node:test"

import { appendSample, seriesStats, windowTotals } from "./series.js"

test("TC-FE-SER-01 statistik deret", () => {
  assert.deepEqual(seriesStats([10, 20, 60]), { min: 10, max: 60, avg: 30, last: 60 })
  assert.deepEqual(seriesStats([]), { min: 0, max: 0, avg: 0, last: 0 })
})

test("TC-FE-SER-02 total jendela dan persentase performa", () => {
  const samples = [
    { met: 9, missed: 0 },
    { met: 7, missed: 2 },
    { met: 8, missed: 0 },
  ]
  assert.deepEqual(windowTotals(samples), { met: 24, missed: 2, percent: 92.3 })
  assert.deepEqual(windowTotals([{ met: 5, missed: 0 }]), { met: 5, missed: 0, percent: 100 })
  assert.deepEqual(windowTotals([]), { met: 0, missed: 0, percent: null })
})

test("TC-FE-SER-03 appendSample menjaga kapasitas tanpa mengubah masukan", () => {
  const input = [1, 2, 3]
  const out = appendSample(input, 4, 3)
  assert.deepEqual(out, [2, 3, 4])
  assert.deepEqual(input, [1, 2, 3])
  assert.deepEqual(appendSample([1], 2, 3), [1, 2])
})

test("TC-FE-SER-04 persentase dibulatkan satu desimal", () => {
  assert.equal(windowTotals([{ met: 2, missed: 1 }]).percent, 66.7)
})