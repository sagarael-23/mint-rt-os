const DEFAULT_TIMEOUT_MS = 4000

// offline = true berarti backend tidak terjangkau (mati, tidak menjawab, atau
// proxy gagal meneruskan). Kesalahan lain (404, 400, dst.) berarti backend
// hidup tetapi menolak permintaannya.
export class ApiError extends Error {
  constructor(message, { status = 0, offline = false } = {}) {
    super(message)
    this.name = "ApiError"
    this.status = status
    this.offline = offline
  }
}

async function request(path, init = {}, { timeoutMs = DEFAULT_TIMEOUT_MS } = {}) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)

  let response
  try {
    response = await fetch(path, {
      ...init,
      cache: "no-store",
      signal: controller.signal,
    })
  } catch (err) {
    const timedOut = err?.name === "AbortError"
    throw new ApiError(
      timedOut ? "Backend tidak menjawab (timeout)" : "Backend tidak terjangkau",
      { offline: true }
    )
  } finally {
    clearTimeout(timer)
  }

  let body = null
  try {
    body = await response.json()
  } catch {
    body = null
  }

  if (!response.ok) {
    // Proxy Vite menjawab HTTP 5xx tanpa JSON saat backend mati.
    if (body === null && response.status >= 500) {
      throw new ApiError("Backend tidak terjangkau", {
        status: response.status,
        offline: true,
      })
    }
    throw new ApiError(body?.error ?? `HTTP ${response.status}`, {
      status: response.status,
    })
  }
  if (body === null) {
    throw new ApiError("Jawaban backend bukan JSON", { status: response.status })
  }
  return body
}

export function getJson(path, options) {
  return request(path, {}, options)
}

// Header X-Requested-With diwajibkan backend untuk semua POST (perlindungan
// terhadap permintaan lintas situs).
export function postJson(path, options) {
  return request(
    path,
    { method: "POST", headers: { "X-Requested-With": "mint-rt" } },
    options
  )
}