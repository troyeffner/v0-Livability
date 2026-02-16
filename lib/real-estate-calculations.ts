// Core real estate calculation functions - delegates to finance-core for consistent math
import { DEFAULTS, piti, pmt, rateMonthlyFromPercent, safeNumber, solvePriceWithDynamicDownPayment } from "./finance-core"

export { safeNumber } from "./finance-core"

export interface MortgageCalculation {
  monthlyPayment: number
  totalInterest: number
  totalPayments: number
  principalAndInterest: number
  propertyTax: number
  insurance: number
  pmi?: number
}

export interface AffordabilityAnalysis {
  maxPurchasePrice: number
  maxMonthlyPayment: number
  requiredDownPayment: number
  dtiRatio: number
  remainingBudget: number
  canAfford: boolean
  constraints: string[]
  opportunities: string[]
}

// Calculate monthly mortgage payment (P&I only) - delegates to finance-core pmt
export function calculateMonthlyPayment(loanAmount: number, interestRatePercent: number, loanTermYears: number): number {
  const principal = safeNumber(loanAmount)
  const r = rateMonthlyFromPercent(safeNumber(interestRatePercent))
  const n = safeNumber(loanTermYears) * 12
  return pmt(principal, r, n)
}

// Calculate total monthly housing payment (PITI) - delegates to finance-core piti
export function calculateTotalMonthlyPayment(
  purchasePrice: number,
  downPayment: number,
  interestRatePercent: number,
  loanTermYears: number,
  propertyTaxRatePercent = DEFAULTS.propertyTaxRatePercent,
  annualInsurance = DEFAULTS.annualInsurance,
  monthlyHOA = DEFAULTS.monthlyHOA,
  pmiAnnualRatePercent = DEFAULTS.pmiAnnualRatePercent,
): MortgageCalculation {
  const price = safeNumber(purchasePrice)
  const dpPercent = price > 0 ? (safeNumber(downPayment) / price) * 100 : 0
  const res = piti({
    purchasePrice: price,
    downPaymentPercent: dpPercent,
    interestRatePercent,
    termYears: loanTermYears,
    propertyTaxRatePercent,
    annualInsurance,
    monthlyHOA,
    pmiAnnualRatePercent,
  })

  const totalPayments = res.principalAndInterest * loanTermYears * 12
  const loanAmount = res.loanAmount
  const totalInterest = Math.max(0, totalPayments - loanAmount)

  return {
    monthlyPayment: res.monthly,
    totalInterest,
    totalPayments,
    principalAndInterest: res.principalAndInterest,
    propertyTax: res.propertyTax,
    insurance: res.insurance,
    pmi: res.pmi && res.pmi > 0 ? res.pmi : undefined,
  }
}

