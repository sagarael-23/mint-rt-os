import { cn } from "@/lib/utils"

export default function LiveToggle({ live, onChange }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!live)}
      aria-pressed={live}
      className={cn(
        "inline-flex h-9 items-center gap-2 rounded-md border px-3 text-sm font-medium transition-colors",
        live
          ? "border-success/40 bg-success/10 text-success"
          : "border-input bg-card text-muted-foreground hover:text-foreground"
      )}
    >
      <span
        className={cn(
          "size-2 rounded-full",
          live ? "animate-pulse bg-success" : "bg-muted-foreground"
        )}
      />
      Live
    </button>
  )
}