export const DEFAULT_SETTINGS = {
  theme: "dark",
  refreshMs: 1000,
  liveDefault: true,
  notifications: true,
}
export const THEMES = ["dark", "light"]
export const REFRESH_OPTIONS = [1000, 2000, 5000]

// Hanya nilai yang dikenal yang diterima; selebihnya jatuh ke nilai bawaan.
// Dipakai saat membaca localStorage, yang bisa berisi apa saja.
export function sanitize(raw) {
  const out = { ...DEFAULT_SETTINGS }
  if (raw && typeof raw === "object") {
    if (THEMES.includes(raw.theme)) out.theme = raw.theme
    if (REFRESH_OPTIONS.includes(raw.refreshMs)) out.refreshMs = raw.refreshMs
    if (typeof raw.liveDefault === "boolean") out.liveDefault = raw.liveDefault
    if (typeof raw.notifications === "boolean") out.notifications = raw.notifications
  }
  return out
}

export function parseSettings(text) {
  try {
    return sanitize(JSON.parse(text))
  } catch {
    return { ...DEFAULT_SETTINGS }
  }
}

// Aturan sama dengan backend (POST /api/settings?cycleMs=...), termasuk
// bunyi pesan kesalahannya.
export function validateCycleMs(text, min = 500, max = 5000) {
  const s = String(text ?? "").trim()
  if (!/^\d+$/.test(s)) {
    return { ok: false, error: "cycleMs must be a whole number" }
  }
  const value = Number(s)
  if (value < min || value > max) {
    return { ok: false, error: `cycleMs must be between ${min} and ${max}` }
  }
  return { ok: true, value }
}