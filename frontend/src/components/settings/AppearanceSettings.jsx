import Panel from "@/components/layout/Panel"
import SegmentedControl from "@/components/layout/SegmentedControl"
import SettingRow from "@/components/settings/SettingRow"
import { updateSettings, useSettings } from "@/hooks/useSettings"

const OPTIONS = [
  { value: "dark", label: "Dark" },
  { value: "light", label: "Light" },
]

export default function AppearanceSettings() {
  const { theme } = useSettings()

  return (
    <Panel title="Appearance" subtitle="Disimpan di browser ini">
      <div className="divide-y divide-border">
        <SettingRow
          label="Theme"
          description="Dark adalah tampilan utama sesuai desain. Light dibuat sederhana dari token warna yang sama."
        >
          <SegmentedControl
            label="Theme"
            options={OPTIONS}
            value={theme}
            onChange={(value) => updateSettings({ theme: value })}
          />
        </SettingRow>
      </div>
    </Panel>
  )
}