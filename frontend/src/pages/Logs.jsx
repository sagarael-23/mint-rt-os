import { useMemo, useState } from "react"

import LogFilter from "@/components/logs/LogFilter"
import LogTable from "@/components/logs/LogTable"
import MockNotice from "@/components/layout/MockNotice"
import Panel from "@/components/layout/Panel"
import { useLogs } from "@/hooks/useLogs"
import { countByLevel, filterLogs } from "@/lib/logs"

export default function Logs() {
  const [live, setLive] = useState(false)
  const { entries, isMock, refresh, clear, updatedAt } = useLogs({ autoRefresh: live })

  const [level, setLevel] = useState("ALL")
  const [category, setCategory] = useState("ALL")
  const [query, setQuery] = useState("")

  const counts = useMemo(() => countByLevel(entries), [entries])
  // Entri terbaru di atas.
  const rows = useMemo(
    () => filterLogs(entries, { level, category, query }).reverse(),
    [entries, level, category, query]
  )

  return (
    <div className="space-y-4">
      {isMock && <MockNotice />}

      <LogFilter
        level={level}
        onLevel={setLevel}
        counts={counts}
        category={category}
        onCategory={setCategory}
        query={query}
        onQuery={setQuery}
        live={live}
        onLive={setLive}
        onRefresh={refresh}
        onClear={clear}
        updatedAt={updatedAt}
        shown={rows.length}
        total={entries.length}
      />

      <Panel>
        <LogTable rows={rows} />
        <p className="mt-3 text-xs text-muted-foreground">
          Menampilkan maksimal 500 entri terakhir (sama dengan buffer backend).
          Clear view hanya membersihkan tampilan ini; log di backend tidak dihapus.
        </p>
      </Panel>
    </div>
  )
}