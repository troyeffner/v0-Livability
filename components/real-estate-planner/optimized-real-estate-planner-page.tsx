"use client"

import React, { useState, useMemo, useCallback, useRef, useEffect } from "react"
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core"
import { arrayMove, sortableKeyboardCoordinates } from "@dnd-kit/sortable"

import OptimizedCurrentPurchaseSimulation from "./optimized-current-purchase-simulation"
import OptimizedFinancialPanel from "./optimized-financial-panel"
import TradeoffImpactPanel from "./tradeoff-impact-panel"
import EditItemModal from "./edit-item-modal"
import InterestRateEditModal from "./interest-rate-edit-modal"
import ErrorBoundary from "./error-boundary"
import { useMemoizedCalculations } from "@/hooks/use-memoized-calculations"
import { useDebouncedCallback } from "@/hooks/use-debounced-callback"
import { initialPersonalFinances, initialMortgageApplication, initialFutureHome } from "@/lib/real-estate-data"
import type {
  FinancialItem,
  MortgageOptionGroup,
  FutureItem,
  ItemCategory,
  Item,
  TradeoffImpact,
} from "@/lib/real-estate-types"
import {
  calculateMonthlyMortgagePaymentForPrice,
  calculateTransactionCosts,
  calculateLivabilityPurchasePrice,
  calculateGrossPurchasePrice,
} from "@/lib/real-estate-calculations"

// Memoized grid layout component
const PlannerGrid = React.memo<{
  personalFinances: ItemCategory<FinancialItem>[]
  mortgageApplication: MortgageOptionGroup[]
  futureHome: ItemCategory<FutureItem>[]
  tradeoffLog: TradeoffImpact[]
  onToggle: (panel: "personal" | "mortgage" | "future", categoryId: string, itemId: string) => void
  onEdit: (panel: "personal" | "mortgage" | "future", categoryId: string, itemId: string) => void
  onAddItem: (panel: "personal" | "future" | "mortgage", categoryId: string) => void
  onPersonalInputChange: (groupId: string, itemId: string, value: number) => void
  onMortgageInputChange: (groupId: string, itemId: string, value: number) => void
  monthlyTakeHomeIncome: number
  remainingLifestyleBudget: number
  livabilityPurchasePrice: number
}>(
  ({
    personalFinances,
    mortgageApplication,
    futureHome,
    tradeoffLog,
    onToggle,
    onEdit,
    onAddItem,
    onPersonalInputChange,
    onMortgageInputChange,
    monthlyTakeHomeIncome,
    remainingLifestyleBudget,
    livabilityPurchasePrice,
  }) => (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 mb-6">
      <OptimizedFinancialPanel
        title="Personal Finances"
        categories={personalFinances}
        panelType="personal"
        onToggle={onToggle}
        onEdit={onEdit}
        onAddItem={onAddItem}
        onPersonalInputChange={onPersonalInputChange}
        monthlyTakeHomeIncome={monthlyTakeHomeIncome}
        remainingLifestyleBudget={remainingLifestyleBudget}
      />
      <OptimizedFinancialPanel
        title="Mortgage Application"
        categories={mortgageApplication}
        panelType="mortgage"
        onToggle={onToggle}
        onEdit={onEdit}
        onAddItem={onAddItem}
        onMortgageInputChange={onMortgageInputChange}
        livabilityPurchasePrice={livabilityPurchasePrice}
      />
      <OptimizedFinancialPanel
        title="Future Home"
        categories={futureHome}
        panelType="future"
        onToggle={onToggle}
        onEdit={onEdit}
        onAddItem={onAddItem}
      />
      <TradeoffImpactPanel tradeoffLog={tradeoffLog} />
    </div>
  ),
)

PlannerGrid.displayName = "PlannerGrid"

