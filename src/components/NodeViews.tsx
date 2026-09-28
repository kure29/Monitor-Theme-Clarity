import { ArrowDown, ArrowUp, ChevronRight } from "lucide-react"

import { Country, Status } from "@/components/NodeCard"
import { CarrierLatency } from "@/components/CarrierLatency"
import type { Node } from "@/lib/api"
import type { ThemeConfig } from "@/lib/config"
import { osName, percent, rate } from "@/lib/format"

type NodeViewProps = { node: Node; onOpen: () => void; config: ThemeConfig }

function usage(value: number | null): string {
  return value === null ? "—" : `${value.toFixed(value < 10 ? 1 : 0)}%`
}

function resource(node: Node, kind: "cpu" | "mem" | "disk"): number | null {
  const m = node.metrics
  if (!m) return null
  if (kind === "cpu") return m.cpu
  return kind === "mem" ? percent(m.mem_used, m.mem_total) : percent(m.disk_used, m.disk_total)
}

function ResourceStat({ label, value }: { label: string; value: number | null }) {
  const width = value === null ? 0 : Math.min(100, Math.max(0, value))
  return (
    <div className="resource-stat">
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-xs text-muted-foreground">{label}</span>
        <span className="tnum text-sm font-semibold">{usage(value)}</span>
      </div>
      <div className="mt-2 h-1 overflow-hidden rounded-full bg-muted">
        <span className="resource-fill block h-full rounded-full" style={{ width: `${width}%` }} />
      </div>
    </div>
  )
}

export function CompactNodeCard({ node, onOpen, config }: NodeViewProps) {
  return (
    <button className="surface-card compact-node-card min-w-0 text-left" onClick={onOpen} aria-label={`查看 ${node.name} 详情`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="truncate text-base font-semibold">{node.name}</h3>
            <Country node={node} />
          </div>
          <p className="mt-1 truncate text-xs text-muted-foreground">{node.os ? osName(node.os) : "等待首次上报"}</p>
        </div>
        <Status node={node} />
      </div>
      <div className="compact-metrics mt-5 grid grid-cols-3 gap-4">
        <ResourceStat label="CPU" value={resource(node, "cpu")} />
        <ResourceStat label="内存" value={resource(node, "mem")} />
        <ResourceStat label="硬盘" value={resource(node, "disk")} />
      </div>
      <div className="mt-5 flex items-center justify-between border-t border-border pt-3 text-xs text-muted-foreground">
        <span className="tnum inline-flex items-center gap-1"><ArrowDown className="size-3" />{node.metrics ? rate(node.metrics.net_rx) : "—"}</span>
        <span className="tnum inline-flex items-center gap-1"><ArrowUp className="size-3" />{node.metrics ? rate(node.metrics.net_tx) : "—"}</span>
        <ChevronRight className="size-4" aria-hidden />
      </div>
      {config.show_carrier_latency && <CarrierLatency nodeId={node.id} online={node.online} />}
    </button>
  )
}

export function MiniNodeCard({ node, onOpen, config }: NodeViewProps) {
  return (
    <button className="surface-card mini-node-card min-w-0 text-left" onClick={onOpen} aria-label={`查看 ${node.name} 详情`}>
      <div className="flex min-w-0 items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <span className={`mini-status-dot ${node.online ? "online" : "offline"}`} aria-hidden />
          <h3 className="truncate text-sm font-semibold">{node.name}</h3>
        </div>
        <Country node={node} />
      </div>
      <p className="mt-2 truncate text-xs text-muted-foreground">{node.online ? (node.os ? osName(node.os) : "在线") : "离线"}</p>
      <div className="mt-5 grid grid-cols-2 gap-3 border-t border-border pt-3">
        <div><span className="mini-label">CPU</span><strong className="tnum mini-value">{usage(resource(node, "cpu"))}</strong></div>
        <div><span className="mini-label">内存</span><strong className="tnum mini-value">{usage(resource(node, "mem"))}</strong></div>
      </div>
      {config.show_carrier_latency && <CarrierLatency nodeId={node.id} online={node.online} compact limit={2} />}
    </button>
  )
}

export function NodeRows({ nodes, onOpen, config }: { nodes: Node[]; onOpen: (id: number) => void; config: ThemeConfig }) {
  return (
    <div className={`node-table ${config.show_carrier_latency ? "node-table-with-carrier" : ""}`} aria-label="节点列表">
      <div className="node-table-head">
        <span>节点</span><span>状态</span><span>CPU</span>
        <span>内存</span><span>硬盘</span><span>网络</span>{config.show_carrier_latency && <span>网络延迟</span>}
      </div>
      {nodes.map((node) => (
        <button key={node.id} className="list-node-row" onClick={() => onOpen(node.id)} aria-label={`查看 ${node.name} 详情`}>
          <span className="list-node-identity min-w-0">
            <span className="flex min-w-0 items-center gap-2"><strong className="truncate">{node.name}</strong><Country node={node} /></span>
            <small className="block truncate text-muted-foreground">{node.os ? osName(node.os) : "等待首次上报"}</small>
          </span>
          <span className="list-node-status"><Status node={node} /></span>
          <span className="tnum list-node-value"><small>CPU</small>{usage(resource(node, "cpu"))}</span>
          <span className="tnum list-node-value"><small>内存</small>{usage(resource(node, "mem"))}</span>
          <span className="tnum list-node-value"><small>硬盘</small>{usage(resource(node, "disk"))}</span>
          <span className="tnum list-node-value"><small>网络</small>{node.metrics ? rate(node.metrics.net_rx) : "—"}</span>
          {config.show_carrier_latency && <span className="list-node-carrier"><CarrierLatency nodeId={node.id} online={node.online} compact /></span>}
        </button>
      ))}
      {nodes.length === 0 && <p className="p-8 text-center text-sm text-muted-foreground">这个分组还没有节点</p>}
    </div>
  )
}
