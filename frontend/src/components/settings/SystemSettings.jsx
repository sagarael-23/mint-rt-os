import Panel from "@/components/layout/Panel"
import SegmentedControl from "@/components/layout/SegmentedControl"
import SettingRow from "@/components/settings/SettingRow"
import { Button } from "@/components/ui/button"
import { resetSettings, updateSettings, useSettings } from "@/hooks/useSettings"
import { REFRESH_OPTIONS } from "@/lib/settings"

const REFRESH = REFRESH_OPTIONS.map((ms) => ({ value: ms, label: `${ms / 1000} s` }))
const ON_OFF = [
  { value: true, label: "On" },
  { value: false, label: "Off" },
]

export default function SystemSettings() {
  const { refreshMs, liveDefault, notifications } = useSettings()

  return (
    <Panel title="System" subtitle="Disimpan di browser ini">
      <div className="divide-y divide-border">
        <SettingRow
          label="Live refresh interval"
          description="Seberapa sering data diperbarui saat mode Live aktif, dan seberapa sering log baru dicek."
        >
          <SegmentedControl
            label="Live refresh interval"
            options={REFRESH}
            value={refreshMs}
            onChange={(ms) => updateSettings({ refreshMs: ms })}
          />
        </SettingRow>

        <SettingRow
          label="Start pages in Live mode"
          description="Jika On, tombol Live langsung menyala saat Dashboard, Tasks, Scheduler, Monitoring, dan Logs dibuka."
        >
          <SegmentedControl
            label="Start pages in Live mode"
            options={ON_OFF}
            value={liveDefault}
            onChange={(value) => updateSettings({ liveDefault: value })}
          />
        </SettingRow>

        <SettingRow
          label="Notifications"
          description="Kotak peringatan di pojok layar saat backend mencatat peristiwa WARN atau ERROR (deadline terlewat, CPU atau memori tinggi, process zombie, kesalahan). Peristiwa INFO tidak diberi notifikasi."
        >
          <SegmentedControl
            label="Notifications"
            options={ON_OFF}
            value={notifications}
            onChange={(value) => updateSettings({ notifications: value })}
          />
        </SettingRow>

        <SettingRow
          label="Reset"
          description="Kembalikan tema, interval, mode Live, dan notifikasi ke nilai bawaan."
        >
          <Button variant="outline" size="sm" onClick={() => resetSettings()}>
            Reset to defaults
          </Button>
        </SettingRow>
      </div>
    </Panel>
  )
}