import type { ItemCategory, MortgageOptionGroup, FinancialItem, FutureItem } from "./real-estate-types"

export const initialPersonalFinances: ItemCategory<FinancialItem>[] = [
  {
    id: "income",
    name: "Income",
    items: [
      {
        id: "income-1",
        label: "Dale Income",
        amount: 85000,
        itemType: "income",
        frequency: "annual",
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
        id: "income-3",
        label: "Jamie Income",
        amount: 55000,
        itemType: "income",
        frequency: "annual",
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
        id: "income-2",
        label: "Door Dash",
        amount: 500,
        itemType: "income",
        frequency: "monthly",
        active: false,
        editable: true,
        incomeEntry: "gross" as const,
        withholdingTaxPct: 25,
        withholding401kPct: 0,
        withholdingHealthcarePct: 0,
        withholdingHSAPct: 0,
        withholdingOtherPct: 0,
      },
    ],
  },
  {
    id: "monthly-payment",
    name: "Desired Monthly Payment\nMortgage + Escrow",
    type: "input",
    items: [
      {
        id: "mp-1",
        label: "Monthly payment as a percentage of income",
        amount: 30,
        itemType: "info",
        frequency: "monthly" as const,
        active: true,
        editable: true,
      },
    ],
  },
  {
    id: "monthly-expenses",
    name: "Monthly Expenses",
    items: [
      {
        id: "me-1",
        label: "Internet",
        amount: 120,
        itemType: "expense",
        frequency: "monthly",
        active: false,
        editable: true,
      },
      {
        id: "me-2",
        label: "Groceries",
        amount: 400,
        itemType: "expense",
        frequency: "monthly",
        active: false,
        editable: true,
      },
      {
        id: "me-3",
        label: "Auto Insurance",
        amount: 200,
        itemType: "expense",
        frequency: "monthly",
        active: false,
        editable: true,
      },
      {
        id: "me-4",
        label: "Gas",
        amount: 150,
        itemType: "expense",
        frequency: "monthly",
        active: false,
        editable: true,
      },
      {
        id: "me-5",
        label: "Mass Transit",
        amount: 75,
        itemType: "expense",
        frequency: "monthly",
        active: false,
        editable: true,
      },
    ],
  },
  {
    id: "annual-expenses",
    name: "Annual Expenses",
    items: [
      {
        id: "ae-1",
        label: "Car Registration",
        amount: 300,
        itemType: "expense",
        frequency: "annual",
        active: false,
        editable: true,
      },
      {
        id: "ae-2",
        label: "Amazon Membership",
        amount: 160,
        itemType: "expense",
        frequency: "annual",
        active: false,
        editable: true,
      },
      {
        id: "ae-3",
        label: "Clothing Shopping",
        amount: 1000,
        itemType: "expense",
        frequency: "annual",
        active: false,
        editable: true,
      },
    ],
  },
  {
    id: "fixed-debts",
    name: "Fixed Debts (Minimum Payments)",
    items: [
      {
        id: "fd-1",
        label: "Cap1 Credit Card",
        amount: 70,
        itemType: "expense",
        frequency: "monthly",
        active: false,
        editable: true,
      },
      {
        id: "fd-2",
        label: "BoA Credit Card",
        amount: 112,
        itemType: "expense",
        frequency: "monthly",
        active: false,
        editable: true,
      },
      {
        id: "fd-3",
        label: "Auto Loan",
        amount: 400,
        itemType: "expense",
        frequency: "monthly",
        active: false,
        editable: true,
      },
    ],
  },
]

// Simulated function to get today's mortgage rate
// In a real application, this would fetch from a mortgage rate API
export const getTodaysMortgageRate = (): number => {
  // Simulating today's rate - in production this would be an API call
  // For demo purposes, returning a realistic current rate
  return 6.85 // Current average 30-year fixed rate
}

// Function to get property tax rate based on location
export const getPropertyTaxRate = (location: string): number => {
  // Default property tax rates by location
  const rates: { [key: string]: number } = {
    "Austin, TX": 0.0181,
    "Seattle, WA": 0.0092,
    "Denver, CO": 0.0051,
    default: 0.0181,
  }
  return rates[location] || rates.default
}

// Function to estimate home insurance based on home value and location
export const getHomeInsuranceEstimate = (homeValue: number, location: string): number => {
  // Rough estimate: $3-5 per $1000 of home value annually
  const baseRate = 0.004 // 0.4%
  return homeValue * baseRate
}

// Generate initial mortgage application with dynamic interest rates
const todaysRate = getTodaysMortgageRate()
const lowerRate = todaysRate - 0.2
const higherRate = todaysRate + 0.2

