export const STATE_OPTIONS = [
  "ALL",
  "RUNNING",
  "SLEEPING",
  "DISK_WAIT",
  "STOPPED",
  "ZOMBIE",
  "IDLE",
]

export const RT_OPTIONS = [
  { value: "ALL", label: "All scheduling" },
  { value: "EDF", label: "EDF simulation" },
  { value: "NORMAL", label: "Normal" },
]

// Nama (tanpa membedakan huruf besar/kecil) atau PID (sebagian angka).
export function filterProcesses(list, { query = "", state = "ALL", rt = "ALL" } = {}) {
  const q = query.trim().toLowerCase()
  return list.filter((p) => {
    if (q && !p.name.toLowerCase().includes(q) && !String(p.pid).includes(q)) {
      return false
    }
    if (state !== "ALL" && p.stateName !== state) return false
    if (rt === "EDF" && p.rtStatus === "NORMAL") return false
    if (rt === "NORMAL" && p.rtStatus !== "NORMAL") return false
    return true
  })
}

// Mengembalikan salinan terurut. Nilai sama diurutkan menurut PID agar stabil.
export function sortProcesses(list, key, dir = "desc") {
  const sign = dir === "asc" ? 1 : -1
  return [...list].sort((a, b) => {
    const va = a[key]
    const vb = b[key]
    const cmp =
      typeof va === "string" || typeof vb === "string"
        ? String(va).localeCompare(String(vb), undefined, { sensitivity: "base" })
        : va - vb
    return cmp !== 0 ? sign * cmp : a.pid - b.pid
  })
}

// Halaman dijepit ke rentang yang valid. start dan end berbasis 0 (end eksklusif).
export function paginate(total, page, pageSize) {
  const pages = Math.max(1, Math.ceil(total / pageSize))
  const current = Math.min(Math.max(page, 1), pages)
  const start = total === 0 ? 0 : (current - 1) * pageSize
  const end = Math.min(start + pageSize, total)
  return { page: current, pages, start, end }
}

export function summarize(list) {
  return {
    total: list.length,
    running: list.filter((p) => p.stateName === "RUNNING").length,
    sleeping: list.filter((p) => p.stateName === "SLEEPING").length,
    edf: list.filter((p) => p.rtStatus !== "NORMAL").length,
  }
}