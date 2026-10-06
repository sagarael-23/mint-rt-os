export function formatPercent(value, digits = 1) {
  return value == null ? "—" : `${value.toFixed(digits)}%`
}

// Thread kernel tidak punya RSS (backend mengirim 0), tampilkan "—".
export function formatMb(kb) {
  return kb == null || kb === 0 ? "—" : `${(kb / 1024).toFixed(1)} MB`
}

export function formatSeconds(sec) {
  if (sec == null) return "—"
  if (sec >= 3600) {
    return `${Math.floor(sec / 3600)}h ${Math.floor((sec % 3600) / 60)}m`
  }
  if (sec >= 60) return `${Math.floor(sec / 60)}m ${Math.floor(sec % 60)}s`
  return `${sec.toFixed(2)} s`
}

// Warna lencana untuk status proses Linux.
export function stateTone(stateName) {
  switch (stateName) {
    case "RUNNING":
      return "success"
    case "ZOMBIE":
      return "danger"
    case "STOPPED":
    case "DISK_WAIT":
      return "warning"
    default:
      return "muted"
  }
}