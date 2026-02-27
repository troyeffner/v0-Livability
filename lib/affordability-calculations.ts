import type { Property, Scenario, PropertyAffordability, AffordabilityCalculation } from "./property-types"
import { DEFAULTS } from "./finance-core"

export const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}

/**
 * Estimate a realistic interest rate based on credit profile and market conditions.
 *
 * @param creditScore  - FICO score
 * @param loanTerm     - 15, 20, or 30 years
 * @param downPaymentPct - down payment percentage (10, 15, 20, 25…)
 * @param marketReferenceRate - today's 30yr fixed rate for 760+ credit / 20% down (default 6.85%)
 * @returns estimated rate rounded to nearest 0.125%
 */
export function estimateInterestRate(
  creditScore: number,
  loanTerm: number,
  downPaymentPct: number,
  marketReferenceRate: number = 6.85,
): number {
  // Credit score premium relative to 760+ (exceptional) baseline
  const creditAdj =
    creditScore >= 760 ? -0.25  :
    creditScore >= 720 ?  0.00  :
    creditScore >= 680 ?  0.375 :
    creditScore >= 640 ?  0.875 :
    creditScore >= 620 ?  1.375 : 2.25

  // Shorter terms carry lower rates (15yr ≈ 0.625% below 30yr)
  const termAdj =
    loanTerm <= 15 ? -0.625 :
    loanTerm <= 20 ? -0.375 : 0.00

  // Lower down payment = higher lender risk
  const dpAdj =
    downPaymentPct < 15 ? 0.25  :
    downPaymentPct < 20 ? 0.125 : 0.00

  const raw = marketReferenceRate + creditAdj + termAdj + dpAdj
  // Round to nearest 0.125%
  return Math.round(raw * 8) / 8
}

export const calculatePropertyAffordability = (property: Property, scenario: Scenario): PropertyAffordability => {
  const { financialInputs } = scenario

  // Calculate monthly income
  const grossMonthlyIncome = financialInputs.annualIncome / 12
  const takeHomeIncome = grossMonthlyIncome * 0.7 // Rough estimate

  // Calculate maximum monthly payment (28% of gross income rule)
  const maxMonthlyPayment = grossMonthlyIncome * 0.28

  // Calculate mortgage payment for this property
  const downPaymentAmount = property.price * 0.2 // 20% down
  const loanAmount = property.price - downPaymentAmount
  const monthlyInterestRate = financialInputs.interestRate / 100 / 12
  const numberOfPayments = financialInputs.loanTerm * 12

  const monthlyPrincipalInterest =
    (loanAmount * monthlyInterestRate) / (1 - Math.pow(1 + monthlyInterestRate, -numberOfPayments))

  const monthlyPropertyTax = (property.price * property.propertyTaxRate) / 12
  const monthlyInsurance = (property.estimatedInsurance ?? DEFAULTS.annualInsurance) / 12
  const monthlyHOA = property.hoaFees || 0

  const totalMonthlyPayment = monthlyPrincipalInterest + monthlyPropertyTax + monthlyInsurance + monthlyHOA

  // Calculate DTI ratio
  const totalMonthlyDebts = financialInputs.fixedDebts + totalMonthlyPayment
  const dtiRatio = (totalMonthlyDebts / grossMonthlyIncome) * 100

  // Calculate monthly margin (what's left after housing + expenses + debts)
  const monthlyMargin =
    takeHomeIncome - totalMonthlyPayment - financialInputs.monthlyExpenses - financialInputs.fixedDebts

  // Determine affordability
  const canAfford =
    totalMonthlyPayment <= maxMonthlyPayment &&
    dtiRatio <= 43 &&
    financialInputs.downPaymentSources >= downPaymentAmount &&
    monthlyMargin >= 0

  // Calculate affordability score (0-100)
  const paymentScore = Math.max(0, 100 - (totalMonthlyPayment / maxMonthlyPayment) * 100)
  const dtiScore = Math.max(0, 100 - (dtiRatio / 43) * 100)
  const downPaymentScore = Math.min(100, (financialInputs.downPaymentSources / downPaymentAmount) * 100)
  const marginScore = Math.max(0, Math.min(100, (monthlyMargin / 1000) * 100))

  const affordabilityScore = (paymentScore + dtiScore + downPaymentScore + marginScore) / 4

  // Generate recommendations and constraints
  const recommendations: string[] = []
  const constraints: string[] = []

  if (!canAfford) {
    if (totalMonthlyPayment > maxMonthlyPayment) {
      constraints.push(
        `Monthly payment ${formatCurrency(totalMonthlyPayment)} exceeds recommended ${formatCurrency(maxMonthlyPayment)}`,
      )
    }
    if (dtiRatio > 43) {
      constraints.push(`DTI ratio ${dtiRatio.toFixed(1)}% exceeds 43% limit`)
    }
    if (financialInputs.downPaymentSources < downPaymentAmount) {
      constraints.push(
        `Need ${formatCurrency(downPaymentAmount - financialInputs.downPaymentSources)} more for down payment`,
      )
    }
    if (monthlyMargin < 0) {
      constraints.push(`Monthly shortfall of ${formatCurrency(Math.abs(monthlyMargin))} after all obligations`)
    }
  } else {
    if (monthlyMargin > 1000) {
      recommendations.push(`Strong monthly margin of ${formatCurrency(monthlyMargin)} — good cushion each month`)
    }
    if (dtiRatio < 30) {
      recommendations.push(`Excellent DTI ratio of ${dtiRatio.toFixed(1)}%`)
    }
  }

  return {
    canAfford,
    affordabilityScore,
    monthlyPayment: totalMonthlyPayment,
    downPaymentNeeded: downPaymentAmount,
    monthlyMargin,
    dtiRatio,
    recommendations,
    constraints,
  }
}

