import { useEffect, useRef, useState } from "react"

import { probeReadings, loadCarrierHistory, type PingHistory } from "@/lib/carrierLatency"
import { cn } from "@/lib/utils"

export function CarrierLatency({ nodeId, online, compact = false, limit }: {
  nodeId: number
  online: boolean
  compact?: boolean
  limit?: number
}) {
  const target = useRef<HTMLSpanElement>(null)
  const [visible, setVisible] = useState(false)
  const [history, setHistory] = useState<PingHistory | null>(null)

  useEffect(() => {
    const element = target.current
    if (!element) return
    if (typeof IntersectionObserver === "undefined") {
      const timer = window.setTimeout(() => setVisible(true), 0)
      return () => window.clearTimeout(timer)
    }
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) { setVisible(true); observer.disconnect() }
    }, { rootMargin: "240px" })
    observer.observe(element)
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    if (!visible) return
    let active = true
    const refresh = () => { void loadCarrierHistory(nodeId).then((next) => { if (active) setHistory(next) }) }
    refresh()
    const timer = window.setInterval(refresh, 60_000)
    return () => { active = false; window.clearInterval(timer) }
  }, [nodeId, visible])

  const readings = probeReadings(history)
  const shown = readings?.slice(0, limit ?? (compact ? 3 : undefined))
  const remaining = readings ? readings.length - (shown?.length ?? 0) : 0
  return (
    <span ref={target} className={cn("carrier-latency-anchor", compact && "carrier-latency-compact")}>
      {shown && (
        <>
          <span className="carrier-latency" aria-label="节点到后台分配的探测目标的 TCP 延迟">
            {shown.map(({ id, name, value }) => (
              <span className="carrier-latency-item" key={id}>
                <span className="carrier-latency-label" title={name}>{name}</span>
                <span className={cn("carrier-latency-value tnum", value === "timeout" && "text-destructive")}>
                  {!online || value === null ? "—" : value === "timeout" ? "超时" : `${value.toFixed(value < 10 ? 1 : 0)} ms`}
                </span>
              </span>
            ))}
          </span>
          {remaining > 0 && <span className="carrier-latency-more">另有 {remaining} 项探测</span>}
        </>
      )}
    </span>
  )
}
