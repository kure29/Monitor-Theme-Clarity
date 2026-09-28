import type { Node } from "./api"

type PricedNode = Pick<Node, "price" | "currency" | "billing_cycle">

export type CurrencyCost = { currency: string; monthly: number; annual: number; count: number }

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
    const entry = totals.get(currency) ?? { currency, monthly: 0, annual: 0, count: 0 }
    entry.monthly += node.price / months
    entry.annual = entry.monthly * 12
    entry.count++
    totals.set(currency, entry)
  }
  return [...totals.values()].sort((a, b) => a.currency.localeCompare(b.currency))
}

const SYMBOLS: Record<string, string> = { CNY: "¥", USD: "$", EUR: "€", GBP: "£", JPY: "¥" }
const NUMBER = new Intl.NumberFormat("zh-CN", { maximumFractionDigits: 2, minimumFractionDigits: 0 })

export function costMoney(amount: number, currency: string, showCode = false): string {
  const symbol = SYMBOLS[currency]
  return `${symbol ?? ""}${NUMBER.format(amount)}${showCode || !symbol ? ` ${currency}` : ""}`
}
