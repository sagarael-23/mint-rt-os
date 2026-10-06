import { cn } from "@/lib/utils"

const TONES = {
  success: "bg-success/15 text-success",
  warning: "bg-warning/15 text-warning",
  danger: "bg-danger/15 text-danger",
  primary: "bg-primary/15 text-primary",
  muted: "bg-muted text-muted-foreground",
}

export default function StatusBadge({ tone = "muted", children }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium",
        TONES[tone]
      )}
    >
      {children}
    </span>
  )
}