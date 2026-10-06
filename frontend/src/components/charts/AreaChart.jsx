const W = 600
const H = 200

export default function AreaChart({
  values,
  gradientId,
  max = 100,
  ticks = [0, 25, 50, 75, 100],
  unit = "%",
  startLabel,
  endLabel,
  height = 200,
}) {
  const n = values.length
  const x = (i) => (n <= 1 ? 0 : (i / (n - 1)) * W)
  const y = (v) => H - (Math.min(Math.max(v, 0), max) / max) * H

  const line = values
    .map((v, i) => `${i === 0 ? "M" : "L"}${x(i).toFixed(1)},${y(v).toFixed(1)}`)
    .join(" ")
  const area = n > 0 ? `${line} L${W},${H} L0,${H} Z` : ""

  return (
    <div>
      <div className="flex gap-3">
        <div
          className="flex flex-col justify-between text-right font-mono text-[10px] leading-none text-muted-foreground"
          style={{ height }}
        >
          {[...ticks].reverse().map((t) => (
            <span key={t}>
              {t}
              {unit}
            </span>
          ))}
        </div>

        <svg
          viewBox={`0 0 ${W} ${H}`}
          preserveAspectRatio="none"
          className="w-full"
          style={{ height }}
        >
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--chart-1)" stopOpacity="0.35" />
              <stop offset="100%" stopColor="var(--chart-1)" stopOpacity="0" />
            </linearGradient>
          </defs>

          {ticks.map((t) => (
            <line
              key={t}
              x1="0"
              x2={W}
              y1={y(t)}
              y2={y(t)}
              stroke="var(--border)"
              strokeDasharray="4 4"
              vectorEffect="non-scaling-stroke"
            />
          ))}

          <path d={area} fill={`url(#${gradientId})`} />
          <path
            d={line}
            fill="none"
            stroke="var(--chart-1)"
            strokeWidth="2"
            strokeLinejoin="round"
            vectorEffect="non-scaling-stroke"
          />
        </svg>
      </div>

      <div className="mt-2 flex justify-between pl-10 font-mono text-[10px] text-muted-foreground">
        <span>{startLabel}</span>
        <span>{endLabel}</span>
      </div>
    </div>
  )
}