export function calculateMaxAffordability(
  scenario: Scenario,
  housingPercentage: number,
  downPaymentPercentage: number,
  annualPropertyTaxRate?: number,
): AffordabilityCalculation {
  const { financialInputs } = scenario

  const grossAnnualIncome = financialInputs.annualIncome + (financialInputs.futureIncomeMonthly || 0) * 12
  const grossMonthlyIncome = grossAnnualIncome / 12
  // Use per-item take-home if available (from gross/net withholding), otherwise fall back to 30% deduction estimate
  const takeHomeIncome = financialInputs.annualTakeHomeIncome
    ? financialInputs.annualTakeHomeIncome / 12
    : grossMonthlyIncome * 0.7

  const totalMonthlyExpenses = financialInputs.monthlyExpenses
  const fixedDebts = financialInputs.fixedDebts

  const maxDTI = 0.43
  const maxTotalDebtPayment = grossMonthlyIncome * maxDTI
  const maxHousingPaymentFromDTI = maxTotalDebtPayment - fixedDebts

  const maxLivabilityPayment = takeHomeIncome * (housingPercentage / 100)
  const availableForHousing = takeHomeIncome - totalMonthlyExpenses - fixedDebts

  const maxMonthlyPayment = Math.max(
    0,
    Math.min(maxHousingPaymentFromDTI, Math.min(maxLivabilityPayment, availableForHousing)),
  )

  const interestRate = financialInputs.interestRate / 100 / 12
  const numPayments = financialInputs.loanTerm * 12
  const propertyTaxRate = (annualPropertyTaxRate ?? 0.0181) / 12
  const insuranceRate = DEFAULTS.annualInsurance / 12

  let idealHousePrice = 0
  let estimate = 400000

  for (let i = 0; i < 50; i++) {
    const propertyTax = estimate * propertyTaxRate
    const insurance = insuranceRate
    const availableForPI = maxMonthlyPayment - propertyTax - insurance

    if (availableForPI <= 0) {
      estimate *= 0.8
      continue
    }

    const maxLoanFromPayment =
      availableForPI > 0 && interestRate > 0
        ? (availableForPI * (1 - Math.pow(1 + interestRate, -numPayments))) / interestRate
        : availableForPI * numPayments

    const purchasePriceFromLoan = maxLoanFromPayment / (1 - downPaymentPercentage / 100)

    if (Math.abs(purchasePriceFromLoan - estimate) < 1000) {
      idealHousePrice = purchasePriceFromLoan
      break
    }

    estimate = purchasePriceFromLoan
    idealHousePrice = purchasePriceFromLoan
  }

  const requiredDownPayment = (idealHousePrice * downPaymentPercentage) / 100
  const availableDownPayment = financialInputs.downPaymentSources

  let downPaymentStatus: "on-target" | "excess" | "shortfall"
  let excessAmount: number | undefined
  let shortfallAmount: number | undefined

  const tolerance = requiredDownPayment * 0.05

  if (availableDownPayment < requiredDownPayment - tolerance) {
    downPaymentStatus = "shortfall"
    shortfallAmount = requiredDownPayment - availableDownPayment
  } else if (availableDownPayment > requiredDownPayment + tolerance) {
    downPaymentStatus = "excess"
    excessAmount = availableDownPayment - requiredDownPayment
  } else {
    downPaymentStatus = "on-target"
  }

  const excessDownPaymentStrategy = financialInputs.excessDownPaymentStrategy || "save"
  let finalMaxPurchasePrice: number
  let actualDownPaymentUsed: number
  let actualMonthlyPayment: number

  if (downPaymentStatus === "shortfall") {
    finalMaxPurchasePrice = availableDownPayment / (downPaymentPercentage / 100)
    actualDownPaymentUsed = availableDownPayment
    const loanAmount = Math.max(0, finalMaxPurchasePrice - actualDownPaymentUsed)
    const monthlyPropertyTax = finalMaxPurchasePrice * propertyTaxRate
    const monthlyInsurance = insuranceRate
    const monthlyPrincipalInterest =
      loanAmount > 0 && interestRate > 0
        ? (loanAmount * interestRate) / (1 - Math.pow(1 + interestRate, -numPayments))
        : loanAmount / numPayments
    actualMonthlyPayment = monthlyPrincipalInterest + monthlyPropertyTax + monthlyInsurance
  } else if (downPaymentStatus === "excess") {
    if (excessDownPaymentStrategy === "increase-price") {
      finalMaxPurchasePrice = idealHousePrice + excessAmount!
      actualDownPaymentUsed = availableDownPayment
      const loanAmount = Math.max(0, finalMaxPurchasePrice - actualDownPaymentUsed)
      const monthlyPropertyTax = finalMaxPurchasePrice * propertyTaxRate
      const monthlyInsurance = insuranceRate
      const monthlyPrincipalInterest =
        loanAmount > 0 && interestRate > 0
          ? (loanAmount * interestRate) / (1 - Math.pow(1 + interestRate, -numPayments))
          : loanAmount / numPayments
      actualMonthlyPayment = monthlyPrincipalInterest + monthlyPropertyTax + monthlyInsurance
    } else if (excessDownPaymentStrategy === "reduce-payment") {
      finalMaxPurchasePrice = idealHousePrice
      actualDownPaymentUsed = availableDownPayment
      const loanAmount = Math.max(0, finalMaxPurchasePrice - actualDownPaymentUsed)
      const monthlyPropertyTax = finalMaxPurchasePrice * propertyTaxRate
      const monthlyInsurance = insuranceRate
      const monthlyPrincipalInterest =
        loanAmount > 0 && interestRate > 0
          ? (loanAmount * interestRate) / (1 - Math.pow(1 + interestRate, -numPayments))
          : loanAmount / numPayments
      actualMonthlyPayment = monthlyPrincipalInterest + monthlyPropertyTax + monthlyInsurance
    } else {
      finalMaxPurchasePrice = idealHousePrice
      actualDownPaymentUsed = requiredDownPayment
      actualMonthlyPayment = maxMonthlyPayment
    }
  } else {
    finalMaxPurchasePrice = idealHousePrice
    actualDownPaymentUsed = requiredDownPayment
    actualMonthlyPayment = maxMonthlyPayment
  }

  const loanAmount = Math.max(0, finalMaxPurchasePrice - actualDownPaymentUsed)
  const monthlyPropertyTax = finalMaxPurchasePrice * propertyTaxRate
  const monthlyInsurance = insuranceRate
  const monthlyPrincipalInterest =
    loanAmount > 0 && interestRate > 0
      ? (loanAmount * interestRate) / (1 - Math.pow(1 + interestRate, -numPayments))
      : loanAmount / numPayments

  const dtiRatio = ((actualMonthlyPayment + fixedDebts) / grossMonthlyIncome) * 100
  const monthlyMargin =
    takeHomeIncome -
    actualMonthlyPayment -
    totalMonthlyExpenses -
    fixedDebts -
    (financialInputs.futureExpensesMonthly || 0)

  const constraints: string[] = []
  const opportunities: string[] = []

  if (downPaymentStatus === "shortfall") {
    constraints.push(
      `Need ${formatCurrency(shortfallAmount!)} more down payment to afford your ideal ${formatCurrency(idealHousePrice)} house`,
    )
  }

  if (maxMonthlyPayment <= 0) {
    constraints.push("Current expenses exceed income - reduce expenses to afford a home")
  }

  if (dtiRatio > 40) {
    constraints.push(`High DTI ratio: ${dtiRatio.toFixed(1)}% (banks prefer <43%)`)
  }

  if (monthlyMargin < 500) {
    constraints.push("Tight monthly margin — consider reducing housing target or increasing income")
  }

  if (monthlyMargin > 1000) {
    opportunities.push(`Strong monthly margin — could afford ${formatCurrency(monthlyMargin * 200)} more house`)
  }

  if (downPaymentStatus === "excess" && excessDownPaymentStrategy === "save") {
    opportunities.push(
      `Consider using your ${formatCurrency(excessAmount!)} excess down payment to buy a more expensive house or reduce monthly payments`,
    )
  }

  return {
    maxPurchasePrice: Math.max(0, finalMaxPurchasePrice),
    maxMonthlyPayment: Math.max(0, maxMonthlyPayment),
    actualMonthlyPayment: Math.max(0, actualMonthlyPayment),
    availableDownPayment,
    requiredDownPayment: Math.max(0, requiredDownPayment),
    maxPriceFromDownPayment: availableDownPayment / (downPaymentPercentage / 100),
    loanAmount: Math.max(0, loanAmount),
    dtiRatio,
    monthlyIncome: grossMonthlyIncome,
    takeHomeIncome,
    monthlyMargin,
    constraints,
    opportunities,
    housingPercentage,
    downPaymentPercentage,
    monthlyPrincipalInterest: Math.max(0, monthlyPrincipalInterest),
    monthlyPropertyTax: Math.max(0, monthlyPropertyTax),
    monthlyInsurance: Math.max(0, monthlyInsurance),
    downPaymentStatus,
    excessAmount,
    shortfallAmount,
  }
}
