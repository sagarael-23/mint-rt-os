import { useSyncExternalStore } from "react"

import { DEFAULT_SETTINGS, parseSettings, sanitize } from "@/lib/settings"

const STORAGE_KEY = "mintrt.settings"
const listeners = new Set()

function load() {
  try {
    return parseSettings(window.localStorage.getItem(STORAGE_KEY))
  } catch {
    return { ...DEFAULT_SETTINGS }
  }
}

let current = load()

export function applyTheme(theme) {
  const root = document.documentElement
  root.classList.toggle("dark", theme === "dark")
  root.classList.toggle("light", theme === "light")
}

// Dipanggil sekali di main.jsx sebelum render pertama.
export function initTheme() {
  applyTheme(current.theme)
}

export function updateSettings(patch) {
  current = sanitize({ ...current, ...patch })
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(current))
  } catch {
    // Penyimpanan browser tidak tersedia: pengaturan berlaku sampai halaman dimuat ulang.
  }
  applyTheme(current.theme)
  listeners.forEach((listener) => listener())
}

export function resetSettings() {
  updateSettings(DEFAULT_SETTINGS)
}

function subscribe(listener) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

function getSnapshot() {
  return current
}

export function useSettings() {
  return useSyncExternalStore(subscribe, getSnapshot)
}