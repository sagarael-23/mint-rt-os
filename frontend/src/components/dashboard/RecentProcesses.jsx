import Panel from "@/components/layout/Panel"
import StatusBadge from "@/components/layout/StatusBadge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { formatMb, formatPercent, stateTone } from "@/lib/format"

const HEAD = "text-xs uppercase tracking-wider text-muted-foreground"

export default function RecentProcesses({ processes, limit = 6 }) {
  const top = [...processes]
    .sort((a, b) => b.cpu - a.cpu || b.memoryKb - a.memoryKb)
    .slice(0, limit)

  return (
    <Panel title="Recent Processes" subtitle="Highest CPU usage right now">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className={HEAD}>PID</TableHead>
            <TableHead className={HEAD}>Process</TableHead>
            <TableHead className={HEAD}>CPU</TableHead>
            <TableHead className={HEAD}>Memory</TableHead>
            <TableHead className={HEAD}>State</TableHead>
            <TableHead className={HEAD}>RT</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {top.map((p) => (
            <TableRow key={p.pid}>
              <TableCell className="font-mono">{p.pid}</TableCell>
              <TableCell className="font-medium">{p.name}</TableCell>
              <TableCell className="font-mono tabular-nums">
                {formatPercent(p.cpu)}
              </TableCell>
              <TableCell className="font-mono tabular-nums">
                {formatMb(p.memoryKb)}
              </TableCell>
              <TableCell>
                <StatusBadge tone={stateTone(p.stateName)}>{p.stateName}</StatusBadge>
              </TableCell>
              <TableCell>
                <StatusBadge tone={p.rtStatus === "NORMAL" ? "muted" : "primary"}>
                  {p.rtStatus === "NORMAL" ? "NORMAL" : "EDF SIM"}
                </StatusBadge>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Panel>
  )
}