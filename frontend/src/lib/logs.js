export const LEVELS = ["ALL", "INFO", "WARN", "ERROR"]
export const CATEGORIES = ["ALL", "SYSTEM", "PROCESS", "SCHEDULER", "CPU", "DEADLINE"]

// Pencarian hanya pada pesan, tanpa membedakan huruf besar atau kecil.
export function filterLogs(entries, { level = "ALL", category = "ALL", query = "" } = {}) {
  const q = query.trim().toLowerCase()
  return entries.filter((e) => {
    if (level !== "ALL" && e.level !== level) return false
    if (category !== "ALL" && e.category !== category) return false
    if (q && !e.message.toLowerCase().includes(q)) return false
    return true
  })
}

export function countByLevel(entries) {
  const counts = { ALL: entries.length, INFO: 0, WARN: 0, ERROR: 0 }
  for (const e of entries) {
    if (e.level in counts) counts[e.level] += 1
  }
  return counts
}

// Menambah entri baru (seq lebih besar dari entri terakhir) ke ujung daftar,
// membuang duplikat, dan menjaga kapasitas. Daftar asli tidak diubah.
export function mergeLogs(existing, incoming, capacity = 500) {
  const lastSeq = existing.length ? existing[existing.length - 1].seq : 0
  const fresh = incoming.filter((e) => e.seq > lastSeq).sort((a, b) => a.seq - b.seq)
  const merged = [...existing, ...fresh]
  return merged.length > capacity ? merged.slice(merged.length - capacity) : merged
}

export function levelTone(level) {
  switch (level) {
    case "INFO":
      return "primary"
    case "WARN":
      return "warning"
    case "ERROR":
      return "danger"
    default:
      return "muted"
  }
}