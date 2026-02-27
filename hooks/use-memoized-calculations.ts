"use client"

import { useMemo } from "react"
import { calculateGrossAnnualIncome, calculateTakeHomeFromIncomeItems } from "@/lib/real-estate-calculations"
import type { ItemCategory, FinancialItem, FutureItem, MortgageOptionGroup } from "@/lib/real-estate-types"
import { DEFAULTS } from "@/lib/finance-core"

export function useMemoizedCalculations(
  personalFinances: ItemCategory<FinancialItem>[],
  futureHome: ItemCategory<FutureItem>[],
  mortgageApplication: MortgageOptionGroup[],
) {
  // Memoize active items to prevent recalculation
  const activePersonalFinanceItems = useMemo(() => {
    try {
      return personalFinances.flatMap((cat) => cat.items.filter((item) => item.active))
    } catch (error) {
      console.error("Error getting active personal finance items:", error)
      return []
    }
  }, [personalFinances])

  const activeFutureHomeItems = useMemo(() => {
    try {
      return futureHome.flatMap((cat) => cat.items.filter((item) => item.active))
    } catch (error) {
      console.error("Error getting active future home items:", error)
      return []
    }
  }, [futureHome])

  // Memoize income calculations
  // grossAnnualIncome — sums all active income items (used for bank DTI qualification, which uses gross)
  const grossAnnualIncome = useMemo(
    () => calculateGrossAnnualIncome(activePersonalFinanceItems.filter((item) => item.itemType === "income")),
    [activePersonalFinanceItems],
  )

  // activeIncomeItems — only income-type items, passed to per-item take-home calculation
  const activeIncomeItems = useMemo(
    () => activePersonalFinanceItems.filter((item) => item.itemType === "income"),
    [activePersonalFinanceItems],
  )

  // Per-item take-home respects each item's gross/net setting and withholding percentages
  const { annualTakeHome, taxes, healthcare, retirement, hsa, other } = useMemo(
    () => calculateTakeHomeFromIncomeItems(activeIncomeItems),
    [activeIncomeItems],
  )

  const monthlyTakeHomeIncome = useMemo(() => Math.max(0, Math.round(annualTakeHome / 12)), [annualTakeHome])

  // Memoize expense calculations
  const expenseCalculations = useMemo(() => {
    try {
      const fixedDebtsMonthly =
        personalFinances
          .find((cat) => cat.id === "fixed-debts")
          ?.items.filter((item) => item.active && item.frequency === "monthly")
          .reduce((sum, item) => sum + (typeof item.amount === "number" ? item.amount : 0), 0) || 0

      const lifestyleExpensesMonthly = personalFinances
        .filter((cat) => cat.id === "monthly-expenses" || cat.id === "annual-expenses")
        .flatMap((cat) => cat.items.filter((item) => item.active))
        .reduce((sum, item) => {
          const amount = typeof item.amount === "number" ? item.amount : 0
          if (item.frequency === "monthly") return sum + amount
          if (item.frequency === "annual") return sum + amount / 12
          return sum
        }, 0)

      const futureIncomeMonthly = activeFutureHomeItems
        .filter((item) => item.itemType === "income")
        .reduce((sum, item) => {
          const amount = typeof item.amount === "number" ? item.amount : 0
          if (item.frequency === "monthly") return sum + amount
          if (item.frequency === "annual") return sum + amount / 12
          return sum
        }, 0)

      const futureExpensesMonthly = activeFutureHomeItems
        .filter((item) => item.itemType === "expense" && item.frequency !== "one-time")
        .reduce((sum, item) => {
          const amount = typeof item.amount === "number" ? item.amount : 0
          if (item.frequency === "monthly") return sum + amount
          if (item.frequency === "annual") return sum + amount / 12
          return sum
        }, 0)

      return {
        fixedDebtsMonthly,
        lifestyleExpensesMonthly,
        futureIncomeMonthly,
        futureExpensesMonthly,
      }
    } catch (error) {
      console.error("Error calculating expenses:", error)
      return {
        fixedDebtsMonthly: 0,
        lifestyleExpensesMonthly: 0,
        futureIncomeMonthly: 0,
        futureExpensesMonthly: 0,
      }
    }
  }, [personalFinances, activeFutureHomeItems])

  // Memoize mortgage options
  const selectedMortgageOptions = useMemo(() => {
    try {
      const options: { [key: string]: string | number | boolean } = {}

      const monthlyPaymentCategory = personalFinances.find((cat) => cat.id === "monthly-payment")
      const livabilityIncomePercentage =
        typeof monthlyPaymentCategory?.items[0]?.amount === "number" ? monthlyPaymentCategory.items[0].amount : 30

      mortgageApplication.forEach((group) => {
        if (group.type === "select" || group.type === "radio") {
          const activeItem = group.items.find((item) => item.active)
          if (activeItem) {
            options[group.id] = activeItem.value !== undefined ? activeItem.value : activeItem.label
          } else if (group.items.length > 0) {
            options[group.id] = group.items[0].value !== undefined ? group.items[0].value : group.items[0].label
          }
        } else if (group.type === "input") {
          const item = group.items[0]
          options[group.id] = typeof item.amount === "number" ? item.amount : 0
        } else if (group.type === "default" && group.id === "downpayment-sources") {
          const totalSources = group.items
            .filter((item) => item.active)
            .reduce((sum, item) => sum + (typeof item.amount === "number" ? item.amount : 0), 0)
          options["downpayment-sources-total"] = totalSources
        }
      })

      const getInterestRate = (rateString: any): number => {
        if (rateString === undefined || rateString === null) return 0.0685
        const parsed = typeof rateString === "string" ? Number.parseFloat(rateString) : Number(rateString)
        if (isNaN(parsed) || parsed <= 0 || parsed > 20) return 0.0685
        return parsed / 100
      }

      return {
        livabilityIncomePercentage: Math.max(0.1, Math.min(0.5, livabilityIncomePercentage / 100)),
        interestRate: getInterestRate(options["interest-rate"]),
        termLength: Math.max(
          10,
          Math.min(40, typeof options["term-length"] === "number" ? options["term-length"] : 30),
        ),
        availableDownPayment: Math.max(
          0,
          typeof options["downpayment-sources-total"] === "number" ? options["downpayment-sources-total"] : 0,
        ),
        downPaymentPercentage: Math.max(
          5,
          Math.min(50, typeof options["downpayment-percentage"] === "number" ? options["downpayment-percentage"] : 20),
        ),
        propertyTaxRate: DEFAULTS.propertyTaxRatePercent / 100,
        homeownersInsuranceAnnual: DEFAULTS.annualInsurance,
      }
    } catch (error) {
      console.error("Error calculating selected mortgage options:", error)
      return {
        livabilityIncomePercentage: 0.3,
        interestRate: 0.0685,
        termLength: 30,
        availableDownPayment: 0,
        downPaymentPercentage: 20,
        propertyTaxRate: DEFAULTS.propertyTaxRatePercent / 100,
        homeownersInsuranceAnnual: DEFAULTS.annualInsurance,
      }
    }
  }, [mortgageApplication, personalFinances])

  return {
    activePersonalFinanceItems,
    activeFutureHomeItems,
    grossAnnualIncome,
    annualTakeHome,
    taxes,
    healthcare,
    retirement,
    hsa,
    other,
    monthlyTakeHomeIncome,
    ...expenseCalculations,
    selectedMortgageOptions,
  }
}
