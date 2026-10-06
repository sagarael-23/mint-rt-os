import { cn } from "@/lib/utils"

const TONES = {
  primary: { value: "text-foreground", icon: "bg-primary/15 text-primary" },
  success: { value: "text-success", icon: "bg-success/15 text-success" },
  danger: { value: "text-danger", icon: "bg-danger/15 text-danger" },
  default: { value: "text-foreground", icon: "bg-secondary text-muted-foreground" },
}

export default function StatCard({ label, value, hint, icon: Icon, tone = "default" }) {
  const t = TONES[tone]
  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <div className="flex items-start justify-between">
        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          {label}
        </p>
        <span
          className={cn("flex size-8 items-center justify-center rounded-lg", t.icon)}
        >
          <Icon className="size-4" />
        </span>
      </div>
      <p className={cn("mt-3 font-mono text-3xl font-semibold tabular-nums", t.value)}>
        {value}
      </p>
      {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
    </div>
  )
}