"use client"

import type React from "react"

import { useState, useRef, useMemo, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { TrendingUp, TrendingDown, Home, DollarSign, AlertTriangle, CheckCircle, Settings, ChevronDown, ChevronUp, Plus, Pencil, Trash2, Calendar, Info, MapPin } from 'lucide-react'
import { formatCurrency, calculateMaxAffordability, estimateInterestRate } from "@/lib/affordability-calculations"
import type { Scenario } from "@/lib/property-types"

interface ZipData {
  city: string
  state: string
  propertyTaxRate: number  // county + city portion
  schoolTaxRate: number    // school district portion
}

const ZIP_TAX_RATES: Record<string, ZipData> = {
  "62701": { city: "Springfield",  state: "IL", propertyTaxRate: 0.0060, schoolTaxRate: 0.0140 }, // total 2.00%
  "65801": { city: "Springfield",  state: "MO", propertyTaxRate: 0.0050, schoolTaxRate: 0.0043 }, // total 0.93%
  "01103": { city: "Springfield",  state: "MA", propertyTaxRate: 0.0082, schoolTaxRate: 0.0090 }, // total 1.72%
  "45501": { city: "Springfield",  state: "OH", propertyTaxRate: 0.0057, schoolTaxRate: 0.0090 }, // total 1.47%
  "10001": { city: "New York",     state: "NY", propertyTaxRate: 0.0053, schoolTaxRate: 0.0035 }, // total 0.88%
  "60601": { city: "Chicago",      state: "IL", propertyTaxRate: 0.0074, schoolTaxRate: 0.0140 }, // total 2.14%
  "77001": { city: "Houston",      state: "TX", propertyTaxRate: 0.0090, schoolTaxRate: 0.0111 }, // total 2.01%
  "78701": { city: "Austin",       state: "TX", propertyTaxRate: 0.0070, schoolTaxRate: 0.0111 }, // total 1.81%
  "30301": { city: "Atlanta",      state: "GA", propertyTaxRate: 0.0051, schoolTaxRate: 0.0040 }, // total 0.91%
  "85001": { city: "Phoenix",      state: "AZ", propertyTaxRate: 0.0040, schoolTaxRate: 0.0022 }, // total 0.62%
  "80201": { city: "Denver",       state: "CO", propertyTaxRate: 0.0038, schoolTaxRate: 0.0022 }, // total 0.60%
  "98101": { city: "Seattle",      state: "WA", propertyTaxRate: 0.0055, schoolTaxRate: 0.0037 }, // total 0.92%
  "33101": { city: "Miami",        state: "FL", propertyTaxRate: 0.0058, schoolTaxRate: 0.0039 }, // total 0.97%
  "19101": { city: "Philadelphia", state: "PA", propertyTaxRate: 0.0083, schoolTaxRate: 0.0048 }, // total 1.31%
  "90210": { city: "Beverly Hills",state: "CA", propertyTaxRate: 0.0050, schoolTaxRate: 0.0027 }, // total 0.77%
}

interface AffordabilitySummaryProps {
scenario: Scenario
onScenarioUpdate: (scenario: Scenario) => void
onLocationChange?: (location: (ZipData & { zipCode: string }) | null) => void
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
// Debt-specific field
balance?: number  // outstanding principal balance (for debts)
// Expense-specific dimension field (replaces timing for expenses)
expenseTiming?: "stable" | "changing" | "new"  // stable=same after move, changing=different amount, new=doesn't exist yet
futureAmount?: number  // post-move amount for "changing" expenses
// Income-specific withholding fields
incomeEntry?: "gross" | "net"
withholdingTaxPct?: number
withholding401kPct?: number
withholdingHealthcarePct?: number
withholdingHSAPct?: number
withholdingOtherPct?: number
}

export default function AffordabilitySummary({
scenario,
onScenarioUpdate,
onLocationChange,
className = "",
}: AffordabilitySummaryProps) {
// Get housing percentage from scenario or default to 30%
const housingPercentage = scenario.financialInputs.housingPercentage || 30
const downPaymentPercentage = scenario.financialInputs.downPaymentPercentage || 20

// Scenario management state
const [isScenarioBuilderOpen, setIsScenarioBuilderOpen] = useState(false)
const [isSustainabilityOpen, setIsSustainabilityOpen] = useState(false)
const [isLivabilityOpen, setIsLivabilityOpen] = useState(false)
const [isLocationOpen, setIsLocationOpen] = useState(false)

// Location panel state
const [locationMode, setLocationMode] = useState<"zip" | "home">("zip")
const [zipCode, setZipCode] = useState("62701")
const [homeAddress, setHomeAddress] = useState("")
const [homeListPrice, setHomeListPrice] = useState<number | undefined>()
const [homeBeds, setHomeBeds] = useState<number | undefined>()
const [homeBaths, setHomeBaths] = useState<number | undefined>()
const [homeSqft, setHomeSqft] = useState<number | undefined>()
const [homeNotes, setHomeNotes] = useState("")

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
    incomeEntry: "gross" as const,
    withholdingTaxPct: 25,
    withholding401kPct: 5,
    withholdingHealthcarePct: 5,
    withholdingHSAPct: 0,
    withholdingOtherPct: 0,
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
    incomeEntry: "gross" as const,
    withholdingTaxPct: 25,
    withholding401kPct: 5,
    withholdingHealthcarePct: 5,
    withholdingHSAPct: 0,
    withholdingOtherPct: 0,
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
    incomeEntry: "gross" as const,
    withholdingTaxPct: 25,
    withholding401kPct: 0,
    withholdingHealthcarePct: 0,
    withholdingHSAPct: 0,
    withholdingOtherPct: 0,
  },
  // Stable expenses — same before and after the move
  {
    id: "groceries",
    label: "Groceries",
    amount: 600,
    type: "expense",
    frequency: "monthly",
    timing: "current",
    expenseTiming: "stable",
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
    expenseTiming: "stable",
    active: true,
    editable: true,
  },
  {
    id: "amazon-prime",
    label: "Amazon Prime",
    amount: 160,
    type: "expense",
    frequency: "annual",
    timing: "current",
    expenseTiming: "stable",
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
    expenseTiming: "stable",
    active: false,
    editable: true,
  },
  {
    id: "clothes",
    label: "Clothes",
    amount: 1000,
    type: "expense",
    frequency: "annual",
    timing: "current",
    expenseTiming: "stable",
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
    expenseTiming: "stable",
    active: false,
    editable: true,
  },
  // Changing expenses — exist now but will be different after the move
  {
    id: "utilities",
    label: "Utilities",
    amount: 200,
    futureAmount: 300,
    type: "expense",
    frequency: "monthly",
    timing: "current",
    expenseTiming: "changing",
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
    expenseTiming: "stable",
    active: false,
    editable: true,
  },
  // New expenses — don't exist yet, start after the move
  {
    id: "daycare",
    label: "Future Daycare",
    amount: scenario.financialInputs.futureExpensesMonthly || 1200,
    type: "expense",
    frequency: "monthly",
    timing: "future",
    expenseTiming: "new",
    active: !!scenario.financialInputs.futureExpensesMonthly,
    editable: true,
  },
  {
    id: "hoa-fees",
    label: "HOA Fees",
    amount: 500,
    type: "expense",
    frequency: "annual",
    timing: "future",
    expenseTiming: "new",
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
    expenseTiming: "new",
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
    expenseTiming: "new",
    active: false,
    editable: true,
  },
  {
    id: "future-annual",
    label: "Future Annual Expense",
    amount: 1500,
    type: "expense",
    frequency: "annual",
    timing: "future",
    expenseTiming: "new",
    active: false,
    editable: true,
  },
  // Debt items
  {
    id: "credit-card",
    label: "Credit Card Payment",
    amount: Math.floor(scenario.financialInputs.fixedDebts * 0.4),
    balance: 8400,
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
    balance: 14200,
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
// Debt-specific modal state
const [modalBalance, setModalBalance] = useState<number | undefined>(undefined)
// Expense-specific modal state
const [modalExpenseTiming, setModalExpenseTiming] = useState<"stable" | "changing" | "new">("stable")
const [modalFutureAmount, setModalFutureAmount] = useState<number | undefined>(undefined)
// Income-specific withholding modal state
const [modalIncomeEntry, setModalIncomeEntry] = useState<"gross" | "net">("gross")
const [modalWithholdingTax, setModalWithholdingTax] = useState(25)
const [modalWithholding401k, setModalWithholding401k] = useState(5)
const [modalWithholdingHealthcare, setModalWithholdingHealthcare] = useState(5)
const [modalWithholdingHSA, setModalWithholdingHSA] = useState(0)
const [modalWithholdingOther, setModalWithholdingOther] = useState(0)

// Quick add state
const [quickAddItems, setQuickAddItems] = useState<{ [key: string]: { label: string; amount: string } }>({})
const quickAddRefs = useRef<{ [key: string]: HTMLInputElement | null }>({})

const zipInfo = zipCode.length === 5 ? ZIP_TAX_RATES[zipCode] : undefined
const activePropertyTaxRate = zipInfo
  ? zipInfo.propertyTaxRate + zipInfo.schoolTaxRate
  : 0.0181

// Notify parent whenever location changes
useEffect(() => {
  onLocationChange?.(zipInfo ? { zipCode, ...zipInfo } : null)
}, [zipCode]) // eslint-disable-line react-hooks/exhaustive-deps

const affordability = calculateMaxAffordability(scenario, housingPercentage, downPaymentPercentage, activePropertyTaxRate)

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
  const newRate = estimateInterestRate(
    scenario.financialInputs.creditScore ?? 699,
    scenario.financialInputs.loanTerm ?? 30,
    newPercentage,
    scenario.financialInputs.marketReferenceRate ?? 6.85,
  )
  onScenarioUpdate({
    ...scenario,
    financialInputs: {
      ...scenario.financialInputs,
      downPaymentPercentage: newPercentage,
      interestRate: newRate,
    },
  })
}

const handleCreditScoreChange = (score: number) => {
  const newRate = estimateInterestRate(
    score,
    scenario.financialInputs.loanTerm ?? 30,
    downPaymentPercentage,
    scenario.financialInputs.marketReferenceRate ?? 6.85,
  )
  onScenarioUpdate({
    ...scenario,
    financialInputs: {
      ...scenario.financialInputs,
      creditScore: score,
      interestRate: newRate,
    },
  })
}

const handleMarketRateChange = (marketRate: number) => {
  const newRate = estimateInterestRate(
    scenario.financialInputs.creditScore ?? 699,
    scenario.financialInputs.loanTerm ?? 30,
    downPaymentPercentage,
    marketRate,
  )
  onScenarioUpdate({
    ...scenario,
    financialInputs: {
      ...scenario.financialInputs,
      marketReferenceRate: marketRate,
      interestRate: newRate,
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
  // Populate debt-specific fields
  setModalBalance(item.balance)
  // Populate expense-specific dimension fields
  setModalExpenseTiming(item.expenseTiming ?? (item.timing === "future" ? "new" : "stable"))
  setModalFutureAmount(item.futureAmount)
  // Populate income-specific withholding fields
  setModalIncomeEntry(item.incomeEntry ?? "gross")
  setModalWithholdingTax(item.withholdingTaxPct ?? 25)
  setModalWithholding401k(item.withholding401kPct ?? 5)
  setModalWithholdingHealthcare(item.withholdingHealthcarePct ?? 5)
  setModalWithholdingHSA(item.withholdingHSAPct ?? 0)
  setModalWithholdingOther(item.withholdingOtherPct ?? 0)
  setIsModalOpen(true)
}

const handleDelete = (itemId: string) => {
  const updatedItems = financialItems.filter((item) => item.id !== itemId)
  setFinancialItems(updatedItems)
  updateScenarioFromItems(updatedItems)
}

const handleSaveModal = () => {
  let updatedItems: FinancialItem[]

  // Build income-specific withholding fields
  const incomeFields = modalType === "income" ? {
    incomeEntry: modalIncomeEntry,
    withholdingTaxPct:        modalIncomeEntry === "gross" ? modalWithholdingTax : undefined,
    withholding401kPct:       modalIncomeEntry === "gross" ? modalWithholding401k : undefined,
    withholdingHealthcarePct: modalIncomeEntry === "gross" ? modalWithholdingHealthcare : undefined,
    withholdingHSAPct:        modalIncomeEntry === "gross" ? modalWithholdingHSA : undefined,
    withholdingOtherPct:      modalIncomeEntry === "gross" ? modalWithholdingOther : undefined,
  } : {}

  // Build debt-specific fields
  const debtFields = modalType === "debt" ? {
    balance: modalBalance != null && modalBalance > 0 ? modalBalance : undefined,
  } : {}

  // Build expense-specific dimension fields
  const expenseFields = modalType === "expense" ? {
    expenseTiming: modalExpenseTiming,
    futureAmount: modalExpenseTiming === "changing" && modalFutureAmount != null ? modalFutureAmount : undefined,
    timing: (modalExpenseTiming === "new" ? "future" : "current") as "current" | "future",
  } : {}

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
            ...incomeFields,
            ...debtFields,
            ...expenseFields,
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
      ...incomeFields,
      ...debtFields,
      ...expenseFields,
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
  // Reset debt-specific fields
  setModalBalance(undefined)
  // Reset expense-specific dimension fields
  setModalExpenseTiming("stable")
  setModalFutureAmount(undefined)
  // Reset income-specific fields to defaults
  setModalIncomeEntry("gross")
  setModalWithholdingTax(25)
  setModalWithholding401k(5)
  setModalWithholdingHealthcare(5)
  setModalWithholdingHSA(0)
  setModalWithholdingOther(0)
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

  // Compute per-item take-home, respecting each income item's gross/net setting
  let annualTakeHomeIncome = 0
  for (const item of activeItems.filter((i) => i.type === "income")) {
    const annualGross = item.frequency === "annual" ? item.amount : item.amount * 12
    if (item.incomeEntry === "net") {
      annualTakeHomeIncome += annualGross
    } else {
      const taxPct = item.withholdingTaxPct ?? 25
      const ret401Pct = item.withholding401kPct ?? 5
      const hcPct = item.withholdingHealthcarePct ?? 5
      const hsaPct = item.withholdingHSAPct ?? 0
      const otherPct = item.withholdingOtherPct ?? 0
      annualTakeHomeIncome += annualGross * (1 - (taxPct + ret401Pct + hcPct + hsaPct + otherPct) / 100)
    }
  }

  // Pre-move baseline: stable + changing expenses (using current amount)
  const monthlyExpenses = activeItems
    .filter((item) => item.type === "expense" && (
      item.expenseTiming === "stable" ||
      item.expenseTiming === "changing" ||
      // fallback for legacy items without expenseTiming
      (!item.expenseTiming && item.timing === "current")
    ))
    .reduce((sum, item) => {
      return sum + (item.frequency === "monthly" ? item.amount : item.amount / 12)
    }, 0)

  // Post-move projection: changing expenses (at futureAmount) + new expenses
  const futureExpensesMonthly = activeItems
    .filter((item) => item.type === "expense" && (
      item.expenseTiming === "changing" ||
      item.expenseTiming === "new" ||
      // fallback for legacy items without expenseTiming
      (!item.expenseTiming && item.timing === "future")
    ))
    .reduce((sum, item) => {
      const postMoveAmount = item.expenseTiming === "changing"
        ? (item.futureAmount ?? item.amount)  // use futureAmount if set, else same as current
        : item.amount
      return sum + (item.frequency === "monthly" ? postMoveAmount : postMoveAmount / 12)
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
      annualTakeHomeIncome: Math.round(annualTakeHomeIncome),
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
    <div className="flex items-center gap-2 p-2 bg-muted rounded border-2 border-dashed border-gray-300">
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

const renderItemGroup = (
  type: FinancialItem["type"],
  timingOrExpenseTiming: "current" | "future" | "stable" | "changing" | "new",
  title: string,
  color: string,
) => {
  const items = financialItems.filter((item) => {
    if (item.type !== type) return false
    if (type === "expense" && (timingOrExpenseTiming === "stable" || timingOrExpenseTiming === "changing" || timingOrExpenseTiming === "new")) {
      // Route by expenseTiming for expenses
      const et = item.expenseTiming ?? (item.timing === "current" ? "stable" : "new")
      return et === timingOrExpenseTiming
    }
    // Non-expense types use timing as before
    return item.timing === timingOrExpenseTiming
  })

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
          <h3 className="font-semibold text-foreground">{title}</h3>
          {type === "expense" && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsExpenseIdeasOpen(true)}
              className="h-6 w-6 p-0 text-muted-foreground/70 hover:text-muted-foreground"
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
              item.active ? "bg-white border-border" : "bg-muted border-border/60"
            } ${item.frequency === "annual" ? "border-l-4 border-l-orange-300" : ""}`}
          >
            <div className="flex items-center gap-3 flex-1">
              <Switch checked={item.active} onCheckedChange={() => handleToggle(item.id)} />
              <div className="flex-1">
                <p
                  className={`text-sm font-medium ${item.active ? "text-foreground" : "text-muted-foreground"} flex items-center gap-2`}
                >
                  {item.label}
                  {item.frequency === "annual" && <Calendar size={12} className="text-orange-500" />}
                </p>
                <p
                  className={`text-xs ${item.active ? "text-muted-foreground" : "text-muted-foreground/70"} ${item.frequency === "annual" ? "text-orange-600" : ""}`}
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

        {/* Income Math Summary — shows gross → withholdings → net → housing target */}
        {type === "income" && (() => {
          const activeIncomeItems = financialItems.filter((i) => i.type === "income" && i.active)
          if (activeIncomeItems.length === 0) return null
          const totalGrossMonthly = activeIncomeItems.reduce((sum, item) => {
            return sum + (item.frequency === "annual" ? item.amount / 12 : item.amount)
          }, 0)
          const totalNetMonthly = activeIncomeItems.reduce((sum, item) => {
            const monthly = item.frequency === "annual" ? item.amount / 12 : item.amount
            if (item.incomeEntry === "net") return sum + monthly
            const totalPct = (item.withholdingTaxPct ?? 25) + (item.withholding401kPct ?? 5) +
              (item.withholdingHealthcarePct ?? 5) + (item.withholdingHSAPct ?? 0) + (item.withholdingOtherPct ?? 0)
            return sum + monthly * (1 - totalPct / 100)
          }, 0)
          const totalWithholdingsMonthly = totalGrossMonthly - totalNetMonthly
          const effectiveWithholdingPct = totalGrossMonthly > 0
            ? Math.round((totalWithholdingsMonthly / totalGrossMonthly) * 100) : 0
          const housingTarget = totalNetMonthly * (housingPercentage / 100)
          const hasNetItems = activeIncomeItems.some((i) => i.incomeEntry === "net")

          return (
            <div className="mt-3 pt-3 border-t border-border bg-muted rounded-lg p-3 space-y-1 text-sm">
              <div className="flex justify-between text-muted-foreground">
                <span>Total Gross Income</span>
                <span className="font-medium">{formatCurrency(totalGrossMonthly)}/mo</span>
              </div>
              {totalWithholdingsMonthly > 0 && (
                <div className="flex justify-between text-muted-foreground/70">
                  <span>(-) Withholdings (~{effectiveWithholdingPct}%)</span>
                  <span>-{formatCurrency(totalWithholdingsMonthly)}/mo</span>
                </div>
              )}
              <div className="flex justify-between font-semibold text-green-700 pt-1 border-t border-border">
                <span>= Net Take-Home</span>
                <span>{formatCurrency(totalNetMonthly)}/mo</span>
              </div>
              <div className="flex justify-between text-primary font-medium">
                <span>× {housingPercentage}% Housing Target</span>
                <span>= {formatCurrency(housingTarget)}/mo</span>
              </div>
              {hasNetItems && (
                <p className="text-xs text-muted-foreground/70 italic pt-1">
                  One or more sources entered as net — withholding row reflects gross items only.
                </p>
              )}
            </div>
          )
        })()}

        {/* Quick Add Row */}
        {renderQuickAdd(type, timingOrExpenseTiming === "new" ? "future" : "current")}
      </div>
    </div>
  )
}

const getAffordabilityLevel = (price: number) => {
  if (price >= 600000) return { level: "High", color: "text-green-600 bg-green-50", icon: TrendingUp }
  if (price >= 400000) return { level: "Moderate", color: "text-primary bg-primary/8", icon: Home }
  if (price >= 200000) return { level: "Starter", color: "text-yellow-600 bg-yellow-50", icon: Home }
  return { level: "Limited", color: "text-red-600 bg-red-50", icon: AlertTriangle }
}

const affordabilityLevel = getAffordabilityLevel(affordability.maxPurchasePrice)
const AffordabilityIcon = affordabilityLevel.icon

const renderMortgageDetailsGroup = () => {
  const currentInterestRate = scenario.financialInputs.interestRate ?? 6.85
  const currentLoanTerm = scenario.financialInputs.loanTerm ?? 30
  const currentCreditScore = scenario.financialInputs.creditScore ?? 699
  const currentMarketRate = scenario.financialInputs.marketReferenceRate ?? 6.85

  // Credit score tiers
  const CREDIT_TIERS = [
    { label: "Very Poor",  range: "<620",     score: 580 },
    { label: "Poor",       range: "620–639",  score: 629 },
    { label: "Fair",       range: "640–679",  score: 659 },
    { label: "Good",       range: "680–719",  score: 699 },
    { label: "Very Good",  range: "720–759",  score: 739 },
    { label: "Exceptional",range: "760+",     score: 780 },
  ]
  const activeTier = CREDIT_TIERS.slice().reverse().find((t) => currentCreditScore >= t.score) ?? CREDIT_TIERS[3]

  // Estimated rate for current profile
  const estimatedRate = estimateInterestRate(currentCreditScore, currentLoanTerm, downPaymentPercentage, currentMarketRate)
  const rateMatchesEstimate = Math.abs(currentInterestRate - estimatedRate) < 0.01

  // Nudge rate buttons (±0.25%)
  const nudgeLow  = Math.max(1,  Math.round((currentInterestRate - 0.25) * 8) / 8)
  const nudgeHigh = Math.min(15, Math.round((currentInterestRate + 0.25) * 8) / 8)

  const handleMortgageToggle = (item: { type: string; value: number }) => {
    if (item.type === "term") {
      const newRate = estimateInterestRate(currentCreditScore, item.value, downPaymentPercentage, currentMarketRate)
      onScenarioUpdate({
        ...scenario,
        financialInputs: { ...scenario.financialInputs, loanTerm: item.value, interestRate: newRate },
      })
    } else if (item.type === "rate") {
      onScenarioUpdate({
        ...scenario,
        financialInputs: { ...scenario.financialInputs, interestRate: item.value },
      })
    }
  }

  // Debt items
  const debtItems = financialItems.filter((item) => item.type === "debt" && item.timing === "current")
  const activeDebtTotal = debtItems
    .filter((item) => item.active)
    .reduce((sum, item) => sum + (item.frequency === "annual" ? item.amount / 12 : item.amount), 0)

  // Debt impact on purchase ceiling
  const scenarioNoDebts = { ...scenario, financialInputs: { ...scenario.financialInputs, fixedDebts: 0 } }
  const affordabilityNoDebts = calculateMaxAffordability(scenarioNoDebts, housingPercentage, downPaymentPercentage, activePropertyTaxRate)
  const debtPriceDelta = Math.round((affordabilityNoDebts.maxPurchasePrice - affordability.maxPurchasePrice) / 1000) * 1000

  // Radio circle indicator (replaces Switch readOnly)
  const RadioCircle = ({ active }: { active: boolean }) => (
    <div className={`w-4 h-4 rounded-full border-2 flex-shrink-0 flex items-center justify-center ${
      active ? "border-primary bg-primary/80" : "border-gray-400"
    }`}>
      {active && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
    </div>
  )

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-foreground">Mortgage Details</h3>
        <Badge variant="outline" className="text-primary bg-primary/8">
          {displayLoanTerm}yr • {downPaymentPercentage}% down • {displayInterestRate}%
        </Badge>
      </div>

      <div className="space-y-3">
        {/* 1. Loan Term */}
        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground">Loan Term</p>
          <div className="flex flex-wrap gap-2">
            {[
              { id: "term-15", label: "15 Year Term", value: 15 },
              { id: "term-20", label: "20 Year Term", value: 20 },
              { id: "term-30", label: "30 Year Term", value: 30 },
            ].map((item) => {
              const isActive = currentLoanTerm === item.value
              return (
                <div
                  key={item.id}
                  className={`flex items-center gap-2 p-2 rounded-lg border transition-all cursor-pointer ${
                    isActive ? "bg-primary/8 border-primary/25" : "bg-muted border-border/60 hover:bg-gray-100"
                  }`}
                  onClick={() => handleMortgageToggle({ type: "term", value: item.value })}
                >
                  <RadioCircle active={isActive} />
                  <span className={`text-sm font-medium ${isActive ? "text-primary" : "text-muted-foreground"}`}>
                    {item.label}
                  </span>
                </div>
              )
            })}
          </div>
        </div>

        {/* 2. Down Payment % */}
        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground">Down Payment %</p>
          <div className="flex flex-wrap gap-2">
            {[10, 15, 20, 25].map((percentage) => {
              const isActive = downPaymentPercentage === percentage
              return (
                <div
                  key={`dp-${percentage}`}
                  className={`flex items-center gap-2 p-2 rounded-lg border transition-all cursor-pointer ${
                    isActive ? "bg-primary/8 border-primary/25" : "bg-muted border-border/60 hover:bg-gray-100"
                  }`}
                  onClick={() => handleDownPaymentPercentageChange(percentage)}
                >
                  <RadioCircle active={isActive} />
                  <span className={`text-sm font-medium ${isActive ? "text-primary" : "text-muted-foreground"}`}>
                    {percentage}%
                  </span>
                </div>
              )
            })}
          </div>
        </div>

        {/* 3. Credit Score Tier */}
        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground">Credit Score</p>
          <div className="flex flex-wrap gap-2">
            {CREDIT_TIERS.map((tier) => {
              const isActive = activeTier.score === tier.score
              return (
                <div
                  key={tier.score}
                  className={`flex items-center gap-2 p-2 rounded-lg border transition-all cursor-pointer ${
                    isActive ? "bg-primary/8 border-primary/25" : "bg-muted border-border/60 hover:bg-gray-100"
                  }`}
                  onClick={() => handleCreditScoreChange(tier.score)}
                >
                  <RadioCircle active={isActive} />
                  <div>
                    <span className={`text-sm font-medium ${isActive ? "text-primary" : "text-muted-foreground"}`}>
                      {tier.label}
                    </span>
                    <span className={`text-xs ml-1 ${isActive ? "text-primary" : "text-muted-foreground/70"}`}>
                      {tier.range}
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* 4. Interest Rate — derived from above, with manual nudge */}
        <div className="space-y-2 pt-1 border-t border-border/60">
          {/* Market reference rate input */}
          <div className="flex items-center gap-2">
            <p className="text-xs font-medium text-muted-foreground flex-1">Interest Rate</p>
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <span>Market ref:</span>
              <input
                type="number"
                step="0.125"
                min="1"
                max="15"
                value={currentMarketRate}
                onChange={(e) => {
                  const v = parseFloat(e.target.value)
                  if (!isNaN(v) && v > 0 && v < 20) handleMarketRateChange(v)
                }}
                className="w-14 text-xs border border-gray-300 rounded px-1 py-0.5 text-center"
              />
              <span>%</span>
            </div>
          </div>

          {/* Estimated rate label */}
          <div className="text-xs text-muted-foreground">
            Estimated for your profile:{" "}
            <span className="font-semibold text-primary">{estimatedRate.toFixed(2)}%</span>
            <span className="ml-1">
              ({activeTier.label} • {currentLoanTerm}yr • {downPaymentPercentage}% down)
            </span>
          </div>

          {/* Interest rate stepper */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              aria-label="Decrease interest rate by 0.125%"
              onClick={() => {
                const next = Math.max(1, parseFloat((currentInterestRate - 0.125).toFixed(3)))
                handleMortgageToggle({ type: "rate", value: next })
              }}
              disabled={currentInterestRate <= 1}
              className="w-8 h-8 flex items-center justify-center rounded border border-gray-300 bg-white hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed text-gray-700 font-medium text-base leading-none"
            >
              −
            </button>
            <input
              id="interestRateInput"
              type="number"
              step="0.125"
              min="1"
              max="15"
              value={currentInterestRate.toFixed(2)}
              onChange={(e) => {
                const v = parseFloat(e.target.value)
                if (!isNaN(v) && v >= 1 && v <= 15) handleMortgageToggle({ type: "rate", value: v })
              }}
              aria-label="Interest rate percent APR"
              className="w-20 text-center text-sm font-semibold border border-gray-300 rounded px-2 py-1"
            />
            <button
              type="button"
              aria-label="Increase interest rate by 0.125%"
              onClick={() => {
                const next = Math.min(15, parseFloat((currentInterestRate + 0.125).toFixed(3)))
                handleMortgageToggle({ type: "rate", value: next })
              }}
              disabled={currentInterestRate >= 15}
              className="w-8 h-8 flex items-center justify-center rounded border border-gray-300 bg-white hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed text-gray-700 font-medium text-base leading-none"
            >
              +
            </button>
            <span className="text-xs text-muted-foreground ml-1">% APR</span>
          </div>

          {/* Reset to estimated link — shown only when manually nudged */}
          {!rateMatchesEstimate && (
            <button
              className="text-xs text-primary hover:text-primary underline"
              onClick={() => handleMortgageToggle({ type: "rate", value: estimatedRate })}
            >
              ↺ Reset to estimated ({estimatedRate.toFixed(2)}%)
            </button>
          )}
        </div>

        {/* 5. Debt Obligations — affects DTI qualification */}
        <div className="space-y-2 pt-2 border-t border-border/60">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium text-muted-foreground">Debt Obligations</p>
            <span className="text-xs text-muted-foreground/70 italic">affects your DTI ratio</span>
          </div>
          {debtItems.length === 0 ? (
            <p className="text-xs text-muted-foreground/70 italic">No debts added yet</p>
          ) : (
            <div className="space-y-1">
              {debtItems.map((item) => (
                <div
                  key={item.id}
                  className={`flex items-center justify-between p-2 rounded-lg border transition-all ${
                    item.active ? "bg-primary/8 border-primary/25" : "bg-muted border-border/60 opacity-50"
                  }`}
                >
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <Switch
                      checked={item.active}
                      onCheckedChange={(checked) => {
                        const updated = financialItems.map((fi) =>
                          fi.id === item.id ? { ...fi, active: checked } : fi
                        )
                        setFinancialItems(updated)
                        updateScenarioFromItems(updated)
                      }}
                    />
                    <span className={`text-sm font-medium truncate ${item.active ? "text-primary" : "text-muted-foreground"}`}>
                      {item.label}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 ml-2 shrink-0">
                    <div className="text-right">
                      <div className="text-xs font-semibold text-primary">
                        {formatCurrency(item.frequency === "annual" ? item.amount / 12 : item.amount)}/mo min
                      </div>
                      {item.balance != null && (
                        <div className="text-xs text-muted-foreground/70">
                          Balance: {formatCurrency(item.balance)}
                        </div>
                      )}
                    </div>
                    {item.editable && (
                      <div className="flex gap-1">
                        <Button variant="ghost" size="sm" onClick={() => handleEdit(item)} className="h-6 w-6 p-0">
                          <Pencil size={12} />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            const updated = financialItems.filter((fi) => fi.id !== item.id)
                            setFinancialItems(updated)
                            updateScenarioFromItems(updated)
                          }}
                          className="h-6 w-6 p-0 text-red-400 hover:text-red-600"
                        >
                          <Trash2 size={12} />
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
          {activeDebtTotal > 0 && (
            <div className="text-xs text-primary font-medium text-right">
              Total: {formatCurrency(activeDebtTotal)}/mo in minimum payments
            </div>
          )}
          {/* Debt impact on purchase ceiling */}
          {activeDebtTotal > 0 && debtPriceDelta > 0 && (
            <div className="mt-1 p-2 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800">
              Your {formatCurrency(activeDebtTotal)}/mo in debt minimums reduces your purchase ceiling by{" "}
              <span className="font-semibold">~{formatCurrency(debtPriceDelta)}</span>.
              Toggle a debt off above to see your ceiling change.
            </div>
          )}
          {/* Quick-add debt row */}
          <div className="flex gap-2 mt-2">
            <Input
              placeholder="Debt name..."
              className="flex-1 h-8 text-sm"
              onKeyDown={(e) => {
                if (e.key === "Enter") handleAddNew("debt")
              }}
            />
            <Button
              size="sm"
              variant="outline"
              className="h-8 px-3"
              onClick={() => handleAddNew("debt")}
            >
              <Plus size={14} />
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

// Computed live take-home preview for the income modal
const modalTotalWithholdingPct = modalWithholdingTax + modalWithholding401k + modalWithholdingHealthcare + modalWithholdingHSA + modalWithholdingOther
const modalEstimatedTakeHome = (() => {
  if (modalType !== "income" || modalAmount <= 0) return 0
  const annualAmount = modalFrequency === "monthly" ? modalAmount * 12 : modalAmount
  if (modalIncomeEntry === "net") {
    return modalFrequency === "monthly" ? modalAmount : Math.round(modalAmount / 12)
  }
  return Math.round((annualAmount * (1 - modalTotalWithholdingPct / 100)) / 12)
})()

return (
  <div className={`space-y-6 ${className}`}>
    {/* Scenario Builder - Collapsible */}
    <Card className="border-2 border-border">
      <Collapsible open={isScenarioBuilderOpen} onOpenChange={setIsScenarioBuilderOpen}>
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer hover:bg-muted transition-colors">
            <CardTitle className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <TrendingUp size={20} className="text-primary" />
                <span className="text-lg font-semibold text-foreground">Income and Mortgage</span>
                <span className="text-sm text-muted-foreground">•</span>
                <span className="text-sm font-medium text-primary">{scenario.name}</span>
              </span>
              {isScenarioBuilderOpen ? (
                <ChevronUp size={20} className="text-muted-foreground/70" />
              ) : (
                <ChevronDown size={20} className="text-muted-foreground/70" />
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
                  <div className="p-3 bg-primary/8 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-2 h-2 bg-primary/80 rounded-full"></div>
                      <span className="font-semibold text-foreground">Housing Payment</span>
                    </div>
                    <div className="space-y-1">
                      <div className="flex justify-between">
                        <span className="text-primary">Payment Ceiling:</span>
                        <span className="font-medium text-foreground">
                          {formatCurrency(affordability.maxMonthlyPayment)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-primary">Actual:</span>
                        <span className="font-medium text-foreground">
                          {formatCurrency(affordability.actualMonthlyPayment)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-primary">% of Income:</span>
                        <span className="font-medium text-foreground">{housingPercentage}%</span>
                      </div>
                    </div>
                  </div>

                  {/* Down Payment & Opportunity */}
                  <div className="p-3 bg-primary/8 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-2 h-2 bg-primary/80 rounded-full"></div>
                      <span className="font-semibold text-primary">Down Payment</span>
                    </div>
                    <div className="space-y-1">
                      <div className="flex justify-between">
                        <span className="text-primary">Roof:</span>
                        <span className="font-medium text-primary">
                          {formatCurrency(affordability.maxPriceFromDownPayment)}
                        </span>
                      </div>

                      {/* Actionable suggestions based on down payment status */}
                      {affordability.downPaymentStatus === "shortfall" && (
                        <>
                          <div className="text-xs text-primary mt-2">
                            💡 Maximize your monthly budget to{" "}
                            {formatCurrency(affordability.maxMonthlyPayment + affordability.shortfallAmount! / 200)}
                          </div>
                          <div className="text-xs text-primary">
                            🏠 Increase home price to {formatCurrency(affordability.maxPriceFromDownPayment)}
                          </div>
                          <div className="text-xs text-primary">
                            💰 Add {formatCurrency(affordability.shortfallAmount!)} to down payment
                          </div>
                        </>
                      )}

                      {affordability.downPaymentStatus === "excess" && (
                        <>
                          <div className="text-xs text-primary mt-2">
                            🎯 Use excess {formatCurrency(affordability.excessAmount!)} strategically
                          </div>
                          <div className="text-xs text-primary">
                            🏠 Buy {formatCurrency(affordability.maxPurchasePrice + affordability.excessAmount!)} home
                          </div>
                          <div className="text-xs text-primary">
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
                          <div className="text-xs text-primary">
                            🏠 Target home: {formatCurrency(affordability.maxPurchasePrice)}
                          </div>
                          <div className="text-xs text-primary">
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
                  <p className="text-xs text-muted-foreground">
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
                  <div className="bg-muted rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <Label htmlFor="housingPercentage" className="text-sm font-medium flex items-center gap-2">
                        <Settings size={16} />
                        Housing Payment Ceiling
                      </Label>
                      <div className="text-sm text-muted-foreground text-right">
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
                      <span className="text-sm text-muted-foreground">% of take-home income</span>
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
                    <div className="mt-3 p-3 bg-white border border-border rounded-md">
                      <p className="text-xs font-medium text-muted-foreground mb-1">Purchase Roof</p>
                      <p className="text-sm font-semibold text-foreground">
                        {formatCurrency(
                          (() => {
                            // Calculate what purchase price this monthly payment can afford
                            const maxPayment = affordability.maxMonthlyPayment
                            const interestRate = (scenario.financialInputs.interestRate ?? 6.85) / 100 / 12
                            const numPayments = (scenario.financialInputs.loanTerm ?? 30) * 12
                            const propertyTaxRate = activePropertyTaxRate / 12
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
                        )}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {formatCurrency(affordability.maxMonthlyPayment)}/mo · {downPaymentPercentage}% down · {displayInterestRate}%
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

                    <p className="text-xs text-muted-foreground mt-2">
                      Recommended: 25-30% for comfortable living, up to 35% for aggressive buying
                    </p>
                  </div>
                </div>

                {/* Middle Column: Down Payment & Percentage */}
                <div className="space-y-4">
                  {/* Down Payment Sources */}
                  <div>
                    {renderItemGroup("downpayment", "current", "Down Payment Sources", "text-primary bg-primary/8")}
                  </div>

                  {/* Down Payment Control - With Status-Based Strategy */}
                  {/* Down Payment Control - With Purchase Power Display */}
                  <div className="bg-muted rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <Label htmlFor="downPaymentPercentage" className="text-sm font-medium flex items-center gap-2">
                        <DollarSign size={16} />
                        Down Payment Ceiling
                      </Label>
                    </div>

                    {/* Down Payment Purchase Roof - Always Show */}
                    <div className="mb-3 p-3 bg-white border border-border rounded-md">
                      <p className="text-xs font-medium text-muted-foreground mb-1">Purchase Roof</p>
                      <p className="text-sm font-semibold text-foreground">
                        {formatCurrency(affordability.maxPriceFromDownPayment)}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {formatCurrency(affordability.availableDownPayment)} at {downPaymentPercentage}% down
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

    {/* Sustainability + Location side by side */}
    <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">

    {/* Sustainability */}
    <Card className="border-2 border-primary/25">
      <Collapsible open={isSustainabilityOpen} onOpenChange={setIsSustainabilityOpen}>
        <CollapsibleTrigger asChild>
          <CardHeader className="pb-3 cursor-pointer hover:bg-primary/8/50 transition-colors">
            <CardTitle className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <DollarSign size={20} className="text-primary" />
                <span className="text-lg font-semibold text-green-900">Sustainability</span>
                <span className="text-sm text-muted-foreground">
                  What you can carry — the full monthly and upfront cost picture.
                </span>
              </span>
              <div className="flex items-center gap-2">
                {!isSustainabilityOpen && (
                  <span className="text-sm font-medium text-muted-foreground">
                    {formatCurrency(affordability.maxPurchasePrice)} home · {formatCurrency(affordability.actualMonthlyPayment)}/mo
                  </span>
                )}
                <Badge className={affordabilityLevel.color}>
                  <AffordabilityIcon size={14} className="mr-1" />
                  {affordabilityLevel.level}
                </Badge>
                {isSustainabilityOpen ? <ChevronUp size={16} className="text-muted-foreground/70" /> : <ChevronDown size={16} className="text-muted-foreground/70" />}
              </div>
            </CardTitle>
          </CardHeader>
        </CollapsibleTrigger>
        <CollapsibleContent>
        <CardContent className="space-y-6">
        {/* Maximum Home Price - Centered */}
        {/* Maximum Home Price - Equation Format */}
        <div className="text-center py-6">
          <p className="text-sm font-medium text-primary mb-4">Your Home Purchase Equation</p>

          {/* Equation Display */}
          <div className="flex items-center justify-center gap-4 mb-6 text-2xl font-bold">
            <div className="text-center">
              <div className="text-foreground">{formatCurrency(affordability.loanAmount)}</div>
              <div className="text-sm font-normal text-muted-foreground">Loan Amount</div>
            </div>
            <div className="text-primary text-3xl">+</div>
            <div className="text-center">
              <div className="text-foreground">
                {formatCurrency(affordability.maxPurchasePrice * (downPaymentPercentage / 100))}
              </div>
              <div className="text-sm font-normal text-muted-foreground">Down Payment</div>
            </div>
            <div className="text-primary text-3xl">=</div>
            <div className="text-center">
              <div className="text-4xl text-foreground">{formatCurrency(affordability.maxPurchasePrice)}</div>
              <div className="text-sm font-normal text-muted-foreground">Home Purchase</div>
            </div>
          </div>

          <p className="text-sm text-primary mb-4">Based on {scenario.name} scenario</p>
          <div className="text-sm text-muted-foreground mb-4">
            <p className="font-semibold">
              Actual Monthly Payment: {formatCurrency(affordability.actualMonthlyPayment)}
            </p>
            <p>
              {formatCurrency(affordability.monthlyPrincipalInterest)} P&I +{" "}
              {formatCurrency(affordability.monthlyPropertyTax)} Tax +{" "}
              {formatCurrency(affordability.monthlyInsurance)} Insurance
            </p>
            <p className="text-xs text-muted-foreground/70 mt-1">
              {zipInfo ? (
                <>
                  Property tax {(zipInfo.propertyTaxRate * 100).toFixed(2)}% · School district {(zipInfo.schoolTaxRate * 100).toFixed(2)}% · Total {((zipInfo.propertyTaxRate + zipInfo.schoolTaxRate) * 100).toFixed(2)}% ({zipCode} · {zipInfo.city}, {zipInfo.state}) · Insurance est. $1,800/yr
                </>
              ) : `Tax uses ${(activePropertyTaxRate * 100).toFixed(2)}% (${zipCode.length === 5 ? zipCode + " · unknown ZIP" : "national avg"}, 0.3%–2.5% actual) · Insurance est. $1,800/yr`
              }
            </p>
          </div>

          {/* Loan Details */}
          <div className="flex items-center justify-center gap-8 text-sm text-muted-foreground">
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

        {/* Monthly Budget Breakdown */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 mb-4">
            <DollarSign size={18} className="text-muted-foreground" />
            <h3 className="text-lg font-semibold text-foreground">Monthly Budget Breakdown</h3>
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

            {/* PMI warning when down payment < 20% */}
            {downPaymentPercentage < 20 && affordability.loanAmount > 0 && (
              <div className="flex items-start gap-2 p-2 bg-amber-50 border border-amber-200 rounded text-xs text-amber-800">
                <AlertTriangle size={12} className="mt-0.5 flex-shrink-0" />
                <span>
                  <span className="font-semibold">PMI not shown:</span> Less than 20% down typically adds Private Mortgage Insurance (~{formatCurrency(Math.round(affordability.loanAmount * 0.009 / 12 / 10) * 10)}/mo). This is not included in the figures above.
                </span>
              </div>
            )}

            <div className="flex justify-between items-center">
              <span className="text-gray-700">(-) Living Expenses:</span>
              <span className="font-semibold text-red-600">
                {formatCurrency(scenario.financialInputs.monthlyExpenses)}
              </span>
            </div>

            <div className="flex justify-between items-center">
              <span className="text-gray-700">
                (-) Fixed Debt Minimums:
                <span className="text-xs text-muted-foreground/70 ml-1 italic">(also counted in your DTI ratio)</span>
              </span>
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

            <div className="flex justify-between items-center pt-3 border-t border-border">
              <span className="text-foreground font-semibold">Monthly Margin:</span>
              <span
                className={`font-bold text-lg ${affordability.monthlyMargin >= 0 ? "text-green-600" : "text-red-600"}`}
              >
                {formatCurrency(affordability.monthlyMargin)}
              </span>
            </div>

            {/* Monthly Margin Status Message */}
            <div className="mt-4 flex items-center gap-2">
              {affordability.monthlyMargin >= 1000 ? (
                <>
                  <CheckCircle size={16} className="text-green-600" />
                  <span className="text-sm text-green-700 font-medium">
                    Strong monthly margin — good cushion for savings and unexpected costs
                  </span>
                </>
              ) : affordability.monthlyMargin >= 0 ? (
                <>
                  <CheckCircle size={16} className="text-yellow-600" />
                  <span className="text-sm text-yellow-700 font-medium">
                    Tight monthly margin — consider building a cash reserve before committing
                  </span>
                </>
              ) : (
                <>
                  <AlertTriangle size={16} className="text-red-600" />
                  <span className="text-sm text-red-700 font-medium">
                    Negative margin — income doesn't cover housing, expenses, and debts at this scenario
                  </span>
                </>
              )}
            </div>
          </div>
        </div>
        </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>

    {/* Location Panel */}
    <Card className="border-2 border-primary/25">
      <Collapsible open={isLocationOpen} onOpenChange={setIsLocationOpen}>
        <CollapsibleTrigger asChild>
          <CardHeader className="pb-3 cursor-pointer hover:bg-primary/8/50 transition-colors">
            <CardTitle className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <MapPin size={20} className="text-primary" />
                <span className="text-lg font-semibold text-primary">Location costs</span>
                <span className="text-sm font-normal text-muted-foreground">ZIP code or specific home</span>
              </span>
              <div className="flex items-center gap-3">
                {!isLocationOpen && (
                  zipInfo ? (
                    <span className="text-sm font-medium text-muted-foreground">
                      {zipCode} · {zipInfo.city}, {zipInfo.state} · {((zipInfo.propertyTaxRate + zipInfo.schoolTaxRate) * 100).toFixed(2)}% total tax
                    </span>
                  ) : zipCode.length === 5 ? (
                    <span className="text-sm text-muted-foreground/70">{zipCode} · rate unknown</span>
                  ) : (
                    <span className="text-sm text-muted-foreground/70">No location set</span>
                  )
                )}
                {isLocationOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </div>
            </CardTitle>
          </CardHeader>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <CardContent className="space-y-6 pt-0">
            {/* Mode toggle */}
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setLocationMode("zip")}
                className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-colors ${
                  locationMode === "zip"
                    ? "bg-primary/12 border-purple-300 text-primary"
                    : "bg-white border-border text-muted-foreground hover:bg-muted"
                }`}
              >
                ZIP Code
              </button>
              <button
                type="button"
                onClick={() => setLocationMode("home")}
                className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-colors ${
                  locationMode === "home"
                    ? "bg-primary/12 border-purple-300 text-primary"
                    : "bg-white border-border text-muted-foreground hover:bg-muted"
                }`}
              >
                Specific Home
              </button>
            </div>

            {/* Location inputs */}
            {locationMode === "zip" ? (
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-gray-700">ZIP Code</label>
                  <Input
                    value={zipCode}
                    onChange={(e) => setZipCode(e.target.value.replace(/\D/g, "").slice(0, 5))}
                    placeholder="e.g. 62701"
                    maxLength={5}
                    className="mt-1 font-mono text-lg tracking-widest"
                  />
                  {zipCode.length === 5 && (
                    <p className={`text-xs mt-1 ${zipInfo ? "text-primary font-medium" : "text-muted-foreground/70"}`}>
                      {zipInfo
                        ? `${zipInfo.city}, ${zipInfo.state} — ${(zipInfo.propertyTaxRate * 100).toFixed(2)}% property + ${(zipInfo.schoolTaxRate * 100).toFixed(2)}% school = ${((zipInfo.propertyTaxRate + zipInfo.schoolTaxRate) * 100).toFixed(2)}% total`
                        : "ZIP not in our lookup — using 1.81% national average"}
                    </p>
                  )}
                </div>
                <div className="rounded-lg bg-primary/8 border border-purple-100 p-4">
                  <p className="text-sm font-medium text-primary mb-2">What ZIP code unlocks</p>
                  <ul className="space-y-1 text-xs text-primary list-disc list-inside">
                    <li>Local property tax rate (active — updates Sustainability & Upfront Costs)</li>
                    <li>Area context for your Decision Rehearsal</li>
                    <li>Property search filter (coming soon)</li>
                  </ul>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-gray-700">Address</label>
                  <Input
                    value={homeAddress}
                    onChange={(e) => setHomeAddress(e.target.value)}
                    placeholder="123 Main St, City, ST 10001"
                    className="mt-1"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">List Price</label>
                  <div className="relative mt-1">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground/70 text-sm">$</span>
                    <Input
                      type="number"
                      value={homeListPrice ?? ""}
                      onChange={(e) => setHomeListPrice(e.target.value ? Number(e.target.value) : undefined)}
                      placeholder="450000"
                      className="pl-7"
                    />
                  </div>
                  {homeListPrice != null && affordability.maxPurchasePrice > 0 && (
                    <p className="text-xs mt-1">
                      {formatCurrency(homeListPrice)} —{" "}
                      {homeListPrice <= affordability.maxPurchasePrice ? (
                        <span className="text-green-600 font-medium">within your ceiling ({formatCurrency(affordability.maxPurchasePrice)})</span>
                      ) : (
                        <span className="text-red-500 font-medium">above your ceiling ({formatCurrency(affordability.maxPurchasePrice)})</span>
                      )}
                    </p>
                  )}
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="text-sm font-medium text-gray-700">Beds</label>
                    <Input
                      type="number"
                      value={homeBeds ?? ""}
                      onChange={(e) => setHomeBeds(e.target.value ? Number(e.target.value) : undefined)}
                      placeholder="3"
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">Baths</label>
                    <Input
                      type="number"
                      value={homeBaths ?? ""}
                      onChange={(e) => setHomeBaths(e.target.value ? Number(e.target.value) : undefined)}
                      placeholder="2"
                      className="mt-1"
                      step="0.5"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">Sq Ft</label>
                    <Input
                      type="number"
                      value={homeSqft ?? ""}
                      onChange={(e) => setHomeSqft(e.target.value ? Number(e.target.value) : undefined)}
                      placeholder="1,400"
                      className="mt-1"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Notes</label>
                  <textarea
                    value={homeNotes}
                    onChange={(e) => setHomeNotes(e.target.value)}
                    placeholder="Inspection concerns, must-haves, agent notes..."
                    rows={3}
                    className="mt-1 w-full rounded-md border border-border p-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-purple-300"
                  />
                </div>
              </div>
            )}

            {/* One Time Upfront Costs */}
            <div className="bg-white border border-border rounded-lg">
              <Collapsible defaultOpen={false}>
                <CollapsibleTrigger asChild>
                  <div className="p-4 cursor-pointer hover:bg-muted transition-colors">
                    <div className="flex items-center justify-between">
                      <h3 className="text-base font-semibold text-foreground">One Time Upfront Costs</h3>
                      <div className="flex items-center gap-3">
                        <span className="font-bold text-primary">
                          {formatCurrency(
                            affordability.maxPurchasePrice * (downPaymentPercentage / 100) +
                              affordability.maxPurchasePrice * 0.03 +
                              500 + 450 + 1500 + 350 +
                              affordability.monthlyInsurance * 12 +
                              affordability.maxPurchasePrice * 0.01 +
                              2500 + 600,
                          )}
                        </span>
                        <ChevronDown size={16} className="text-muted-foreground/70" />
                      </div>
                    </div>
                    <div className="mt-2 grid grid-cols-3 gap-3 text-sm">
                      <div className="text-center">
                        <div className="font-semibold text-foreground">
                          {formatCurrency(
                            affordability.maxPurchasePrice * (downPaymentPercentage / 100) +
                              affordability.maxPurchasePrice * 0.03 + 950,
                          )}
                        </div>
                        <div className="text-xs text-muted-foreground">Purchase & Closing</div>
                      </div>
                      <div className="text-center">
                        <div className="font-semibold text-green-900">
                          {formatCurrency(1500 + 350 + affordability.monthlyInsurance * 12)}
                        </div>
                        <div className="text-xs text-muted-foreground">Moving & Setup</div>
                      </div>
                      <div className="text-center">
                        <div className="font-semibold text-orange-900">
                          {formatCurrency(affordability.maxPurchasePrice * 0.01 + 2500 + 600)}
                        </div>
                        <div className="text-xs text-muted-foreground">Home Needs</div>
                      </div>
                    </div>
                  </div>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <div className="px-4 pb-4 pt-0">
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <h4 className="text-xs font-semibold text-gray-700 border-b border-border pb-1 uppercase tracking-wide">Purchase & Closing</h4>
                        <div className="flex justify-between text-sm"><span className="text-muted-foreground">Down Payment:</span><span className="font-semibold">{formatCurrency(affordability.maxPurchasePrice * (downPaymentPercentage / 100))} ({downPaymentPercentage}%)</span></div>
                        <div className="flex justify-between text-sm"><span className="text-muted-foreground">Closing Costs:</span><span className="font-semibold">{formatCurrency(affordability.maxPurchasePrice * 0.03)} (3%)</span></div>
                        <div className="flex justify-between text-sm"><span className="text-muted-foreground">Home Inspection:</span><span className="font-semibold">$500</span></div>
                        <div className="flex justify-between text-sm"><span className="text-muted-foreground">Appraisal:</span><span className="font-semibold">$450</span></div>
                      </div>
                      <div className="space-y-2">
                        <h4 className="text-xs font-semibold text-gray-700 border-b border-border pb-1 uppercase tracking-wide">Moving & Setup</h4>
                        <div className="flex justify-between text-sm"><span className="text-muted-foreground">Moving Expenses:</span><span className="font-semibold">$1,500</span></div>
                        <div className="flex justify-between text-sm"><span className="text-muted-foreground">Utility Deposits & Setup:</span><span className="font-semibold">$350</span></div>
                        <div className="flex justify-between text-sm"><span className="text-muted-foreground">First Year Home Insurance:</span><span className="font-semibold">{formatCurrency(affordability.monthlyInsurance * 12)}</span></div>
                      </div>
                      <div className="space-y-2">
                        <h4 className="text-xs font-semibold text-gray-700 border-b border-border pb-1 uppercase tracking-wide">Immediate Home Needs</h4>
                        <div className="flex justify-between text-sm"><span className="text-muted-foreground">Emergency Repairs Fund:</span><span className="font-semibold">{formatCurrency(affordability.maxPurchasePrice * 0.01)} (1%)</span></div>
                        <div className="flex justify-between text-sm"><span className="text-muted-foreground">Basic Furnishing/Appliances:</span><span className="font-semibold">$2,500</span></div>
                        <div className="flex justify-between text-sm"><span className="text-muted-foreground">Security System (optional):</span><span className="font-semibold text-muted-foreground/70">$600</span></div>
                      </div>
                      <div className="flex justify-between items-center pt-3 border-t-2 border-gray-300">
                        <span className="font-bold text-foreground">Total Upfront Costs:</span>
                        <span className="font-bold text-primary">
                          {formatCurrency(
                            affordability.maxPurchasePrice * (downPaymentPercentage / 100) +
                              affordability.maxPurchasePrice * 0.03 +
                              500 + 450 + 1500 + 350 +
                              affordability.monthlyInsurance * 12 +
                              affordability.maxPurchasePrice * 0.01 +
                              2500 + 600,
                          )}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground p-3 bg-muted rounded-md">
                        <strong>Note:</strong> Estimates vary by location and personal choices. Emergency repairs fund (1% of home value) recommended for year-one surprises.
                      </p>
                    </div>
                  </div>
                </CollapsibleContent>
              </Collapsible>
            </div>
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>

    </div>{/* end Sustainability + Location grid */}

    {/* Livability Section - MOVED FROM INSIDE SCENARIO BUILDER */}
    <Card className="border-2 border-green-200">
      <Collapsible open={isLivabilityOpen} onOpenChange={setIsLivabilityOpen}>
        <CollapsibleTrigger asChild>
          <CardHeader className="pb-3 cursor-pointer hover:bg-green-50/50 transition-colors">
            <CardTitle className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Home size={20} className="text-green-600" />
                <span className="text-lg font-semibold text-green-900">Lifestyle costs</span>
                <span className="text-sm text-muted-foreground">
                  What you can live — your lifestyle costs, current and after the move.
                </span>
              </span>
              <div className="flex items-center gap-2">
                {!isLivabilityOpen && (() => {
                  const activeExpenses = financialItems.filter(i => i.type === "expense" && i.active)
                  const totalMonthly = activeExpenses.reduce((sum, i) => {
                    const amt = i.expenseTiming === "changing" && i.futureAmount != null ? i.futureAmount : i.amount
                    return sum + (i.frequency === "annual" ? amt / 12 : amt)
                  }, 0)
                  return totalMonthly > 0 ? (
                    <span className="text-sm font-medium text-muted-foreground">
                      {formatCurrency(totalMonthly)}/mo tracked
                    </span>
                  ) : null
                })()}
                {isLivabilityOpen ? <ChevronUp size={16} className="text-muted-foreground/70" /> : <ChevronDown size={16} className="text-muted-foreground/70" />}
              </div>
            </CardTitle>
          </CardHeader>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Same before and after the move */}
              <div>{renderItemGroup("expense", "stable", "Stable Living Costs", "text-red-600 bg-red-50")}</div>

              {/* Exists now, different amount post-move */}
              <div>{renderItemGroup("expense", "changing", "Costs Changing After Move", "text-amber-600 bg-amber-50")}</div>

              {/* New expenses that start after the move */}
              <div>{renderItemGroup("expense", "new", "New After-Move Costs", "text-orange-600 bg-orange-50")}</div>
            </div>
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>

    {/* Edit/Add Modal */}
    <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
      <DialogContent className={modalType === "income" ? "sm:max-w-[500px]" : modalType === "debt" || modalType === "expense" ? "sm:max-w-[460px]" : "sm:max-w-[425px]"}>
        <DialogHeader>
          <DialogTitle>
            {editingItem
              ? modalType === "income" ? "Edit Income Source"
                : modalType === "debt" ? "Edit Debt"
                : "Edit Item"
              : modalType === "income" ? "Add Income Source"
                : modalType === "debt" ? "Add Debt"
                : "Add New Item"}
          </DialogTitle>
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
              placeholder={modalType === "income" ? "e.g. Base Salary" : "Enter item name"}
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="amount" className="text-right">
              Amount
            </Label>
            <div className="col-span-3 flex gap-2">
              <div className="relative flex-1">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">$</span>
                <Input
                  id="amount"
                  type="number"
                  value={modalAmount}
                  onChange={(e) => setModalAmount(Number(e.target.value))}
                  className="pl-6"
                  placeholder="0"
                  min="0"
                />
              </div>
              <Select value={modalFrequency} onValueChange={(value: any) => setModalFrequency(value)}>
                <SelectTrigger className="w-28">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="monthly">Monthly</SelectItem>
                  <SelectItem value="annual">Annual</SelectItem>
                  <SelectItem value="one-time">One Time</SelectItem>
                </SelectContent>
              </Select>
            </div>
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
          {modalType === "expense" ? (
            <>
              <div className="grid grid-cols-4 items-start gap-4">
                <Label className="text-right pt-2 text-sm">Timing</Label>
                <div className="col-span-3 flex flex-col gap-2">
                  <label className="flex items-start gap-3 cursor-pointer">
                    <input
                      type="radio"
                      name="modalExpenseTiming"
                      value="stable"
                      checked={modalExpenseTiming === "stable"}
                      onChange={() => setModalExpenseTiming("stable")}
                      className="mt-0.5 accent-blue-600"
                    />
                    <div>
                      <span className="text-sm font-medium">Stays the same</span>
                      <p className="text-xs text-muted-foreground">Same amount before and after the move</p>
                    </div>
                  </label>
                  <label className="flex items-start gap-3 cursor-pointer">
                    <input
                      type="radio"
                      name="modalExpenseTiming"
                      value="changing"
                      checked={modalExpenseTiming === "changing"}
                      onChange={() => setModalExpenseTiming("changing")}
                      className="mt-0.5 accent-blue-600"
                    />
                    <div>
                      <span className="text-sm font-medium">Amount changes after move</span>
                      <p className="text-xs text-muted-foreground">Exists now, different amount post-move</p>
                    </div>
                  </label>
                  <label className="flex items-start gap-3 cursor-pointer">
                    <input
                      type="radio"
                      name="modalExpenseTiming"
                      value="new"
                      checked={modalExpenseTiming === "new"}
                      onChange={() => setModalExpenseTiming("new")}
                      className="mt-0.5 accent-blue-600"
                    />
                    <div>
                      <span className="text-sm font-medium">New after move</span>
                      <p className="text-xs text-muted-foreground">Doesn't exist yet, starts after the move</p>
                    </div>
                  </label>
                </div>
              </div>
              {modalExpenseTiming === "changing" && (
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="futureAmount" className="text-right text-sm leading-tight">
                    After-move amount
                  </Label>
                  <div className="col-span-3">
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">$</span>
                      <Input
                        id="futureAmount"
                        type="number"
                        value={modalFutureAmount ?? ""}
                        onChange={(e) => setModalFutureAmount(e.target.value ? Number(e.target.value) : undefined)}
                        className="pl-6"
                        placeholder="Amount after the move"
                        min="0"
                      />
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      The amount per month after moving (above field is current amount)
                    </p>
                  </div>
                </div>
              )}
            </>
          ) : (
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
          )}

          {/* Debt-specific: outstanding balance field */}
          {modalType === "debt" && (
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="balance" className="text-right text-sm">
                Balance
              </Label>
              <div className="col-span-3">
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">$</span>
                  <Input
                    id="balance"
                    type="number"
                    value={modalBalance ?? ""}
                    onChange={(e) => setModalBalance(e.target.value ? Number(e.target.value) : undefined)}
                    className="pl-6"
                    placeholder="Total remaining balance (optional)"
                    min="0"
                  />
                </div>
                <p className="text-xs text-muted-foreground mt-1">Outstanding principal — displayed alongside minimum payment</p>
              </div>
            </div>
          )}

          {/* Income-specific: Gross vs. Net toggle + withholding breakdown */}
          {modalType === "income" && (
            <>
              <div className="border-t pt-3">
                <p className="text-sm font-medium text-muted-foreground mb-3">How is this amount entered?</p>
                <div className="flex flex-col gap-2">
                  <label className="flex items-start gap-3 cursor-pointer">
                    <input
                      type="radio"
                      name="modalIncomeEntry"
                      value="gross"
                      checked={modalIncomeEntry === "gross"}
                      onChange={() => setModalIncomeEntry("gross")}
                      className="mt-0.5 accent-blue-600"
                    />
                    <div>
                      <span className="text-sm font-medium">Gross income</span>
                      <p className="text-xs text-muted-foreground">Before taxes, 401k, and other paycheck deductions</p>
                    </div>
                  </label>
                  <label className="flex items-start gap-3 cursor-pointer">
                    <input
                      type="radio"
                      name="modalIncomeEntry"
                      value="net"
                      checked={modalIncomeEntry === "net"}
                      onChange={() => setModalIncomeEntry("net")}
                      className="mt-0.5 accent-blue-600"
                    />
                    <div>
                      <span className="text-sm font-medium">Net take-home</span>
                      <p className="text-xs text-muted-foreground">Already after all deductions — what hits your bank account</p>
                    </div>
                  </label>
                </div>
              </div>

              {/* Withholding breakdown — only when gross */}
              {modalIncomeEntry === "gross" && (
                <div className="border rounded-lg p-3 bg-muted/30 space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium">Paycheck Withholding</p>
                    <span className="text-xs text-muted-foreground">{modalTotalWithholdingPct}% total deducted</span>
                  </div>
                  <div className="space-y-2">
                    {[
                      { label: "Federal & State Taxes", value: modalWithholdingTax, setter: setModalWithholdingTax },
                      { label: "401(k) / Retirement", value: modalWithholding401k, setter: setModalWithholding401k },
                      { label: "Health Insurance", value: modalWithholdingHealthcare, setter: setModalWithholdingHealthcare },
                      { label: "HSA Contribution", value: modalWithholdingHSA, setter: setModalWithholdingHSA },
                      { label: "Other", value: modalWithholdingOther, setter: setModalWithholdingOther },
                    ].map(({ label, value, setter }) => (
                      <div key={label} className="flex items-center justify-between gap-4">
                        <p className="text-sm">{label}</p>
                        <div className="flex items-center gap-1">
                          <Input
                            type="number"
                            value={value}
                            onChange={(e) => setter(Math.max(0, Math.min(100, Number(e.target.value))))}
                            className="w-16 text-right tabular-nums"
                            min={0}
                            max={100}
                            step={1}
                          />
                          <span className="text-sm text-muted-foreground">%</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Take-home preview */}
              {modalAmount > 0 && (
                <div className="flex items-center justify-between rounded-md bg-green-50 border border-green-200 px-4 py-2.5">
                  <div className="flex items-center gap-2 text-green-700">
                    <DollarSign size={15} />
                    <span className="text-sm font-medium">Estimated monthly take-home</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-base font-semibold text-green-700">
                      ${modalEstimatedTakeHome.toLocaleString()}/mo
                    </span>
                    {modalIncomeEntry === "gross" && modalTotalWithholdingPct > 0 && (
                      <span className="text-xs text-muted-foreground flex items-center gap-0.5">
                        <TrendingDown size={11} />
                        {modalTotalWithholdingPct}% withheld
                      </span>
                    )}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setIsModalOpen(false)}>
            Cancel
          </Button>
          <Button type="submit" onClick={handleSaveModal} disabled={!modalLabel.trim() || modalAmount <= 0}>
            {editingItem ? "Save Changes" : "Add Item"}
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
                <h3 className="font-semibold text-foreground text-lg border-b border-border pb-2">{lifeEvent}</h3>

                {/* Monthly Expenses */}
                {expenses.monthly.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="font-medium text-gray-700 flex items-center gap-2">
                      <span className="w-2 h-2 bg-primary/80 rounded-full"></span>
                      Monthly Expenses
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      {expenses.monthly.map((idea, index) => (
                        <div
                          key={`${lifeEvent}-monthly-${index}`}
                          className="flex items-center justify-between p-3 bg-primary/8 rounded-lg hover:bg-primary/12 cursor-pointer transition-colors border border-primary/25"
                          onClick={() => handleAddExpenseIdea(idea, "current")}
                        >
                          <div>
                            <p className="text-sm font-medium text-foreground">{idea.label}</p>
                            <p className="text-xs text-primary">{formatCurrency(idea.amount)}/mo</p>
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
                              <p className="text-sm font-medium text-foreground">{idea.label}</p>
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
          <p className="text-xs text-muted-foreground text-left flex-1">
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
