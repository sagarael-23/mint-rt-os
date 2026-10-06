import AreaChart from "@/components/charts/AreaChart"
import Panel from "@/components/layout/Panel"

export default function CpuChart({ samples, className }) {
  const values = samples.map((s) => s.cpu)
  return (
    <Panel
      title="CPU Usage"
      subtitle={`Last ${samples.length} seconds`}
      className={className}
    >
      <AreaChart
        values={values}
        gradientId="cpu-area"
        startLabel={samples[0]?.time}
        endLabel={samples[samples.length - 1]?.time}
      />
    </Panel>
  )
}