import type { Property, Scenario, PropertyAffordability } from "./property-types"

export const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
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
  const monthlyInsurance = 1800 / 12 // Estimate
  const monthlyHOA = property.monthlyHOA || 0

  const totalMonthlyPayment = monthlyPrincipalInterest + monthlyPropertyTax + monthlyInsurance + monthlyHOA

  // Calculate DTI ratio
  const totalMonthlyDebts = financialInputs.fixedDebts + totalMonthlyPayment
  const dtiRatio = (totalMonthlyDebts / grossMonthlyIncome) * 100

  // Calculate remaining budget
  const remainingBudget =
    takeHomeIncome - totalMonthlyPayment - financialInputs.monthlyExpenses - financialInputs.fixedDebts

  // Determine affordability
  const canAfford =
    totalMonthlyPayment <= maxMonthlyPayment &&
    dtiRatio <= 43 &&
    financialInputs.downPaymentSources >= downPaymentAmount &&
    remainingBudget >= 0

  // Calculate affordability score (0-100)
  const paymentScore = Math.max(0, 100 - (totalMonthlyPayment / maxMonthlyPayment) * 100)
  const dtiScore = Math.max(0, 100 - (dtiRatio / 43) * 100)
  const downPaymentScore = Math.min(100, (financialInputs.downPaymentSources / downPaymentAmount) * 100)
  const budgetScore = Math.max(0, Math.min(100, (remainingBudget / 1000) * 100))

  const affordabilityScore = (paymentScore + dtiScore + downPaymentScore + budgetScore) / 4

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
