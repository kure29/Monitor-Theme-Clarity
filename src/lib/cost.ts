import type { Node } from "./api"
import type { CostMode } from "./config"

type PricedNode = Pick<Node, "price" | "currency" | "billing_cycle">

export type CurrencyCost = { currency: string; monthly: number }

const RATE_URL = "https://api.frankfurter.dev/v2/rates?base=USD"
const RATE_CACHE_KEY = "clarity:usd-rates"
const RATE_FRESH_MS = 60 * 60 * 1000
const RATE_MAX_AGE_MS = 7 * 24 * RATE_FRESH_MS

export type ExchangeRates = { rates: Record<string, number>; time: number }

/** A recurring plan's length in months. An outright purchase has no monthly cost. */
export function billingMonths(cycle: string): number | null {
  const value = String(cycle ?? "").trim().toLowerCase()
  if (/^(once|one-time|lifetime|永久|一次性|买断|-1)$/.test(value)) return null
  const named: Record<string, number> = {
    monthly: 1, month: 1, mo: 1, "月": 1, "月付": 1, "每月": 1,
    quarterly: 3, quarter: 3, "季": 3, "季度": 3, "季付": 3,
    semiannual: 6, "semi-annually": 6, halfyear: 6, "half-year": 6, "半年": 6, "半年付": 6,
    yearly: 12, annually: 12, annual: 12, year: 12, yr: 12, "年": 12, "年付": 12, "每年": 12,
    biennial: 24, "两年": 24, "两年付": 24, "2年": 24, "2年付": 24,
    triennial: 36, "三年": 36, "三年付": 36, "3年": 36, "3年付": 36,
  }
  if (value in named) return named[value]
  const days = Number(value)
  if (value && Number.isFinite(days) && days > 0) {
    if (days === 360 || days === 365) return 12
    if (days % 365 === 0) return (days / 365) * 12
    return days / 30
  }
  // The hub's default billing cycle is annual; old records may omit it.
  return 12
}

/** Currencies remain separate: adding USD, CNY and EUR without rates is misleading. */
export function costByCurrency(nodes: PricedNode[]): CurrencyCost[] {
  const totals = new Map<string, CurrencyCost>()
  for (const node of nodes) {
    const months = billingMonths(node.billing_cycle)
    if (!months || !Number.isFinite(node.price) || node.price <= 0) continue
    const currency = node.currency?.trim().toUpperCase() || "CNY"
    const entry = totals.get(currency) ?? { currency, monthly: 0 }
    entry.monthly += node.price / months
    totals.set(currency, entry)
  }
  return [...totals.values()].sort((a, b) => a.currency.localeCompare(b.currency))
}

/** Frankfurter v2 returns an array; older compatible endpoints use { rates }. */
export function parseUsdRates(payload: unknown): Record<string, number> {
  const rates: Record<string, number> = { USD: 1 }
  if (Array.isArray(payload)) {
    for (const row of payload) {
      if (!row || typeof row !== "object") continue
      const item = row as Record<string, unknown>
      if (item.base && String(item.base).toUpperCase() !== "USD") continue
      if (typeof item.quote !== "string") continue
      const rate = Number(item.rate)
      if (Number.isFinite(rate) && rate > 0) rates[item.quote.toUpperCase()] = rate
    }
  } else if (payload && typeof payload === "object") {
    const record = payload as Record<string, unknown>
    if (record.base && String(record.base).toUpperCase() !== "USD") throw new Error("汇率基准币种不正确")
    if (record.rates && typeof record.rates === "object") {
      for (const [code, value] of Object.entries(record.rates)) {
        const rate = Number(value)
        if (Number.isFinite(rate) && rate > 0) rates[code.toUpperCase()] = rate
      }
    }
  }
  if (!rates.CNY) throw new Error("汇率数据缺少人民币报价")
  return rates
}

function cachedRates(): ExchangeRates | null {
  try {
    const raw = localStorage.getItem(RATE_CACHE_KEY)
    if (!raw) return null
    const entry: unknown = JSON.parse(raw)
    if (!entry || typeof entry !== "object") return null
    const { rates, time } = entry as Record<string, unknown>
    if (typeof time !== "number" || Date.now() - time > RATE_MAX_AGE_MS || time > Date.now()) return null
    return { rates: parseUsdRates({ rates }), time }
  } catch {
    return null
  }
}

export async function getExchangeRates(signal?: AbortSignal): Promise<ExchangeRates> {
  const old = cachedRates()
  if (old && Date.now() - old.time < RATE_FRESH_MS) return old
  try {
    const response = await fetch(RATE_URL, { cache: "no-store", signal })
    if (!response.ok) throw new Error(`汇率服务 HTTP ${response.status}`)
    const entry = { rates: parseUsdRates(await response.json()), time: Date.now() }
    try { localStorage.setItem(RATE_CACHE_KEY, JSON.stringify(entry)) } catch { /* Private browsing can disable storage. */ }
    return entry
  } catch (error) {
    if (signal?.aborted) throw error
    if (old) return old
    throw error
  }
}

/** Null means at least one currency has no rate, so a single total would lie. */
export function monthlyTotalCny(costs: CurrencyCost[], rates: Record<string, number>): number | null {
  let total = 0
  for (const item of costs) {
    if (item.currency === "CNY") {
      total += item.monthly
    } else {
      const quote = rates[item.currency]
      if (!quote || !rates.CNY) return null
      total += item.monthly / quote * rates.CNY
    }
  }
  return total
}

/** A year is the common basis for plans with different billing cycles. */
export function costForMode(monthly: number, mode: CostMode): number {
  if (mode === "daily") return monthly * 12 / 365
  if (mode === "total") return monthly * 12
  return monthly
}

const SYMBOLS: Record<string, string> = { CNY: "¥", USD: "$", EUR: "€", GBP: "£", JPY: "¥" }
const NUMBER = new Intl.NumberFormat("zh-CN", { maximumFractionDigits: 2, minimumFractionDigits: 0 })

export function costMoney(amount: number, currency: string): string {
  const symbol = SYMBOLS[currency]
  return `${symbol ?? ""}${NUMBER.format(amount)}${symbol ? "" : ` ${currency}`}`
}
