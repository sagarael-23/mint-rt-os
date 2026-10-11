import AreaChart from "@/components/charts/AreaChart"
import Panel from "@/components/layout/Panel"
import { formatPercent } from "@/lib/format"
import { seriesStats } from "@/lib/series"

export default function CpuChart({ samples }) {
  const values = samples.map((s) => s.cpu)
  const st = seriesStats(values)

  return (
    <Panel
      title="CPU Usage"
      subtitle={`avg ${formatPercent(st.avg)} · max ${formatPercent(st.max)} · min ${formatPercent(st.min)}`}
    >
      <AreaChart
        values={values}
        labels={samples.map((s) => s.time)}
        gradientId="mon-cpu"
        color="var(--chart-1)"
        startLabel={samples[0]?.time}
        endLabel={samples[samples.length - 1]?.time}
      />
    </Panel>
  )
}