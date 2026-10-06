import { cn } from "@/lib/utils"

export default function Panel({ title, subtitle, action, className, children }) {
  return (
    <section
      className={cn("rounded-xl border border-border bg-card p-5", className)}
    >
      {(title || action) && (
        <div className="mb-4 flex items-start justify-between gap-4">
          <div>
            <h2 className="text-sm font-semibold">{title}</h2>
            {subtitle && (
              <p className="text-xs text-muted-foreground">{subtitle}</p>
            )}
          </div>
          {action}
        </div>
      )}
      {children}
    </section>
  )
}