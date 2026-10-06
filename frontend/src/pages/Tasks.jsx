import { useMemo, useState } from "react"

import MockNotice from "@/components/layout/MockNotice"
import Panel from "@/components/layout/Panel"
import ProcessDetails from "@/components/tasks/ProcessDetails"
import ProcessFilters from "@/components/tasks/ProcessFilters"
import ProcessTable from "@/components/tasks/ProcessTable"
import { useProcesses } from "@/hooks/useProcesses"
import {
  filterProcesses,
  paginate,
  sortProcesses,
  summarize,
} from "@/lib/process"
import { cn } from "@/lib/utils"

const PAGE_SIZE = 12
const DESC_FIRST = new Set(["cpu", "memoryKb", "threads"])

function SummaryChip({ label, value }) {
  return (
    <div className="rounded-lg border border-border bg-card px-3 py-1.5 text-xs">
      <span className="text-muted-foreground">{label}</span>
      <span className="ml-2 font-mono text-sm tabular-nums">{value}</span>
    </div>
  )
}

export default function Tasks() {
  const [live, setLive] = useState(false)
  const { data, isMock, refresh, updatedAt } = useProcesses({ autoRefresh: live })

  const [query, setQuery] = useState("")
  const [state, setState] = useState("ALL")
  const [rt, setRt] = useState("ALL")
  const [sort, setSort] = useState({ key: "cpu", dir: "desc" })
  const [page, setPage] = useState(1)
  const [selectedPid, setSelectedPid] = useState(null)

  const all = data.processes
  const summary = useMemo(() => summarize(all), [all])
  const filtered = useMemo(
    () => sortProcesses(filterProcesses(all, { query, state, rt }), sort.key, sort.dir),
    [all, query, state, rt, sort]
  )
  const pager = paginate(filtered.length, page, PAGE_SIZE)
  const rows = filtered.slice(pager.start, pager.end)
  const selected = all.find((p) => p.pid === selectedPid) ?? null

  function handleSort(key) {
    setSort((prev) =>
      prev.key === key
        ? { key, dir: prev.dir === "asc" ? "desc" : "asc" }
        : { key, dir: DESC_FIRST.has(key) ? "desc" : "asc" }
    )
    setPage(1)
  }

  function withPageReset(setter) {
    return (value) => {
      setter(value)
      setPage(1)
    }
  }

  return (
    <div className="space-y-4">
      {isMock && <MockNotice />}

      <div className="flex flex-wrap gap-2">
        <SummaryChip label="Total" value={summary.total} />
        <SummaryChip label="Running" value={summary.running} />
        <SummaryChip label="Sleeping" value={summary.sleeping} />
        <SummaryChip label="EDF simulation" value={summary.edf} />
      </div>

      <ProcessFilters
        query={query}
        onQuery={withPageReset(setQuery)}
        state={state}
        onState={withPageReset(setState)}
        rt={rt}
        onRt={withPageReset(setRt)}
        live={live}
        onLive={setLive}
        onRefresh={refresh}
        updatedAt={updatedAt}
      />

      <div
        className={cn(
          "grid gap-4",
          selectedPid != null && "lg:grid-cols-[minmax(0,1fr)_20rem]"
        )}
      >
        <Panel>
          <ProcessTable
            rows={rows}
            total={filtered.length}
            pager={pager}
            sort={sort}
            onSort={handleSort}
            selectedPid={selectedPid}
            onSelect={setSelectedPid}
            onPage={setPage}
          />
        </Panel>

        {selectedPid != null && (
          <ProcessDetails
            pid={selectedPid}
            process={selected}
            onClose={() => setSelectedPid(null)}
          />
        )}
      </div>
    </div>
  )
}