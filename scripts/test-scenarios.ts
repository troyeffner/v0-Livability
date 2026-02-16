// Test various real-world scenarios
console.log("Testing real-world scenarios...")

interface TestScenario {
  name: string
  annualIncome: number
  monthlyExpenses: number
  fixedDebts: number
  downPaymentSources: number
  expectedAffordable: boolean
  notes: string
}

const testScenarios: TestScenario[] = [
  {
    name: "First-time buyer",
    annualIncome: 65000,
    monthlyExpenses: 2500,
    fixedDebts: 400,
    downPaymentSources: 25000,
    expectedAffordable: true,
    notes: "Modest income, careful spending",
  },
  {
    name: "High earner, high expenses",
    annualIncome: 150000,
    monthlyExpenses: 8000,
    fixedDebts: 1200,
    downPaymentSources: 100000,
    expectedAffordable: false,
    notes: "Lifestyle inflation limits affordability",
  },
  {
    name: "Dual income couple",
    annualIncome: 120000,
    monthlyExpenses: 4000,
    fixedDebts: 800,
    downPaymentSources: 80000,
    expectedAffordable: true,
    notes: "Combined income, shared expenses",
  },
  {
    name: "Recent graduate",
    annualIncome: 45000,
    monthlyExpenses: 2000,
    fixedDebts: 600,
    downPaymentSources: 15000,
    expectedAffordable: false,
    notes: "Low income, student loans",
  },
  {
    name: "Mid-career professional",
    annualIncome: 95000,
    monthlyExpenses: 3500,
    fixedDebts: 300,
    downPaymentSources: 60000,
    expectedAffordable: true,
    notes: "Stable income, low debt",
  },
]

// Test property for all scenarios
const testProperty = {
  price: 350000,
  propertyTaxRate: 0.015,
}

testScenarios.forEach((scenario, index) => {
  console.log(`\n--- Scenario ${index + 1}: ${scenario.name} ---`)

  const grossMonthlyIncome = scenario.annualIncome / 12
  const takeHomeIncome = grossMonthlyIncome * 0.7
  const maxMonthlyPayment = grossMonthlyIncome * 0.28

  // Calculate mortgage payment
  const downPaymentAmount = testProperty.price * 0.2
  const loanAmount = testProperty.price - downPaymentAmount
  const monthlyInterestRate = 0.065 / 12
  const numberOfPayments = 30 * 12

  const monthlyPrincipalInterest =
    (loanAmount * monthlyInterestRate) / (1 - Math.pow(1 + monthlyInterestRate, -numberOfPayments))

  const monthlyPropertyTax = (testProperty.price * testProperty.propertyTaxRate) / 12
  const monthlyInsurance = 150
  const totalMonthlyPayment = monthlyPrincipalInterest + monthlyPropertyTax + monthlyInsurance

  // Calculate affordability
  const dtiRatio = ((scenario.fixedDebts + totalMonthlyPayment) / grossMonthlyIncome) * 100
  const remainingBudget = takeHomeIncome - totalMonthlyPayment - scenario.monthlyExpenses - scenario.fixedDebts

  const canAfford =
    totalMonthlyPayment <= maxMonthlyPayment &&
    dtiRatio <= 43 &&
    scenario.downPaymentSources >= downPaymentAmount &&
    remainingBudget >= 0

  console.log(`Income: $${scenario.annualIncome.toLocaleString()} ($${grossMonthlyIncome.toFixed(0)}/mo)`)
  console.log(`Monthly payment: $${totalMonthlyPayment.toFixed(0)}`)
  console.log(`DTI ratio: ${dtiRatio.toFixed(1)}%`)
  console.log(`Down payment available: $${scenario.downPaymentSources.toLocaleString()}`)
  console.log(`Down payment needed: $${downPaymentAmount.toLocaleString()}`)
  console.log(`Remaining budget: $${remainingBudget.toFixed(0)}`)
  console.log(`Can afford: ${canAfford ? "YES" : "NO"}`)
  console.log(`Expected: ${scenario.expectedAffordable ? "YES" : "NO"}`)
  console.log(`Notes: ${scenario.notes}`)

  // Verify expectation
  if (canAfford === scenario.expectedAffordable) {
    console.log("✅ Expectation met")
  } else {
    console.log("❌ Expectation not met - review calculation")
  }
})

console.log("\nScenario testing complete!")
