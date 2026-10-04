import type { ReactNode } from "react"

type Props = { label: ReactNode; pct: number | null; foot: ReactNode; empty?: ReactNode }

/** Whether a bar is full enough to be worth a look: orange from 75%, red from 90%. */
export function level(pct: number | null): "high" | "critical" | undefined {
  if (pct === null) return undefined
  return pct >= 90 ? "critical" : pct >= 75 ? "high" : undefined
}

/**
 * One metric: name and percentage on top, bar in the middle, raw numbers
 * underneath. One tint, since the length of the bar carries the message; it
 * changes only once the bar nears full.
 */
export function Meter({ label, pct, foot, empty = "—" }: Props) {
  // null means the metric has no ceiling to fill, so the bar stays empty rather
  // than reporting 0%. What replaces the percentage depends on the reason:
  // unknown for a node with no metrics, ∞ for a plan with no limit.
  const filled = pct === null ? 0 : Math.min(100, Math.max(0, pct))
  return (
    <div className="min-w-0">
      <div className="flex items-baseline justify-between gap-2">
        <span className="truncate text-xs text-muted-foreground">{label}</span>
        <span className="tnum text-xs font-medium">
          {pct === null ? empty : `${filled < 10 ? filled.toFixed(1) : filled.toFixed(0)}%`}
        </span>
      </div>
      <div className="meter-track mt-2 h-1.5 w-full overflow-hidden rounded-full bg-muted">
        <div className="meter-fill h-full rounded-full transition-[width] duration-500" data-level={level(pct)} style={{ width: `${filled}%` }} />
      </div>
      <div className="tnum mt-1.5 truncate text-xs text-muted-foreground">{foot}</div>
    </div>
  )
}
