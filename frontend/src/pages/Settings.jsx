import AppearanceSettings from "@/components/settings/AppearanceSettings"
import SchedulerSettings from "@/components/settings/SchedulerSettings"
import SystemSettings from "@/components/settings/SystemSettings"

export default function Settings() {
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <SchedulerSettings />
      <AppearanceSettings />
      <SystemSettings />
    </div>
  )
}