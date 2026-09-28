import { lazy, Suspense, useCallback, useEffect, useState, useSyncExternalStore, type CSSProperties } from "react"
import { ArrowLeft, LayoutDashboard, Moon, Settings2, Sun, WifiOff } from "lucide-react"

import { NodeCard } from "@/components/NodeCard"
import { CompactNodeCard, MiniNodeCard, NodeRows } from "@/components/NodeViews"
import { Summary } from "@/components/Summary"
import { ThemeSettings } from "@/components/ThemeSettings"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { api, groupsOf, isDataStale, STALE_AFTER_MS, useNodes, type Node } from "@/lib/api"
import { DEFAULT_CONFIG, loadConfig, type ThemeConfig } from "@/lib/config"

type Me = { authed: boolean; github: boolean; site_name: string; public_page: boolean }

// Split out because recharts is most of this bundle and the list page draws no
// chart. The landing page is 242 kB rather than 629 kB (77 kB gzipped against
// 188 kB), with the rest fetched immediately after it paints.
const loadDetail = () => import("@/components/NodeDetail").then((m) => ({ default: m.NodeDetail }))
const NodeDetail = lazy(loadDetail)

// `/node/{id}` is a real page: it survives a reload, can be linked to, and back
// leaves the detail view rather than the site. The hub serves index.html for any
// unknown path, so no server-side route is required.
function useNodeRoute() {
  const read = () => {
    const match = location.pathname.match(/^\/node\/(\d+)/)
    return match ? Number(match[1]) : null
  }
  const [id, setId] = useState(read)
  useEffect(() => {
    const sync = () => setId(read())
    addEventListener("popstate", sync)
    return () => removeEventListener("popstate", sync)
  }, [])
  return [
    id,
    (next: number | null) => {
      history.pushState({}, "", next === null ? "/" : `/node/${next}`)
      setId(next)
      scrollTo(0, 0)
    },
  ] as const
}

const DARK_MEDIA = matchMedia("(prefers-color-scheme: dark)")

/**
 * The visitor's own choice, or the system's while there is none. Only the toggle
 * writes the choice down: persisting the system's answer on load would pin it,
 * leaving a visitor who never touched the toggle in whichever mode their system
 * happened to be in that day. The panel at `/admin/` shares this key on one
 * origin, so it has to hold to the same rule -- one app writing on load pins the
 * others.
 *
 * The system's answer is subscribed to rather than copied into state: a flip
 * landing between the first render and the effect that would have attached the
 * listener is otherwise never heard, and the next one is a day away.
 */
function useTheme() {
  const [saved, setSaved] = useState(() => localStorage.getItem("theme"))
  const system = useSyncExternalStore(
    (notify) => {
      DARK_MEDIA.addEventListener("change", notify)
      return () => DARK_MEDIA.removeEventListener("change", notify)
    },
    () => DARK_MEDIA.matches,
  )
  const dark = saved ? saved === "dark" : system

  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark)
  }, [dark])

  return [
    dark,
    () => {
      const next = dark ? "light" : "dark"
      localStorage.setItem("theme", next)
      setSaved(next)
    },
  ] as const
}