// Calculate maximum affordable home price - uses binary search via finance-core
export function calculateMaxAffordablePrice(
  annualIncome: number,
  monthlyExpenses: number,
  fixedDebts: number,
  downPaymentSources: number,
  interestRatePercent: number,
  loanTermYears: number,
  propertyTaxRatePercent = DEFAULTS.propertyTaxRatePercent,
  annualInsurance = DEFAULTS.annualInsurance,
  housingRatio = 0.28,
  dtiRatio = 0.43,
  dpCapPercent = 20,
): AffordabilityAnalysis {
  const grossMonthlyIncome = safeNumber(annualIncome) / 12
  const takeHomeIncome = grossMonthlyIncome * 0.7

  const maxPaymentFromHousingRatio = grossMonthlyIncome * safeNumber(housingRatio)
  const maxPaymentFromDTI = grossMonthlyIncome * safeNumber(dtiRatio) - safeNumber(fixedDebts)
  const availableBudget = takeHomeIncome - safeNumber(monthlyExpenses) - safeNumber(fixedDebts)

  const maxMonthlyPayment = Math.max(0, Math.min(maxPaymentFromHousingRatio, Math.min(maxPaymentFromDTI, availableBudget)))

  // Solve for price with dynamic down payment capped at dpCapPercent
  const maxPrice = solvePriceWithDynamicDownPayment({
    targetMonthly: maxMonthlyPayment,
    availableDownPayment: safeNumber(downPaymentSources),
    dpCapPercent,
    interestRatePercent,
    termYears: loanTermYears,
    propertyTaxRatePercent,
    annualInsurance,
  })

  const dpUsed = Math.min(safeNumber(downPaymentSources), maxPrice * (dpCapPercent / 100))
  const comp = piti({
    purchasePrice: maxPrice,
    downPaymentPercent: maxPrice > 0 ? (dpUsed / maxPrice) * 100 : 0,
    interestRatePercent,
    termYears: loanTermYears,
    propertyTaxRatePercent,
    annualInsurance,
  })

  const finalMonthly = comp.monthly
  const finalDTI = grossMonthlyIncome > 0 ? ((safeNumber(fixedDebts) + finalMonthly) / grossMonthlyIncome) * 100 : 1000
  const remainingBudget = takeHomeIncome - finalMonthly - safeNumber(monthlyExpenses) - safeNumber(fixedDebts)

  const constraints: string[] = []
  const opportunities: string[] = []

  if (maxPrice <= 0) constraints.push("Current expenses exceed income - reduce expenses to afford a home")
  if (finalDTI > 40) constraints.push(`High DTI ratio: ${finalDTI.toFixed(1)}% (lenders prefer <43%)`)
  if (remainingBudget < 500) constraints.push("Tight budget - consider increasing income or reducing expenses")
  if (safeNumber(downPaymentSources) < maxPrice * (dpCapPercent / 100)) {
    const gap = maxPrice * (dpCapPercent / 100) - safeNumber(downPaymentSources)
    if (gap > 0) constraints.push(`Need ${(gap / 1000).toFixed(0)}k more for down payment`)
  }

  if (remainingBudget > 1000) {
    opportunities.push(`Strong budget position - could afford ${(((remainingBudget * 200) / 1000) | 0)}k more house`)
  }
  if (safeNumber(downPaymentSources) > maxPrice * (dpCapPercent / 100) * 1.1) {
    opportunities.push("Excess down payment available - consider higher price range or lower monthly payment")
  }

  return {
    maxPurchasePrice: Math.max(0, maxPrice),
    maxMonthlyPayment,
    requiredDownPayment: Math.max(0, maxPrice * (dpCapPercent / 100)),
    dtiRatio: finalDTI,
    remainingBudget,
    canAfford: maxPrice > 0 && remainingBudget >= 0,
    constraints,
    opportunities,
  }
}

// Wrapper expected by RealEstatePlannerPage (keeps existing import intact)
export function calculateAffordability(input: {
  annualIncome: number
  monthlyExpenses: number
  fixedDebts: number
  downPaymentSources: number
  interestRate: number
  loanTerm: number
  housingPercentage: number
}) {
  return calculateMaxAffordablePrice(
    input.annualIncome,
    input.monthlyExpenses,
    input.fixedDebts,
    input.downPaymentSources,
    input.interestRate,
    input.loanTerm,
    DEFAULTS.propertyTaxRatePercent,
    DEFAULTS.annualInsurance,
    Math.max(0, Math.min(1, (input.housingPercentage || 30) / 100)),
    0.43,
    20,
  )
}

// Calculate gross annual income from active financial items
export function calculateGrossAnnualIncome(
  items: Array<{ amount: number; active: boolean; frequency?: string }>
): number {
  return items
    .filter((item) => item.active)
    .reduce((sum, item) => {
      if (item.frequency === "monthly") return sum + item.amount * 12
      return sum + item.amount
    }, 0)
}

// Calculate estimated annual take-home income (after taxes)
// Returns an object to match the destructuring in use-memoized-calculations
export function calculateEstimatedAnnualTakeHomeIncome(grossAnnualIncome: number): {
  annualTakeHome: number
  taxes: number
  healthcare: number
  retirement: number
} {
  const gross = safeNumber(grossAnnualIncome)
  const taxes = gross * 0.22
  const healthcare = gross * 0.04
  const retirement = gross * 0.04
  const annualTakeHome = gross - taxes - healthcare - retirement
  return { annualTakeHome, taxes, healthcare, retirement }
}

// Format currency for display
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(safeNumber(amount))
}

// Format percentage for display
export function formatPercentage(decimal: number): string {
  return `${(safeNumber(decimal) * 100).toFixed(1)}%`
}
