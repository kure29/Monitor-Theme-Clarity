import manifest from "../../theme.json"

export const VIEW_MODES = ["large", "compact", "mini", "list"] as const
export type ViewMode = (typeof VIEW_MODES)[number]
export type ThemeConfig = {
  card_mode: ViewMode
  show_summary: boolean
  show_carrier_latency: boolean
  background_image_url: string
  global_transparency: number
}

type Field = { key: string; type: string; default: unknown; options?: { value: string }[]; min?: number; max?: number }
const fields = (manifest.config as Field[]).filter((field) => field.type !== "title")
const url = `/api/themes/${manifest.short}/config`

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

function fits(field: Field, value: unknown): boolean {
  if (field.type === "boolean") return typeof value === "boolean"
  if (field.type === "number") return typeof value === "number" && Number.isFinite(value)
    && value >= (field.min ?? -Infinity) && value <= (field.max ?? Infinity)
  if (field.type === "select") return field.options?.some((option) => option.value === value) ?? false
  if (field.key === "background_image_url") return typeof value === "string" && isBackgroundImageUrl(value)
  return typeof value === "string"
}

export function isBackgroundImageUrl(value: string): boolean {
  const url = value.trim()
  if (!url) return true
  if (!/^https?:\/\//i.test(url) && !/^\/(?!\/)/.test(url)) return false
  try {
    const parsed = new URL(url, "https://example.invalid")
    return (parsed.protocol === "https:" || parsed.protocol === "http:") && !parsed.username && !parsed.password
  } catch {
    return false
  }
}

function withDefaults(saved: Record<string, unknown>): ThemeConfig {
  const values = Object.fromEntries(fields.map((field) => [
    field.key,
    fits(field, saved[field.key]) ? saved[field.key] : field.default,
  ]))
  return values as ThemeConfig
}

export const DEFAULT_CONFIG = withDefaults({})

// Older hubs have no config endpoint; a public page should still render.
export async function loadConfig(): Promise<ThemeConfig> {
  try {
    const response = await fetch(url)
    if (response.ok) {
      const saved: unknown = await response.json()
      if (isRecord(saved)) return withDefaults(saved)
    }
  } catch {
    // Network errors use manifest defaults, like 401 and 404.
  }
  return withDefaults({})
}

// The hub replaces the entire saved object. Retain keys from another version
// and omit values equal to current defaults, as required by the theme contract.
export async function saveConfig(values: ThemeConfig): Promise<void> {
  const read = await fetch(url)
  if (!read.ok) throw new Error(`无法读取主题设置（HTTP ${read.status}）`)
  const stored: unknown = await read.json()
  if (!isRecord(stored)) throw new Error("主题设置格式不正确")
  const next = { ...stored }
  // Retired in v0.2.5: task names now come from the hub's current assignments.
  delete next.carrier_telecom
  delete next.carrier_unicom
  delete next.carrier_mobile
  for (const field of fields) {
    const value = values[field.key as keyof ThemeConfig]
    if (!fits(field, value)) throw new Error(`${field.key} 的值无效`)
    if (value === field.default) delete next[field.key]
    else next[field.key] = value
  }
  const response = await fetch(url, {
    method: "PUT",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(next),
  })
  if (!response.ok) throw new Error((await response.text()).trim() || `保存失败（HTTP ${response.status}）`)
}
