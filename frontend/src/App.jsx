import BackendBanner from "@/components/layout/BackendBanner"
import Sidebar from "@/components/layout/Sidebar"
import ToastHost from "@/components/layout/ToastHost"
import Topbar from "@/components/layout/Topbar"
import { useEventWatcher } from "@/hooks/useEventWatcher"
import { useHashRoute } from "@/hooks/useHashRoute"
import { NAV_ITEMS } from "@/lib/nav"
import Dashboard from "@/pages/Dashboard"
import Help from "@/pages/Help"
import Landing from "@/pages/Landing"
import Logs from "@/pages/Logs"
import Monitoring from "@/pages/Monitoring"
import Scheduler from "@/pages/Scheduler"
import Settings from "@/pages/Settings"
import Tasks from "@/pages/Tasks"

const PAGES = {
  dashboard: Dashboard,
  tasks: Tasks,
  scheduler: Scheduler,
  monitoring: Monitoring,
  logs: Logs,
  settings: Settings,
  help: Help,
}

export default function App() {
  const route = useHashRoute()
  useEventWatcher() // pengawas log global: Recent Activity dan notifikasi

  // Layar pembuka tanpa sidebar dan topbar.
  if (route === "landing") {
    return (
      <>
        <Landing />
        <ToastHost />
      </>
    )
  }

  // Hash yang tidak dikenal jatuh ke Dashboard.
  const active = NAV_ITEMS.find((item) => item.id === route) ?? NAV_ITEMS[0]
  const Page = PAGES[active.id]

  return (
    <div className="flex h-svh bg-background text-foreground">
      <Sidebar route={active.id} />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar title={active.title} subtitle={active.subtitle} />
        <main className="flex-1 overflow-y-auto p-8">
          <BackendBanner />
          <Page />
        </main>
      </div>
      <ToastHost />
    </div>
  )
}