import Panel from "@/components/layout/Panel"
import SegmentedControl from "@/components/layout/SegmentedControl"
import StatusBadge from "@/components/layout/StatusBadge"
import SettingRow from "@/components/settings/SettingRow"
import { Button } from "@/components/ui/button"
import { resetSettings, updateSettings, useSettings } from "@/hooks/useSettings"
import { REFRESH_OPTIONS } from "@/lib/settings"

const OPTIONS = REFRESH_OPTIONS.map((ms) => ({ value: ms, label: `${ms / 1000} s` }))

export default function SystemSettings() {
  const { refreshMs } = useSettings()

  return (
    <Panel title="System" subtitle="Disimpan di browser ini">
      <div className="divide-y divide-border">
        <SettingRow
          label="Live refresh interval"
          description="Seberapa sering data diperbarui saat tombol Live aktif di Tasks, Scheduler, Monitoring, dan Logs."
        >
          <SegmentedControl
            label="Live refresh interval"
            options={OPTIONS}
            value={refreshMs}
            onChange={(ms) => updateSettings({ refreshMs: ms })}
          />
        </SettingRow>

        <SettingRow
          label="Notifications"
          description="Belum tersedia. Butuh pembaruan data global yang dibuat di Phase 11."
        >
          <StatusBadge tone="muted">Planned</StatusBadge>
        </SettingRow>

        <SettingRow label="Reset" description="Kembalikan tema dan interval ke nilai bawaan.">
          <Button variant="outline" size="sm" onClick={() => resetSettings()}>
            Reset to defaults
          </Button>
        </SettingRow>
      </div>
    </Panel>
  )
}