import AreaChart from "@/components/charts/AreaChart"
import Panel from "@/components/layout/Panel"
import { formatPercent } from "@/lib/format"
import { seriesStats } from "@/lib/series"

export default function MemoryChart({ samples }) {
  const values = samples.map((s) => s.mem)
  const st = seriesStats(values)

  return (
    <Panel
      title="Memory Usage"
      subtitle={`avg ${formatPercent(st.avg)} · max ${formatPercent(st.max)} · min ${formatPercent(st.min)}`}
    >
      <AreaChart
        values={values}
        labels={samples.map((s) => s.time)}
        gradientId="mon-mem"
        color="var(--chart-2)"
        startLabel={samples[0]?.time}
        endLabel={samples[samples.length - 1]?.time}
      />
    </Panel>
  )
}