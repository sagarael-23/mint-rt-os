import { useSyncExternalStore } from "react"

const TOAST_MS = 7000
const MAX_VISIBLE = 4

let toasts = []
const listeners = new Set()

function emit() {
  listeners.forEach((listener) => listener())
}

export function dismissToast(id) {
  const next = toasts.filter((t) => t.id !== id)
  if (next.length === toasts.length) return
  toasts = next
  emit()
}

// toast: { id, level, title, message }. id yang sama tidak ditampilkan dua kali.
export function pushToast(toast) {
  if (toasts.some((t) => t.id === toast.id)) return
  toasts = [...toasts, toast].slice(-MAX_VISIBLE)
  emit()
  setTimeout(() => dismissToast(toast.id), TOAST_MS)
}

function subscribe(listener) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

function getSnapshot() {
  return toasts
}

export function useToasts() {
  return useSyncExternalStore(subscribe, getSnapshot)
}