export default function App() {
  const [dark, toggleTheme] = useTheme()
  const [me, setMe] = useState<Me | null>(null)
  const [meError, setMeError] = useState("")
  const { nodes, error, closed, lastUpdated } = useNodes()
  const [open, go] = useNodeRoute()
  // The list's group tab, held here so it survives a visit to a node's page.
  const [group, setGroup] = useState<string | null>(null)
  const [siteConfig, setSiteConfig] = useState<ThemeConfig>(DEFAULT_CONFIG)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [headerScrolled, setHeaderScrolled] = useState(false)
  const [now, setNow] = useState(Date.now)

  useEffect(() => {
    if (lastUpdated === null) return
    const tick = () => setNow(Date.now())
    const timer = window.setTimeout(tick, Math.max(0, lastUpdated + STALE_AFTER_MS - Date.now()) + 20)
    document.addEventListener("visibilitychange", tick)
    return () => { window.clearTimeout(timer); document.removeEventListener("visibilitychange", tick) }
  }, [lastUpdated])
  const stale = isDataStale(lastUpdated, now)

  useEffect(() => {
    const sync = () => setHeaderScrolled(scrollY > 8)
    sync()
    addEventListener("scroll", sync, { passive: true })
    return () => removeEventListener("scroll", sync)
  }, [])

  function applySettings(next: ThemeConfig) {
    setSiteConfig(next)
    setSettingsOpen(false)
  }

  const loadMe = useCallback(() => {
    return api<Me>("/me")
      .then((next) => { setMe(next); setMeError("") })
      .catch((e: Error) => setMeError(e.message))
  }, [])

  useEffect(() => {
    loadMe()
    // Warmed here rather than left to Suspense, which requests the chunk only
    // once a render reaches the detail view, itself waiting on /me. Without this
    // the split trades its first paint for a full-page skeleton over the first
    // node opened: 2.6s click-to-chart on 4G against 1.4s unsplit, 1.7s warm.
    void loadDetail()
  }, [loadMe])

  useEffect(() => {
    let active = true
    void loadConfig().then((next) => { if (active) setSiteConfig(next) })
    return () => { active = false }
  }, [])

  // The status page was closed while this tab was open. `me` holds whatever it
  // reported at load, so it is re-queried; the effect below then directs an
  // anonymous visitor to the panel rather than leaving them on a list that
  // stopped updating with only a red line to explain it.
  useEffect(() => {
    if (closed) void loadMe()
  }, [closed, loadMe])

  useEffect(() => {
    if (me && !me.public_page && !me.authed) location.href = "/admin/"
  }, [me])

  const sorted = [...(nodes ?? [])].sort((a, b) => a.sort - b.sort || a.id - b.id)
  const selected = sorted.find((n) => n.id === open)

  // `/node/{id}` is a page people bookmark and share, so the tab needs the node's
  // name. The site name rather than a fixed string, since the hub lets an operator
  // rename the site.
  useEffect(() => {
    document.title = [selected?.name, me?.site_name || "Monitor"].filter(Boolean).join(" · ")
  }, [selected?.name, me?.site_name])

  // Only while there is nothing else to show. Once `me` has loaded, a later
  // failure belongs beside the page rather than over it.
  if (!me) return (
    <div className="grid min-h-svh place-items-center p-6 text-sm text-muted-foreground">
      {meError ? <div className="space-y-3 text-center"><p role="alert">加载失败：{meError}</p><Button onClick={loadMe}>重试</Button></div> : "加载中…"}
    </div>
  )

  // The status page is closed and nobody is signed in: redirect to the panel.
  if (!me.public_page && !me.authed) return null

  return (
    <div
      className={`app-shell min-h-svh ${siteConfig.background_image_url ? "has-background-image" : ""}`}
      style={{
        "--surface-opacity": `${100 - siteConfig.global_transparency}%`,
      } as CSSProperties}
    >
      {siteConfig.background_image_url && <BackgroundImage key={siteConfig.background_image_url} url={siteConfig.background_image_url} />}
      <header className={`app-header sticky top-0 z-10 ${headerScrolled ? "is-scrolled" : ""}`}>
        <div className="mx-auto flex max-w-[1360px] items-center gap-3 px-5 py-4 sm:px-8">
          {/* The site name is the way back to the list, so a node page needs
              no back button of its own. */}
          <button className="brand-mark min-w-0 truncate font-semibold transition-opacity hover:opacity-70" onClick={() => go(null)}>
            {me.site_name || "Monitor"}
          </button>
          <span className="header-divider hidden sm:block" aria-hidden />
          <span className="hidden text-sm text-muted-foreground sm:block">状态概览</span>
          <div className="flex-1" />
          {me.authed && (
            <Button variant="ghost" size="sm" onClick={() => setSettingsOpen(true)} className="header-action" aria-label="主题设置">
              <Settings2 /><span className="hidden sm:inline">主题设置</span>
            </Button>
          )}
          {me.authed && (
            <Button asChild variant="ghost" size="sm" className="header-action">
              <a href="/admin/"><LayoutDashboard /><span className="hidden sm:inline">进入后台</span><span className="sm:hidden">后台</span></a>
            </Button>
          )}
          <Button variant="ghost" size="icon" onClick={toggleTheme} title="切换主题" aria-label="切换主题" className="header-action">
            {dark ? <Sun /> : <Moon />}
          </Button>
        </div>
      </header>

      <main className="mx-auto max-w-[1360px] space-y-7 px-5 py-9 sm:px-8 sm:py-12">
        <FreshnessNotice error={error} lastUpdated={lastUpdated} stale={stale} />

        {open !== null && (
          <button className="back-link inline-flex items-center gap-2 text-sm" onClick={() => go(null)}>
            <ArrowLeft className="size-4" /> 返回概览
          </button>
        )}
        {open !== null ? (
          !nodes ? (
            <Skeleton className="h-96" />
          ) : selected ? (
            <Suspense fallback={<Skeleton className="h-96" />}>
              <NodeDetail node={selected} />
            </Suspense>
          ) : (
            <p className="py-16 text-center text-sm text-muted-foreground">
              节点不存在或未公开。<button className="underline" onClick={() => go(null)}>返回列表</button>
            </p>
          )
        ) : !nodes ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} className="h-72" />
            ))}
          </div>
        ) : (
          <NodeList nodes={sorted} group={group} onGroup={setGroup} onOpen={go} config={siteConfig} stale={stale} />
        )}
      </main>
      {settingsOpen && me.authed && <ThemeSettings config={siteConfig} onClose={() => setSettingsOpen(false)} onSaved={applySettings} />}
    </div>
  )
}

