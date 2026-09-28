/// <reference types="node" />
import assert from "node:assert/strict"
import { probeReadings, type PingHistory } from "./carrierLatency.ts"

const now = 1_000_000
const history: PingHistory = {
  // The hub sends current node assignments, even when a task has no samples.
  probes: { 1: "香港电信", 2: "北京联通", 3: "广州移动", 5: "新建探测" },
  ping: [
    { task_id: 3, ts: now - 80, latency: 19 },
    { task_id: 3, ts: now - 20, latency: 23.5 },
    { task_id: 1, ts: now - 10, latency: null },
    { task_id: 2, ts: now - 400, latency: 45 },
    { task_id: 4, ts: now - 5, latency: 2 }, // No longer assigned.
  ],
}
assert.deepEqual(probeReadings(history, now), [
  { id: 3, name: "广州移动", value: 23.5 },
  { id: 1, name: "香港电信", value: "timeout" },
  { id: 2, name: "北京联通", value: null },
  { id: 5, name: "新建探测", value: null },
])
assert.deepEqual(probeReadings({ ...history, probes: { 3: "移动线路已改名" } }, now), [
  { id: 3, name: "移动线路已改名", value: 23.5 },
])
assert.equal(probeReadings({ ping: history.ping, probes: {} }, now), null)
assert.deepEqual(probeReadings({ probes: { 1: "电信" }, ping: [{ task_id: 1, ts: now, latency: -1 }] }, now), [
  { id: 1, name: "电信", value: "timeout" },
])
console.log("latency follows current hub assignments, names, timeouts and stale readings")
