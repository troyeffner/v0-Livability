export type Money = number
export type RatePercent = number // 6.85 means 6.85%

export interface LoanParams {
  purchasePrice: Money
  downPaymentPercent: RatePercent // 20 means 20%
  interestRatePercent: RatePercent // APR as percent
  termYears: number
  propertyTaxRatePercent?: RatePercent // annual as percent of price
  annualInsurance?: Money
  monthlyHOA?: Money
  pmiAnnualRatePercent?: RatePercent // annual as percent of loan if DP < 20%
}

export const DEFAULTS = {
  propertyTaxRatePercent: 1.5, // 1.5% annual of purchase price
  annualInsurance: 1800,
  monthlyHOA: 0,
  pmiAnnualRatePercent: 0.6, // 0.6% annual PMI default
}

export function safeNumber(value: any, fallback = 0): number {
  const n = Number(value)
  return Number.isFinite(n) ? n : fallback
}

export function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n))
}

export function rateMonthlyFromPercent(ratePercent: RatePercent): number {
  return safeNumber(ratePercent) / 100 / 12
}

export function pmt(principal: Money, rateMonthly: number, nPayments: number): Money {
  if (principal <= 0 || nPayments <= 0) return 0
  if (rateMonthly === 0) return principal / nPayments
  return (principal * rateMonthly) / (1 - Math.pow(1 + rateMonthly, -nPayments))
}

export function piti(params: LoanParams) {
  const dpPct = clamp(safeNumber(params.downPaymentPercent), 0, 100)
  const price = Math.max(0, safeNumber(params.purchasePrice))
  const loan = Math.max(0, price * (1 - dpPct / 100))

  const r = rateMonthlyFromPercent(clamp(safeNumber(params.interestRatePercent), 0, 100))
  const n = Math.max(1, Math.round(safeNumber(params.termYears) * 12))

  const principalAndInterest = pmt(loan, r, n)
  const propertyTax =
    (price * (params.propertyTaxRatePercent ?? DEFAULTS.propertyTaxRatePercent)) / 100 / 12
  const insurance = (params.annualInsurance ?? DEFAULTS.annualInsurance) / 12
  const hoa = params.monthlyHOA ?? DEFAULTS.monthlyHOA

  const needsPMI = dpPct < 20 && loan > 0
  const pmiMonthly =
    needsPMI
      ? (loan * (params.pmiAnnualRatePercent ?? DEFAULTS.pmiAnnualRatePercent)) / 100 / 12
      : 0

  const monthly = principalAndInterest + propertyTax + insurance + hoa + pmiMonthly
  return {
    monthly,
    principalAndInterest,
    propertyTax,
    insurance,
    hoa,
    pmi: needsPMI ? pmiMonthly : 0,
    loanAmount: loan,
  }
}

export interface SolveParams extends Omit<LoanParams, "purchasePrice"> {
  targetMonthly: Money
  minPrice?: Money
  maxPrice?: Money
  tolerance?: Money
  maxIterations?: number
}

/**
 * Finds a purchase price such that PITI(price) ~= targetMonthly within tolerance,
 * using a robust bounded binary search. Assumes downPaymentPercent is fixed.
 */
export function solvePurchasePriceForMonthlyBudget(params: SolveParams) {
  const tol = params.tolerance ?? 50
  let low = Math.max(0, params.minPrice ?? 0)
  let high = Math.max(low, params.maxPrice ?? 2_000_000)
  let best = 0

  for (let i = 0; i < (params.maxIterations ?? 60); i++) {
    const mid = (low + high) / 2
    const m = piti({
      purchasePrice: mid,
      downPaymentPercent: params.downPaymentPercent,
      interestRatePercent: params.interestRatePercent,
      termYears: params.termYears,
      propertyTaxRatePercent: params.propertyTaxRatePercent,
      annualInsurance: params.annualInsurance,
      monthlyHOA: params.monthlyHOA,
      pmiAnnualRatePercent: params.pmiAnnualRatePercent,
    }).monthly

    if (Math.abs(m - params.targetMonthly) <= tol) {
      best = mid
      break
    }

    if (m > params.targetMonthly) {
      high = mid
    } else {
      best = mid
      low = mid
    }
  }

  return Math.max(0, Math.round(best))
}

/**
 * Variant where down payment is determined by available cash and capped at a target percent.
 * dpPercent(price) = min(dpCapPercent, availableDownPayment / price * 100)
 */
export function solvePriceWithDynamicDownPayment(opts: {
  targetMonthly: Money
  availableDownPayment: Money
  dpCapPercent: RatePercent
  interestRatePercent: RatePercent
  termYears: number
  propertyTaxRatePercent?: RatePercent
  annualInsurance?: Money
  monthlyHOA?: Money
  pmiAnnualRatePercent?: RatePercent
  minPrice?: Money
  maxPrice?: Money
  tolerance?: Money
  maxIterations?: number
}) {
  const tol = opts.tolerance ?? 50
  let low = Math.max(0, opts.minPrice ?? 0)
  let high = Math.max(low, opts.maxPrice ?? 2_000_000)
  let best = 0

  for (let i = 0; i < (opts.maxIterations ?? 60); i++) {
    const mid = (low + high) / 2
    const dpPercent =
      mid > 0 ? Math.min(opts.dpCapPercent, (safeNumber(opts.availableDownPayment) / mid) * 100) : 0

    const m = piti({
      purchasePrice: mid,
      downPaymentPercent: dpPercent,
      interestRatePercent: opts.interestRatePercent,
      termYears: opts.termYears,
      propertyTaxRatePercent: opts.propertyTaxRatePercent,
      annualInsurance: opts.annualInsurance,
      monthlyHOA: opts.monthlyHOA,
      pmiAnnualRatePercent: opts.pmiAnnualRatePercent,
    }).monthly

    if (Math.abs(m - opts.targetMonthly) <= tol) {
      best = mid
      break
    }

    if (m > opts.targetMonthly) {
      high = mid
    } else {
      best = mid
      low = mid
    }
  }

  return Math.max(0, Math.round(best))
}
