import assert from "node:assert/strict"
import test from "node:test"

import {
  DEFAULT_SETTINGS,
  parseSettings,
  sanitize,
  validateCycleMs,
} from "./settings.js"

test("TC-FE-SET-01 sanitize: nilai tidak valid jatuh ke bawaan", () => {
  assert.deepEqual(sanitize(null), DEFAULT_SETTINGS)
  assert.deepEqual(sanitize("teks"), DEFAULT_SETTINGS)
  assert.deepEqual(sanitize({ theme: "ungu", refreshMs: 3000 }), DEFAULT_SETTINGS)
})

test("TC-FE-SET-02 sanitize: nilai valid dipertahankan, kunci asing dibuang", () => {
  assert.deepEqual(
    sanitize({ theme: "light", refreshMs: 5000, lain: 1 }),
    { theme: "light", refreshMs: 5000 }
  )
  assert.deepEqual(sanitize({ theme: "light" }), { theme: "light", refreshMs: 1000 })
})

test("TC-FE-SET-03 parseSettings: JSON rusak atau kosong", () => {
  assert.deepEqual(parseSettings("{rusak"), DEFAULT_SETTINGS)
  assert.deepEqual(parseSettings(null), DEFAULT_SETTINGS)
  assert.deepEqual(
    parseSettings('{"theme":"light","refreshMs":2000}'),
    { theme: "light", refreshMs: 2000 }
  )
})

test("TC-FE-SET-04 validateCycleMs: nilai valid", () => {
  assert.deepEqual(validateCycleMs("1000"), { ok: true, value: 1000 })
  assert.deepEqual(validateCycleMs(" 2000 "), { ok: true, value: 2000 })
  assert.deepEqual(validateCycleMs("500"), { ok: true, value: 500 })
  assert.deepEqual(validateCycleMs("5000"), { ok: true, value: 5000 })
})

test("TC-FE-SET-05 validateCycleMs: nilai tidak valid", () => {
  const range = { ok: false, error: "cycleMs must be between 500 and 5000" }
  const whole = { ok: false, error: "cycleMs must be a whole number" }
  assert.deepEqual(validateCycleMs("499"), range)
  assert.deepEqual(validateCycleMs("5001"), range)
  for (const bad of ["abc", "", "1500.5", "-100", "12e2", null]) {
    assert.deepEqual(validateCycleMs(bad), whole)
  }
})