import { piti, safeNumber, DEFAULTS } from "./finance-core"
import type { Property, Scenario, PropertyAffordability } from "./property-types"

export const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(safeNumber(amount))
}

export const calculatePropertyAffordability = (property: Property, scenario: Scenario): PropertyAffordability => {
  const { financialInputs } = scenario

  const grossMonthlyIncome = safeNumber(financialInputs.annualIncome) / 12
  const takeHomeIncome = grossMonthlyIncome * 0.7

  const maxMonthlyPayment = grossMonthlyIncome * 0.28

  // Use finance-core PITI for consistent math and 0% rate handling
  const downPaymentAmount = property.price * 0.2
  const dpPercent = property.price > 0 ? (downPaymentAmount / property.price) * 100 : 0

  // property.propertyTaxRate is stored as a decimal (0.015 = 1.5%), convert to percent for finance-core
  const propertyTaxRatePercent = safeNumber(property.propertyTaxRate) * 100 || DEFAULTS.propertyTaxRatePercent

  const calc = piti({
    purchasePrice: property.price,
    downPaymentPercent: dpPercent,
    interestRatePercent: safeNumber(financialInputs.interestRate),
    termYears: safeNumber(financialInputs.loanTerm),
    propertyTaxRatePercent,
    annualInsurance: DEFAULTS.annualInsurance,
    monthlyHOA: safeNumber((property as any).monthlyHOA) || 0,
  })

  const totalMonthlyPayment = calc.monthly

  const totalMonthlyDebts = safeNumber(financialInputs.fixedDebts) + totalMonthlyPayment
  const dtiRatio = grossMonthlyIncome > 0 ? (totalMonthlyDebts / grossMonthlyIncome) * 100 : 1000

  const remainingBudget =
    takeHomeIncome -
    totalMonthlyPayment -
    safeNumber(financialInputs.monthlyExpenses) -
    safeNumber(financialInputs.fixedDebts)

  const canAfford =
    totalMonthlyPayment <= maxMonthlyPayment &&
    dtiRatio <= 43 &&
    safeNumber(financialInputs.downPaymentSources) >= downPaymentAmount &&
    remainingBudget >= 0

  const paymentScore = Math.max(0, 100 - (totalMonthlyPayment / Math.max(1, maxMonthlyPayment)) * 100)
  const dtiScore = Math.max(0, 100 - (dtiRatio / 43) * 100)
  const downPaymentScore = Math.min(
    100,
    (safeNumber(financialInputs.downPaymentSources) / Math.max(1, downPaymentAmount)) * 100,
  )
  const budgetScore = Math.max(0, Math.min(100, (remainingBudget / 1000) * 100))

  const affordabilityScore = (paymentScore + dtiScore + downPaymentScore + budgetScore) / 4

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
    if (safeNumber(financialInputs.downPaymentSources) < downPaymentAmount) {
      constraints.push(
        `Need ${formatCurrency(Math.max(0, downPaymentAmount - safeNumber(financialInputs.downPaymentSources)))} more for down payment`,
      )
    }
    if (remainingBudget < 0) {
      constraints.push(`Budget shortfall of ${formatCurrency(Math.abs(remainingBudget))} per month`)
    }
  } else {
    if (remainingBudget > 1000) {
      recommendations.push(`Strong budget position with ${formatCurrency(remainingBudget)} monthly cushion`)
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
    remainingBudget,
    dtiRatio,
    recommendations,
    constraints,
  }
}
