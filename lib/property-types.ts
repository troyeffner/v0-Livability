export interface UserPreferences {
  maxPrice?: number
  minBedrooms?: number
  preferredAreas?: string[]
  mustHaveFeatures?: string[]
  dealBreakers?: string[]
}

export interface UserProfile {
  id: string
  name: string
  scenarios: Scenario[]
  activeScenarioId: string
  savedProperties: string[]
  journeyPhases: JourneyPhase[]
  preferences?: UserPreferences
}

export interface Scenario {
  id: string
  name: string
  description?: string
  active?: boolean
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
  annualTakeHomeIncome?: number  // computed from per-item gross/net withholding
  marketReferenceRate?: number   // today's 30yr prime rate for 760+ credit / 20% down; anchors rate estimation
}

export interface Property {
  id: string
  address: string
  price: number
  bedrooms: number
  bathrooms: number
  squareFeet: number
  yearBuilt: number
  propertyType: string
  neighborhood: string
  imageUrl: string
  features: string[]
  hoaFees?: number
  propertyTaxRate: number
  walkScore?: number
  commuteTime?: string
  schoolRating?: number
  city?: string
  state?: string
  zipCode?: string
  lotSize?: string
  listingDate?: string
  daysOnMarket?: number
  mlsNumber?: string
  description?: string
  schoolDistrict?: string
  estimatedInsurance?: number
  nearbyAmenities?: string[]
}

export interface PropertyAffordability {
  canAfford: boolean
  affordabilityScore: number
  monthlyPayment: number
  downPaymentNeeded: number
  monthlyMargin: number
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
  completed?: boolean
}

export interface AffordabilityCalculation {
  maxPurchasePrice: number
  maxMonthlyPayment: number
  actualMonthlyPayment: number
  availableDownPayment: number
  requiredDownPayment: number
  maxPriceFromDownPayment: number
  loanAmount: number
  dtiRatio: number
  monthlyIncome: number
  takeHomeIncome: number
  monthlyMargin: number
  constraints: string[]
  opportunities: string[]
  housingPercentage: number
  downPaymentPercentage: number
  monthlyPrincipalInterest: number
  monthlyPropertyTax: number
  monthlyInsurance: number
  downPaymentStatus: "on-target" | "excess" | "shortfall"
  excessAmount?: number
  shortfallAmount?: number
}
