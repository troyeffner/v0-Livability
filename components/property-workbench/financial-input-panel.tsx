"use client"

import type React from "react"

import { useState, useRef, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { X, DollarSign, Percent, Plus, Pencil, Trash2 } from "lucide-react"
import { formatCurrency } from "@/lib/affordability-calculations"
import type { Scenario } from "@/lib/property-types"
import { Slider } from "@/components/ui/slider"

interface FinancialItem {
  id: string
  label: string
  amount: number
  type: "income" | "expense" | "debt" | "downpayment"
  frequency: "monthly" | "annual" | "one-time"
  timing: "current" | "future" // NEW: For expenses
  active: boolean
  editable: boolean
}

interface FinancialInputPanelProps {
  scenario: Scenario
  onScenarioUpdate: (scenario: Scenario) => void
  onClose: () => void
}

export default function FinancialInputPanel({ scenario, onScenarioUpdate, onClose }: FinancialInputPanelProps) {
  // Convert scenario inputs to toggleable items
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
      id: "bonus-income",
      label: "Annual Bonus",
      amount: 8000,
      type: "income",
      frequency: "annual",
      timing: "current",
      active: false,
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
      id: "gym",
      label: "Gym Membership",
      amount: 80,
      type: "expense",
      frequency: "monthly",
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
      id: "hoa-fees",
      label: "HOA Fees",
      amount: 250,
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
    {
      id: "student-loan",
      label: "Student Loan",
      amount: 250,
      type: "debt",
      frequency: "monthly",
      timing: "current",
      active: false,
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
    {
      id: "401k-loan",
      label: "401k Loan",
      amount: 15000,
      type: "downpayment",
      frequency: "one-time",
      timing: "current",
      active: false,
      editable: true,
    },
  ])

  const [loanTerms, setLoanTerms] = useState({
    interestRate: scenario.financialInputs.interestRate,
    loanTerm: scenario.financialInputs.loanTerm,
    creditScore: scenario.financialInputs.creditScore,
  })

  // Keep track of the last financialInputs sent to avoid endless update loops
  const prevInputsRef = useRef(scenario.financialInputs)

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

  const handleToggle = (itemId: string) => {
    setFinancialItems((prev) => prev.map((item) => (item.id === itemId ? { ...item, active: !item.active } : item)))
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
    setFinancialItems((prev) => prev.filter((item) => item.id !== itemId))
  }

  const handleSaveModal = () => {
    if (editingItem) {
      // Update existing item
      setFinancialItems((prev) =>
        prev.map((item) =>
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
        ),
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
      setFinancialItems((prev) => [...prev, newItem])
    }
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

      setFinancialItems((prev) => [...prev, newItem])

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

  const calculateTotals = () => {
    const activeItems = financialItems.filter((item) => item.active)

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

    return { annualIncome, monthlyExpenses, fixedDebts, downPaymentSources, futureIncomeMonthly, futureExpensesMonthly }
  }

  const totals = calculateTotals()
  const monthlyTakeHome = (totals.annualIncome / 12) * 0.7

  const handleInputChange = (field: keyof Scenario["financialInputs"], value: number) => {
    onScenarioUpdate({
      ...scenario,
      financialInputs: {
        ...scenario.financialInputs,
        [field]: value,
      },
    })
  }

  // Real-time update, but ONLY when something actually changes
  useEffect(() => {
    const updatedInputs = {
      ...scenario.financialInputs,
      annualIncome: totals.annualIncome,
      monthlyExpenses: totals.monthlyExpenses,
      fixedDebts: totals.fixedDebts,
      downPaymentSources: totals.downPaymentSources,
      futureIncomeMonthly: totals.futureIncomeMonthly,
      futureExpensesMonthly: totals.futureExpensesMonthly,
      interestRate: loanTerms.interestRate,
      loanTerm: loanTerms.loanTerm,
      creditScore: loanTerms.creditScore,
    }

    // Shallow-ish compare via JSON (good enough for our flat object)
    const inputsChanged = JSON.stringify(prevInputsRef.current) !== JSON.stringify(updatedInputs)

    if (inputsChanged) {
      onScenarioUpdate({ ...scenario, financialInputs: updatedInputs })
      prevInputsRef.current = updatedInputs
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [financialItems, loanTerms, totals])

  const handleSave = () => {
    onClose()
  }

  const renderQuickAdd = (type: FinancialItem["type"], timing: "current" | "future" = "current") => {
    const key = `${type}-${timing}`
    const currentItem = quickAddItems[key] || { label: "", amount: "" }

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
          disabled={!currentItem.label.trim() || !currentItem.amount.trim()}
          className="h-8 px-2"
        >
          <Plus size={14} />
        </Button>
      </div>
    )
  }

  const renderItemGroup = (type: FinancialItem["type"], timing: "current" | "future", title: string, color: string) => {
    const items = financialItems.filter((item) => item.type === type && item.timing === timing)
    const activeSum = items
      .filter((item) => item.active)
      .reduce((sum, item) => {
        if (type === "downpayment") return sum + item.amount
        return sum + (item.frequency === "monthly" ? item.amount : item.amount / 12)
      }, 0)

    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-gray-900">{title}</h3>
          <Badge variant="outline" className={color}>
            {type === "downpayment" ? formatCurrency(activeSum) : `${formatCurrency(activeSum)}/mo`}
          </Badge>
        </div>

        <div className="space-y-2">
          {items.map((item) => (
            <div
              key={item.id}
              className={`flex items-center justify-between p-2 rounded-lg border transition-all ${
                item.active ? "bg-white border-gray-200" : "bg-gray-50 border-gray-100"
              }`}
            >
              <div className="flex items-center gap-3 flex-1">
                <Switch checked={item.active} onCheckedChange={() => handleToggle(item.id)} />
                <div className="flex-1">
                  <p className={`text-sm font-medium ${item.active ? "text-gray-900" : "text-gray-500"}`}>
                    {item.label}
                  </p>
                  <p className={`text-xs ${item.active ? "text-gray-600" : "text-gray-400"}`}>
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

  return (
    <>
      <Card className="border-2 border-blue-200">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <DollarSign size={20} />
            Financial Settings - {scenario.name}
          </CardTitle>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X size={16} />
          </Button>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Summary */}
          <div className="bg-blue-50 p-4 rounded-lg">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
              <div>
                <p className="text-sm text-blue-600">Annual Income</p>
                <p className="font-bold text-blue-900">{formatCurrency(totals.annualIncome)}</p>
              </div>
              <div>
                <p className="text-sm text-blue-600">Monthly Take-Home</p>
                <p className="font-bold text-blue-900">{formatCurrency(monthlyTakeHome)}</p>
              </div>
              <div>
                <p className="text-sm text-blue-600">Monthly Expenses</p>
                <p className="font-bold text-blue-900">{formatCurrency(totals.monthlyExpenses + totals.fixedDebts)}</p>
              </div>
              <div>
                <p className="text-sm text-blue-600">Down Payment</p>
                <p className="font-bold text-blue-900">{formatCurrency(totals.downPaymentSources)}</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Income */}
            <div>{renderItemGroup("income", "current", "Income Sources", "text-green-600 bg-green-50")}</div>

            {/* Current Expenses */}
            <div>{renderItemGroup("expense", "current", "Ongoing Living Costs", "text-red-600 bg-red-50")}</div>

            {/* Future Expenses */}
            <div>{renderItemGroup("expense", "future", "Future Expenses", "text-orange-600 bg-orange-50")}</div>

            {/* Down Payment */}
            <div>{renderItemGroup("downpayment", "current", "Down Payment Sources", "text-blue-600 bg-blue-50")}</div>
          </div>

          {/* Debts Row */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div>{renderItemGroup("debt", "current", "Fixed Debts", "text-purple-600 bg-purple-50")}</div>
            <div></div>
            <div></div>
            <div></div>
          </div>

          {/* Loan Terms */}
          <div className="border-t pt-6">
            <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Percent size={16} />
              Loan Terms
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="interestRate" className="text-sm">
                  Interest Rate (%)
                </Label>
                <Slider
                  value={[loanTerms.interestRate]}
                  onValueChange={(value) => setLoanTerms((prev) => ({ ...prev, interestRate: value[0] }))}
                  max={10}
                  min={3}
                  step={0.1}
                  className="w-full"
                />
                <div className="flex justify-between text-sm text-gray-600 mt-2">
                  <span>3%</span>
                  <span className="font-semibold">{loanTerms.interestRate.toFixed(2)}%</span>
                  <span>10%</span>
                </div>
              </div>
              <div>
                <Label htmlFor="loanTerm" className="text-sm">
                  Loan Term (years)
                </Label>
                <div className="flex gap-2 mt-1">
                  {[15, 20, 30].map((term) => (
                    <button
                      key={term}
                      onClick={() => setLoanTerms((prev) => ({ ...prev, loanTerm: term }))}
                      className={`px-3 py-2 rounded border ${
                        loanTerms.loanTerm === term
                          ? "bg-blue-500 text-white border-blue-500"
                          : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
                      }`}
                    >
                      {term}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <Label htmlFor="creditScore" className="text-sm">
                  Credit Score
                </Label>
                <Input
                  id="creditScore"
                  type="number"
                  value={loanTerms.creditScore}
                  onChange={(e) => setLoanTerms((prev) => ({ ...prev, creditScore: Number(e.target.value) }))}
                  className="mt-1"
                />
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button onClick={handleSave}>Done</Button>
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
            {modalType === "expense" && (
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
          </div>
          <DialogFooter>
            <Button type="submit" onClick={handleSaveModal}>
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
