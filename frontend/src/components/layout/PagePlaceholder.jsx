import { Button } from "@/components/ui/button"

export default function PagePlaceholder({ name }) {
  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-border bg-card p-6">
        <p className="font-mono text-sm text-primary">{name}</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Isi halaman ini dibangun pada tahap berikutnya di Phase 9.
        </p>
      </div>

      <div className="rounded-xl border border-border bg-card p-6">
        <p className="mb-4 text-xs font-medium uppercase tracking-wider text-muted-foreground">
          Design check (sementara)
        </p>
        <div className="flex flex-wrap items-center gap-3">
          <Button>Primary</Button>
          <Button variant="secondary">Secondary</Button>
          <Button variant="outline">Outline</Button>
          <span className="rounded-md bg-success/15 px-2 py-0.5 text-xs font-medium text-success">
            MET
          </span>
          <span className="rounded-md bg-warning/15 px-2 py-0.5 text-xs font-medium text-warning">
            WARN
          </span>
          <span className="rounded-md bg-danger/15 px-2 py-0.5 text-xs font-medium text-danger">
            MISSED
          </span>
        </div>
        <p className="mt-4 font-mono text-sm tabular-nums">
          PID 1234 · 12.4% · 480 MB · RUNNING
        </p>
      </div>
    </div>
  )
}