export default function OptimizedRealEstatePlannerPage() {
  // State management
  const [personalFinances, setPersonalFinances] = useState<ItemCategory<FinancialItem>[]>(initialPersonalFinances)
  const [mortgageApplication, setMortgageApplication] = useState<MortgageOptionGroup[]>(initialMortgageApplication)
  const [futureHome, setFutureHome] = useState<ItemCategory<FutureItem>[]>(initialFutureHome)
  const [tradeoffLog, setTradeoffLog] = useState<TradeoffImpact[]>([])

  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<FinancialItem | null>(null)
  const [editingItemPath, setEditingItemPath] = useState<{
    panel: "personal" | "future" | "mortgage"
    categoryIndex: number
    itemIndex?: number
    categoryId?: string
  } | null>(null)

  const [isInterestRateModalOpen, setIsInterestRateModalOpen] = useState(false)
  const [editingInterestRateItem, setEditingInterestRateItem] = useState<Item | null>(null)

  // Performance tracking
  const [lastAction, setLastAction] = useState<{ item: Item; type: "toggle" | "edit" } | null>(null)
  const prevPricesRef = useRef({ gpp: 0, lpp: 0 })

  // Use memoized calculations hook
  const {
    grossAnnualIncome,
    annualTakeHome,
    taxes,
    healthcare,
    retirement,
    monthlyTakeHomeIncome,
    fixedDebtsMonthly,
    lifestyleExpensesMonthly,
    futureIncomeMonthly,
    futureExpensesMonthly,
    selectedMortgageOptions,
  } = useMemoizedCalculations(personalFinances, futureHome, mortgageApplication)

  // Memoize complex calculations
  const purchasePriceCalculations = useMemo(() => {
    const {
      grossPurchasePrice,
      maxLoanAmount: gppMaxLoanAmount,
      requiredDownPayment,
    } = calculateGrossPurchasePrice(
      grossAnnualIncome,
      fixedDebtsMonthly,
      selectedMortgageOptions.interestRate,
      selectedMortgageOptions.termLength,
      selectedMortgageOptions.propertyTaxRate,
      selectedMortgageOptions.homeownersInsuranceAnnual,
    )

    const {
      livabilityPurchasePrice,
      maxLoanAmount: lppMaxLoanAmount,
      adjustedTakeHome,
      effectiveDownPaymentPercentage,
      excessDownPayment,
      excessApplication,
    } = calculateLivabilityPurchasePrice(
      monthlyTakeHomeIncome,
      futureIncomeMonthly,
      futureExpensesMonthly,
      fixedDebtsMonthly,
      lifestyleExpensesMonthly,
      selectedMortgageOptions.interestRate,
      selectedMortgageOptions.termLength,
      selectedMortgageOptions.availableDownPayment,
      selectedMortgageOptions.downPaymentPercentage,
      selectedMortgageOptions.propertyTaxRate,
      selectedMortgageOptions.homeownersInsuranceAnnual,
      selectedMortgageOptions.livabilityIncomePercentage,
    )

    return {
      grossPurchasePrice,
      gppMaxLoanAmount,
      requiredDownPayment,
      livabilityPurchasePrice,
      lppMaxLoanAmount,
      adjustedTakeHome,
      effectiveDownPaymentPercentage,
      excessDownPayment,
      excessApplication,
    }
  }, [
    grossAnnualIncome,
    fixedDebtsMonthly,
    selectedMortgageOptions,
    monthlyTakeHomeIncome,
    futureIncomeMonthly,
    futureExpensesMonthly,
    lifestyleExpensesMonthly,
  ])

  // Memoize derived calculations
  const derivedCalculations = useMemo(() => {
    const livabilityMonthlyMortgagePayment =
      purchasePriceCalculations.livabilityPurchasePrice <= 0 || purchasePriceCalculations.lppMaxLoanAmount <= 0
        ? 0
        : calculateMonthlyMortgagePaymentForPrice(
            purchasePriceCalculations.lppMaxLoanAmount,
            selectedMortgageOptions.interestRate,
            selectedMortgageOptions.termLength,
          )

    const escrowPaymentMonthly =
      purchasePriceCalculations.livabilityPurchasePrice <= 0
        ? 0
        : (purchasePriceCalculations.livabilityPurchasePrice * selectedMortgageOptions.propertyTaxRate) / 12 +
          selectedMortgageOptions.homeownersInsuranceAnnual / 12

    const remainingLifestyleBudget =
      purchasePriceCalculations.adjustedTakeHome -
      livabilityMonthlyMortgagePayment -
      escrowPaymentMonthly -
      fixedDebtsMonthly -
      lifestyleExpensesMonthly

    const transactionCosts = calculateTransactionCosts(purchasePriceCalculations.livabilityPurchasePrice)

    return {
      livabilityMonthlyMortgagePayment,
      escrowPaymentMonthly,
      remainingLifestyleBudget,
      transactionCosts,
    }
  }, [purchasePriceCalculations, selectedMortgageOptions, fixedDebtsMonthly, lifestyleExpensesMonthly])

  // Debounced tradeoff logging to prevent excessive updates
  const debouncedLogTradeoff = useDebouncedCallback(
    (action: { item: Item }, prevGPP: number, newGPP: number, prevLPP: number, newLPP: number) => {
      try {
        const { item } = action
        const gppDiff = newGPP - prevGPP
        const lppDiff = newLPP - prevLPP

        if (Math.abs(gppDiff) < 100 && Math.abs(lppDiff) < 100) return

        let message = ""
        let impactCategory: "Affordability" | "One-Time Cost" | "Loan Terms" = "Affordability"

        if (item.id.includes("downpayment-sources") || item.id.includes("dps-")) {
          message = `${item.label}: ${item.active ? "+" : "-"}$${Math.abs(item.amount || 0).toLocaleString()} → ${lppDiff > 0 ? "Increase" : "Decrease"} Livability Purchase Price by $${Math.abs(lppDiff).toLocaleString()}`
          impactCategory = "One-Time Cost"
        } else if (item.itemType === "income" && item.active) {
          const incomeIncrease = item.frequency === "annual" ? item.amount || 0 : (item.amount || 0) * 12
          message = `💰 ${item.label}: +$${incomeIncrease.toLocaleString()}/year → Purchase price increased by $${Math.abs(lppDiff).toLocaleString()}`
        } else if (item.itemType === "expense" && item.active) {
          const monthlyExpenseIncrease =
            item.frequency === "monthly" ? item.amount || 0 : (item.amount || 0) / 12
          message = `💸 ${item.label}: +$${Math.round(monthlyExpenseIncrease).toLocaleString()}/month expenses → Purchase price reduced by $${Math.abs(lppDiff).toLocaleString()}`
        }

        if (message) {
          setTradeoffLog((prev) =>
            [
              {
                id: Date.now().toString(),
                message,
                itemLabel: item.label || "",
                gppImpact: gppDiff,
                lppImpact: lppDiff,
                type: item.itemType || "info",
                impactCategory,
              },
              ...prev,
            ].slice(0, 10),
          )
        }
      } catch (error) {
        console.error("Error logging tradeoff:", error)
      }
    },
    300,
  )

  // Optimized effect for tradeoff logging
  useEffect(() => {
    if (lastAction) {
      const prevGPP = prevPricesRef.current.gpp
      const prevLPP = prevPricesRef.current.lpp

      if (
        Math.abs(prevGPP - purchasePriceCalculations.grossPurchasePrice) > 100 ||
        Math.abs(prevLPP - purchasePriceCalculations.livabilityPurchasePrice) > 100
      ) {
        debouncedLogTradeoff(
          lastAction,
          prevGPP,
          purchasePriceCalculations.grossPurchasePrice,
          prevLPP,
          purchasePriceCalculations.livabilityPurchasePrice,
        )
      }

      setLastAction(null)
    }

    prevPricesRef.current = {
      gpp: purchasePriceCalculations.grossPurchasePrice,
      lpp: purchasePriceCalculations.livabilityPurchasePrice,
    }
  }, [
    purchasePriceCalculations.grossPurchasePrice,
    purchasePriceCalculations.livabilityPurchasePrice,
    lastAction,
    debouncedLogTradeoff,
  ])

  // Memoized event handlers
  const handleToggle = useCallback(
    (panel: "personal" | "mortgage" | "future", categoryId: string, itemId: string) => {
      try {
        let toggledItem: Item | null = null

        const findAndToggle = <T extends { id: string; items: Item[] }>(items: T[]) =>
          items.map((cat) => {
            if (cat.id === categoryId) {
              return {
                ...cat,
                items: cat.items.map((item: Item) => {
                  if (item.id === itemId) {
                    toggledItem = { ...item, active: !item.active }
                    return toggledItem
                  }
                  return item
                }),
              }
            }
            return cat
          })

        const findAndToggleRadio = (groups: MortgageOptionGroup[]) =>
          groups.map((group) => {
            if (group.id === categoryId) {
              return {
                ...group,
                items: group.items.map((item) => {
                  const isActive = item.id === itemId
                  if (isActive) {
                    toggledItem = { ...item, active: true }
                  }
                  return { ...item, active: isActive }
                }),
              }
            }
            return group
          })

        if (panel === "personal") {
          setPersonalFinances(findAndToggle)
        } else if (panel === "future") {
          setFutureHome(findAndToggle)
        } else if (panel === "mortgage") {
          const group = mortgageApplication.find((g) => g.id === categoryId)
          if (group?.type === "radio" || group?.type === "select") {
            setMortgageApplication(findAndToggleRadio)
          } else {
            setMortgageApplication(findAndToggle)
          }
        }

        if (toggledItem) {
          setLastAction({ item: toggledItem, type: "toggle" })
        }
      } catch (error) {
        console.error("Error handling toggle:", error)
      }
    },
    [mortgageApplication],
  )

  const handleEdit = useCallback(
    (panel: "personal" | "mortgage" | "future", categoryId: string, itemId: string) => {
      try {
        // Handle interest rate editing with special modal
        if (panel === "mortgage" && categoryId === "interest-rate") {
          const group = mortgageApplication.find((g) => g.id === categoryId)
          if (group) {
            const item = group.items.find((i) => i.id === itemId)
            if (item) {
              setEditingInterestRateItem(item)
              setIsInterestRateModalOpen(true)
              return
            }
          }
        }

        // Handle regular editing for other items
        let itemToEdit: FinancialItem | null = null
        let catIndex = -1
        let itmIndex = -1

        if (panel === "personal") {
          catIndex = personalFinances.findIndex((c) => c.id === categoryId)
          if (catIndex !== -1) {
            itmIndex = personalFinances[catIndex].items.findIndex((i) => i.id === itemId)
            if (itmIndex !== -1) itemToEdit = personalFinances[catIndex].items[itmIndex]
          }
          if (itemToEdit)
            setEditingItemPath({ panel: "personal", categoryIndex: catIndex, itemIndex: itmIndex, categoryId })
        } else if (panel === "future") {
          catIndex = futureHome.findIndex((c) => c.id === categoryId)
          if (catIndex !== -1) {
            itmIndex = futureHome[catIndex].items.findIndex((i) => i.id === itemId)
            if (itmIndex !== -1) itemToEdit = futureHome[catIndex].items[itmIndex]
          }
          if (itemToEdit)
            setEditingItemPath({ panel: "future", categoryIndex: catIndex, itemIndex: itmIndex, categoryId })
        } else if (panel === "mortgage") {
          catIndex = mortgageApplication.findIndex((c) => c.id === categoryId)
          if (catIndex !== -1) {
            itmIndex = mortgageApplication[catIndex].items.findIndex((i) => i.id === itemId)
            if (itmIndex !== -1) itemToEdit = mortgageApplication[catIndex].items[itmIndex] as FinancialItem
          }
          if (itemToEdit)
            setEditingItemPath({ panel: "mortgage", categoryIndex: catIndex, itemIndex: itmIndex, categoryId })
        }

        if (itemToEdit) {
          setEditingItem(itemToEdit)
          setIsModalOpen(true)
        }
      } catch (error) {
        console.error("Error handling edit:", error)
      }
    },
    [mortgageApplication, personalFinances, futureHome],
  )

  const handleAddItem = useCallback(
    (panel: "personal" | "future" | "mortgage", categoryId: string) => {
      try {
        let catIndex = -1
        if (panel === "personal") {
          catIndex = personalFinances.findIndex((c) => c.id === categoryId)
          if (catIndex !== -1) setEditingItemPath({ panel, categoryIndex: catIndex, categoryId })
        } else if (panel === "future") {
          catIndex = futureHome.findIndex((c) => c.id === categoryId)
          if (catIndex !== -1) setEditingItemPath({ panel, categoryIndex: catIndex, categoryId })
        } else if (panel === "mortgage") {
          catIndex = mortgageApplication.findIndex((c) => c.id === categoryId)
          if (catIndex !== -1) setEditingItemPath({ panel, categoryIndex: catIndex, categoryId })
        }

        let category: { id: string; items: Item[] } | undefined
        if (panel === "personal") {
          category = personalFinances[catIndex]
        } else if (panel === "future") {
          category = futureHome[catIndex]
        } else if (panel === "mortgage") {
          category = mortgageApplication[catIndex]
        }

        if (!category) return

        let itemType: "income" | "expense" | "info" = "expense"
        if (category.id.includes("income") || category.id === "downpayment-sources") {
          itemType = "income"
        } else if (category.id.includes("expense")) {
          itemType = "expense"
        } else {
          itemType = "info"
        }

        let frequency: "monthly" | "annual" | "one-time" = "monthly"
        if (category.id === "downpayment-sources" || category.id === "moving-first-month-expenses") {
          frequency = "one-time"
        } else if (category.id.includes("income")) {
          frequency = "annual"
        }

        setEditingItem({
          id: `new-${Date.now()}`,
          label: "",
          amount: 0,
          itemType,
          frequency,
          active: true,
          editable: true,
        })
        setIsModalOpen(true)
      } catch (error) {
        console.error("Error adding item:", error)
      }
    },
    [personalFinances, futureHome, mortgageApplication],
  )

  const handleMortgageInputChange = useCallback((groupId: string, itemId: string, value: number) => {
    try {
      const safeValue = typeof value === "number" && Number.isFinite(value) ? value : 0
      setMortgageApplication((prev) =>
        prev.map((group) => {
          if (group.id === groupId) {
            return {
              ...group,
              items: group.items.map((item) => {
                if (item.id === itemId) {
                  const updatedItem = { ...item, amount: safeValue }
                  setLastAction({ item: updatedItem, type: "edit" })
                  return updatedItem
                }
                return item
              }),
            }
          }
          return group
        }),
      )
    } catch (error) {
      console.error("Error handling mortgage input change:", error)
    }
  }, [])

  const handlePersonalInputChange = useCallback((groupId: string, itemId: string, value: number) => {
    try {
      const safeValue = typeof value === "number" && Number.isFinite(value) ? value : 0
      setPersonalFinances((prev) =>
        prev.map((group) => {
          if (group.id === groupId) {
            return {
              ...group,
              items: group.items.map((item) => {
                if (item.id === itemId) {
                  const updatedItem = { ...item, amount: safeValue }
                  setLastAction({ item: updatedItem, type: "edit" })
                  return updatedItem
                }
                return item
              }),
            }
          }
          return group
        }),
      )
    } catch (error) {
      console.error("Error handling personal input change:", error)
    }
  }, [])

  const handleSaveItem = useCallback(
    (updatedItem: Item) => {
      try {
        if (!editingItemPath || !editingItem) return
        const { panel, categoryIndex, itemIndex } = editingItemPath

        const updateCategoryItems = <T extends { id: string; items: Item[] }>(
          setState: React.Dispatch<React.SetStateAction<T[]>>,
        ) => {
          setState((prev) =>
            prev.map((cat, cIdx) => {
              if (cIdx === categoryIndex) {
                if (itemIndex === undefined) {
                  return { ...cat, items: [...cat.items, updatedItem] }
                }
                return {
                  ...cat,
                  items: cat.items.map((item, iIdx) => (iIdx === itemIndex ? updatedItem : item)),
                }
              }
              return cat
            }) as T[],
          )
        }

        if (panel === "personal") {
          updateCategoryItems(setPersonalFinances)
        } else if (panel === "future") {
          updateCategoryItems(setFutureHome)
        } else if (panel === "mortgage") {
          updateCategoryItems(setMortgageApplication)
        }

        setLastAction({ item: updatedItem, type: "edit" })
        setIsModalOpen(false)
        setEditingItem(null)
        setEditingItemPath(null)
      } catch (error) {
        console.error("Error saving item:", error)
      }
    },
    [editingItemPath, editingItem],
  )

  const handleDeleteItem = useCallback(
    (itemToDelete: Item) => {
      try {
        if (!editingItemPath) return
        const { panel, categoryIndex, itemIndex } = editingItemPath

        const removeItemFromCategory = <T extends { id: string; items: Item[] }>(
          setState: React.Dispatch<React.SetStateAction<T[]>>,
        ) => {
          setState((prev) =>
            prev.map((cat, cIdx) => {
              if (cIdx === categoryIndex) {
                return {
                  ...cat,
                  items: cat.items.filter((_item, iIdx) => iIdx !== itemIndex),
                }
              }
              return cat
            }) as T[],
          )
        }

        if (panel === "personal") {
          removeItemFromCategory(setPersonalFinances)
        } else if (panel === "future") {
          removeItemFromCategory(setFutureHome)
        } else if (panel === "mortgage") {
          removeItemFromCategory(setMortgageApplication)
        }

        setLastAction({ item: itemToDelete, type: "edit" })
        setIsModalOpen(false)
        setEditingItem(null)
        setEditingItemPath(null)
      } catch (error) {
        console.error("Error deleting item:", error)
      }
    },
    [editingItemPath],
  )

  const handleInterestRateSave = useCallback(
    (newRate: string) => {
      try {
        if (!editingInterestRateItem) return

        const safeRate = typeof newRate === "string" ? newRate : String(newRate)

        setMortgageApplication((prev) =>
          prev.map((group) => {
            if (group.id === "interest-rate") {
              return {
                ...group,
                items: group.items.map((item) => {
                  if (item.id === editingInterestRateItem.id) {
                    const updatedItem = {
                      ...item,
                      label: `${safeRate}%`,
                      value: safeRate,
                    }
                    if (item.active) {
                      setLastAction({ item: updatedItem, type: "edit" })
                    }
                    return updatedItem
                  }
                  return item
                }),
              }
            }
            return group
          }),
        )

        setIsInterestRateModalOpen(false)
        setEditingInterestRateItem(null)
      } catch (error) {
        console.error("Error saving interest rate:", error)
      }
    },
    [editingInterestRateItem],
  )

  // DnD sensors
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  )

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    try {
      const { active, over } = event
      if (over && active.id !== over.id) {
        setTradeoffLog((items) => {
          const oldIndex = items.findIndex((item) => item.id === active.id)
          const newIndex = items.findIndex((item) => item.id === over.id)
          return arrayMove(items, oldIndex, newIndex)
        })
      }
    } catch (error) {
      console.error("Error handling drag end:", error)
    }
  }, [])

  // Calculate additional derived values for the simulation
  const simulationProps = useMemo(() => {
    const futureOneTimeExpenses = futureHome
      .flatMap((cat) => cat.items.filter((item) => item.active && item.frequency === "one-time"))
      .reduce((sum, item) => sum + (item.amount || 0), 0)

    const movingFirstMonthExpenses =
      futureHome
        .find((cat) => cat.id === "moving-first-month-expenses")
        ?.items.filter((item) => item.active && item.frequency === "one-time")
        .reduce((sum, item) => sum + (item.amount || 0), 0) || 0

    const downPaymentAmount = Math.max(0, selectedMortgageOptions.availableDownPayment)
    const oneTimePurchasePaymentTotal = Math.max(
      0,
      downPaymentAmount + derivedCalculations.transactionCosts + futureOneTimeExpenses + movingFirstMonthExpenses,
    )

    // Calculate down payment constraint details
    const downPaymentConstraintDetails = (() => {
      try {
        const maxHousingBudget = monthlyTakeHomeIncome * selectedMortgageOptions.livabilityIncomePercentage
        const availableForPITI = monthlyTakeHomeIncome - fixedDebtsMonthly - lifestyleExpensesMonthly
        const maxPITI = Math.min(maxHousingBudget, availableForPITI)

        if (maxPITI <= 0) return null

        // Simplified constraint calculation for performance
        const maxPriceFromIncome = purchasePriceCalculations.livabilityPurchasePrice * 1.2 // Rough estimate
        const priceDifference = maxPriceFromIncome - purchasePriceCalculations.livabilityPurchasePrice
        const isConstrained = priceDifference > purchasePriceCalculations.livabilityPurchasePrice * 0.1

        if (!isConstrained) return null

        const additionalDownPaymentNeeded = Math.max(
          0,
          (maxPriceFromIncome * selectedMortgageOptions.downPaymentPercentage) / 100 -
            selectedMortgageOptions.availableDownPayment,
        )

        return {
          isConstrained: true,
          additionalDownPaymentNeeded: Math.round(additionalDownPaymentNeeded),
          purchasePriceIncrease: Math.round(priceDifference),
          maxPriceFromIncome: Math.round(maxPriceFromIncome),
        }
      } catch (error) {
        console.error("Error calculating down payment constraint details:", error)
        return null
      }
    })()

    return {
      futureOneTimeExpenses,
      movingFirstMonthExpenses,
      downPaymentAmount,
      oneTimePurchasePaymentTotal,
      downPaymentConstraintDetails,
    }
  }, [
    futureHome,
    selectedMortgageOptions,
    derivedCalculations.transactionCosts,
    monthlyTakeHomeIncome,
    fixedDebtsMonthly,
    lifestyleExpensesMonthly,
    purchasePriceCalculations.livabilityPurchasePrice,
  ])

  return (
    <ErrorBoundary>
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <div className="space-y-6 max-w-7xl mx-auto p-4">
          <PlannerGrid
            personalFinances={personalFinances}
            mortgageApplication={mortgageApplication}
            futureHome={futureHome}
            tradeoffLog={tradeoffLog}
            onToggle={handleToggle}
            onEdit={handleEdit}
            onAddItem={handleAddItem}
            onPersonalInputChange={handlePersonalInputChange}
            onMortgageInputChange={handleMortgageInputChange}
            monthlyTakeHomeIncome={monthlyTakeHomeIncome}
            remainingLifestyleBudget={derivedCalculations.remainingLifestyleBudget}
            livabilityPurchasePrice={purchasePriceCalculations.livabilityPurchasePrice}
          />

          <OptimizedCurrentPurchaseSimulation
            grossAnnualIncome={grossAnnualIncome}
            taxes={taxes}
            healthcare={healthcare}
            retirement={retirement}
            annualTakeHome={annualTakeHome}
            grossPurchasePrice={purchasePriceCalculations.grossPurchasePrice}
            monthlyTakeHomeIncome={monthlyTakeHomeIncome}
            livabilityMonthlyMortgagePayment={derivedCalculations.livabilityMonthlyMortgagePayment}
            escrowPaymentMonthly={derivedCalculations.escrowPaymentMonthly}
            lifestyleExpensesMonthly={lifestyleExpensesMonthly}
            futureExpensesMonthly={futureExpensesMonthly}
            futureIncomeMonthly={futureIncomeMonthly}
            remainingLifestyleBudget={derivedCalculations.remainingLifestyleBudget}
            livabilityPurchasePrice={purchasePriceCalculations.livabilityPurchasePrice}
            downPaymentAmount={simulationProps.downPaymentAmount}
            transactionCosts={derivedCalculations.transactionCosts}
            oneTimePurchasePaymentTotal={simulationProps.oneTimePurchasePaymentTotal}
            gppLoanAmount={purchasePriceCalculations.gppMaxLoanAmount}
            fixedDebtsMonthly={fixedDebtsMonthly}
            selectedMortgageOptions={{
              livabilityIncomePercentage: selectedMortgageOptions.livabilityIncomePercentage,
              interestRate: selectedMortgageOptions.interestRate,
              termLength: selectedMortgageOptions.termLength,
              availableDownPayment: selectedMortgageOptions.availableDownPayment,
              effectiveDownPaymentPercentage: purchasePriceCalculations.effectiveDownPaymentPercentage,
              propertyTaxRate: selectedMortgageOptions.propertyTaxRate,
              homeownersInsuranceAnnual: selectedMortgageOptions.homeownersInsuranceAnnual,
              downPaymentPercentage: selectedMortgageOptions.downPaymentPercentage,
            }}
            lppLoanAmount={purchasePriceCalculations.lppMaxLoanAmount}
            adjustedTakeHome={purchasePriceCalculations.adjustedTakeHome}
            futureOneTimeExpenses={simulationProps.futureOneTimeExpenses}
            requiredDownPayment={purchasePriceCalculations.requiredDownPayment}
            excessDownPayment={purchasePriceCalculations.excessDownPayment}
            excessApplication={purchasePriceCalculations.excessApplication}
            downPaymentConstraintDetails={simulationProps.downPaymentConstraintDetails}
            movingFirstMonthExpenses={simulationProps.movingFirstMonthExpenses}
          />

          {/* Modals */}
          <EditItemModal
            item={editingItem}
            isOpen={isModalOpen}
            onClose={() => {
              setIsModalOpen(false)
              setEditingItem(null)
              setEditingItemPath(null)
            }}
            onSave={handleSaveItem}
            onDelete={handleDeleteItem}
            categoryId={editingItemPath?.categoryId}
          />

          <InterestRateEditModal
            item={editingInterestRateItem}
            isOpen={isInterestRateModalOpen}
            onClose={() => {
              setIsInterestRateModalOpen(false)
              setEditingInterestRateItem(null)
            }}
            onSave={handleInterestRateSave}
          />
        </div>
      </DndContext>
    </ErrorBoundary>
  )
}
