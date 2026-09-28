import { useEffect, useState } from "react"
import { ArrowDown, ArrowDownUp, ArrowUp, Gauge, Server, Wallet } from "lucide-react"

import { Card } from "@/components/ui/card"
import { speedHistory, type Node } from "@/lib/api"
import type { CostMode } from "@/lib/config"
import { costByCurrency, costForMode, costMoney, getExchangeRates, monthlyTotalCny, type ExchangeRates } from "@/lib/cost"
import { bytes, rate } from "@/lib/format"
import { cn } from "@/lib/utils"

function Tile({ icon: Icon, label, children }: {
  icon: typeof Server; label: string; children: React.ReactNode
}) {
  return (
    <Card className="summary-tile gap-0 p-5 sm:p-6">
      <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
        <Icon className="size-4" />
        {label}
      </div>
      {children}
    </Card>
  )
}

/**
 * In and out side by side, the form every traffic figure on this page takes.
 * Stacked below sm, where two tiles share a phone's width and "23.3 MB" has
 * roughly 70px available.
 */
function Flow({ down, up, className }: { down: string; up: string; className?: string }) {
  return (
    <div className={cn("tnum grid grid-cols-1 gap-x-2 sm:grid-cols-2", className)}>
      <span className="inline-flex items-center gap-1">
        <ArrowDown className="size-3 shrink-0 text-muted-foreground" />
        {down}
      </span>
      <span className="inline-flex items-center gap-1">
        <ArrowUp className="size-3 shrink-0 text-muted-foreground" />
        {up}
      </span>
    </div>
  )
}

/**
 * A bare polyline with no axes or tooltips: at this size only the shape is
 * legible, and recharts would bring a full chart's machinery for it. Series share
 * one scale so the two throughput lines remain comparable.
 */
function Spark({ series }: { series: { values: number[]; className: string }[] }) {
  const top = Math.max(...series.flatMap((s) => s.values), 1)
  const width = Math.max(...series.map((s) => s.values.length), 2) - 1
  return (
    <svg viewBox="0 0 100 24" preserveAspectRatio="none" className="h-5 w-full" aria-hidden>
      {series.map((s, i) => (
        <polyline
          key={i}
          className={s.className}
          fill="none"
          stroke="currentColor"
          strokeWidth={1.25}
          vectorEffect="non-scaling-stroke"
          points={s.values.map((v, x) => `${(x / width) * 100},${23 - (v / top) * 22}`).join(" ")}
        />
      ))}
    </svg>
  )
}

/** `group` picks the throughput series: null for every node, else the tab's group. */
export function Summary({ nodes, group, costMode }: { nodes: Node[]; group: string | null; costMode: CostMode }) {
  const online = nodes.filter((n) => n.online)
  const sum = (pick: (n: Node) => number) => nodes.reduce((total, n) => total + pick(n), 0)

  // The same push produced `nodes` and this sample, so the figure above the line
  // is that line's last point.
  const history = speedHistory.get(group) ?? []
  const now = history.at(-1) ?? { rx: 0, tx: 0 }
  const costs = costByCurrency(nodes)
  const needsRates = costs.some(({ currency }) => currency !== "CNY")
  const [rateData, setRateData] = useState<ExchangeRates | null>(null)
  const [rateError, setRateError] = useState(false)
  useEffect(() => {
    if (!needsRates) return
    const controller = new AbortController()
    void getExchangeRates(controller.signal)
      .then((rates) => { setRateData(rates); setRateError(false) })
      .catch(() => { if (!controller.signal.aborted) setRateError(true) })
    return () => controller.abort()
  }, [needsRates])
  const monthlyCost = monthlyTotalCny(costs, rateData?.rates ?? { CNY: 1 })
  const costLabel = costMode === "daily" ? "日均费用" : costMode === "total" ? "年化总费用" : "月均费用"

  return (
    <div className="summary-grid grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
      <Tile icon={Server} label="节点">
        <div className="tnum mt-5 text-3xl font-semibold tracking-tight sm:text-4xl">
          {online.length} / {nodes.length}
        </div>
        <div className="mt-auto pt-2 text-xs text-muted-foreground">
          {nodes.length - online.length > 0 ? `${nodes.length - online.length} 个离线` : "全部在线"}
        </div>
      </Tile>

      <Tile icon={ArrowDownUp} label="今日流量">
        <Flow
          down={bytes(sum((n) => n.day_rx))}
          up={bytes(sum((n) => n.day_tx))}
          className="mt-1 text-sm font-semibold"
        />
        <div className="mt-2 text-xs text-muted-foreground">总流量</div>
        <Flow down={bytes(sum((n) => n.total_rx))} up={bytes(sum((n) => n.total_tx))} className="mt-0.5 text-sm" />
      </Tile>

      <Tile icon={Gauge} label="实时网速">
        <Flow down={rate(now.rx)} up={rate(now.tx)} className="mt-2 text-sm font-semibold" />
        <div className="mt-auto pt-1">
          <Spark
            series={[
              { values: history.map((s) => s.rx), className: "text-foreground" },
              { values: history.map((s) => s.tx), className: "text-muted-foreground" },
            ]}
          />
        </div>
      </Tile>

      <Tile icon={Wallet} label="服务器费用">
        {costs.length === 0 ? (
          <div className="mt-auto text-sm text-muted-foreground">暂无定价</div>
        ) : (
          <>
            <div className="tnum mt-4 text-2xl font-semibold tracking-tight sm:text-3xl">
              {monthlyCost === null
                ? <span className="text-sm text-muted-foreground">{rateError ? "汇率暂不可用" : rateData ? "币种汇率缺失" : "汇率加载中…"}</span>
                : costMoney(costForMode(monthlyCost, costMode), "CNY")}
            </div>
            <div className="mt-auto pt-2 text-xs text-muted-foreground">
              {costLabel}{needsRates ? " · 已折算人民币" : ""}
            </div>
          </>
        )}
      </Tile>
    </div>
  )
}
