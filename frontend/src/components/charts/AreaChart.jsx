import { useState } from "react"

const W = 600
const H = 200

export default function AreaChart({
  values,
  labels,
  gradientId,
  color = "var(--chart-1)",
  max = 100,
  ticks = [0, 25, 50, 75, 100],
  unit = "%",
  startLabel,
  endLabel,
  height = 200,
}) {
  const [hover, setHover] = useState(null)

  const n = values.length
  const x = (i) => (n <= 1 ? 0 : (i / (n - 1)) * W)
  const y = (v) => H - (Math.min(Math.max(v, 0), max) / max) * H

  const line = values
    .map((v, i) => `${i === 0 ? "M" : "L"}${x(i).toFixed(1)},${y(v).toFixed(1)}`)
    .join(" ")
  const area = n > 0 ? `${line} L${W},${H} L0,${H} Z` : ""

  // Indeks sorotan dijaga agar tetap valid saat data bergeser (mode Live).
  const hi = hover != null && hover < n ? hover : null
  const hoverLeft = hi == null || n <= 1 ? 0 : (hi / (n - 1)) * 100
  const tipLeft = Math.min(Math.max(hoverLeft, 14), 86)

  function handleMove(e) {
    if (n === 0) return
    const rect = e.currentTarget.getBoundingClientRect()
    const ratio = (e.clientX - rect.left) / rect.width
    setHover(Math.min(n - 1, Math.max(0, Math.round(ratio * (n - 1)))))
  }

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

        <div
          className="relative w-full"
          style={{ height }}
          onMouseMove={handleMove}
          onMouseLeave={() => setHover(null)}
        >
          <svg
            viewBox={`0 0 ${W} ${H}`}
            preserveAspectRatio="none"
            className="h-full w-full"
          >
            <defs>
              <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={color} stopOpacity="0.35" />
                <stop offset="100%" stopColor={color} stopOpacity="0" />
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
              stroke={color}
              strokeWidth="2"
              strokeLinejoin="round"
              vectorEffect="non-scaling-stroke"
            />
          </svg>

          {hi != null && (
            <>
              <div
                className="pointer-events-none absolute inset-y-0 w-px bg-foreground/30"
                style={{ left: `${hoverLeft}%` }}
              />
              <div
                className="pointer-events-none absolute size-2 -translate-x-1/2 -translate-y-1/2 rounded-full"
                style={{
                  left: `${hoverLeft}%`,
                  top: `${(y(values[hi]) / H) * 100}%`,
                  background: color,
                }}
              />
              <div
                className="pointer-events-none absolute top-0 z-10 -translate-x-1/2 whitespace-nowrap rounded-md border border-border bg-popover px-2 py-1 font-mono text-[10px] shadow"
                style={{ left: `${tipLeft}%` }}
              >
                {labels ? `${labels[hi]} · ` : ""}
                {values[hi].toFixed(1)}
                {unit}
              </div>
            </>
          )}
        </div>
      </div>

      <div className="mt-2 flex justify-between pl-10 font-mono text-[10px] text-muted-foreground">
        <span>{startLabel}</span>
        <span>{endLabel}</span>
      </div>
    </div>
  )
}