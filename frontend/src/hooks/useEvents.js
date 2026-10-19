import { useSyncExternalStore } from "react"

import { mergeLogs } from "@/lib/logs"

const MAX_EVENTS = 50
let entries = []
const listeners = new Set()

function emit() {
  listeners.forEach((listener) => listener())
}

// Ganti seluruh isi (titik awal baru, mis. saat aplikasi dibuka atau backend dimulai ulang).
export function replaceEvents(list) {
  entries = list.slice(-MAX_EVENTS)
  emit()
}

// Tambah entri baru di ujung (seq lebih besar dari yang sudah ada).
export function addEvents(list) {
  entries = mergeLogs(entries, list, MAX_EVENTS)
  emit()
}

function subscribe(listener) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

function getSnapshot() {
  return entries
}

// Urutan naik menurut seq (yang terbaru di ujung).
export function useRecentEvents() {
  return useSyncExternalStore(subscribe, getSnapshot)
}