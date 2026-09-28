/// <reference types="node" />
import assert from "node:assert/strict"
import { carrierReadings, type PingHistory } from "./carrierLatency.ts"
import type { ThemeConfig } from "./config.ts"

const config = {
  carrier_telecom: "电信", carrier_unicom: "联通", carrier_mobile: "移动",
} as ThemeConfig
const now = 1_000_000
const history: PingHistory = {
  probes: { 1: "上海电信", 2: "北京联通", 3: "广州移动", 4: "其他探测" },
  ping: [
    { task_id: 1, ts: now - 80, latency: 19 },
    { task_id: 1, ts: now - 20, latency: 23.5 },
    { task_id: 2, ts: now - 10, latency: null },
    { task_id: 3, ts: now - 400, latency: 45 },
    { task_id: 4, ts: now - 5, latency: 2 },
  ],
}
assert.deepEqual(carrierReadings(history, config, now), [
  { label: "电信", value: 23.5 }, { label: "联通", value: "timeout" }, { label: "移动", value: null },
])
assert.equal(carrierReadings({ probes: { 4: "其他" }, ping: history.ping }, config, now), null)
assert.deepEqual(carrierReadings(history, { ...config, carrier_telecom: "  SHANGHAI " }, now), [
  { label: "电信", value: null }, { label: "联通", value: "timeout" }, { label: "移动", value: null },
])
assert.deepEqual(carrierReadings({ probes: { 1: "上海电信" }, ping: [{ task_id: 1, ts: now, latency: -1 }] }, config, now)?.[0],
  { label: "电信", value: "timeout" })
console.log("carrier latency matches recent probe data without presenting stale values")
