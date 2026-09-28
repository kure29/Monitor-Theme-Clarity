import { billingMonths, costByCurrency, costForMode, costMoney, monthlyTotalCny, parseUsdRates } from "./cost.ts"

let failed = 0
function eq(got: unknown, want: unknown, label: string) {
  if (JSON.stringify(got) !== JSON.stringify(want)) {
    console.error(`${label}: got ${JSON.stringify(got)}, wanted ${JSON.stringify(want)}`)
    failed++
  }
}

eq(billingMonths("monthly"), 1, "monthly")
eq(billingMonths("quarterly"), 3, "quarterly")
eq(billingMonths("semiannual"), 6, "semiannual")
eq(billingMonths("yearly"), 12, "yearly")
eq(billingMonths("biennial"), 24, "biennial")
eq(billingMonths("triennial"), 36, "triennial")
eq(billingMonths("1095"), 36, "three years in days")
eq(billingMonths("once"), null, "one-time purchase")
eq(costByCurrency([
  { price: 12, currency: "USD", billing_cycle: "monthly" },
  { price: 36, currency: "USD", billing_cycle: "quarterly" },
  { price: 120, currency: "CNY", billing_cycle: "yearly" },
  { price: 90, currency: "CNY", billing_cycle: "once" },
  { price: 0, currency: "USD", billing_cycle: "monthly" },
]), [
  { currency: "CNY", monthly: 10 },
  { currency: "USD", monthly: 24 },
], "monthly amortization and currency separation")
eq(costMoney(24.5, "USD"), "$24.5", "formatted cost")
eq(parseUsdRates([{ base: "USD", quote: "CNY", rate: 7.2 }, { base: "USD", quote: "EUR", rate: 0.9 }]),
  { USD: 1, CNY: 7.2, EUR: 0.9 }, "Frankfurter v2 rates")
eq(monthlyTotalCny([
  { currency: "CNY", monthly: 10 },
  { currency: "EUR", monthly: 9 },
], { USD: 1, CNY: 7.2, EUR: 0.9 }), 82, "mixed currencies become one CNY monthly total")
eq(monthlyTotalCny([{ currency: "EUR", monthly: 9 }], { USD: 1, CNY: 7.2 }),
  null, "missing rate never produces a partial total")
eq(costForMode(365, "daily"), 12, "daily average uses an annual basis")
eq(costForMode(365, "monthly"), 365, "monthly average retains current behavior")
eq(costForMode(365, "total"), 4380, "total is annualized across billing cycles")

if (failed) process.exitCode = 1
