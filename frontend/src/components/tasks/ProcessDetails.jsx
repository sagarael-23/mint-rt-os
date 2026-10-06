import { X } from "lucide-react"

import Panel from "@/components/layout/Panel"
import StatusBadge from "@/components/layout/StatusBadge"
import { formatMb, formatPercent, formatSeconds, stateTone } from "@/lib/format"

function Field({ label, children }) {
  return (
    <div>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="mt-0.5 font-mono text-sm tabular-nums">{children}</dd>
    </div>
  )
}

function CloseButton({ onClose }) {
  return (
    <button
      type="button"
      onClick={onClose}
      aria-label="Close details"
      className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
    >
      <X className="size-4" />
    </button>
  )
}

export default function ProcessDetails({ pid, process, onClose }) {
  if (!process) {
    return (
      <Panel title="Process details" action={<CloseButton onClose={onClose} />}>
        <p className="text-sm text-muted-foreground">
          Process <span className="font-mono">{pid}</span> no longer exists. It
          may have exited.
        </p>
      </Panel>
    )
  }

  const edf = process.rtStatus !== "NORMAL"

  return (
    <Panel
      title={process.name}
      subtitle={`PID ${process.pid}`}
      action={<CloseButton onClose={onClose} />}
    >
      <div className="mb-4 flex flex-wrap gap-2">
        <StatusBadge tone={stateTone(process.stateName)}>{process.stateName}</StatusBadge>
        <StatusBadge tone={edf ? "primary" : "muted"}>{process.rtStatus}</StatusBadge>
      </div>

      <dl className="grid grid-cols-2 gap-x-4 gap-y-4">
        <Field label="PID">{process.pid}</Field>
        <Field label="Parent PID">{process.ppid}</Field>
        <Field label="CPU">{formatPercent(process.cpu)}</Field>
        <Field label="Memory (RSS)">{formatMb(process.memoryKb)}</Field>
        <Field label="Threads">{process.threads}</Field>
        <Field label="Kernel priority">{process.priority}</Field>
        <Field label="CPU time">{formatSeconds(process.cpuTimeSec)}</Field>
        <Field label="State code">{process.state}</Field>
      </dl>

      <div className="mt-5 border-t border-border pt-4">
        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          Scheduling
        </p>
        {edf ? (
          <>
            <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-4">
              <Field label="Simulated execution">{process.rtExecMs} ms</Field>
              <Field label="Simulated deadline">{process.rtDeadlineMs} ms</Field>
            </dl>
            <p className="mt-3 text-xs text-muted-foreground">
              Nilai simulasi dari CPU time nyata proses pada siklus terakhir.
              Bukan deadline Linux, dan proses aslinya tidak diubah.
            </p>
          </>
        ) : (
          <p className="mt-2 text-xs text-muted-foreground">
            Dijadwalkan oleh kernel Linux seperti biasa. Proses ini tidak
            memakai CPU pada siklus simulasi EDF terakhir, jadi tidak punya job
            simulasi.
          </p>
        )}
      </div>
    </Panel>
  )
}