export const initialMortgageApplication: MortgageOptionGroup[] = [
  {
    id: "downpayment-sources",
    name: "Downpayment Sources",
    type: "default",
    items: [
      {
        id: "dps-1",
        label: "Gift",
        amount: 10000,
        itemType: "income",
        frequency: "one-time",
        active: true,
        editable: true,
      },
      {
        id: "dps-2",
        label: "Sell Motorcycle",
        amount: 12000,
        itemType: "income",
        frequency: "one-time",
        active: true,
        editable: true,
      },
      {
        id: "dps-3",
        label: "Cash",
        amount: 5000,
        itemType: "income",
        frequency: "one-time",
        active: true,
        editable: true,
      },
      {
        id: "dps-4",
        label: "Sell Stocks",
        amount: 16000,
        itemType: "income",
        frequency: "one-time",
        active: true,
        editable: true,
      },
    ],
  },
  {
    id: "downpayment-percentage",
    name: "Downpayment %",
    type: "input",
    items: [
      {
        id: "dp-percentage-1",
        label: "Down Payment Percentage",
        amount: 20,
        itemType: "info",
        active: true,
        editable: true,
      },
    ],
  },
  {
    id: "term-length",
    name: "Term Length (Years)",
    type: "radio",
    items: [
      { id: "tl-1", label: "15 Years", value: "15", itemType: "info", active: false },
      { id: "tl-2", label: "20 Years", value: "20", itemType: "info", active: false },
      { id: "tl-3", label: "30 Years", value: "30", itemType: "info", active: true },
    ],
  },
  {
    id: "interest-rate",
    name: "Interest Rate Options",
    type: "radio",
    items: [
      {
        id: "ir-1",
        label: `${lowerRate.toFixed(2)}%`,
        value: lowerRate.toFixed(2),
        itemType: "info",
        active: false,
        editable: true,
      },
      {
        id: "ir-2",
        label: `${todaysRate.toFixed(2)}%`,
        value: todaysRate.toFixed(2),
        itemType: "info",
        active: true,
        editable: true,
      },
      {
        id: "ir-3",
        label: `${higherRate.toFixed(2)}%`,
        value: higherRate.toFixed(2),
        itemType: "info",
        active: false,
        editable: true,
      },
    ],
  },
]

export const initialFutureHome: ItemCategory<FutureItem>[] = [
  {
    id: "future-income",
    name: "Future Income",
    items: [
      {
        id: "fi-1",
        label: "AirBnB",
        amount: 2000,
        itemType: "income",
        frequency: "annual",
        active: false,
        editable: true,
      },
      {
        id: "fi-2",
        label: "Roommate",
        amount: 12000,
        itemType: "income",
        frequency: "annual",
        active: false,
        editable: true,
      },
    ],
  },
  {
    id: "home-related-expenses",
    name: "Home-related Expenses",
    items: [
      {
        id: "hre-1",
        label: "HOA Fees",
        amount: 500,
        itemType: "expense",
        frequency: "monthly",
        active: false,
        editable: true,
      },
      {
        id: "hre-2",
        label: "Pool Expenses",
        amount: 1000,
        itemType: "expense",
        frequency: "annual",
        active: false,
        editable: true,
      },
      {
        id: "hre-3",
        label: "Landscaping",
        amount: 1500,
        itemType: "expense",
        frequency: "annual",
        active: false,
        editable: true,
      },
    ],
  },
  {
    id: "future-monthly-expenses",
    name: "Future Monthly Expenses",
    items: [
      {
        id: "fme-1",
        label: "Gym",
        amount: 100,
        itemType: "expense",
        frequency: "monthly",
        active: false,
        editable: true,
      },
      {
        id: "fme-2",
        label: "Daycare",
        amount: 1500,
        itemType: "expense",
        frequency: "monthly",
        active: false,
        editable: true,
      },
    ],
  },
  {
    id: "future-annual-expenses",
    name: "Future Annual Expenses",
    items: [
      {
        id: "fae-1",
        label: "Pediatrics",
        amount: 2000,
        itemType: "expense",
        frequency: "annual",
        active: false,
        editable: true,
      },
    ],
  },
  {
    id: "moving-first-month-expenses",
    name: "Moving and First Month Expenses",
    items: [
      {
        id: "mfme-1",
        label: "Movers",
        amount: 4000,
        itemType: "expense",
        frequency: "one-time",
        active: false,
        editable: true,
      },
      {
        id: "mfme-2",
        label: "Cleaners",
        amount: 500,
        itemType: "expense",
        frequency: "one-time",
        active: false,
        editable: true,
      },
      {
        id: "mfme-3",
        label: "Painters",
        amount: 2000,
        itemType: "expense",
        frequency: "one-time",
        active: false,
        editable: true,
      },
    ],
  },
]
