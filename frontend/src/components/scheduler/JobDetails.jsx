import { X } from "lucide-react"

import Panel from "@/components/layout/Panel"
import StatusBadge from "@/components/layout/StatusBadge"
import { explainDeadline, slackLabel } from "@/lib/schedule"

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
      aria-label="Close job details"
      className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
    >
      <X className="size-4" />
    </button>
  )
}

export default function JobDetails({ pid, queue, timeline, cycleMs, onClose }) {
  const index = queue.findIndex((j) => j.pid === pid)

  if (index < 0) {
    return (
      <Panel title="Job details" action={<CloseButton onClose={onClose} />}>
        <p className="text-sm text-muted-foreground">
          Process <span className="font-mono">{pid}</span> tidak punya job pada
          siklus ini (tidak memakai CPU, atau sudah selesai).
        </p>
      </Panel>
    )
  }

  const job = queue[index]
  const slice = timeline.find((s) => s.pid === job.pid)
  const why = explainDeadline(job, queue.length, cycleMs)

  return (
    <Panel
      title={job.name}
      subtitle={`PID ${job.pid} · dispatch #${index + 1} of ${queue.length}`}
      action={<CloseButton onClose={onClose} />}
    >
      <div className="mb-4">
        <StatusBadge tone={job.missed ? "danger" : "success"}>
          {job.missed ? "MISSED" : "MET"}
        </StatusBadge>
      </div>

      <dl className="grid grid-cols-2 gap-x-4 gap-y-4 sm:grid-cols-5">
        <Field label="Execution">{job.execMs} ms</Field>
        <Field label="Started">{slice ? `${slice.startMs} ms` : "—"}</Field>
        <Field label="Finish">
          {job.finishMs == null ? "—" : `${job.finishMs} ms`}
        </Field>
        <Field label="Deadline">{job.deadlineMs} ms</Field>
        <Field label="Slack">{slackLabel(job)}</Field>
      </dl>

      <div className="mt-5 border-t border-border pt-4">
        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          Why this deadline?
        </p>
        <p className="mt-2 font-mono text-xs">
          deadline = exec × jobs = {job.execMs} × {why.jobs} = {why.raw} ms
        </p>
        {why.capped && (
          <p className="mt-1 font-mono text-xs">
            batas = maks(exec, siklus {cycleMs} ms) = {why.cap} ms, jadi deadline
            = {why.computed} ms
          </p>
        )}
        {!why.matches && (
          <p className="mt-2 text-xs text-warning">
            Hitungan ({why.computed} ms) berbeda dari nilai backend (
            {job.deadlineMs} ms). Periksa versi backend dan frontend.
          </p>
        )}
        <p className="mt-2 text-xs text-muted-foreground">
          EDF menjalankan job menurut deadline terdekat, jadi job ini
          mendapat urutan ke-{index + 1} dari {queue.length}. Ini deadline
          simulasi, bukan deadline Linux.
        </p>
      </div>
    </Panel>
  )
}