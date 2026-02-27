// Core real estate calculation functions
import type { FinancialItem } from "./real-estate-types"
import { DEFAULTS } from "./finance-core"
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

// Safe number utility
export function safeNumber(value: any, defaultValue = 0): number {
  const num = Number(value)
  return isNaN(num) || !isFinite(num) ? defaultValue : num
}

// Calculate monthly mortgage payment (P&I only)
export function calculateMonthlyPayment(loanAmount: number, interestRate: number, loanTermYears: number): number {
  const principal = safeNumber(loanAmount)
  const rate = safeNumber(interestRate) / 100 / 12
  const payments = safeNumber(loanTermYears) * 12

  if (principal <= 0 || payments <= 0) return 0
  if (rate === 0) return principal / payments

  return (principal * rate) / (1 - Math.pow(1 + rate, -payments))
}

// Calculate total monthly housing payment (PITI)
export function calculateTotalMonthlyPayment(
  purchasePrice: number,
  downPayment: number,
  interestRate: number,
  loanTermYears: number,
  propertyTaxRate: number,
  annualInsurance: number,
  monthlyHOA = 0,
  pmiRate = 0,
): MortgageCalculation {
  const loanAmount = Math.max(0, safeNumber(purchasePrice) - safeNumber(downPayment))
  const principalAndInterest = calculateMonthlyPayment(loanAmount, interestRate, loanTermYears)
  const propertyTax = (safeNumber(purchasePrice) * safeNumber(propertyTaxRate)) / 12
  const insurance = safeNumber(annualInsurance) / 12
  const pmi =
    loanAmount > 0 && safeNumber(downPayment) / safeNumber(purchasePrice) < 0.2
      ? (loanAmount * safeNumber(pmiRate)) / 12
      : 0

  const monthlyPayment = principalAndInterest + propertyTax + insurance + safeNumber(monthlyHOA) + pmi
  const totalPayments = principalAndInterest * loanTermYears * 12
  const totalInterest = totalPayments - loanAmount

  return {
    monthlyPayment,
    totalInterest,
    totalPayments,
    principalAndInterest,
    propertyTax,
    insurance,
    pmi: pmi > 0 ? pmi : undefined,
  }
}

