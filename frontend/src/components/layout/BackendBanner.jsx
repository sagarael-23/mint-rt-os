import { useBackendStatus } from "@/hooks/useBackendStatus"

export default function BackendBanner() {
  const { connected, error } = useBackendStatus()

  if (connected === false) {
    return (
      <div
        role="alert"
        className="mb-6 rounded-lg border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger"
      >
        <p className="font-medium">Backend tidak terjangkau</p>
        <p className="mt-1 text-xs">
          Jalankan di terminal:{" "}
          <code className="font-mono">
            cd ~/mint-rt-os/backend && ./mint-rt-backend --serve
          </code>
          . Halaman tersambung otomatis dalam beberapa detik.
        </p>
        {error && <p className="mt-1 font-mono text-xs opacity-80">{error}</p>}
      </div>
    )
  }

  if (error) {
    return (
      <div
        role="alert"
        className="mb-6 rounded-lg border border-warning/30 bg-warning/10 px-4 py-3 text-xs text-warning"
      >
        Permintaan ke backend gagal: <span className="font-mono">{error}</span>
      </div>
    )
  }

  return null
}