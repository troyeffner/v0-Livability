export interface UserProfile {
  id: string
  name: string
  scenarios: Scenario[]
  activeScenarioId: string
  savedProperties: string[]
  journeyPhases: JourneyPhase[]
}

export interface Scenario {
  id: string
  name: string
  financialInputs: FinancialInputs
}

export interface FinancialInputs {
  annualIncome: number
  monthlyExpenses: number
  fixedDebts: number
  downPaymentSources: number
  interestRate: number
  loanTerm: number
  creditScore: number
  housingPercentage?: number
  downPaymentPercentage?: number
  futureIncomeMonthly?: number
  futureExpensesMonthly?: number
  excessDownPaymentStrategy?: "save" | "reduce-payment" | "increase-price"
}

export interface Property {
  id: string
  address: string
  price: number
  bedrooms: number
  bathrooms: number
  sqft: number
  yearBuilt: number
  propertyType: string
  neighborhood: string
  imageUrl: string
  features: string[]
  monthlyHOA?: number
  propertyTaxRate: number
  walkScore?: number
  commuteTime?: string
  schoolRating?: number
}

export interface PropertyAffordability {
  canAfford: boolean
  affordabilityScore: number
  monthlyPayment: number
  downPaymentNeeded: number
  remainingBudget: number
  dtiRatio: number
  recommendations: string[]
  constraints: string[]
}

export interface JourneyPhase {
  id: string
  name: string
  description: string
  properties: string[]
  color: string
}