// Calculate maximum affordable home price
export function calculateMaxAffordablePrice(
  annualIncome: number,
  monthlyExpenses: number,
  fixedDebts: number,
  downPaymentSources: number,
  interestRate: number,
  loanTermYears: number,
  propertyTaxRate = 0.015,
  annualInsurance = 1800,
  housingRatio = 0.28,
  dtiRatio = 0.43,
): AffordabilityAnalysis {
  const grossMonthlyIncome = safeNumber(annualIncome) / 12
  const takeHomeIncome = grossMonthlyIncome * 0.7 // Rough estimate

  // Calculate maximum monthly payment using both ratios
  const maxPaymentFromHousingRatio = grossMonthlyIncome * safeNumber(housingRatio)
  const maxPaymentFromDTI = grossMonthlyIncome * safeNumber(dtiRatio) - safeNumber(fixedDebts)
  const maxMonthlyPayment = Math.min(maxPaymentFromHousingRatio, maxPaymentFromDTI)

  // Calculate available budget after expenses
  const availableBudget = takeHomeIncome - safeNumber(monthlyExpenses) - safeNumber(fixedDebts)
  const conservativeMaxPayment = Math.min(maxMonthlyPayment, availableBudget)

  // Iteratively solve for maximum purchase price
  let maxPrice = 0
  let estimate = 300000 // Starting estimate

  for (let i = 0; i < 50; i++) {
    const downPayment = Math.min(safeNumber(downPaymentSources), estimate * 0.2)
    const calculation = calculateTotalMonthlyPayment(
      estimate,
      downPayment,
      interestRate,
      loanTermYears,
      propertyTaxRate,
      annualInsurance,
    )

    if (calculation.monthlyPayment <= conservativeMaxPayment) {
      maxPrice = estimate
      estimate *= 1.1 // Increase estimate
    } else {
      estimate *= 0.95 // Decrease estimate
    }

    // Check for convergence
    if (Math.abs(calculation.monthlyPayment - conservativeMaxPayment) < 50) {
      maxPrice = estimate
      break
    }
  }

  // Calculate final metrics
  const requiredDownPayment = maxPrice * 0.2
  const finalCalculation = calculateTotalMonthlyPayment(
    maxPrice,
    Math.min(downPaymentSources, requiredDownPayment),
    interestRate,
    loanTermYears,
    propertyTaxRate,
    annualInsurance,
  )

  const finalDTI = ((safeNumber(fixedDebts) + finalCalculation.monthlyPayment) / grossMonthlyIncome) * 100
  const remainingBudget =
    takeHomeIncome - finalCalculation.monthlyPayment - safeNumber(monthlyExpenses) - safeNumber(fixedDebts)

  // Determine constraints and opportunities
  const constraints: string[] = []
  const opportunities: string[] = []

  if (maxPrice <= 0) {
    constraints.push("Current expenses exceed income - reduce expenses to afford a home")
  }

  if (safeNumber(downPaymentSources) < requiredDownPayment) {
    constraints.push(
      `Need ${((requiredDownPayment - safeNumber(downPaymentSources)) / 1000).toFixed(0)}k more for down payment`,
    )
  }

  if (finalDTI > 40) {
    constraints.push(`High DTI ratio: ${finalDTI.toFixed(1)}% (lenders prefer <43%)`)
  }

  if (remainingBudget < 500) {
    constraints.push("Tight budget - consider increasing income or reducing expenses")
  }

  if (remainingBudget > 1000) {
    opportunities.push(
      `Strong budget position - could afford ${((remainingBudget * 200) / 1000).toFixed(0)}k more house`,
    )
  }

  if (safeNumber(downPaymentSources) > requiredDownPayment * 1.1) {
    opportunities.push("Excess down payment available - consider higher price range or lower monthly payment")
  }

  return {
    maxPurchasePrice: Math.max(0, maxPrice),
    maxMonthlyPayment: Math.max(0, conservativeMaxPayment),
    requiredDownPayment: Math.max(0, requiredDownPayment),
    dtiRatio: finalDTI,
    remainingBudget,
    canAfford: maxPrice > 0 && remainingBudget >= 0,
    constraints,
    opportunities,
  }
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

// Calculate gross annual income from active financial items
export function calculateGrossAnnualIncome(
  items: Array<{ amount?: number; active: boolean; frequency?: string }>
): number {
  return items
    .filter((item) => item.active)
    .reduce((sum, item) => {
      const amount = item.amount ?? 0
      if (item.frequency === "monthly") return sum + amount * 12
      return sum + amount // annual by default
    }, 0)
}

// Calculate estimated annual take-home income broken down by withholding category
export function calculateEstimatedAnnualTakeHomeIncome(grossAnnualIncome: number): {
  annualTakeHome: number
  taxes: number
  healthcare: number
  retirement: number
} {
  const gross = safeNumber(grossAnnualIncome)
  const taxes = Math.round(gross * 0.25)
  const healthcare = Math.round(gross * 0.05)
  const retirement = Math.round(gross * 0.05)
  const annualTakeHome = gross - taxes - healthcare - retirement
  return { annualTakeHome, taxes, healthcare, retirement }
}

// Calculate per-item take-home income — respects each item's incomeEntry (gross/net)
// and individual withholding percentages, falling back to DEFAULTS for gross items.
// Net items are passed through as-is. Used by the Real Estate Planner.
export function calculateTakeHomeFromIncomeItems(incomeItems: FinancialItem[]): {
  annualTakeHome: number
  taxes: number
  retirement: number
  healthcare: number
  hsa: number
  other: number
} {
  let annualTakeHome = 0
  let taxes = 0
  let retirement = 0
  let healthcare = 0
  let hsa = 0
  let other = 0

  for (const item of incomeItems) {
    if (!item.active) continue
    const annualGross =
      item.frequency === "monthly" ? (item.amount ?? 0) * 12 : (item.amount ?? 0)

    if (item.incomeEntry === "net") {
      // Net income — already take-home, no withholding applied
      annualTakeHome += annualGross
    } else {
      // Gross income — apply per-item rates or fall back to DEFAULTS
      const taxPct    = item.withholdingTaxPct        ?? DEFAULTS.withholdingTaxPct
      const ret401Pct = item.withholding401kPct        ?? DEFAULTS.withholding401kPct
      const hcPct     = item.withholdingHealthcarePct  ?? DEFAULTS.withholdingHealthcarePct
      const hsaPct    = item.withholdingHSAPct         ?? DEFAULTS.withholdingHSAPct
      const otherPct  = item.withholdingOtherPct       ?? 0

      const itemTaxes = Math.round(annualGross * taxPct / 100)
      const itemRet   = Math.round(annualGross * ret401Pct / 100)
      const itemHC    = Math.round(annualGross * hcPct / 100)
      const itemHSA   = Math.round(annualGross * hsaPct / 100)
      const itemOther = Math.round(annualGross * otherPct / 100)

      annualTakeHome += annualGross - itemTaxes - itemRet - itemHC - itemHSA - itemOther
      taxes     += itemTaxes
      retirement += itemRet
      healthcare += itemHC
      hsa       += itemHSA
      other     += itemOther
    }
  }

  return { annualTakeHome, taxes, retirement, healthcare, hsa, other }
}

// Calculate affordability analysis from user inputs
export function calculateAffordability(input: {
  annualIncome: number
  monthlyExpenses: number
  fixedDebts: number
  downPaymentSources: number
  interestRate: number
  loanTerm: number
  housingPercentage: number
}): AffordabilityAnalysis {
  return calculateMaxAffordablePrice(
    input.annualIncome,
    input.monthlyExpenses,
    input.fixedDebts,
    input.downPaymentSources,
    input.interestRate,
    input.loanTerm,
    0.015,
    1800,
    input.housingPercentage / 100,
    0.43,
  )
}

// Monthly P&I payment for a given loan amount
export function calculateMonthlyMortgagePaymentForPrice(
  loanAmount: number,
  interestRate: number,
  termYears: number,
): number {
  const principal = safeNumber(loanAmount)
  const monthlyRate = safeNumber(interestRate) / 12
  const payments = safeNumber(termYears) * 12
  if (principal <= 0 || payments <= 0) return 0
  if (monthlyRate === 0) return principal / payments
  return (principal * monthlyRate) / (1 - Math.pow(1 + monthlyRate, -payments))
}

// Estimated transaction costs (closing costs + fees) for a purchase
export function calculateTransactionCosts(purchasePrice: number): number {
  // ~3% of purchase price covers closing costs, inspection, title, etc.
  return Math.round(safeNumber(purchasePrice) * 0.03)
}

// Bank qualification purchase price (DTI method, 43% of gross income)
export function calculateGrossPurchasePrice(
  grossAnnualIncome: number,
  fixedDebtsMonthly: number,
  interestRate: number,
  termYears: number,
  propertyTaxRate: number,
  homeownersInsuranceAnnual: number,
): {
  grossPurchasePrice: number
  maxLoanAmount: number
  requiredDownPayment: number
} {
  const grossMonthlyIncome = safeNumber(grossAnnualIncome) / 12
  const maxMonthlyHousing = grossMonthlyIncome * 0.43 - safeNumber(fixedDebtsMonthly)

  if (maxMonthlyHousing <= 0) {
    return { grossPurchasePrice: 0, maxLoanAmount: 0, requiredDownPayment: 0 }
  }

  // Binary search for max purchase price
  let lo = 0
  let hi = 5000000
  for (let i = 0; i < 50; i++) {
    const mid = (lo + hi) / 2
    const downPayment = mid * 0.2
    const loanAmount = mid - downPayment
    const pi = calculateMonthlyMortgagePaymentForPrice(loanAmount, interestRate, termYears)
    const tax = (mid * safeNumber(propertyTaxRate)) / 12
    const insurance = safeNumber(homeownersInsuranceAnnual) / 12
    const totalPITI = pi + tax + insurance
    if (totalPITI < maxMonthlyHousing) {
      lo = mid
    } else {
      hi = mid
    }
    if (hi - lo < 100) break
  }

  const grossPurchasePrice = Math.round(lo)
  const requiredDownPayment = Math.round(grossPurchasePrice * 0.2)
  const maxLoanAmount = grossPurchasePrice - requiredDownPayment

  return { grossPurchasePrice, maxLoanAmount, requiredDownPayment }
}

// Livability purchase price (based on take-home income and actual lifestyle budget)
export function calculateLivabilityPurchasePrice(
  monthlyTakeHomeIncome: number,
  futureIncomeMonthly: number,
  futureExpensesMonthly: number,
  fixedDebtsMonthly: number,
  lifestyleExpensesMonthly: number,
  interestRate: number,
  termYears: number,
  availableDownPayment: number,
  downPaymentPercentage: number,
  propertyTaxRate: number,
  homeownersInsuranceAnnual: number,
  livabilityIncomePercentage: number,
): {
  livabilityPurchasePrice: number
  maxLoanAmount: number
  adjustedTakeHome: number
  effectiveDownPaymentPercentage: number
  excessDownPayment: number
  excessApplication: string
} {
  const adjustedTakeHome =
    safeNumber(monthlyTakeHomeIncome) + safeNumber(futureIncomeMonthly) - safeNumber(futureExpensesMonthly)

  const maxMonthlyForHousing = adjustedTakeHome * safeNumber(livabilityIncomePercentage)

  if (maxMonthlyForHousing <= 0 || adjustedTakeHome <= 0) {
    return {
      livabilityPurchasePrice: 0,
      maxLoanAmount: 0,
      adjustedTakeHome,
      effectiveDownPaymentPercentage: safeNumber(downPaymentPercentage),
      excessDownPayment: 0,
      excessApplication: "None",
    }
  }

  const downPct = safeNumber(downPaymentPercentage) / 100
  const available = safeNumber(availableDownPayment)

  // Binary search for purchase price where PITI ≈ maxMonthlyForHousing
  let lo = 0
  let hi = 5000000
  for (let i = 0; i < 60; i++) {
    const mid = (lo + hi) / 2
    const requiredDown = mid * downPct
    const actualDown = Math.min(available, requiredDown)
    const loanAmount = mid - actualDown
    const pi = calculateMonthlyMortgagePaymentForPrice(loanAmount, interestRate, termYears)
    const tax = (mid * safeNumber(propertyTaxRate)) / 12
    const insurance = safeNumber(homeownersInsuranceAnnual) / 12
    const totalPITI = pi + tax + insurance
    if (totalPITI < maxMonthlyForHousing) {
      lo = mid
    } else {
      hi = mid
    }
    if (hi - lo < 100) break
  }

  const livabilityPurchasePrice = Math.round(lo)
  const requiredDown = livabilityPurchasePrice * downPct
  const actualDown = Math.min(available, requiredDown)
  const excessDownPayment = Math.max(0, Math.round(available - requiredDown))
  const maxLoanAmount = Math.max(0, livabilityPurchasePrice - actualDown)
  const effectiveDownPaymentPercentage =
    livabilityPurchasePrice > 0 ? (actualDown / livabilityPurchasePrice) * 100 : safeNumber(downPaymentPercentage)

  const excessApplication = excessDownPayment > 0 ? "Reduces Loan" : "None"

  return {
    livabilityPurchasePrice,
    maxLoanAmount,
    adjustedTakeHome,
    effectiveDownPaymentPercentage,
    excessDownPayment,
    excessApplication,
  }
}
