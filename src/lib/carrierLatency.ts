import { api } from "./api.ts"

export type PingPoint = { task_id: number; ts: number; latency: number | null }
export type PingHistory = { ping: PingPoint[]; probes: Record<string, string> }
export type ProbeReading = { id: number; name: string; value: number | null | "timeout" }

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

export function probeReadings(data: PingHistory | null, now = Date.now() / 1000): ProbeReading[] | null {
  if (!data || !Array.isArray(data.ping) || !data.probes || Array.isArray(data.probes)) return null
  // The hub includes only probes currently assigned to this node. Its ping
  // rows start in the panel's task order; assigned probes without any samples
  // follow those rows in id order because the public name map has no sort key.
  const assigned = new Map<number, string>()
  for (const [key, name] of Object.entries(data.probes)) {
    const id = Number(key)
    if (Number.isSafeInteger(id) && id > 0 && typeof name === "string") {
      assigned.set(id, name.trim() || `探测 ${id}`)
    }
  }
  if (assigned.size === 0) return null
  const latest = new Map<number, PingPoint>()
  const order: number[] = []
  for (const point of data.ping) {
    if (!Number.isFinite(point.ts) || !assigned.has(point.task_id)) continue
    if (!order.includes(point.task_id)) order.push(point.task_id)
    const previous = latest.get(point.task_id)
    if (!previous || previous.ts < point.ts) latest.set(point.task_id, point)
  }
  const missing = [...assigned.keys()].filter((id) => !latest.has(id)).sort((a, b) => a - b)
  return [...order, ...missing].map((id): ProbeReading => {
    const point = latest.get(id)
    const name = assigned.get(id)!
    if (!point) return { id, name, value: null }
    // A bucket timestamp is seconds since epoch. Old results must never look
    // current after an agent or probe stops reporting.
    if (point.ts > now + 60 || now - point.ts > 300) return { id, name, value: null }
    if (point.latency === null || point.latency < 0 || !Number.isFinite(point.latency)) {
      return { id, name, value: "timeout" }
    }
    return { id, name, value: point.latency }
  })
}