function FreshnessNotice({ error, lastUpdated, stale }: { error: string | null; lastUpdated: number | null; stale: boolean }) {
  if (!error && !stale) return null
  return (
    <div className="data-notice flex items-start gap-3" role="status" aria-live="polite">
      <WifiOff className="mt-0.5 size-4 shrink-0" aria-hidden />
      <div className="min-w-0">
        <strong className="block text-sm font-semibold">{stale ? "状态数据已暂停更新" : "连接异常，正在重试"}</strong>
        <p className="mt-1 text-xs leading-relaxed">
          {lastUpdated === null ? error : <>
            最近一次更新：<time dateTime={new Date(lastUpdated).toISOString()}>{new Date(lastUpdated).toLocaleString("zh-CN", { month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit", second: "2-digit" })}</time>。当前显示的是上次数据。
          </>}
        </p>
      </div>
    </div>
  )
}

function BackgroundImage({ url }: { url: string }) {
  const [failed, setFailed] = useState(false)
  if (failed) return null
  return <div className="background-scene" aria-hidden="true">
    <img src={url} alt="" decoding="async" onError={() => setFailed(true)} />
    <span className="background-scrim" />
  </div>
}

// Group tabs sit beside the node heading, while the summary follows the selection.
function NodeList({ nodes, group, onGroup, onOpen, config, stale }: {
  nodes: Node[]
  /** null is every node, "" the ungrouped. */
  group: string | null
  onGroup: (group: string | null) => void
  onOpen: (id: number) => void
  config: ThemeConfig
  stale: boolean
}) {
  const groups = groupsOf(nodes)
  const ungrouped = nodes.filter((n) => !n.group).length
  // A tab that has since emptied or been renamed -- 未分组 included -- falls back
  // to every node rather than to an empty page, and is forgotten, so a later
  // group of the same name does not take the page over.
  const current = groups.length === 0
    ? null
    : group === null || (group === "" ? ungrouped > 0 : groups.includes(group)) ? group : null
  useEffect(() => {
    if (current !== group) onGroup(current)
  }, [current, group, onGroup])
  const shown = current === null ? nodes : nodes.filter((n) => (n.group ?? "") === current)
  const tabs = [
    [null, "全部", nodes.length] as const,
    ...groups.map((g) => [g, g, nodes.filter((n) => n.group === g).length] as const),
    ...(ungrouped ? [["", "未分组", ungrouped] as const] : []),
  ]
  return (
    <>
      {config.show_summary && <Summary nodes={shown} group={current} costMode={config.cost_display_mode} stale={stale} />}
      <section className="node-section">
        <div className="section-heading flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-baseline gap-3">
            <h1 className="text-xl font-semibold tracking-tight">节点</h1>
            <span className="text-sm text-muted-foreground">{shown.length} 台设备</span>
          </div>
          {groups.length > 0 && <div role="group" aria-label="分组" className="group-tabs -mx-1 flex max-w-full gap-1 overflow-x-auto px-1 pb-1">
            {tabs.map(([value, label, count]) => (
              <Button
                // Group names are free text, so they carry a prefix no key of
                // the 全部 tab can share.
                key={value === null ? "*" : `=${value}`}
                aria-pressed={current === value}
                size="sm"
                variant={current === value ? "secondary" : "ghost"}
                className="shrink-0"
                onClick={() => onGroup(value)}
              >
                {label}
                <span className="tnum text-muted-foreground">{count}</span>
              </Button>
            ))}
          </div>}
        </div>
        {nodes.length === 0 ? (
          <p className="py-16 text-center text-sm text-muted-foreground">还没有节点</p>
        ) : config.card_mode === "list" ? (
          <NodeRows nodes={shown} onOpen={onOpen} config={config} />
        ) : (
          <div className={`node-grid grid items-start gap-4 ${config.card_mode === "mini" ? "grid-cols-2 lg:grid-cols-4" : "md:grid-cols-2 xl:grid-cols-3"}`}>
            {shown.map((n) => (
              config.card_mode === "large"
                ? <NodeCard key={n.id} node={n} onOpen={() => onOpen(n.id)} config={config} />
                : config.card_mode === "compact"
                  ? <CompactNodeCard key={n.id} node={n} onOpen={() => onOpen(n.id)} config={config} />
                  : <MiniNodeCard key={n.id} node={n} onOpen={() => onOpen(n.id)} config={config} />
            ))}
          </div>
        )}
      </section>
    </>
  )
}
