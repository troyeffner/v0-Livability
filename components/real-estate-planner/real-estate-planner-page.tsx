"use client"

import { useState, useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { TrendingUp, Home, DollarSign, AlertTriangle, CheckCircle, Settings } from "lucide-react"
import FinancialPanel from "./financial-panel"
import TradeoffImpactPanel from "./tradeoff-impact-panel"
import type { ItemCategory, FinancialItem, MortgageOptionGroup } from "@/lib/real-estate-types"
import { calculateAffordability, formatCurrency } from "@/lib/real-estate-calculations"

export default function RealEstatePlannerPage() {
  // Sample data - in real app this would come from props or context
  const [personalFinanceCategories, setPersonalFinanceCategories] = useState<ItemCategory<FinancialItem>[]>([
    {
      id: "income",
      label: "Income Sources",
      items: [
        { id: "salary", label: "Base Salary", amount: 75000, active: true, frequency: "annual" },
        { id: "bonus", label: "Annual Bonus", amount: 10000, active: true, frequency: "annual" },
        { id: "side-hustle", label: "Side Business", amount: 500, active: false, frequency: "monthly" },
      ],
    },
    {
      id: "expenses",
      label: "Monthly Expenses",
      items: [
        { id: "groceries", label: "Groceries", amount: 600, active: true, frequency: "monthly" },
        { id: "utilities", label: "Utilities", amount: 200, active: true, frequency: "monthly" },
        { id: "entertainment", label: "Entertainment", amount: 400, active: true, frequency: "monthly" },
      ],
    },
    {
      id: "debts",
      label: "Fixed Debts",
      items: [
        { id: "car-loan", label: "Car Payment", amount: 350, active: true, frequency: "monthly" },
        { id: "credit-card", label: "Credit Card Min", amount: 150, active: true, frequency: "monthly" },
      ],
    },
  ])

  const [mortgageCategories, setMortgageCategories] = useState<MortgageOptionGroup[]>([
    {
      id: "payment-percentage",
      label: "Monthly Payment Target",
      type: "input",
      items: [{ id: "housing-percentage", label: "% of Take-Home Income", amount: 30, active: true }],
    },
    {
      id: "down-payment",
      label: "Down Payment Sources",
      type: "toggle",
      items: [
        { id: "savings", label: "Savings Account", amount: 40000, active: true },
        { id: "gift", label: "Family Gift", amount: 15000, active: true },
        { id: "stocks", label: "Investment Sale", amount: 10000, active: false },
      ],
    },
    {
      id: "loan-terms",
      label: "Loan Options",
      type: "toggle",
      items: [
        { id: "30-year", label: "30-Year Fixed", amount: 6.85, active: true },
        { id: "15-year", label: "15-Year Fixed", amount: 6.25, active: false },
        { id: "arm", label: "5/1 ARM", amount: 6.15, active: false },
      ],
    },
  ])

  const [futureCategories, setFutureCategories] = useState<ItemCategory<FinancialItem>[]>([
    {
      id: "future-income",
      label: "Future Income",
      items: [
        { id: "promotion", label: "Expected Promotion", amount: 1000, active: false, frequency: "monthly" },
        { id: "spouse-income", label: "Spouse Job", amount: 3000, active: false, frequency: "monthly" },
      ],
    },
    {
      id: "future-expenses",
      label: "Future Expenses",
      items: [
        { id: "daycare", label: "Childcare", amount: 1200, active: false, frequency: "monthly" },
        { id: "hoa", label: "HOA Fees", amount: 150, active: false, frequency: "monthly" },
      ],
    },
  ])

  // Calculate current financial state
  const currentFinancials = useMemo(() => {
    const income =
      personalFinanceCategories
        .find((cat) => cat.id === "income")
        ?.items.filter((item) => item.active)
        .reduce((sum, item) => sum + (item.frequency === "annual" ? item.amount : item.amount * 12), 0) || 0

    const monthlyExpenses =
      personalFinanceCategories
        .find((cat) => cat.id === "expenses")
        ?.items.filter((item) => item.active)
        .reduce((sum, item) => sum + item.amount, 0) || 0

    const fixedDebts =
      personalFinanceCategories
        .find((cat) => cat.id === "debts")
        ?.items.filter((item) => item.active)
        .reduce((sum, item) => sum + item.amount, 0) || 0

    const downPaymentSources =
      mortgageCategories
        .find((cat) => cat.id === "down-payment")
        ?.items.filter((item) => item.active)
        .reduce((sum, item) => sum + item.amount, 0) || 0

    const housingPercentage = mortgageCategories.find((cat) => cat.id === "payment-percentage")?.items[0]?.amount || 30

    const futureIncome =
      futureCategories
        .find((cat) => cat.id === "future-income")
        ?.items.filter((item) => item.active)
        .reduce((sum, item) => sum + (item.frequency === "annual" ? item.amount : item.amount * 12), 0) || 0

    const futureExpenses =
      futureCategories
        .find((cat) => cat.id === "future-expenses")
        ?.items.filter((item) => item.active)
        .reduce((sum, item) => sum + (item.frequency === "annual" ? item.amount / 12 : item.amount), 0) || 0

    return {
      annualIncome: income,
      monthlyExpenses,
      fixedDebts,
      downPaymentSources,
      housingPercentage,
      futureAnnualIncome: futureIncome,
      futureMonthlyExpenses: futureExpenses,
    }
  }, [personalFinanceCategories, mortgageCategories, futureCategories])

  // Calculate affordability
  const affordability = useMemo(() => {
    return calculateAffordability({
      annualIncome: currentFinancials.annualIncome + currentFinancials.futureAnnualIncome,
      monthlyExpenses: currentFinancials.monthlyExpenses + currentFinancials.futureMonthlyExpenses,
      fixedDebts: currentFinancials.fixedDebts,
      downPaymentSources: currentFinancials.downPaymentSources,
      interestRate: 6.85,
      loanTerm: 30,
      housingPercentage: currentFinancials.housingPercentage,
    })
  }, [currentFinancials])

  const handleToggle = (panel: "personal" | "mortgage" | "future", categoryId: string, itemId: string) => {
    if (panel === "personal") {
      setPersonalFinanceCategories((prev) =>
        prev.map((cat) =>
          cat.id === categoryId
            ? {
                ...cat,
                items: cat.items.map((item) => (item.id === itemId ? { ...item, active: !item.active } : item)),
              }
            : cat,
        ),
      )
    } else if (panel === "mortgage") {
      setMortgageCategories((prev) =>
        prev.map((cat) =>
          cat.id === categoryId
            ? {
                ...cat,
                items: cat.items.map((item) => (item.id === itemId ? { ...item, active: !item.active } : item)),
              }
            : cat,
        ),
      )
    } else if (panel === "future") {
      setFutureCategories((prev) =>
        prev.map((cat) =>
          cat.id === categoryId
            ? {
                ...cat,
                items: cat.items.map((item) => (item.id === itemId ? { ...item, active: !item.active } : item)),
              }
            : cat,
        ),
      )
    }
  }

  const handleEdit = (panel: "personal" | "mortgage" | "future", categoryId: string, itemId: string) => {
    console.log(`Edit ${panel} ${categoryId} ${itemId}`)
  }

  const handleAddItem = (panel: "personal" | "future" | "mortgage", categoryId: string) => {
    console.log(`Add item to ${panel} ${categoryId}`)
  }

  const handlePersonalInputChange = (groupId: string, itemId: string, value: number) => {
    setPersonalFinanceCategories((prev) =>
      prev.map((cat) =>
        cat.id === groupId
          ? { ...cat, items: cat.items.map((item) => (item.id === itemId ? { ...item, amount: value } : item)) }
          : cat,
      ),
    )
  }

  const handleMortgageInputChange = (groupId: string, itemId: string, value: number) => {
    setMortgageCategories((prev) =>
      prev.map((cat) =>
        cat.id === groupId
          ? { ...cat, items: cat.items.map((item) => (item.id === itemId ? { ...item, amount: value } : item)) }
          : cat,
      ),
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

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Mortgage & Move Planner</h1>
          <p className="text-gray-600">
            Plan your home purchase with confidence using real-time affordability calculations
          </p>
        </div>

        {/* Property Affordability Workbench */}
        <Card className="border-2 border-blue-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings size={20} className="text-blue-600" />
              Property Affordability Workbench
            </CardTitle>
            <div className="flex items-center gap-3 mt-4">
              <span className="text-sm font-medium text-gray-700">Scenario:</span>
              <div className="flex gap-2">
                <Button variant="default" size="sm" className="flex items-center gap-2">
                  Current Situation
                </Button>
                <Button variant="outline" size="sm">
                  Edit
                </Button>
                <Button variant="outline" size="sm">
                  Save
                </Button>
                <Button variant="outline" size="sm">
                  Save as New
                </Button>
              </div>
            </div>
          </CardHeader>
        </Card>

        {/* Affordability Section */}
        <Card className="border-2 border-green-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp size={20} className="text-green-600" />
              Affordability
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <FinancialPanel
                title="Income Sources"
                categories={personalFinanceCategories.filter((cat) => cat.id === "income")}
                panelType="personal"
                onToggle={handleToggle}
                onEdit={handleEdit}
                onAddItem={handleAddItem}
                onPersonalInputChange={handlePersonalInputChange}
              />

              <FinancialPanel
                title="Down Payment Sources"
                categories={mortgageCategories.filter((cat) => cat.id === "down-payment")}
                panelType="mortgage"
                onToggle={handleToggle}
                onEdit={handleEdit}
                onAddItem={handleAddItem}
                onMortgageInputChange={handleMortgageInputChange}
              />

              <FinancialPanel
                title="Mortgage Details"
                categories={mortgageCategories.filter((cat) => cat.id !== "down-payment")}
                panelType="mortgage"
                onToggle={handleToggle}
                onEdit={handleEdit}
                onAddItem={handleAddItem}
                onMortgageInputChange={handleMortgageInputChange}
              />
            </div>
          </CardContent>
        </Card>

        {/* Quality of Life Section (renamed from Your Home Affordability) */}
        <Card className="border-2 border-blue-200">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <DollarSign size={20} className="text-blue-600" />
                Quality of Life
              </span>
              <Badge className={affordabilityLevel.color}>
                <AffordabilityIcon size={14} className="mr-1" />
                {affordabilityLevel.level}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Maximum Home Price - Centered */}
            <div className="text-center py-6">
              <p className="text-sm font-medium text-blue-600 mb-4">Your Home Purchase Equation</p>

              {/* Equation Display */}
              <div className="flex items-center justify-center gap-4 mb-6 text-2xl font-bold">
                <div className="text-center">
                  <div className="text-blue-900">{formatCurrency(affordability.maxPurchasePrice * 0.8)}</div>
                  <div className="text-sm font-normal text-gray-600">Loan Amount</div>
                </div>
                <div className="text-blue-600 text-3xl">+</div>
                <div className="text-center">
                  <div className="text-blue-900">{formatCurrency(affordability.maxPurchasePrice * 0.2)}</div>
                  <div className="text-sm font-normal text-gray-600">Down Payment</div>
                </div>
                <div className="text-blue-600 text-3xl">=</div>
                <div className="text-center">
                  <div className="text-4xl text-blue-900">{formatCurrency(affordability.maxPurchasePrice)}</div>
                  <div className="text-sm font-normal text-gray-600">Home Purchase</div>
                </div>
              </div>

              <p className="text-sm text-blue-700 mb-4">Based on Current Situation scenario</p>
              <div className="text-sm text-gray-600 mb-4">
                <p className="font-semibold">
                  Actual Monthly Payment: {formatCurrency(affordability.maxMonthlyPayment)}
                </p>
                <p>
                  {formatCurrency(affordability.maxMonthlyPayment * 0.7)} P&I +{" "}
                  {formatCurrency(affordability.maxMonthlyPayment * 0.2)} Tax +{" "}
                  {formatCurrency(affordability.maxMonthlyPayment * 0.1)} Insurance
                </p>
              </div>

              {/* Loan Details */}
              <div className="flex items-center justify-center gap-8 text-sm text-gray-600">
                <div className="flex items-center gap-2">
                  <span>Interest Rate:</span>
                  <span className="font-semibold">6.85%</span>
                </div>
                <div className="flex items-center gap-2">
                  <span>Loan Term:</span>
                  <span className="font-semibold">30 years</span>
                </div>
              </div>
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
                  <span className="font-bold text-green-700 text-lg">
                    {formatCurrency(
                      ((currentFinancials.annualIncome + currentFinancials.futureAnnualIncome) / 12) * 0.7,
                    )}
                  </span>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-gray-700">(-) Housing Payment (P&I + Escrow):</span>
                  <span className="font-semibold text-red-600">{formatCurrency(affordability.maxMonthlyPayment)}</span>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-gray-700">(-) Current Expenses:</span>
                  <span className="font-semibold text-red-600">
                    {formatCurrency(currentFinancials.monthlyExpenses)}
                  </span>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-gray-700">(-) Fixed Debts:</span>
                  <span className="font-semibold text-red-600">{formatCurrency(currentFinancials.fixedDebts)}</span>
                </div>

                {currentFinancials.futureMonthlyExpenses > 0 && (
                  <div className="flex justify-between items-center">
                    <span className="text-gray-700">(-) Future Expenses:</span>
                    <span className="font-semibold text-orange-600">
                      {formatCurrency(currentFinancials.futureMonthlyExpenses)}
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

        {/* Livability Section */}
        <Card className="border-2 border-green-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Home size={20} className="text-green-600" />
              Livability
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <FinancialPanel
                title="Current Expenses"
                categories={personalFinanceCategories.filter((cat) => cat.id === "expenses")}
                panelType="personal"
                onToggle={handleToggle}
                onEdit={handleEdit}
                onAddItem={handleAddItem}
                onPersonalInputChange={handlePersonalInputChange}
                monthlyTakeHomeIncome={
                  ((currentFinancials.annualIncome + currentFinancials.futureAnnualIncome) / 12) * 0.7
                }
                remainingLifestyleBudget={affordability.remainingBudget}
              />

              <FinancialPanel
                title="Future Expenses"
                categories={futureCategories.filter((cat) => cat.id === "future-expenses")}
                panelType="future"
                onToggle={handleToggle}
                onEdit={handleEdit}
                onAddItem={handleAddItem}
              />

              <FinancialPanel
                title="Fixed Debts"
                categories={personalFinanceCategories.filter((cat) => cat.id === "debts")}
                panelType="personal"
                onToggle={handleToggle}
                onEdit={handleEdit}
                onAddItem={handleAddItem}
                onPersonalInputChange={handlePersonalInputChange}
              />
            </div>
          </CardContent>
        </Card>

        {/* Tradeoff Impact Panel */}
        <TradeoffImpactPanel currentAffordability={affordability} currentFinancials={currentFinancials} />
      </div>
    </div>
  )
}
