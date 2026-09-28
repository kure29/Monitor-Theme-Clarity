import { useEffect, useRef, useState } from "react"
import { Check, X } from "lucide-react"

import { saveConfig, type ThemeConfig, type ViewMode } from "@/lib/config"

const OPTIONS: { mode: ViewMode; label: string; help: string }[] = [
  { mode: "large", label: "大卡片", help: "显示完整资源与流量" },
  { mode: "compact", label: "小卡片", help: "缩短卡片，保留资源概况" },
  { mode: "mini", label: "迷你卡片", help: "快速扫视节点与关键指标" },
  { mode: "list", label: "列表", help: "在一行内比较多个节点" },
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
      await saveConfig(draft)
      onSaved(draft)
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
          <span><strong className="block text-sm">显示顶部概览</strong><small className="mt-1 block text-muted-foreground">节点数量、流量与实时网速</small></span>
          <input type="checkbox" checked={draft.show_summary} onChange={(event) => setDraft((current) => ({ ...current, show_summary: event.target.checked }))} />
        </label>

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
