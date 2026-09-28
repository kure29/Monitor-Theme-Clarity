import { billingMonths, costByCurrency, costMoney } from "./cost.ts"

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
  { currency: "CNY", monthly: 10, annual: 120, count: 1 },
  { currency: "USD", monthly: 24, annual: 288, count: 2 },
], "monthly amortization and currency separation")
eq(costMoney(24.5, "USD"), "$24.5", "formatted cost")

if (failed) process.exitCode = 1
