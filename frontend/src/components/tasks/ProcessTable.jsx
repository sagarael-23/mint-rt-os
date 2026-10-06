import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
} from "lucide-react"

import StatusBadge from "@/components/layout/StatusBadge"
import { Button } from "@/components/ui/button"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { formatMb, formatPercent, stateTone } from "@/lib/format"
import { cn } from "@/lib/utils"

const COLUMNS = [
  { key: "pid", label: "PID" },
  { key: "name", label: "Process" },
  { key: "cpu", label: "CPU", right: true },
  { key: "memoryKb", label: "Memory", right: true },
  { key: "threads", label: "Threads", right: true },
  { key: "priority", label: "Priority", right: true },
  { key: "stateName", label: "State" },
  { key: "rtStatus", label: "RT" },
]

function SortHeader({ column, sort, onSort }) {
  const active = sort.key === column.key
  const Icon = !active ? ArrowUpDown : sort.dir === "asc" ? ArrowUp : ArrowDown
  return (
    <div className={cn("flex", column.right && "justify-end")}>
      <button
        type="button"
        onClick={() => onSort(column.key)}
        className={cn(
          "inline-flex items-center gap-1 text-xs font-medium uppercase tracking-wider transition-colors hover:text-foreground",
          active ? "text-primary" : "text-muted-foreground"
        )}
      >
        {column.label}
        <Icon className="size-3" />
      </button>
    </div>
  )
}

export default function ProcessTable({
  rows,
  total,
  pager,
  sort,
  onSort,
  selectedPid,
  onSelect,
  onPage,
}) {
  return (
    <div>
      <Table>
        <TableHeader>
          <TableRow>
            {COLUMNS.map((col) => (
              <TableHead key={col.key} className={cn(col.right && "text-right")}>
                <SortHeader column={col} sort={sort} onSort={onSort} />
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.length === 0 ? (
            <TableRow>
              <TableCell
                colSpan={COLUMNS.length}
                className="py-10 text-center text-sm text-muted-foreground"
              >
                No processes match your filters.
              </TableCell>
            </TableRow>
          ) : (
            rows.map((p) => (
              <TableRow
                key={p.pid}
                onClick={() => onSelect(p.pid)}
                className={cn(
                  "cursor-pointer",
                  p.pid === selectedPid && "bg-primary/10 hover:bg-primary/10"
                )}
              >
                <TableCell className="font-mono">{p.pid}</TableCell>
                <TableCell className="max-w-48 truncate font-medium">{p.name}</TableCell>
                <TableCell className="text-right font-mono tabular-nums">
                  {formatPercent(p.cpu)}
                </TableCell>
                <TableCell className="text-right font-mono tabular-nums">
                  {formatMb(p.memoryKb)}
                </TableCell>
                <TableCell className="text-right font-mono tabular-nums">
                  {p.threads}
                </TableCell>
                <TableCell className="text-right font-mono tabular-nums">
                  {p.priority}
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
            ))
          )}
        </TableBody>
      </Table>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-xs text-muted-foreground">
        <span className="font-mono">
          {total === 0
            ? "No results"
            : `Showing ${pager.start + 1}–${pager.end} of ${total}`}
        </span>
        <div className="flex items-center gap-2">
          <span className="font-mono">
            Page {pager.page} of {pager.pages}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={pager.page <= 1}
            onClick={() => onPage(pager.page - 1)}
          >
            <ChevronLeft className="size-4" />
            Prev
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={pager.page >= pager.pages}
            onClick={() => onPage(pager.page + 1)}
          >
            Next
            <ChevronRight className="size-4" />
          </Button>
        </div>
      </div>
    </div>
  )
}