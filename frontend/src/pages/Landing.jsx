import StatusBadge from "@/components/layout/StatusBadge"

export default function Landing() {
  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-6 bg-background px-6 text-center text-foreground">
      <div
        className="size-28 rounded-full"
        style={{ background: "radial-gradient(circle at 30% 30%, #a5e887, #2f7d32)" }}
      />
      <div>
        <h1 className="text-4xl font-semibold tracking-tight">MintRT OS</h1>
        <p className="mt-2 text-muted-foreground">Real-Time System Dashboard</p>
      </div>
      <div className="flex flex-wrap justify-center gap-2">
        <StatusBadge tone="primary">EDF</StatusBadge>
        <StatusBadge tone="muted">Linux Mint</StatusBadge>
        <StatusBadge tone="muted">Real-Time</StatusBadge>
      </div>
      <a
        href="#/dashboard"
        className="inline-flex h-10 items-center rounded-md bg-primary px-6 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
      >
        Open Dashboard
      </a>
      <p className="max-w-md text-xs text-muted-foreground">
        Application-level EDF scheduler simulation and real-time process
        monitoring running on Linux Mint. The Linux kernel is not modified.
      </p>
    </div>
  )
}