"use client"

import type React from "react"

import { useState, useRef } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { TrendingUp, Home, DollarSign, AlertTriangle, CheckCircle, Settings, ChevronDown, ChevronUp, Plus, Pencil, Trash2, Calendar, Info } from 'lucide-react'
import { formatCurrency } from "@/lib/affordability-calculations"
import type { Scenario } from "@/lib/property-types"

interface AffordabilitySummaryProps {
scenario: Scenario
onScenarioUpdate: (scenario: Scenario) => void
className?: string
}

interface FinancialItem {
id: string
label: string
amount: number
type: "income" | "expense" | "debt" | "downpayment"
frequency: "monthly" | "annual" | "one-time"
timing: "current" | "future"
active: boolean
editable: boolean
}

interface AffordabilityCalculation {
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
remainingBudget: number
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

const calculateMaxAffordability = (
scenario: Scenario,
housingPercentage: number,
downPaymentPercentage: number,
): AffordabilityCalculation => {
const { financialInputs } = scenario

// Calculate income
const grossAnnualIncome = financialInputs.annualIncome + (financialInputs.futureIncomeMonthly || 0) * 12
const grossMonthlyIncome = grossAnnualIncome / 12
const takeHomeIncome = grossMonthlyIncome * 0.7 // Rough estimate

// Calculate expenses
const totalMonthlyExpenses = financialInputs.monthlyExpenses
const fixedDebts = financialInputs.fixedDebts

// STEP 1: Calculate MAX MONTHLY PAYMENT (the constraint that determines ideal house price)
const maxDTI = 0.43 // 43% DTI limit
const maxTotalDebtPayment = grossMonthlyIncome * maxDTI
const maxHousingPaymentFromDTI = maxTotalDebtPayment - fixedDebts

// Livability-based calculation (user-defined percentage of take-home)
const maxLivabilityPayment = takeHomeIncome * (housingPercentage / 100)
const availableForHousing = takeHomeIncome - totalMonthlyExpenses - fixedDebts

// Use the most conservative approach for MAX MONTHLY PAYMENT
const maxMonthlyPayment = Math.max(
  0,
  Math.min(maxHousingPaymentFromDTI, Math.min(maxLivabilityPayment, availableForHousing)),
)

// STEP 2: Calculate IDEAL HOUSE PRICE from max monthly payment
const interestRate = financialInputs.interestRate / 100 / 12
const numPayments = financialInputs.loanTerm * 12
const propertyTaxRate = 0.0181 / 12 // 1.81% annually
const insuranceRate = 1800 / 12 // $1800 annually

let idealHousePrice = 0
let estimate = 400000 // Starting estimate

// Iteratively solve for ideal house price that fits the monthly payment budget
for (let i = 0; i < 50; i++) {
  const propertyTax = estimate * propertyTaxRate
  const insurance = insuranceRate
  const availableForPI = maxMonthlyPayment - propertyTax - insurance

  if (availableForPI <= 0) {
    estimate *= 0.8
    continue
  }

  // Calculate loan amount from P&I payment
  const maxLoanFromPayment =
    availableForPI > 0 && interestRate > 0
      ? (availableForPI * (1 - Math.pow(1 + interestRate, -numPayments))) / interestRate
      : availableForPI * numPayments // If interest rate is 0

  // Calculate purchase price from loan amount using down payment percentage
  const purchasePriceFromLoan = maxLoanFromPayment / (1 - downPaymentPercentage / 100)

  // Check for convergence
  if (Math.abs(purchasePriceFromLoan - estimate) < 1000) {
    idealHousePrice = purchasePriceFromLoan
    break
  }

  // Adjust estimate for next iteration
  estimate = purchasePriceFromLoan
  idealHousePrice = purchasePriceFromLoan
}

// STEP 3: Calculate REQUIRED DOWN PAYMENT for ideal house price
const requiredDownPayment = (idealHousePrice * downPaymentPercentage) / 100

// STEP 4: Get AVAILABLE DOWN PAYMENT and determine status
const availableDownPayment = financialInputs.downPaymentSources

// STEP 5: Determine the 3 states
let downPaymentStatus: "on-target" | "excess" | "shortfall"
let excessAmount: number | undefined
let shortfallAmount: number | undefined

const tolerance = requiredDownPayment * 0.05 // 5% tolerance for "on-target"

if (availableDownPayment < requiredDownPayment - tolerance) {
  // STATE 1: SHORTFALL - Can't afford ideal house
  downPaymentStatus = "shortfall"
  shortfallAmount = requiredDownPayment - availableDownPayment
} else if (availableDownPayment > requiredDownPayment + tolerance) {
  // STATE 2: EXCESS - Have more than needed
  downPaymentStatus = "excess"
  excessAmount = availableDownPayment - requiredDownPayment
} else {
  // STATE 3: ON TARGET - Just right
  downPaymentStatus = "on-target"
}

// STEP 6: Apply logic based on status and strategy
const excessDownPaymentStrategy = financialInputs.excessDownPaymentStrategy || "save"
let finalMaxPurchasePrice: number
let actualDownPaymentUsed: number
let actualMonthlyPayment: number

if (downPaymentStatus === "shortfall") {
  // LIMITED BY DOWN PAYMENT - Can only afford smaller house
  finalMaxPurchasePrice = availableDownPayment / (downPaymentPercentage / 100)
  actualDownPaymentUsed = availableDownPayment

  // Calculate actual monthly payment for this smaller house
  const loanAmount = Math.max(0, finalMaxPurchasePrice - actualDownPaymentUsed)
  const monthlyPropertyTax = finalMaxPurchasePrice * propertyTaxRate
  const monthlyInsurance = insuranceRate
  const monthlyPrincipalInterest =
    loanAmount > 0 && interestRate > 0
      ? (loanAmount * interestRate) / (1 - Math.pow(1 + interestRate, -numPayments))
      : loanAmount / numPayments
  actualMonthlyPayment = monthlyPrincipalInterest + monthlyPropertyTax + monthlyInsurance
} else if (downPaymentStatus === "excess") {
  // HAVE EXCESS - Apply strategy
  if (excessDownPaymentStrategy === "increase-price") {
    // Use excess to buy more expensive house - add excess to the ideal house price
    finalMaxPurchasePrice = idealHousePrice + excessAmount!
    actualDownPaymentUsed = availableDownPayment // Use full available down payment

    // Calculate monthly payment for this more expensive house
    const loanAmount = Math.max(0, finalMaxPurchasePrice - actualDownPaymentUsed)
    const monthlyPropertyTax = finalMaxPurchasePrice * propertyTaxRate
    const monthlyInsurance = insuranceRate
    const monthlyPrincipalInterest =
      loanAmount > 0 && interestRate > 0
        ? (loanAmount * interestRate) / (1 - Math.pow(1 + interestRate, -numPayments))
        : loanAmount / numPayments
    actualMonthlyPayment = monthlyPrincipalInterest + monthlyPropertyTax + monthlyInsurance
  } else if (excessDownPaymentStrategy === "reduce-payment") {
    // Use excess to reduce loan amount and monthly payment
    finalMaxPurchasePrice = idealHousePrice
    actualDownPaymentUsed = availableDownPayment // Use full amount to reduce loan

    // Calculate reduced monthly payment
    const loanAmount = Math.max(0, finalMaxPurchasePrice - actualDownPaymentUsed)
    const monthlyPropertyTax = finalMaxPurchasePrice * propertyTaxRate
    const monthlyInsurance = insuranceRate
    const monthlyPrincipalInterest =
      loanAmount > 0 && interestRate > 0
        ? (loanAmount * interestRate) / (1 - Math.pow(1 + interestRate, -numPayments))
        : loanAmount / numPayments
    actualMonthlyPayment = monthlyPrincipalInterest + monthlyPropertyTax + monthlyInsurance
  } else {
    // SAVE EXCESS - Use only what's needed for ideal house
    finalMaxPurchasePrice = idealHousePrice
    actualDownPaymentUsed = requiredDownPayment
    actualMonthlyPayment = maxMonthlyPayment
  }
} else {
  // ON TARGET - Perfect match
  finalMaxPurchasePrice = idealHousePrice
  actualDownPaymentUsed = requiredDownPayment
  actualMonthlyPayment = maxMonthlyPayment
}

// Calculate final loan amount and payment components
const loanAmount = Math.max(0, finalMaxPurchasePrice - actualDownPaymentUsed)
const monthlyPropertyTax = finalMaxPurchasePrice * propertyTaxRate
const monthlyInsurance = insuranceRate
const monthlyPrincipalInterest =
  loanAmount > 0 && interestRate > 0
    ? (loanAmount * interestRate) / (1 - Math.pow(1 + interestRate, -numPayments))
    : loanAmount / numPayments

const dtiRatio = ((actualMonthlyPayment + fixedDebts) / grossMonthlyIncome) * 100
const remainingBudget =
  takeHomeIncome -
  actualMonthlyPayment -
  totalMonthlyExpenses -
  fixedDebts -
  (financialInputs.futureExpensesMonthly || 0)

// Generate constraints and opportunities based on status
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

if (remainingBudget < 500) {
  constraints.push("Tight budget - consider reducing target payment or increasing income")
}

if (remainingBudget > 1000) {
  opportunities.push(`Strong budget position - could afford ${formatCurrency(remainingBudget * 200)} more house`)
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
  remainingBudget,
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

export default function AffordabilitySummary({
scenario,
onScenarioUpdate,
className = "",
}: AffordabilitySummaryProps) {
// Get housing percentage from scenario or default to 30%
const housingPercentage = scenario.financialInputs.housingPercentage || 30
const downPaymentPercentage = scenario.financialInputs.downPaymentPercentage || 20

// Scenario management state
const [isScenarioBuilderOpen, setIsScenarioBuilderOpen] = useState(false)

// Expense ideas modal state
const [isExpenseIdeasOpen, setIsExpenseIdeasOpen] = useState(false)

// Financial settings state
const [financialItems, setFinancialItems] = useState<FinancialItem[]>([
  // Income items
  {
    id: "base-income",
    label: "Base Salary",
    amount: scenario.financialInputs.annualIncome * 0.6,
    type: "income",
    frequency: "annual",
    timing: "current",
    active: true,
    editable: true,
  },
  {
    id: "partner-income",
    label: "Partner Income",
    amount: scenario.financialInputs.annualIncome * 0.4,
    type: "income",
    frequency: "annual",
    timing: "current",
    active: true,
    editable: true,
  },
  {
    id: "side-income",
    label: "Side Hustle",
    amount: scenario.financialInputs.futureIncomeMonthly || 500,
    type: "income",
    frequency: "monthly",
    timing: "future",
    active: !!scenario.financialInputs.futureIncomeMonthly,
    editable: true,
  },
  // Current Expense items
  {
    id: "groceries",
    label: "Groceries",
    amount: 600,
    type: "expense",
    frequency: "monthly",
    timing: "current",
    active: true,
    editable: true,
  },
  {
    id: "utilities",
    label: "Utilities",
    amount: 200,
    type: "expense",
    frequency: "monthly",
    timing: "current",
    active: true,
    editable: true,
  },
  {
    id: "entertainment",
    label: "Entertainment",
    amount: 400,
    type: "expense",
    frequency: "monthly",
    timing: "current",
    active: true,
    editable: true,
  },
  {
    id: "car-registration",
    label: "Car Registration",
    amount: 300,
    type: "expense",
    frequency: "annual",
    timing: "current",
    active: false,
    editable: true,
  },
  {
    id: "vacation",
    label: "Annual Vacation",
    amount: 2400,
    type: "expense",
    frequency: "annual",
    timing: "current",
    active: false,
    editable: true,
  },
  // Additional Current Expense items (inactive examples)
  {
    id: "clothes",
    label: "Clothes",
    amount: 1000,
    type: "expense",
    frequency: "annual",
    timing: "current",
    active: false,
    editable: true,
  },
  {
    id: "amazon-prime",
    label: "Amazon Prime",
    amount: 160,
    type: "expense",
    frequency: "annual",
    timing: "current",
    active: false,
    editable: true,
  },
  {
    id: "pet-care",
    label: "Pet Care",
    amount: 600,
    type: "expense",
    frequency: "annual",
    timing: "current",
    active: false,
    editable: true,
  },
  // Future Expense items
  {
    id: "daycare",
    label: "Future Daycare",
    amount: scenario.financialInputs.futureExpensesMonthly || 1200,
    type: "expense",
    frequency: "monthly",
    timing: "future",
    active: !!scenario.financialInputs.futureExpensesMonthly,
    editable: true,
  },
  {
    id: "future-annual",
    label: "Future Annual Expense",
    amount: 1500,
    type: "expense",
    frequency: "annual",
    timing: "future",
    active: false,
    editable: true,
  },
  // Additional Future Expense items (inactive examples)
  {
    id: "hoa-fees",
    label: "HOA Fees",
    amount: 500,
    type: "expense",
    frequency: "annual",
    timing: "future",
    active: false,
    editable: true,
  },
  {
    id: "lawn-care",
    label: "Lawn Care",
    amount: 800,
    type: "expense",
    frequency: "annual",
    timing: "future",
    active: false,
    editable: true,
  },
  {
    id: "mass-transit",
    label: "Mass Transit",
    amount: 130,
    type: "expense",
    frequency: "monthly",
    timing: "future",
    active: false,
    editable: true,
  },
  // Debt items
  {
    id: "credit-card",
    label: "Credit Card Payment",
    amount: Math.floor(scenario.financialInputs.fixedDebts * 0.4),
    type: "debt",
    frequency: "monthly",
    timing: "current",
    active: scenario.financialInputs.fixedDebts > 0,
    editable: true,
  },
  {
    id: "auto-loan",
    label: "Auto Loan",
    amount: Math.floor(scenario.financialInputs.fixedDebts * 0.6),
    type: "debt",
    frequency: "monthly",
    timing: "current",
    active: scenario.financialInputs.fixedDebts > 0,
    editable: true,
  },
  // Down payment sources
  {
    id: "savings",
    label: "Savings Account",
    amount: Math.floor(scenario.financialInputs.downPaymentSources * 0.5),
    type: "downpayment",
    frequency: "one-time",
    timing: "current",
    active: true,
    editable: true,
  },
  {
    id: "gift",
    label: "Family Gift",
    amount: Math.floor(scenario.financialInputs.downPaymentSources * 0.3),
    type: "downpayment",
    frequency: "one-time",
    timing: "current",
    active: true,
    editable: true,
  },
  {
    id: "stocks",
    label: "Sell Investments",
    amount: Math.floor(scenario.financialInputs.downPaymentSources * 0.2),
    type: "downpayment",
    frequency: "one-time",
    timing: "current",
    active: true,
    editable: true,
  },
])

const expenseIdeas = {
  "New Baby / First Child": {
    monthly: [
      { label: "Daycare", amount: 1500, frequency: "monthly" as const },
      { label: "Diapers & Baby Supplies", amount: 200, frequency: "monthly" as const },
      { label: "Life Insurance Premium", amount: 75, frequency: "monthly" as const },
    ],
    annual: [
      { label: "Pediatrician Visits", amount: 1500, frequency: "annual" as const },
      { label: "Health Insurance Premium Increase", amount: 2400, frequency: "annual" as const },
    ],
  },
  "Growing / Blended Family": {
    monthly: [
      { label: "Higher Grocery Bills", amount: 300, frequency: "monthly" as const },
      { label: "After-school Programs", amount: 400, frequency: "monthly" as const },
      { label: "Increased Utilities", amount: 100, frequency: "monthly" as const },
      { label: "Higher Auto Insurance", amount: 50, frequency: "monthly" as const },
      { label: "Cell Phone Plans", amount: 80, frequency: "monthly" as const },
    ],
    annual: [
      { label: "School Supplies & Field Trips", amount: 800, frequency: "annual" as const },
      { label: "Sports & Extracurriculars", amount: 1200, frequency: "annual" as const },
      { label: "Back-to-School Shopping", amount: 600, frequency: "annual" as const },
    ],
  },
  "Divorce / Separation": {
    monthly: [
      { label: "Single Income Housing", amount: 800, frequency: "monthly" as const },
      { label: "Utilities & Streaming", amount: 150, frequency: "monthly" as const },
      { label: "Child Support/Alimony", amount: 1000, frequency: "monthly" as const },
    ],
    annual: [
      { label: "Therapy/Counseling", amount: 3000, frequency: "annual" as const },
      { label: "Legal Check-ins", amount: 1500, frequency: "annual" as const },
    ],
  },
  "Job Change / Remote Work": {
    monthly: [
      { label: "Internet Plan Upgrade", amount: 50, frequency: "monthly" as const },
      { label: "Increased Electricity", amount: 75, frequency: "monthly" as const },
      { label: "Parking/Gas for Office", amount: 200, frequency: "monthly" as const },
    ],
    annual: [
      { label: "Continuing Education", amount: 2000, frequency: "annual" as const },
      { label: "Workspace Membership", amount: 1200, frequency: "annual" as const },
    ],
  },
  "Caring for Aging Parents": {
    monthly: [
      { label: "Prescriptions & Supplements", amount: 300, frequency: "monthly" as const },
      { label: "Caregiver Support", amount: 800, frequency: "monthly" as const },
      { label: "Increased Groceries & Utilities", amount: 200, frequency: "monthly" as const },
    ],
    annual: [
      { label: "Health Insurance Premiums", amount: 3600, frequency: "annual" as const },
      { label: "Medical Procedures", amount: 5000, frequency: "annual" as const },
    ],
  },
  "Outdoor Space / Home Amenities": {
    monthly: [
      { label: "HOA Fees", amount: 200, frequency: "monthly" as const },
      { label: "Lawn Care Service", amount: 150, frequency: "monthly" as const },
      { label: "Pool Maintenance", amount: 120, frequency: "monthly" as const },
    ],
    annual: [
      { label: "Tree Trimming & Yard Projects", amount: 1500, frequency: "annual" as const },
      { label: "Pest Control Contract", amount: 600, frequency: "annual" as const },
    ],
  },
  "Kids Entering School Age": {
    monthly: [
      { label: "After-school Program", amount: 300, frequency: "monthly" as const },
      { label: "Tutoring", amount: 200, frequency: "monthly" as const },
      { label: "Transportation/Carpooling", amount: 100, frequency: "monthly" as const },
    ],
    annual: [
      { label: "School Enrollment Fees", amount: 1000, frequency: "annual" as const },
      { label: "Test Prep Courses", amount: 800, frequency: "annual" as const },
    ],
  },
  "Financial Windfall / Inheritance": {
    monthly: [
      { label: "Higher Property Taxes", amount: 200, frequency: "monthly" as const },
      { label: "Utilities for Larger Home", amount: 150, frequency: "monthly" as const },
    ],
    annual: [
      { label: "Higher Homeowners Insurance", amount: 1200, frequency: "annual" as const },
      { label: "Travel & Leisure Expenses", amount: 5000, frequency: "annual" as const },
    ],
  },
  Retirement: {
    monthly: [
      { label: "Medicare Supplement", amount: 200, frequency: "monthly" as const },
      { label: "Increased Home Utilities", amount: 100, frequency: "monthly" as const },
      { label: "Travel Spending", amount: 400, frequency: "monthly" as const },
    ],
    annual: [
      { label: "Property Tax Adjustment", amount: 1800, frequency: "annual" as const },
      { label: "HOA Dues (Retirement Community)", amount: 2400, frequency: "annual" as const },
    ],
  },
  "Relocation / Lifestyle Move": {
    monthly: [
      { label: "Higher/Lower Mortgage", amount: 500, frequency: "monthly" as const },
      { label: "Different Car Insurance", amount: 75, frequency: "monthly" as const },
      { label: "Gas/Transit Changes", amount: 100, frequency: "monthly" as const },
    ],
    annual: [
      { label: "Cost-of-Living Shifts", amount: 2000, frequency: "annual" as const },
      { label: "Seasonal Services", amount: 1200, frequency: "annual" as const },
    ],
  },
}

// Modal state for editing items
const [isModalOpen, setIsModalOpen] = useState(false)
const [editingItem, setEditingItem] = useState<FinancialItem | null>(null)
const [modalLabel, setModalLabel] = useState("")
const [modalAmount, setModalAmount] = useState(0)
const [modalType, setModalType] = useState<"income" | "expense" | "debt" | "downpayment">("expense")
const [modalFrequency, setModalFrequency] = useState<"monthly" | "annual" | "one-time">("monthly")
const [modalTiming, setModalTiming] = useState<"current" | "future">("current")

// Quick add state
const [quickAddItems, setQuickAddItems] = useState<{ [key: string]: { label: string; amount: string } }>({})
const quickAddRefs = useRef<{ [key: string]: HTMLInputElement | null }>({})

const affordability = calculateMaxAffordability(scenario, housingPercentage, downPaymentPercentage)

// Safe display values
const displayInterestRate = (scenario.financialInputs.interestRate ?? 6.85).toFixed(2)
const displayLoanTerm = scenario.financialInputs.loanTerm ?? 30
const displayCreditScore = scenario.financialInputs.creditScore ?? 680

const handleHousingPercentageChange = (newPercentage: number) => {
  onScenarioUpdate({
    ...scenario,
    financialInputs: {
      ...scenario.financialInputs,
      housingPercentage: newPercentage,
    },
  })
}

const handleDownPaymentPercentageChange = (newPercentage: number) => {
  onScenarioUpdate({
    ...scenario,
    financialInputs: {
      ...scenario.financialInputs,
      downPaymentPercentage: newPercentage,
    },
  })
}

const handleToggle = (itemId: string) => {
  const updatedItems = financialItems.map((item) => (item.id === itemId ? { ...item, active: !item.active } : item))
  setFinancialItems(updatedItems)
  updateScenarioFromItems(updatedItems)
}

const handleEdit = (item: FinancialItem) => {
  setEditingItem(item)
  setModalLabel(item.label)
  setModalAmount(item.amount)
  setModalType(item.type)
  setModalFrequency(item.frequency)
  setModalTiming(item.timing)
  setIsModalOpen(true)
}

const handleDelete = (itemId: string) => {
  const updatedItems = financialItems.filter((item) => item.id !== itemId)
  setFinancialItems(updatedItems)
  updateScenarioFromItems(updatedItems)
}

const handleSaveModal = () => {
  let updatedItems: FinancialItem[]

  if (editingItem) {
    // Update existing item
    updatedItems = financialItems.map((item) =>
      item.id === editingItem.id
        ? {
            ...item,
            label: modalLabel,
            amount: modalAmount,
            type: modalType,
            frequency: modalFrequency,
            timing: modalTiming,
          }
        : item,
    )
  } else {
    // Add new item
    const newItem: FinancialItem = {
      id: `new-${Date.now()}`,
      label: modalLabel,
      amount: modalAmount,
      type: modalType,
      frequency: modalFrequency,
      timing: modalTiming,
      active: true,
      editable: true,
    }
    updatedItems = [...financialItems, newItem]
  }

  setFinancialItems(updatedItems)
  updateScenarioFromItems(updatedItems)
  setIsModalOpen(false)
  setEditingItem(null)
}

const handleAddNew = (type: FinancialItem["type"]) => {
  setEditingItem(null)
  setModalLabel("")
  setModalAmount(0)
  setModalType(type)
  setModalFrequency(type === "downpayment" ? "one-time" : "monthly")
  setModalTiming("current")
  setIsModalOpen(true)
}

const handleAddExpenseIdea = (
  idea: { label: string; amount: number; frequency: "monthly" | "annual" },
  timing: "current" | "future",
) => {
  const newItem: FinancialItem = {
    id: `idea-${Date.now()}`,
    label: idea.label,
    amount: idea.amount,
    type: "expense",
    frequency: idea.frequency,
    timing,
    active: true,
    editable: true,
  }

  const updatedItems = [...financialItems, newItem]
  setFinancialItems(updatedItems)
  updateScenarioFromItems(updatedItems)
  setIsExpenseIdeasOpen(false)
}

// Quick add functionality
const handleQuickAdd = (type: FinancialItem["type"], timing: "current" | "future" = "current") => {
  const key = `${type}-${timing}`
  const quickItem = quickAddItems[key]

  if (quickItem && quickItem.label.trim() && quickItem.amount.trim()) {
    const newItem: FinancialItem = {
      id: `quick-${Date.now()}`,
      label: quickItem.label.trim(),
      amount: Number(quickItem.amount) || 0,
      type,
      frequency: type === "downpayment" ? "one-time" : "monthly",
      timing,
      active: true,
      editable: true,
    }

    const updatedItems = [...financialItems, newItem]
    setFinancialItems(updatedItems)
    updateScenarioFromItems(updatedItems)

    // Clear the quick add fields
    setQuickAddItems((prev) => ({
      ...prev,
      [key]: { label: "", amount: "" },
    }))

    // Focus back to label input
    setTimeout(() => {
      quickAddRefs.current[`${key}-label`]?.focus()
    }, 0)
  }
}

const handleQuickAddKeyPress = (
  e: React.KeyboardEvent,
  type: FinancialItem["type"],
  timing: "current" | "future" = "current",
) => {
  if (e.key === "Enter") {
    e.preventDefault()
    handleQuickAdd(type, timing)
  }
}

const updateQuickAddItem = (key: string, field: "label" | "amount", value: string) => {
  setQuickAddItems((prev) => ({
    ...prev,
    [key]: {
      ...prev[key],
      [field]: value,
    },
  }))
}

const updateScenarioFromItems = (items: FinancialItem[]) => {
  const activeItems = items.filter((item) => item.active)

  const annualIncome = activeItems
    .filter((item) => item.type === "income")
    .reduce((sum, item) => {
      return sum + (item.frequency === "annual" ? item.amount : item.amount * 12)
    }, 0)

  const monthlyExpenses = activeItems
    .filter((item) => item.type === "expense" && item.timing === "current")
    .reduce((sum, item) => {
      return sum + (item.frequency === "monthly" ? item.amount : item.amount / 12)
    }, 0)

  const futureExpensesMonthly = activeItems
    .filter((item) => item.type === "expense" && item.timing === "future")
    .reduce((sum, item) => {
      return sum + (item.frequency === "monthly" ? item.amount : item.amount / 12)
    }, 0)

  const fixedDebts = activeItems
    .filter((item) => item.type === "debt")
    .reduce((sum, item) => {
      return sum + (item.frequency === "monthly" ? item.amount : item.amount / 12)
    }, 0)

  const downPaymentSources = activeItems
    .filter((item) => item.type === "downpayment")
    .reduce((sum, item) => sum + item.amount, 0)

  const futureIncomeMonthly = activeItems
    .filter((item) => item.type === "income" && item.timing === "future")
    .reduce((sum, item) => {
      return sum + (item.frequency === "monthly" ? item.amount : item.amount / 12)
    }, 0)

  onScenarioUpdate({
    ...scenario,
    financialInputs: {
      ...scenario.financialInputs,
      annualIncome,
      monthlyExpenses,
      futureExpensesMonthly,
      fixedDebts,
      downPaymentSources,
      futureIncomeMonthly,
    },
  })
}

const renderQuickAdd = (type: FinancialItem["type"], timing: "current" | "future" = "current") => {
  const key = `${type}-${timing}`
  // Always start with safe defaults, then merge whatever exists in state
  const currentItem = { label: "", amount: "", ...(quickAddItems[key] ?? {}) }

  return (
    <div className="flex items-center gap-2 p-2 bg-gray-50 rounded border-2 border-dashed border-gray-300">
      <Input
        ref={(el) => (quickAddRefs.current[`${key}-label`] = el)}
        placeholder="Item name..."
        value={currentItem.label}
        onChange={(e) => updateQuickAddItem(key, "label", e.target.value)}
        onKeyPress={(e) => handleQuickAddKeyPress(e, type, timing)}
        className="flex-1 h-8 text-sm"
      />
      <Input
        ref={(el) => (quickAddRefs.current[`${key}-amount`] = el)}
        type="number"
        placeholder="Amount"
        value={currentItem.amount}
        onChange={(e) => updateQuickAddItem(key, "amount", e.target.value)}
        onKeyPress={(e) => handleQuickAddKeyPress(e, type, timing)}
        className="w-24 h-8 text-sm"
      />
      <Button
        size="sm"
        onClick={() => handleQuickAdd(type, timing)}
        disabled={!currentItem.label.trim() || !String(currentItem.amount).trim()}
        className="h-8 px-2"
      >
        <Plus size={14} />
      </Button>
    </div>
  )
}

const renderItemGroup = (type: FinancialItem["type"], timing: "current" | "future", title: string, color: string) => {
  const items = financialItems.filter((item) => item.type === type && item.timing === timing)

  // Sort items: monthly first, then annual
  const sortedItems = items.sort((a, b) => {
    if (a.frequency === "monthly" && b.frequency === "annual") return -1
    if (a.frequency === "annual" && b.frequency === "monthly") return 1
    return 0
  })

  const activeSum = sortedItems
    .filter((item) => item.active)
    .reduce((sum, item) => {
      if (type === "downpayment") return sum + item.amount
      return sum + (item.frequency === "monthly" ? item.amount : item.amount / 12)
    }, 0)

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h3 className="font-semibold text-gray-900">{title}</h3>
          {type === "expense" && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsExpenseIdeasOpen(true)}
              className="h-6 w-6 p-0 text-gray-400 hover:text-gray-600"
              title="View expense ideas"
            >
              <Info size={14} />
            </Button>
          )}
        </div>
        <Badge variant="outline" className={color}>
          {type === "downpayment" ? formatCurrency(activeSum) : `${formatCurrency(activeSum)}/mo`}
        </Badge>
      </div>

      <div className="space-y-2">
        {sortedItems.map((item) => (
          <div
            key={item.id}
            className={`flex items-center justify-between p-2 rounded-lg border transition-all ${
              item.active ? "bg-white border-gray-200" : "bg-gray-50 border-gray-100"
            } ${item.frequency === "annual" ? "border-l-4 border-l-orange-300" : ""}`}
          >
            <div className="flex items-center gap-3 flex-1">
              <Switch checked={item.active} onCheckedChange={() => handleToggle(item.id)} />
              <div className="flex-1">
                <p
                  className={`text-sm font-medium ${item.active ? "text-gray-900" : "text-gray-500"} flex items-center gap-2`}
                >
                  {item.label}
                  {item.frequency === "annual" && <Calendar size={12} className="text-orange-500" />}
                </p>
                <p
                  className={`text-xs ${item.active ? "text-gray-600" : "text-gray-400"} ${item.frequency === "annual" ? "text-orange-600" : ""}`}
                >
                  {formatCurrency(item.amount)}
                  {item.frequency === "monthly" && "/mo"}
                  {item.frequency === "annual" && "/yr"}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              {item.editable && (
                <>
                  <Button variant="ghost" size="sm" onClick={() => handleEdit(item)} className="h-6 w-6 p-0">
                    <Pencil size={12} />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDelete(item.id)}
                    className="h-6 w-6 p-0 text-red-500"
                  >
                    <Trash2 size={12} />
                  </Button>
                </>
              )}
            </div>
          </div>
        ))}

        {/* Quick Add Row */}
        {renderQuickAdd(type, timing)}
      </div>
    </div>
  )
}

