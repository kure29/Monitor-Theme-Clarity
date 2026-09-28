import { useEffect, useRef, useState } from "react"

import { carrierReadings, loadCarrierHistory, type PingHistory } from "@/lib/carrierLatency"
import type { ThemeConfig } from "@/lib/config"
import { cn } from "@/lib/utils"

export function CarrierLatency({ nodeId, online, config, compact = false }: {
  nodeId: number
  online: boolean
  config: ThemeConfig
  compact?: boolean
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

  const readings = carrierReadings(history, config)
  return (
    <span ref={target} className={cn("carrier-latency-anchor", compact && "carrier-latency-compact")}>
      {readings && (
        <span className="carrier-latency" aria-label="节点到电信、联通、移动探测目标的 TCP 延迟">
          {readings.map(({ label, value }) => (
            <span className="carrier-latency-item" key={label}>
              <span className="carrier-latency-label">{label}</span>
              <span className={cn("carrier-latency-value tnum", value === "timeout" && "text-destructive")}>
                {!online || value === null ? "—" : value === "timeout" ? "超时" : `${value.toFixed(value < 10 ? 1 : 0)} ms`}
              </span>
            </span>
          ))}
        </span>
      )}
    </span>
  )
}
