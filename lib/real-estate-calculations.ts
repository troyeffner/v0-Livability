// Core real estate calculation functions
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
  items: Array<{ amount: number; active: boolean; frequency?: string }>
): number {
  return items
    .filter((item) => item.active)
    .reduce((sum, item) => {
      if (item.frequency === "monthly") return sum + item.amount * 12
      return sum + item.amount // annual by default
    }, 0)
}

// Calculate estimated annual take-home income (after taxes)
export function calculateEstimatedAnnualTakeHomeIncome(grossAnnualIncome: number): number {
  return safeNumber(grossAnnualIncome) * 0.7
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
