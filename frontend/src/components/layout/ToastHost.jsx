import { X } from "lucide-react"

import { dismissToast, useToasts } from "@/hooks/useToasts"
import { cn } from "@/lib/utils"

export default function ToastHost() {
  const toasts = useToasts()
  if (toasts.length === 0) return null

  return (
    <div className="pointer-events-none fixed bottom-6 right-6 z-50 flex w-80 flex-col gap-2">
      {toasts.map((t) => {
        const error = t.level === "ERROR"
        return (
          <div
            key={t.id}
            role="status"
            className={cn(
              "pointer-events-auto rounded-lg border bg-popover p-3 shadow-lg",
              error ? "border-danger/50" : "border-warning/50"
            )}
          >
            <div className="flex items-start justify-between gap-2">
              <p
                className={cn(
                  "text-xs font-semibold",
                  error ? "text-danger" : "text-warning"
                )}
              >
                {t.title}
              </p>
              <button
                type="button"
                onClick={() => dismissToast(t.id)}
                aria-label="Dismiss notification"
                className="text-muted-foreground transition-colors hover:text-foreground"
              >
                <X className="size-3.5" />
              </button>
            </div>
            <p className="mt-1 font-mono text-xs [overflow-wrap:anywhere]">
              {t.message}
            </p>
          </div>
        )
      })}
    </div>
  )
}