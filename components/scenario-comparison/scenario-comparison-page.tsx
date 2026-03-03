"use client"

import { useState, useMemo } from "react"
import { defaultUserProfile } from "@/lib/property-data"
import { calculateMaxAffordability, estimateInterestRate } from "@/lib/affordability-calculations"
import type { FinancialInputs, Scenario, AffordabilityCalculation } from "@/lib/property-types"
import ScenarioColumn from "./scenario-column"

export interface ColumnState {
  scenarioId: string
  name: string
  description?: string
  financialInputs: FinancialInputs
  housingPercentage: number
  downPaymentPercentage: number
}

export default function ScenarioComparisonPage() {
  // Initialize column states from default scenarios
  const [columns, setColumns] = useState<ColumnState[]>(() =>
    defaultUserProfile.scenarios.map((s) => ({
      scenarioId: s.id,
      name: s.name,
      description: s.description,
      financialInputs: { ...s.financialInputs },
      housingPercentage: s.financialInputs.housingPercentage ?? 30,
      downPaymentPercentage: s.financialInputs.downPaymentPercentage ?? 20,
    }))
  )

  // Compute affordability for each column
  const columnResults = useMemo(() => {
    return columns.map((col) => {
      const scenario: Scenario = {
        id: col.scenarioId,
        name: col.name,
        description: col.description,
        financialInputs: col.financialInputs,
      }
      const affordability = calculateMaxAffordability(
        scenario,
        col.housingPercentage,
        col.downPaymentPercentage
      )

      // Rate sensitivity — 1% lower rate
      const currentRate = col.financialInputs.interestRate ?? 6.85
      const lowerRate = Math.max(0.5, currentRate - 1)
      const scenarioLowerRate: Scenario = {
        ...scenario,
        financialInputs: { ...col.financialInputs, interestRate: lowerRate },
      }
      const affordabilityLowerRate = calculateMaxAffordability(
        scenarioLowerRate,
        col.housingPercentage,
        col.downPaymentPercentage
      )
      const rateSensitivity =
        Math.round((affordabilityLowerRate.maxPurchasePrice - affordability.maxPurchasePrice) / 1000) * 1000

      return { affordability, rateSensitivity }
    })
  }, [columns])

  const handleColumnChange = (index: number, updated: ColumnState) => {
    setColumns((prev) => {
      const next = [...prev]
      next[index] = updated
      return next
    })
  }

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
      {/* Page header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-foreground">Compare Scenarios</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Adjust inputs per scenario and see metrics update side by side.
        </p>
      </div>

      {/* Columns */}
      <div className="flex gap-6 overflow-x-auto pb-4">
        {columns.map((col, i) => (
          <ScenarioColumn
            key={col.scenarioId}
            column={col}
            affordability={columnResults[i].affordability}
            rateSensitivity={columnResults[i].rateSensitivity}
            onChange={(updated) => handleColumnChange(i, updated)}
          />
        ))}
      </div>
    </div>
  )
}
