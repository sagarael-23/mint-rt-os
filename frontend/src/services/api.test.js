import assert from "node:assert/strict"
import test from "node:test"

import { ApiError, getJson, postJson } from "./api.js"

function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  })
}

test("TC-FE-API-01 getJson mengembalikan isi JSON dan memakai no-store", async () => {
  let seen
  globalThis.fetch = async (url, init) => {
    seen = { url, init }
    return json({ status: "ok" })
  }
  const body = await getJson("/api/health")
  assert.deepEqual(body, { status: "ok" })
  assert.equal(seen.url, "/api/health")
  assert.equal(seen.init.cache, "no-store")
})

test("TC-FE-API-02 kesalahan HTTP membawa pesan dan status dari backend", async () => {
  globalThis.fetch = async () => json({ error: "process not found" }, 404)
  await assert.rejects(
    getJson("/api/processes/1"),
    (err) =>
      err instanceof ApiError &&
      err.status === 404 &&
      err.message === "process not found" &&
      err.offline === false
  )
})

test("TC-FE-API-03 fetch gagal dianggap backend offline", async () => {
  globalThis.fetch = async () => {
    throw new TypeError("fetch failed")
  }
  await assert.rejects(
    getJson("/api/system"),
    (err) =>
      err instanceof ApiError &&
      err.offline === true &&
      err.message === "Backend tidak terjangkau"
  )
})

test("TC-FE-API-04 HTTP 500 tanpa JSON (proxy gagal) dianggap offline", async () => {
  globalThis.fetch = async () => new Response("", { status: 500 })
  await assert.rejects(
    getJson("/api/system"),
    (err) => err.offline === true && err.status === 500
  )
})

test("TC-FE-API-05 jawaban 200 yang bukan JSON ditolak", async () => {
  globalThis.fetch = async () => new Response("<html></html>", { status: 200 })
  await assert.rejects(
    getJson("/api/system"),
    (err) => err.message === "Jawaban backend bukan JSON" && err.offline === false
  )
})

test("TC-FE-API-06 postJson mengirim POST dengan header X-Requested-With", async () => {
  let seen
  globalThis.fetch = async (url, init) => {
    seen = { url, init }
    return json({ status: "RUNNING" })
  }
  const body = await postJson("/api/scheduler/start")
  assert.deepEqual(body, { status: "RUNNING" })
  assert.equal(seen.init.method, "POST")
  assert.equal(seen.init.headers["X-Requested-With"], "mint-rt")
})

test("TC-FE-API-07 backend yang tidak menjawab dianggap offline (timeout)", async () => {
  globalThis.fetch = (url, init) =>
    new Promise((_, reject) => {
      init.signal.addEventListener("abort", () => {
        reject(Object.assign(new Error("aborted"), { name: "AbortError" }))
      })
    })
  await assert.rejects(
    getJson("/api/system", { timeoutMs: 20 }),
    (err) =>
      err.offline === true && err.message === "Backend tidak menjawab (timeout)"
  )
})