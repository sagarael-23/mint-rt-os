const NOTABLE_LEVELS = new Set(["WARN", "ERROR"])

export function isNotable(entry) {
  return NOTABLE_LEVELS.has(entry.level)
}

// Sampai maxIndividual entri ditampilkan satu per satu; lebih dari itu diringkas
// menjadi satu notifikasi agar layar tidak penuh.
export function selectNotifications(entries, maxIndividual = 2) {
  const notable = entries.filter(isNotable)
  if (notable.length === 0) return []

  if (notable.length <= maxIndividual) {
    return notable.map((e) => ({
      id: `log-${e.seq}`,
      level: e.level,
      title: `${e.level} · ${e.category}`,
      message: e.message,
    }))
  }

  const latest = notable[notable.length - 1]
  const hasError = notable.some((e) => e.level === "ERROR")
  return [
    {
      id: `log-${latest.seq}-summary`,
      level: hasError ? "ERROR" : "WARN",
      title: `${notable.length} new warning/error events`,
      message: `Latest: ${latest.message}`,
    },
  ]
}