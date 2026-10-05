import {
  Activity,
  CalendarClock,
  CircleHelp,
  LayoutDashboard,
  ListChecks,
  ScrollText,
  Settings,
} from "lucide-react"

export const NAV_ITEMS = [
  {
    id: "dashboard",
    label: "Dashboard",
    icon: LayoutDashboard,
    title: "Dashboard",
    subtitle: "Real-time system overview",
  },
  {
    id: "tasks",
    label: "Tasks",
    icon: ListChecks,
    title: "Tasks",
    subtitle: "Running Linux processes",
  },
  {
    id: "scheduler",
    label: "Scheduler",
    icon: CalendarClock,
    title: "Scheduler",
    subtitle: "Real-time task scheduling",
  },
  {
    id: "monitoring",
    label: "Monitoring",
    icon: Activity,
    title: "Monitoring",
    subtitle: "System resource monitoring",
  },
  {
    id: "logs",
    label: "Logs",
    icon: ScrollText,
    title: "System Logs",
    subtitle: "System and backend events",
  },
  {
    id: "settings",
    label: "Settings",
    icon: Settings,
    title: "Settings",
    subtitle: "Configure scheduler and system",
  },
  {
    id: "help",
    label: "Help",
    icon: CircleHelp,
    title: "Help",
    subtitle: "Guide to MINT RT OS",
  },
]