import { useEffect, useRef, useState } from "react"
import { Check, X } from "lucide-react"

import { isBackgroundImageUrl, saveConfig, type CostMode, type ThemeConfig, type ViewMode } from "@/lib/config"

const OPTIONS: { mode: ViewMode; label: string; help: string }[] = [
  { mode: "large", label: "大卡片", help: "显示完整资源与流量" },
  { mode: "compact", label: "小卡片", help: "缩短卡片，保留资源概况" },
  { mode: "mini", label: "迷你卡片", help: "快速扫视节点与关键指标" },
  { mode: "list", label: "列表", help: "在一行内比较多个节点" },
]
const COST_OPTIONS: { mode: CostMode; label: string }[] = [
  { mode: "daily", label: "日均" },
  { mode: "monthly", label: "月均" },
  { mode: "total", label: "总费用" },
]

export function ThemeSettings({ config, onClose, onSaved }: {
  config: ThemeConfig
  onClose: () => void
  onSaved: (values: ThemeConfig) => void
}) {
  const dialog = useRef<HTMLDialogElement>(null)
  const [draft, setDraft] = useState(config)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")

  useEffect(() => {
    dialog.current?.showModal()
  }, [])

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSaving(true)
    setError("")
    try {
      const next = { ...draft, background_image_url: draft.background_image_url.trim() }
      if (!isBackgroundImageUrl(next.background_image_url)) throw new Error("请输入有效的 http(s) 图片地址或站内路径")
      await saveConfig(next)
      onSaved(next)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "保存主题设置失败")
    } finally {
      setSaving(false)
    }
  }

  return (
    <dialog ref={dialog} className="theme-settings-dialog" onClose={onClose} aria-labelledby="theme-settings-title">
      <form onSubmit={submit}>
        <div className="flex items-start justify-between gap-5">
          <div>
            <h2 id="theme-settings-title" className="text-xl font-semibold">主题设置</h2>
            <p className="mt-2 text-sm text-muted-foreground">保存后对所有访客生效。</p>
          </div>
          <button type="button" className="settings-close" onClick={onClose} aria-label="关闭主题设置"><X className="size-4" /></button>
        </div>

        <fieldset className="mt-7">
          <legend className="text-sm font-semibold">节点展示方式</legend>
          <div className="settings-options mt-3 grid grid-cols-2 gap-2">
            {OPTIONS.map(({ mode, label, help }) => (
              <button
                key={mode}
                type="button"
                className="settings-option text-left"
                aria-pressed={draft.card_mode === mode}
                onClick={() => setDraft((current) => ({ ...current, card_mode: mode }))}
              >
                <span className="flex items-center justify-between gap-2 font-medium">{label}{draft.card_mode === mode && <Check className="size-4" />}</span>
                <small className="mt-1 block text-muted-foreground">{help}</small>
              </button>
            ))}
          </div>
        </fieldset>

        <label className="settings-toggle mt-6 flex items-center justify-between gap-4">
          <span><strong className="block text-sm">显示顶部概览</strong><small className="mt-1 block text-muted-foreground">节点、流量、网速与服务器费用</small></span>
          <input type="checkbox" checked={draft.show_summary} onChange={(event) => setDraft((current) => ({ ...current, show_summary: event.target.checked }))} />
        </label>

        <fieldset className="mt-6 border-t border-border pt-5">
          <legend className="text-sm font-semibold">服务器费用</legend>
          <div className="mt-3 grid grid-cols-3 gap-2">
            {COST_OPTIONS.map(({ mode, label }) => (
              <label key={mode} className="settings-cost-option flex cursor-pointer items-center justify-center text-center text-sm font-medium">
                <input
                  className="sr-only"
                  type="radio"
                  name="cost-display-mode"
                  value={mode}
                  checked={draft.cost_display_mode === mode}
                  onChange={() => setDraft((current) => ({ ...current, cost_display_mode: mode }))}
                />
                {label}
              </label>
            ))}
          </div>
          <p className="mt-2 text-xs leading-relaxed text-muted-foreground">根据后台填写的价格与付款周期折算。总费用按一年计算，一次性购买不计入。</p>
        </fieldset>

        <fieldset className="mt-6 border-t border-border pt-5">
          <legend className="text-sm font-semibold">页面背景</legend>
          <label htmlFor="background-image-url" className="mt-3 block text-xs text-muted-foreground">背景图片 API 地址</label>
          <input
            id="background-image-url"
            type="text"
            inputMode="url"
            autoComplete="off"
            className="settings-text-input mt-2 w-full"
            placeholder="https://example.com/image"
            value={draft.background_image_url}
            onChange={(event) => setDraft((current) => ({ ...current, background_image_url: event.target.value }))}
          />
          <p className="mt-2 text-xs leading-relaxed text-muted-foreground">填写直接返回图片的 API 地址，一张图会自动适配手机与电脑。留空则使用默认背景。图片地址会对访客公开。</p>
          <div className="mt-5 flex items-center justify-between gap-3 text-sm">
            <label htmlFor="global-transparency" className="font-medium">全局透明度</label>
            <output htmlFor="global-transparency" className="tnum text-muted-foreground">{draft.global_transparency}%</output>
          </div>
          <input
            id="global-transparency"
            className="settings-range mt-3 w-full accent-primary"
            type="range"
            min="0"
            max="70"
            step="5"
            value={draft.global_transparency}
            onChange={(event) => setDraft((current) => ({ ...current, global_transparency: Number(event.target.value) }))}
          />
          <p className="mt-1 text-xs text-muted-foreground">调整卡片和详情面板；数值越大，背景越明显。滚动后的顶栏会保持清晰。</p>
        </fieldset>

        <fieldset className="mt-6 border-t border-border pt-5">
          <legend className="text-sm font-semibold">延迟监控</legend>
          <label className="mt-3 flex items-center justify-between gap-4 text-sm">
            <span>在节点视图显示</span>
            <input type="checkbox" className="size-[18px] accent-primary" checked={draft.show_carrier_latency} onChange={(event) => setDraft((current) => ({ ...current, show_carrier_latency: event.target.checked }))} />
          </label>
          <p className="mt-3 text-xs leading-relaxed text-muted-foreground">自动显示 monitor 后台分配给各节点的 TCP 探测任务与最近结果，无需在主题里配置任务名称。</p>
        </fieldset>

        {error && <p className="mt-5 text-sm text-destructive" role="alert">{error}</p>}
        <div className="mt-7 flex justify-end gap-2">
          <button type="button" className="settings-secondary" onClick={onClose}>取消</button>
          <button type="submit" className="settings-primary" disabled={saving}>{saving ? "保存中…" : "保存设置"}</button>
        </div>
      </form>
    </dialog>
  )
}
