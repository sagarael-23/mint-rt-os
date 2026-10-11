import { useSyncExternalStore } from "react"

// connected: null = belum diketahui, true = online, false = offline.
// error: pesan kesalahan terakhir (offline atau permintaan ditolak).
let state = { connected: null, error: null }
const listeners = new Set()

function set(next) {
  if (next.connected === state.connected && next.error === state.error) return
  state = next
  listeners.forEach((listener) => listener())
}

export function reportOk() {
  set({ connected: true, error: null })
}

export function reportFail(err) {
  const message = err?.message ?? "Kesalahan tidak dikenal"
  if (err?.offline) {
    set({ connected: false, error: message })
  } else {
    set({ connected: state.connected, error: message })
  }
}

function subscribe(listener) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

function getSnapshot() {
  return state
}

export function useBackendStatus() {
  return useSyncExternalStore(subscribe, getSnapshot)
}