const getAffordabilityLevel = (price: number) => {
  if (price >= 600000) return { level: "High", color: "text-green-600 bg-green-50", icon: TrendingUp }
  if (price >= 400000) return { level: "Moderate", color: "text-blue-600 bg-blue-50", icon: Home }
  if (price >= 200000) return { level: "Starter", color: "text-yellow-600 bg-yellow-50", icon: Home }
  return { level: "Limited", color: "text-red-600 bg-red-50", icon: AlertTriangle }
}

const affordabilityLevel = getAffordabilityLevel(affordability.maxPurchasePrice)
const AffordabilityIcon = affordabilityLevel.icon

const renderMortgageDetailsGroup = () => {
  // Get current interest rate with safe fallback
  const currentInterestRate = scenario.financialInputs.interestRate ?? 6.85
  const currentLoanTerm = scenario.financialInputs.loanTerm ?? 30

  // Create mortgage detail items with proper active states
  const mortgageItems = [
    {
      id: "term-15",
      label: "15 Year Term",
      value: 15,
      active: currentLoanTerm === 15,
      type: "term",
    },
    {
      id: "term-20",
      label: "20 Year Term",
      value: 20,
      active: currentLoanTerm === 20,
      type: "term",
    },
    {
      id: "term-30",
      label: "30 Year Term",
      value: 30,
      active: currentLoanTerm === 30,
      type: "term",
    },
    {
      id: "rate-low",
      label: `${Math.max(1, currentInterestRate - 0.5).toFixed(2)}%`,
      value: Math.max(1, currentInterestRate - 0.5),
      active: false,
      type: "rate",
    },
    {
      id: "rate-current",
      label: `${currentInterestRate.toFixed(2)}%`,
      value: currentInterestRate,
      active: true,
      type: "rate",
    },
    {
      id: "rate-high",
      label: `${Math.min(15, currentInterestRate + 0.5).toFixed(2)}%`,
      value: Math.min(15, currentInterestRate + 0.5),
      active: false,
      type: "rate",
    },
  ]

  const handleMortgageToggle = (item: any) => {
    if (item.type === "term") {
      onScenarioUpdate({
        ...scenario,
        financialInputs: {
          ...scenario.financialInputs,
          loanTerm: item.value,
        },
      })
    } else if (item.type === "rate") {
      onScenarioUpdate({
        ...scenario,
        financialInputs: {
          ...scenario.financialInputs,
          interestRate: item.value,
        },
      })
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-gray-900">Mortgage Details</h3>
        <Badge variant="outline" className="text-purple-600 bg-purple-50">
          {displayInterestRate}% • {displayLoanTerm}yr
        </Badge>
      </div>

      <div className="space-y-2">
        {/* Term Length Options */}
        <div className="space-y-2">
          <p className="text-xs font-medium text-gray-600">Loan Term</p>
          <div className="flex flex-wrap gap-2">
            {mortgageItems
              .filter((item) => item.type === "term")
              .map((item) => (
                <div
                  key={item.id}
                  className={`flex items-center justify-between p-2 rounded-lg border transition-all cursor-pointer ${
                    item.active ? "bg-purple-50 border-purple-200" : "bg-gray-50 border-gray-100 hover:bg-gray-100"
                  }`}
                  onClick={() => handleMortgageToggle(item)}
                >
                  <div className="flex items-center gap-2">
                    <Switch checked={item.active} readOnly />
                    <span className={`text-sm font-medium ${item.active ? "text-purple-900" : "text-gray-500"}`}>
                      {item.label}
                    </span>
                  </div>
                </div>
              ))}
          </div>
        </div>

        {/* Interest Rate Options */}
        <div className="space-y-2">
          <p className="text-xs font-medium text-gray-600">Interest Rate</p>
          <div className="flex flex-wrap gap-2">
            {mortgageItems
              .filter((item) => item.type === "rate")
              .map((item) => {
                // Dynamically check if this rate is currently active
                const isCurrentlyActive = Math.abs(currentInterestRate - item.value) < 0.01
                return (
                  <div
                    key={item.id}
                    className={`flex items-center justify-between p-2 rounded-lg border transition-all cursor-pointer ${
                      isCurrentlyActive
                        ? "bg-purple-50 border-purple-200"
                        : "bg-gray-50 border-gray-100 hover:bg-gray-100"
                    }`}
                    onClick={() => handleMortgageToggle(item)}
                  >
                    <div className="flex items-center gap-2">
                      <Switch checked={isCurrentlyActive} readOnly />
                      <span
                        className={`text-sm font-medium ${isCurrentlyActive ? "text-purple-900" : "text-gray-500"}`}
                      >
                        {item.label}
                      </span>
                    </div>
                  </div>
                )
              })}
          </div>
        </div>

        {/* Down Payment Percentage Options */}
        <div className="space-y-2">
          <p className="text-xs font-medium text-gray-600">Down Payment %</p>
          <div className="flex flex-wrap gap-2">
            {[10, 15, 20, 25].map((percentage) => (
              <div
                key={`dp-${percentage}`}
                className={`flex items-center justify-between p-2 rounded-lg border transition-all cursor-pointer ${
                  downPaymentPercentage === percentage
                    ? "bg-purple-50 border-purple-200"
                    : "bg-gray-50 border-gray-100 hover:bg-gray-100"
                }`}
                onClick={() => handleDownPaymentPercentageChange(percentage)}
              >
                <div className="flex items-center gap-2">
                  <Switch checked={downPaymentPercentage === percentage} readOnly />
                  <span
                    className={`text-sm font-medium ${downPaymentPercentage === percentage ? "text-purple-900" : "text-gray-500"}`}
                  >
                    {percentage}%
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

return (
  <div className={`space-y-6 ${className}`}>
    {/* Scenario Builder - Collapsible */}
    <Card className="border-2 border-gray-200">
      <Collapsible open={isScenarioBuilderOpen} onOpenChange={setIsScenarioBuilderOpen}>
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer hover:bg-gray-50 transition-colors">
            <CardTitle className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <TrendingUp size={20} className="text-blue-600" />
                <span className="text-lg font-semibold text-blue-900">Affordability</span>
                <span className="text-sm text-gray-500">•</span>
                <span className="text-sm font-medium text-blue-700">{scenario.name}</span>
              </span>
              {isScenarioBuilderOpen ? (
                <ChevronUp size={20} className="text-gray-400" />
              ) : (
                <ChevronDown size={20} className="text-gray-400" />
              )}
            </CardTitle>
            {!isScenarioBuilderOpen && (
              <div className="mt-4 space-y-4">
                {/* Detailed Breakdown */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-xs">
                  {/* Income Summary */}
                  <div className="p-3 bg-green-50 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                      <span className="font-semibold text-green-800">Income</span>
                    </div>
                    <div className="space-y-1">
                      <div className="flex justify-between">
                        <span className="text-green-700">Annual:</span>
                        <span className="font-medium text-green-900">
                          {formatCurrency(scenario.financialInputs.annualIncome)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-green-700">Take-home:</span>
                        <span className="font-medium text-green-900">
                          {formatCurrency(affordability.takeHomeIncome)}/mo
                        </span>
                      </div>
                      {(scenario.financialInputs.futureIncomeMonthly || 0) > 0 && (
                        <div className="flex justify-between">
                          <span className="text-green-700">Future:</span>
                          <span className="font-medium text-green-900">
                            +{formatCurrency(scenario.financialInputs.futureIncomeMonthly || 0)}/mo
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Monthly Payment Details */}
                  <div className="p-3 bg-blue-50 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                      <span className="font-semibold text-blue-800">Monthly Payment</span>
                    </div>
                    <div className="space-y-1">
                      <div className="flex justify-between">
                        <span className="text-blue-700">Max Budget:</span>
                        <span className="font-medium text-blue-900">
                          {formatCurrency(affordability.maxMonthlyPayment)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-blue-700">Actual:</span>
                        <span className="font-medium text-blue-900">
                          {formatCurrency(affordability.actualMonthlyPayment)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-blue-700">% of Income:</span>
                        <span className="font-medium text-blue-900">{housingPercentage}%</span>
                      </div>
                    </div>
                  </div>

                  {/* Down Payment & Opportunity */}
                  <div className="p-3 bg-purple-50 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                      <span className="font-semibold text-purple-800">Down Payment</span>
                    </div>
                    <div className="space-y-1">
                      <div className="flex justify-between">
                        <span className="text-purple-700">Available:</span>
                        <span className="font-medium text-purple-900">
                          {formatCurrency(affordability.availableDownPayment)}
                        </span>
                      </div>

                      {/* Actionable suggestions based on down payment status */}
                      {affordability.downPaymentStatus === "shortfall" && (
                        <>
                          <div className="text-xs text-purple-700 mt-2">
                            💡 Maximize your monthly budget to{" "}
                            {formatCurrency(affordability.maxMonthlyPayment + affordability.shortfallAmount! / 200)}
                          </div>
                          <div className="text-xs text-purple-700">
                            🏠 Increase home price to {formatCurrency(affordability.maxPriceFromDownPayment)}
                          </div>
                          <div className="text-xs text-purple-700">
                            💰 Add {formatCurrency(affordability.shortfallAmount!)} to down payment
                          </div>
                        </>
                      )}

                      {affordability.downPaymentStatus === "excess" && (
                        <>
                          <div className="text-xs text-purple-700 mt-2">
                            🎯 Use excess {formatCurrency(affordability.excessAmount!)} strategically
                          </div>
                          <div className="text-xs text-purple-700">
                            🏠 Buy {formatCurrency(affordability.maxPurchasePrice + affordability.excessAmount!)} home
                          </div>
                          <div className="text-xs text-purple-700">
                            💰 Or reduce monthly payment by{" "}
                            {formatCurrency(
                              (() => {
                                const excessAmount = affordability.excessAmount!
                                const interestRate = (scenario.financialInputs.interestRate ?? 6.85) / 100 / 12
                                const numPayments = (scenario.financialInputs.loanTerm ?? 30) * 12
                                return interestRate > 0
                                  ? (excessAmount * interestRate) / (1 - Math.pow(1 + interestRate, -numPayments))
                                  : excessAmount / numPayments
                              })(),
                            )}
                          </div>
                        </>
                      )}

                      {affordability.downPaymentStatus === "on-target" && (
                        <>
                          <div className="text-xs text-green-700 mt-2">✅ Perfect balance achieved</div>
                          <div className="text-xs text-purple-700">
                            🏠 Target home: {formatCurrency(affordability.maxPurchasePrice)}
                          </div>
                          <div className="text-xs text-purple-700">
                            💰 Monthly payment: {formatCurrency(affordability.actualMonthlyPayment)}
                          </div>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Mortgage Details */}
                  <div className="p-3 bg-orange-50 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                      <span className="font-semibold text-orange-800">Mortgage</span>
                    </div>
                    <div className="space-y-1">
                      <div className="flex justify-between">
                        <span className="text-orange-700">Rate:</span>
                        <span className="font-medium text-orange-900">{displayInterestRate}%</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-orange-700">Term:</span>
                        <span className="font-medium text-orange-900">{displayLoanTerm} years</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-orange-700">Loan Amount:</span>
                        <span className="font-medium text-orange-900">
                          {formatCurrency(affordability.loanAmount)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Opportunities & Constraints */}
                {(affordability.opportunities.length > 0 || affordability.constraints.length > 0) && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                    {/* Opportunities */}
                    {affordability.opportunities.length > 0 && (
                      <div className="p-3 bg-green-50 rounded-lg border border-green-200">
                        <div className="flex items-center gap-2 mb-2">
                          <CheckCircle size={12} className="text-green-600" />
                          <span className="font-semibold text-green-800">Opportunities</span>
                        </div>
                        <div className="space-y-1">
                          {affordability.opportunities.slice(0, 2).map((opportunity, index) => (
                            <div key={index} className="text-green-700 text-xs">
                              • {opportunity}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Constraints */}
                    {affordability.constraints.length > 0 && (
                      <div className="p-3 bg-yellow-50 rounded-lg border border-yellow-200">
                        <div className="flex items-center gap-2 mb-2">
                          <AlertTriangle size={12} className="text-yellow-600" />
                          <span className="font-semibold text-yellow-800">Considerations</span>
                        </div>
                        <div className="space-y-1">
                          {affordability.constraints.slice(0, 2).map((constraint, index) => (
                            <div key={index} className="text-yellow-700 text-xs">
                              • {constraint}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Quick Action Hint */}
                <div className="text-center">
                  <p className="text-xs text-gray-500">
                    Click to expand and adjust income, expenses, down payment, and mortgage settings
                  </p>
                </div>
              </div>
            )}
          </CardHeader>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <CardContent className="pt-0 space-y-6">
            {/* Aligned Financial Controls */}
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Left Column: Income & Monthly Payment */}
                <div className="space-y-4">
                  {/* Income Sources */}
                  <div>{renderItemGroup("income", "current", "Income Sources", "text-green-600 bg-green-50")}</div>

                  {/* Max Monthly Payment Control - Aligned with Income */}
                  <div className="bg-gray-50 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <Label htmlFor="housingPercentage" className="text-sm font-medium flex items-center gap-2">
                        <Settings size={16} />
                        Max Monthly Payment
                      </Label>
                      <div className="text-sm text-gray-600 text-right">
                        <div className="font-semibold">{formatCurrency(affordability.maxMonthlyPayment)}</div>
                        <div className="text-xs">({housingPercentage}% of take-home)</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Input
                        id="housingPercentage"
                        type="number"
                        value={housingPercentage}
                        onChange={(e) => handleHousingPercentageChange(Number(e.target.value))}
                        className="w-20 text-center"
                        min="10"
                        max="50"
                      />
                      <span className="text-sm text-gray-500">% of take-home income</span>
                      <div className="flex-1">
                        <input
                          type="range"
                          min="10"
                          max="50"
                          value={housingPercentage}
                          onChange={(e) => handleHousingPercentageChange(Number(e.target.value))}
                          className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                        />
                      </div>
                    </div>

                    {/* Live Purchase Price Calculation */}
                    <div className="mt-3 p-3 bg-white border border-gray-200 rounded-md">
                      <p className="text-xs font-medium text-gray-700 mb-1">Purchase Power</p>
                      <p className="text-sm font-semibold text-blue-800">
                        {formatCurrency(affordability.maxMonthlyPayment)}/month ={" "}
                        {formatCurrency(
                          (() => {
                            // Calculate what purchase price this monthly payment can afford
                            const maxPayment = affordability.maxMonthlyPayment
                            const interestRate = (scenario.financialInputs.interestRate ?? 6.85) / 100 / 12
                            const numPayments = (scenario.financialInputs.loanTerm ?? 30) * 12
                            const propertyTaxRate = 0.0181 / 12 // 1.81% annually
                            const insuranceRate = 1800 / 12 // $1800 annually

                            // Iteratively solve for purchase price that fits the monthly payment
                            let purchasePrice = 0
                            let estimate = 400000 // Starting estimate

                            for (let i = 0; i < 50; i++) {
                              const propertyTax = estimate * propertyTaxRate
                              const insurance = insuranceRate
                              const availableForPI = maxPayment - propertyTax - insurance

                              if (availableForPI <= 0) {
                                estimate *= 0.8
                                continue
                              }

                              // Calculate loan amount from P&I payment
                              const maxLoanFromPayment =
                                availableForPI > 0 && interestRate > 0
                                  ? (availableForPI * (1 - Math.pow(1 + interestRate, -numPayments))) / interestRate
                                  : availableForPI * numPayments

                              // Calculate purchase price from loan amount using down payment percentage
                              const purchasePriceFromLoan = maxLoanFromPayment / (1 - downPaymentPercentage / 100)

                              // Check for convergence
                              if (Math.abs(purchasePriceFromLoan - estimate) < 1000) {
                                purchasePrice = purchasePriceFromLoan
                                break
                              }

                              // Adjust estimate for next iteration
                              estimate = purchasePriceFromLoan
                              purchasePrice = purchasePriceFromLoan
                            }

                            return Math.max(0, purchasePrice)
                          })(),
                        )}{" "}
                        home purchase
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        Based on {downPaymentPercentage}% down payment, {displayInterestRate}% interest rate
                      </p>
                    </div>

                    {/* Constraint Warnings for Monthly Payment */}
                    {housingPercentage > 35 && (
                      <div className="mt-3 p-2 bg-yellow-50 border border-yellow-200 rounded-md">
                        <div className="flex items-center gap-2 text-yellow-700">
                          <AlertTriangle size={14} />
                          <span className="text-xs font-medium">
                            ⚠️ {housingPercentage}% is aggressive - consider adding income sources or reducing to
                            30-35%
                          </span>
                        </div>
                      </div>
                    )}

                    <p className="text-xs text-gray-500 mt-2">
                      Recommended: 25-30% for comfortable living, up to 35% for aggressive buying
                    </p>
                  </div>
                </div>

                {/* Middle Column: Down Payment & Percentage */}
                <div className="space-y-4">
                  {/* Down Payment Sources */}
                  <div>
                    {renderItemGroup("downpayment", "current", "Down Payment Sources", "text-blue-600 bg-blue-50")}
                  </div>

                  {/* Down Payment Control - With Status-Based Strategy */}
                  {/* Down Payment Control - With Purchase Power Display */}
                  <div className="bg-gray-50 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <Label htmlFor="downPaymentPercentage" className="text-sm font-medium flex items-center gap-2">
                        <DollarSign size={16} />
                        Down Payment Strategy
                      </Label>
                    </div>

                    {/* Down Payment Purchase Power - Always Show */}
                    <div className="mb-3 p-3 bg-white border border-gray-200 rounded-md">
                      <p className="text-xs font-medium text-gray-700 mb-1">Down Payment Power</p>
                      <p className="text-sm font-semibold text-blue-800">
                        {formatCurrency(affordability.availableDownPayment)} ÷ {downPaymentPercentage}% ={" "}
                        {formatCurrency(affordability.maxPriceFromDownPayment)} home purchase
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        Based on {downPaymentPercentage}% down payment requirement
                      </p>
                    </div>

                    {/* Down Payment Status: Shortfall */}
                    {affordability.downPaymentStatus === "shortfall" && (
                      <div className="p-3 bg-green-50 border border-green-200 rounded-md">
                        <div className="flex items-center gap-2 text-green-700 mb-2">
                          <CheckCircle size={14} />
                          <span className="text-xs font-medium">
                            💡 Opportunity: Add down payment to maximize monthly payment capacity
                          </span>
                        </div>
                      </div>
                    )}

                    {/* Down Payment Status: On Target */}
                    {affordability.downPaymentStatus === "on-target" && (
                      <div className="p-3 bg-green-50 border border-green-200 rounded-md">
                        <div className="flex items-center gap-2 text-green-700">
                          <CheckCircle size={14} />
                          <span className="text-xs font-medium">
                            ✅ Perfect! Your down payment matches your ideal house price
                          </span>
                        </div>
                      </div>
                    )}

                    {/* Down Payment Status: Excess */}
                    {affordability.downPaymentStatus === "excess" && (
                      <div className="space-y-3">
                        <div className="p-3 bg-green-50 border border-green-200 rounded-md">
                          <div className="flex items-center gap-2 text-green-700 mb-2">
                            <CheckCircle size={14} />
                            <span className="text-xs font-medium">
                              💰 Opportunity: Use your {formatCurrency(affordability.excessAmount!)} excess down
                              payment strategically
                            </span>
                          </div>

                          <div className="space-y-2">
                            <p className="text-xs text-green-600 font-medium">Choose your strategy:</p>

                            {/* Option 1: Save the excess */}
                            <div
                              className={`p-2 rounded border cursor-pointer transition-all ${
                                (scenario.financialInputs.excessDownPaymentStrategy || "save") === "save"
                                  ? "bg-white border-green-300"
                                  : "bg-green-50 border-green-200 hover:bg-white"
                              }`}
                              onClick={() =>
                                onScenarioUpdate({
                                  ...scenario,
                                  financialInputs: {
                                    ...scenario.financialInputs,
                                    excessDownPaymentStrategy: "save",
                                  },
                                })
                              }
                            >
                              <div className="flex items-center gap-2">
                                <input
                                  type="radio"
                                  checked={(scenario.financialInputs.excessDownPaymentStrategy || "save") === "save"}
                                  readOnly
                                  className="text-green-600"
                                />
                                <div>
                                  <p className="text-xs font-medium text-green-800">💰 Save the excess</p>
                                  <p className="text-xs text-green-600">
                                    Keep {formatCurrency(affordability.excessAmount!)} for emergencies or other goals
                                  </p>
                                </div>
                              </div>
                            </div>

                            {/* Option 2: Apply to loan to reduce monthly payment */}
                            <div
                              className={`p-2 rounded border cursor-pointer transition-all ${
                                scenario.financialInputs.excessDownPaymentStrategy === "reduce-payment"
                                  ? "bg-white border-green-300"
                                  : "bg-green-50 border-green-200 hover:bg-white"
                              }`}
                              onClick={() =>
                                onScenarioUpdate({
                                  ...scenario,
                                  financialInputs: {
                                    ...scenario.financialInputs,
                                    excessDownPaymentStrategy: "reduce-payment",
                                  },
                                })
                              }
                            >
                              <div className="flex items-center gap-2">
                                <input
                                  type="radio"
                                  checked={scenario.financialInputs.excessDownPaymentStrategy === "reduce-payment"}
                                  readOnly
                                  className="text-green-600"
                                />
                                <div>
                                  <p className="text-xs font-medium text-green-800">📉 Reduce loan amount</p>
                                  <p className="text-xs text-green-600">
                                    Apply excess to down payment → Lower loan amount → Save ~
                                    {formatCurrency(
                                      (() => {
                                        const excessAmount = affordability.excessAmount!
                                        const interestRate =
                                          (scenario.financialInputs.interestRate ?? 6.85) / 100 / 12
                                        const numPayments = (scenario.financialInputs.loanTerm ?? 30) * 12
                                        return interestRate > 0
                                          ? (excessAmount * interestRate) /
                                              (1 - Math.pow(1 + interestRate, -numPayments))
                                          : excessAmount / numPayments
                                      })(),
                                    )}
                                    /month
                                  </p>
                                </div>
                              </div>
                            </div>

                            {/* Option 3: Apply to purchase price to buy more house */}
                            <div
                              className={`p-2 rounded border cursor-pointer transition-all ${
                                scenario.financialInputs.excessDownPaymentStrategy === "increase-price"
                                  ? "bg-white border-green-300"
                                  : "bg-green-50 border-green-200 hover:bg-white"
                              }`}
                              onClick={() =>
                                onScenarioUpdate({
                                  ...scenario,
                                  financialInputs: {
                                    ...scenario.financialInputs,
                                    excessDownPaymentStrategy: "increase-price",
                                  },
                                })
                              }
                            >
                              <div className="flex items-center gap-2">
                                <input
                                  type="radio"
                                  checked={scenario.financialInputs.excessDownPaymentStrategy === "increase-price"}
                                  readOnly
                                  className="text-green-600"
                                />
                                <div>
                                  <p className="text-xs font-medium text-green-800">🏠 Buy more expensive house</p>
                                  <p className="text-xs text-green-600">
                                    Use full {formatCurrency(affordability.availableDownPayment)} down payment → Stay
                                    within your {formatCurrency(affordability.maxMonthlyPayment)}/month budget
                                  </p>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Right Column: Mortgage Details */}
                <div className="space-y-4">
                  {/* Mortgage Details */}
                  <div>{renderMortgageDetailsGroup()}</div>
                </div>
              </div>
            </div>
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>

    {/* Quality of Life Summary - RENAMED FROM "Your Home Affordability" */}
    <Card className="border-2 border-blue-200">
      <CardHeader className="pb-3">
        
  <CardTitle className="flex items-center justify-between">
    <span className="flex items-center gap-2">
      <DollarSign size={20} className="text-blue-600" />
      <span className="text-lg font-semibold text-green-900">Sustainability</span>
      <span className="text-sm text-gray-500">
        a home you can afford now and continue to thrive in over time.
      </span>
    </span>
    <Badge className={affordabilityLevel.color}>
      <AffordabilityIcon size={14} className="mr-1" />
      {affordabilityLevel.level}
    </Badge>
  </CardTitle>

      </CardHeader>
      <CardContent className="space-y-6">
        {/* Maximum Home Price - Centered */}
        {/* Maximum Home Price - Equation Format */}
        <div className="text-center py-6">
          <p className="text-sm font-medium text-blue-600 mb-4">Your Home Purchase Equation</p>

          {/* Equation Display */}
          <div className="flex items-center justify-center gap-4 mb-6 text-2xl font-bold">
            <div className="text-center">
              <div className="text-blue-900">{formatCurrency(affordability.loanAmount)}</div>
              <div className="text-sm font-normal text-gray-600">Loan Amount</div>
            </div>
            <div className="text-blue-600 text-3xl">+</div>
            <div className="text-center">
              <div className="text-blue-900">
                {formatCurrency(affordability.maxPurchasePrice * (downPaymentPercentage / 100))}
              </div>
              <div className="text-sm font-normal text-gray-600">Down Payment</div>
            </div>
            <div className="text-blue-600 text-3xl">=</div>
            <div className="text-center">
              <div className="text-4xl text-blue-900">{formatCurrency(affordability.maxPurchasePrice)}</div>
              <div className="text-sm font-normal text-gray-600">Home Purchase</div>
            </div>
          </div>

          <p className="text-sm text-blue-700 mb-4">Based on {scenario.name} scenario</p>
          <div className="text-sm text-gray-600 mb-4">
            <p className="font-semibold">
              Actual Monthly Payment: {formatCurrency(affordability.actualMonthlyPayment)}
            </p>
            <p>
              {formatCurrency(affordability.monthlyPrincipalInterest)} P&I +{" "}
              {formatCurrency(affordability.monthlyPropertyTax)} Tax +{" "}
              {formatCurrency(affordability.monthlyInsurance)} Insurance
            </p>
          </div>

          {/* Loan Details */}
          <div className="flex items-center justify-center gap-8 text-sm text-gray-600">
            <div className="flex items-center gap-2">
              <span>Interest Rate:</span>
              <span className="font-semibold">{displayInterestRate}%</span>
            </div>
            <div className="flex items-center gap-2">
              <span>Loan Term:</span>
              <span className="font-semibold">{displayLoanTerm} years</span>
            </div>
          </div>
        </div>

        {/* One Time Upfront Costs - Collapsible */}
        <div className="bg-white border border-gray-200 rounded-lg">
          <Collapsible defaultOpen={false}>
            <CollapsibleTrigger asChild>
              <div className="p-6 cursor-pointer hover:bg-gray-50 transition-colors">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-gray-900">One Time Upfront Costs</h3>
                  <div className="flex items-center gap-3">
                    <span className="font-bold text-blue-900 text-lg">
                      {formatCurrency(
                        affordability.maxPurchasePrice * (downPaymentPercentage / 100) + // Down payment
                          affordability.maxPurchasePrice * 0.03 + // Closing costs
                          500 + // Home inspection
                          450 + // Appraisal
                          1500 + // Moving
                          350 + // Utilities
                          affordability.monthlyInsurance * 12 + // Insurance
                          affordability.maxPurchasePrice * 0.01 + // Emergency repairs
                          2500 + // Furnishing
                          600, // Security (optional)
                      )}
                    </span>
                    <ChevronDown size={20} className="text-gray-400" />
                  </div>
                </div>

                {/* Simplified Summary - Only shown when collapsed */}
                <div className="mt-3 grid grid-cols-3 gap-4 text-sm">
                  <div className="text-center">
                    <div className="font-semibold text-blue-900">
                      {formatCurrency(
                        affordability.maxPurchasePrice * (downPaymentPercentage / 100) +
                          affordability.maxPurchasePrice * 0.03 +
                          950,
                      )}
                    </div>
                    <div className="text-gray-600">Purchase & Closing</div>
                  </div>
                  <div className="text-center">
                    <div className="font-semibold text-green-900">
                      {formatCurrency(1500 + 350 + affordability.monthlyInsurance * 12)}
                    </div>
                    <div className="text-gray-600">Moving & Setup</div>
                  </div>
                  <div className="text-center">
                    <div className="font-semibold text-orange-900">
                      {formatCurrency(affordability.maxPurchasePrice * 0.01 + 2500 + 600)}
                    </div>
                    <div className="text-gray-600">Home Needs</div>
                  </div>
                </div>
              </div>
            </CollapsibleTrigger>

            <CollapsibleContent>
              <div className="px-6 pb-6 pt-0">
                <div className="space-y-4 max-w-2xl mx-auto">
                  {/* Purchase Costs */}
                  <div className="space-y-3">
                    <h4 className="text-sm font-semibold text-gray-800 border-b border-gray-200 pb-1">
                      Purchase & Closing
                    </h4>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-700">Down Payment:</span>
                      <span className="font-semibold">
                        {formatCurrency(affordability.maxPurchasePrice * (downPaymentPercentage / 100))} (
                        {downPaymentPercentage}%)
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-700">Closing Costs:</span>
                      <span className="font-semibold">
                        {formatCurrency(affordability.maxPurchasePrice * 0.03)} (3%)
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-700">Home Inspection:</span>
                      <span className="font-semibold">$500</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-700">Appraisal:</span>
                      <span className="font-semibold">$450</span>
                    </div>
                  </div>

                  {/* Moving & Setup Costs */}
                  <div className="space-y-3">
                    <h4 className="text-sm font-semibold text-gray-800 border-b border-gray-200 pb-1">
                      Moving & Setup
                    </h4>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-700">Moving Expenses:</span>
                      <span className="font-semibold">$1,500</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-700">Utility Deposits & Setup:</span>
                      <span className="font-semibold">$350</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-700">First Year Home Insurance:</span>
                      <span className="font-semibold">{formatCurrency(affordability.monthlyInsurance * 12)}</span>
                    </div>
                  </div>

                  {/* Immediate Home Costs */}
                  <div className="space-y-3">
                    <h4 className="text-sm font-semibold text-gray-800 border-b border-gray-200 pb-1">
                      Immediate Home Needs
                    </h4>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-700">Emergency Repairs Fund:</span>
                      <span className="font-semibold">
                        {formatCurrency(affordability.maxPurchasePrice * 0.01)} (1%)
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-700">Basic Furnishing/Appliances:</span>
                      <span className="font-semibold">$2,500</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-700">Security System (optional):</span>
                      <span className="font-semibold text-gray-500">$600</span>
                    </div>
                  </div>

                  {/* Total */}
                  <div className="flex justify-between items-center pt-4 border-t-2 border-gray-300">
                    <span className="text-gray-900 font-bold text-lg">Total Upfront Costs:</span>
                    <span className="font-bold text-blue-900 text-lg">
                      {formatCurrency(
                        affordability.maxPurchasePrice * (downPaymentPercentage / 100) + // Down payment
                          affordability.maxPurchasePrice * 0.03 + // Closing costs
                          500 + // Home inspection
                          450 + // Appraisal
                          1500 + // Moving
                          350 + // Utilities
                          affordability.monthlyInsurance * 12 + // Insurance
                          affordability.maxPurchasePrice * 0.01 + // Emergency repairs
                          2500 + // Furnishing
                          600, // Security (optional)
                      )}
                    </span>
                  </div>

                  {/* Breakdown Note */}
                  <div className="mt-4 p-3 bg-gray-50 rounded-md">
                    <p className="text-xs text-gray-600">
                      <strong>Note:</strong> These are estimated costs that vary by location and personal choices.
                      Emergency repairs fund (1% of home value) is recommended for unexpected issues in the first
                      year. Security system is optional but recommended for peace of mind.
                    </p>
                  </div>
                </div>
              </div>
            </CollapsibleContent>
          </Collapsible>
        </div>

        {/* Monthly Budget Breakdown */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 mb-4">
            <DollarSign size={18} className="text-gray-600" />
            <h3 className="text-lg font-semibold text-gray-900">Monthly Budget Breakdown</h3>
          </div>

          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-green-700 font-medium">Monthly Take-Home Income:</span>
              <span className="font-bold text-green-700 text-lg">{formatCurrency(affordability.takeHomeIncome)}</span>
            </div>

            <div className="flex justify-between items-center">
              <span className="text-gray-700">(-) Housing Payment (P&I + Escrow):</span>
              <span className="font-semibold text-red-600">{formatCurrency(affordability.actualMonthlyPayment)}</span>
            </div>

            <div className="flex justify-between items-center">
              <span className="text-gray-700">(-) Current Expenses:</span>
              <span className="font-semibold text-red-600">
                {formatCurrency(scenario.financialInputs.monthlyExpenses)}
              </span>
            </div>

            <div className="flex justify-between items-center">
              <span className="text-gray-700">(-) Fixed Debts:</span>
              <span className="font-semibold text-red-600">
                {formatCurrency(scenario.financialInputs.fixedDebts)}
              </span>
            </div>

            {(scenario.financialInputs.futureExpensesMonthly || 0) > 0 && (
              <div className="flex justify-between items-center">
                <span className="text-gray-700">(-) Future Expenses:</span>
                <span className="font-semibold text-orange-600">
                  {formatCurrency(scenario.financialInputs.futureExpensesMonthly || 0)}
                </span>
              </div>
            )}

            {(scenario.financialInputs.futureIncomeMonthly || 0) > 0 && (
              <div className="flex justify-between items-center">
                <span className="text-gray-700">(+) Future Income:</span>
                <span className="font-semibold text-green-600">
                  {formatCurrency(scenario.financialInputs.futureIncomeMonthly || 0)}
                </span>
              </div>
            )}

            <div className="flex justify-between items-center pt-3 border-t border-gray-200">
              <span className="text-gray-900 font-semibold">Remaining Lifestyle Budget:</span>
              <span
                className={`font-bold text-lg ${affordability.remainingBudget >= 0 ? "text-green-600" : "text-red-600"}`}
              >
                {formatCurrency(affordability.remainingBudget)}
              </span>
            </div>

            {/* Budget Status Message */}
            <div className="mt-4 flex items-center gap-2">
              {affordability.remainingBudget >= 1000 ? (
                <>
                  <CheckCircle size={16} className="text-green-600" />
                  <span className="text-sm text-green-700 font-medium">
                    Healthy budget with good cushion for unexpected expenses
                  </span>
                </>
              ) : affordability.remainingBudget >= 0 ? (
                <>
                  <CheckCircle size={16} className="text-yellow-600" />
                  <span className="text-sm text-yellow-700 font-medium">
                    Tight but manageable budget - consider building emergency fund
                  </span>
                </>
              ) : (
                <>
                  <AlertTriangle size={16} className="text-red-600" />
                  <span className="text-sm text-red-700 font-medium">
                    Over budget - need to increase income or reduce expenses
                  </span>
                </>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>

    {/* Livability Section - MOVED FROM INSIDE SCENARIO BUILDER */}
    <Card className="border-2 border-green-200">
      <CardHeader className="pb-3">
        
  <CardTitle className="flex items-center gap-2">
    <Home size={20} className="text-green-600" />
    <span className="text-lg font-semibold text-green-900">Sustainability</span>
    <span className="text-sm text-gray-500">
      a home you can afford now and continue to thrive in over time.
    </span>
  </CardTitle>

      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Current Expenses */}
          <div>{renderItemGroup("expense", "current", "Ongoing Living Costs", "text-red-600 bg-red-50")}</div>

          {/* Future Expenses */}
          <div>{renderItemGroup("expense", "future", "Future Expenses", "text-orange-600 bg-orange-50")}</div>

          {/* Fixed Debts */}
          <div>{renderItemGroup("debt", "current", "Fixed Debts", "text-purple-600 bg-purple-50")}</div>
        </div>
      </CardContent>
    </Card>

    {/* Edit/Add Modal */}
    <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{editingItem ? "Edit Item" : "Add New Item"}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="label" className="text-right">
              Name
            </Label>
            <Input
              id="label"
              value={modalLabel}
              onChange={(e) => setModalLabel(e.target.value)}
              className="col-span-3"
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="amount" className="text-right">
              Amount
            </Label>
            <Input
              id="amount"
              type="number"
              value={modalAmount}
              onChange={(e) => setModalAmount(Number(e.target.value))}
              className="col-span-3"
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="type" className="text-right">
              Type
            </Label>
            <Select value={modalType} onValueChange={(value: any) => setModalType(value)}>
              <SelectTrigger className="col-span-3">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="income">Income</SelectItem>
                <SelectItem value="expense">Expense</SelectItem>
                <SelectItem value="debt">Debt</SelectItem>
                <SelectItem value="downpayment">Down Payment</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="frequency" className="text-right">
              Frequency
            </Label>
            <Select value={modalFrequency} onValueChange={(value: any) => setModalFrequency(value)}>
              <SelectTrigger className="col-span-3">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="monthly">Monthly</SelectItem>
                <SelectItem value="annual">Annual</SelectItem>
                <SelectItem value="one-time">One Time</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="timing" className="text-right">
              Timing
            </Label>
            <Select value={modalTiming} onValueChange={(value: any) => setModalTiming(value)}>
              <SelectTrigger className="col-span-3">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="current">Current</SelectItem>
                <SelectItem value="future">Future</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button type="submit" onClick={handleSaveModal}>
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    {/* Expense Ideas Modal */}
    <Dialog open={isExpenseIdeasOpen} onOpenChange={setIsExpenseIdeasOpen}>
      <DialogContent className="sm:max-w-[800px] max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Info size={20} />
            Expense Ideas by Life Event
          </DialogTitle>
        </DialogHeader>
        <div className="overflow-y-auto max-h-[60vh] py-4">
          <div className="space-y-6">
            {Object.entries(expenseIdeas).map(([lifeEvent, expenses]) => (
              <div key={lifeEvent} className="space-y-4">
                <h3 className="font-semibold text-gray-900 text-lg border-b border-gray-200 pb-2">{lifeEvent}</h3>

                {/* Monthly Expenses */}
                {expenses.monthly.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="font-medium text-gray-700 flex items-center gap-2">
                      <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                      Monthly Expenses
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      {expenses.monthly.map((idea, index) => (
                        <div
                          key={`${lifeEvent}-monthly-${index}`}
                          className="flex items-center justify-between p-3 bg-blue-50 rounded-lg hover:bg-blue-100 cursor-pointer transition-colors border border-blue-200"
                          onClick={() => handleAddExpenseIdea(idea, "current")}
                        >
                          <div>
                            <p className="text-sm font-medium text-gray-900">{idea.label}</p>
                            <p className="text-xs text-blue-600">{formatCurrency(idea.amount)}/mo</p>
                          </div>
                          <Plus size={16} className="text-blue-500" />
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Annual Expenses */}
                {expenses.annual.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="font-medium text-gray-700 flex items-center gap-2">
                      <span className="w-2 h-2 bg-orange-500 rounded-full"></span>
                      Annual Expenses
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      {expenses.annual.map((idea, index) => (
                        <div
                          key={`${lifeEvent}-annual-${index}`}
                          className="flex items-center justify-between p-3 bg-orange-50 rounded-lg hover:bg-orange-100 cursor-pointer transition-colors border border-orange-200"
                          onClick={() => handleAddExpenseIdea(idea, "future")}
                        >
                          <div className="flex items-center gap-2">
                            <div>
                              <p className="text-sm font-medium text-gray-900">{idea.label}</p>
                              <p className="text-xs text-orange-600">{formatCurrency(idea.amount)}/yr</p>
                            </div>
                            <Calendar size={12} className="text-orange-500" />
                          </div>
                          <Plus size={16} className="text-orange-500" />
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
        <DialogFooter>
          <p className="text-xs text-gray-500 text-left flex-1">
            Click any expense to add it to your scenario. Organized by common life events that affect housing
            affordability.
          </p>
          <Button variant="outline" onClick={() => setIsExpenseIdeasOpen(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  </div>
)
}
