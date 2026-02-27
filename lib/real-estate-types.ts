// ─── Shared domain types (also in property-types.ts for the Property Workbench) ───

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
  completed?: boolean
}

// ─── Real Estate Planner types ─────────────────────────────────────────────────

export interface Item {
  id: string
  label: string
  amount?: number
  itemType: "income" | "expense" | "info"
  frequency?: "annual" | "monthly" | "one-time"
  active: boolean
  editable?: boolean
  value?: string | number
}

export interface FinancialItem extends Item {
  itemType: "income" | "expense" | "info"
  frequency: "annual" | "monthly" | "one-time"
  // Income-specific withholding fields (only relevant when itemType === "income")
  incomeEntry?: "gross" | "net"       // undefined treated as "gross" for backward compat
  withholdingTaxPct?: number          // federal + state tax %, e.g. 25
  withholding401kPct?: number         // 401k / retirement %, e.g. 5
  withholdingHealthcarePct?: number   // health insurance premium %, e.g. 5
  withholdingHSAPct?: number          // HSA contribution %, e.g. 0
  withholdingOtherPct?: number        // catch-all other deductions %, e.g. 0
}

export interface FutureItem extends Item {
  itemType: "income" | "expense"
  frequency: "annual" | "monthly" | "one-time"
}

export interface ItemCategory<T> {
  id: string
  name: string
  type?: "input" | "default"
  items: T[]
}

export interface MortgageItem {
  id: string
  label: string
  value?: string | number
  amount?: number
  itemType: "income" | "info" | "expense"
  frequency?: "one-time" | "monthly" | "annual"
  active: boolean
  editable?: boolean
}

export interface MortgageOptionGroup {
  id: string
  name: string
  type: "default" | "input" | "radio" | "select"
  items: MortgageItem[]
}

export interface TradeoffImpact {
  id: string
  message: string
  itemLabel: string
  gppImpact: number
  lppImpact: number
  type: string
  impactCategory: "Affordability" | "One-Time Cost" | "Loan Terms"
}
