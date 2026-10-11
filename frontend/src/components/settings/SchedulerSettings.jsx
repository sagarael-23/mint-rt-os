import { useState } from "react"

import Panel from "@/components/layout/Panel"
import StatusBadge from "@/components/layout/StatusBadge"
import SettingRow from "@/components/settings/SettingRow"
import { Button } from "@/components/ui/button"
import { useBackendSettings } from "@/hooks/useBackendSettings"
import { validateCycleMs } from "@/lib/settings"
import { cn } from "@/lib/utils"

const FIELD =
  "h-9 w-28 rounded-md border border-input bg-card px-3 text-right font-mono text-sm outline-none transition-colors [color-scheme:dark] focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30"

export default function SchedulerSettings() {
  const { data, apply } = useBackendSettings()
  // null = belum diubah pengguna, jadi kolom mengikuti nilai dari backend.
  const [draft, setDraft] = useState(null)
  const [message, setMessage] = useState(null)
  const [busy, setBusy] = useState(false)
  const value = draft ?? String(data.cycleMs)

  async function handleSubmit(e) {
    e.preventDefault()
    const result = validateCycleMs(value, data.cycleMinMs, data.cycleMaxMs)
    if (!result.ok) {
      setMessage({ ok: false, text: result.error })
      return
    }

    setBusy(true)
    const response = await apply(result.value)
    setBusy(false)

    if (response.ok) {
      setDraft(null)
      setMessage({ ok: true, text: `Applied: cycle length = ${result.value} ms` })
    } else {
      setMessage({ ok: false, text: response.error })
    }
  }

  return (
    <Panel title="Scheduler" subtitle="Backend scheduler configuration">
      <div className="divide-y divide-border">
        <SettingRow
          label="Algorithm"
          description="Satu-satunya algoritma yang diimplementasikan: simulasi EDF tingkat aplikasi, bukan scheduler kernel."
        >
          <StatusBadge tone="primary">{data.algorithm}</StatusBadge>
        </SettingRow>

        <SettingRow
          label="Cycle length"
          description={`Panjang siklus sampling dan simulasi EDF (${data.cycleMinMs} sampai ${data.cycleMaxMs} ms). Mengubahnya mengubah laju pengambilan data dan batas deadline.`}
        >
          <div>
            <form onSubmit={handleSubmit} className="flex items-center gap-2">
              <input
                type="text"
                inputMode="numeric"
                value={value}
                onChange={(e) => {
                  setDraft(e.target.value)
                  setMessage(null)
                }}
                aria-label="Cycle length in milliseconds"
                className={FIELD}
              />
              <span className="text-sm text-muted-foreground">ms</span>
              <Button type="submit" size="sm" className="h-9" disabled={busy}>
                Apply
              </Button>
            </form>
            {message && (
              <p
                role="status"
                className={cn(
                  "mt-1.5 text-right text-xs",
                  message.ok ? "text-success" : "text-danger"
                )}
              >
                {message.text}
              </p>
            )}
          </div>
        </SettingRow>

        <SettingRow
          label="Simulated processor"
          description="Jumlah core pada prosesor simulasi EDF."
        >
          <span className="font-mono text-sm">{data.simulatedCores} core</span>
        </SettingRow>

        <SettingRow
          label="Scheduler status"
          description="Dikendalikan dari halaman Scheduler."
        >
          <StatusBadge tone={data.schedulerStatus === "RUNNING" ? "success" : "muted"}>
            {data.schedulerStatus}
          </StatusBadge>
        </SettingRow>

        <SettingRow
          label="History"
          description="Jumlah siklus yang disimpan untuk grafik Monitoring."
        >
          <span className="font-mono text-sm">{data.historyCapacity} samples</span>
        </SettingRow>
      </div>

      <p className="mt-3 text-xs text-muted-foreground">
        Nilai dikirim ke backend (POST /api/settings) dan langsung berlaku.
        Tidak disimpan ke disk: kembali ke 1000 ms saat backend dimulai ulang.
      </p>
    </Panel>
  )
}