import { api } from "./api.ts"
import type { ThemeConfig } from "./config.ts"

export type PingPoint = { task_id: number; ts: number; latency: number | null }
export type PingHistory = { ping: PingPoint[]; probes: Record<string, string> }
export type CarrierReading = { label: string; value: number | null | "timeout" }

const cache = new Map<number, { until: number; data: PingHistory | null }>()
const pending = new Map<number, Promise<PingHistory | null>>()
const waiting: (() => void)[] = []
let running = 0

// Hub limits concurrent history windows. Leave room for the detail chart and
// other tabs while visible cards fetch their small, ping-only window.
function withSlot<T>(task: () => Promise<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    const run = () => {
      running++
      const release = () => {
        running--
        waiting.shift()?.()
      }
      task().then(
        (value) => { resolve(value); release() },
        (error) => { reject(error); release() },
      )
    }
    if (running < 2) run()
    else waiting.push(run)
  })
}

export function loadCarrierHistory(nodeId: number): Promise<PingHistory | null> {
  const saved = cache.get(nodeId)
  if (saved && saved.until > Date.now()) return Promise.resolve(saved.data)
  const current = pending.get(nodeId)
  if (current) return current
  const request = withSlot(() => api<PingHistory>(`/nodes/${nodeId}/metrics?hours=1&points=60&series=ping`))
    .then((data) => {
      cache.set(nodeId, { until: Date.now() + 60_000, data })
      return data
    })
    .catch(() => {
      // A busy hub may reject a history window. Retry after a short pause,
      // without showing a stale latency as a live reading.
      cache.set(nodeId, { until: Date.now() + 15_000, data: null })
      return null
    })
    .finally(() => pending.delete(nodeId))
  pending.set(nodeId, request)
  return request
}

export function carrierReadings(data: PingHistory | null, config: ThemeConfig, now = Date.now() / 1000): CarrierReading[] | null {
  if (!data || !Array.isArray(data.ping) || !data.probes) return null
  const entries = [
    ["电信", config.carrier_telecom],
    ["联通", config.carrier_unicom],
    ["移动", config.carrier_mobile],
  ] as const
  const latest = new Map<number, PingPoint>()
  for (const point of data.ping) {
    if (!Number.isFinite(point.ts) || !Number.isFinite(point.task_id)) continue
    const previous = latest.get(point.task_id)
    if (!previous || previous.ts < point.ts) latest.set(point.task_id, point)
  }
  let matched = false
  const readings: CarrierReading[] = entries.map(([label, term]): CarrierReading => {
    const needle = term.trim().toLocaleLowerCase()
    if (!needle) return { label, value: null }
    const candidates = Object.entries(data.probes)
      .filter(([, name]) => typeof name === "string" && name.toLocaleLowerCase().includes(needle))
      .map(([id]) => latest.get(Number(id)))
      .filter((point): point is PingPoint => !!point)
    if (!candidates.length) return { label, value: null }
    matched = true
    const point = candidates.reduce((newest, item) => item.ts > newest.ts ? item : newest)
    // A bucket timestamp is seconds since epoch. Old results must never look
    // current after an agent or probe stops reporting.
    if (point.ts > now + 60 || now - point.ts > 300) return { label, value: null }
    if (point.latency === null || point.latency < 0 || !Number.isFinite(point.latency)) {
      return { label, value: "timeout" }
    }
    return { label, value: point.latency }
  })
  return matched ? readings : null
}
