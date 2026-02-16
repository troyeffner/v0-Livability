"use client"

import React, { useState, useMemo, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { ChevronDown, ChevronUp, Plus, DollarSign, TrendingUp, TrendingDown, Home, Calendar } from "lucide-react"
import ChipGroup from "./chip-group"
import type { ItemCategory, FinancialItem, MortgageOptionGroup } from "@/lib/real-estate-types"
import { getTodaysMortgageRate } from "@/lib/real-estate-data"

interface FinancialPanelProps {
  title: string
  categories: ItemCategory<FinancialItem>[] | MortgageOptionGroup[]
  panelType: "personal" | "mortgage" | "future"
  onToggle: (panel: "personal" | "mortgage" | "future", categoryId: string, itemId: string) => void
  onEdit: (panel: "personal" | "mortgage" | "future", categoryId: string, itemId: string) => void
  onAddItem: (panel: "personal" | "future" | "mortgage", categoryId: string) => void
  onPersonalInputChange?: (groupId: string, itemId: string, value: number) => void
  onMortgageInputChange?: (groupId: string, itemId: string, value: number) => void
  monthlyTakeHomeIncome?: number
  remainingLifestyleBudget?: number
  livabilityPurchasePrice?: number
}

// Memoized category component to prevent unnecessary re-renders
const CategoryItem = React.memo<{
  category: ItemCategory<FinancialItem> | MortgageOptionGroup
  panelType: "personal" | "mortgage" | "future"
  isExpanded: boolean
  onToggleExpanded: () => void
  onToggle: (panel: "personal" | "mortgage" | "future", categoryId: string, itemId: string) => void
  onEdit: (panel: "personal" | "mortgage" | "future", categoryId: string, itemId: string) => void
  onAddItem: (panel: "personal" | "future" | "mortgage", categoryId: string) => void
  onInputChange?: (groupId: string, itemId: string, value: number) => void
}>(({ category, panelType, isExpanded, onToggleExpanded, onToggle, onEdit, onAddItem, onInputChange }) => {
  const isInputType = (category as MortgageOptionGroup).type === "input"

  // Memoize active items count to prevent recalculation
  const activeItemsCount = useMemo(() => {
    return category.items.filter((item) => item.active).length
  }, [category.items])

  // Memoize input change handler
  const handleInputChange = useCallback(
    (itemId: string, value: string) => {
      const numValue = Number.parseFloat(value) || 0
      onInputChange?.(category.id, itemId, numValue)
    },
    [category.id, onInputChange],
  )

  return (
    <div className="border border-gray-200 rounded-md p-3 bg-gray-50/50 relative space-y-2">
      <Collapsible open={isExpanded} onOpenChange={onToggleExpanded}>
        <CollapsibleTrigger asChild>
          <Button variant="ghost" className="w-full justify-between p-2 h-auto hover:bg-gray-50">
            <span className="font-medium text-left">{category.name}</span>
            <div className="flex items-center gap-2">
              {category.items.length > 0 && (
                <Badge variant="secondary" className="text-xs">
                  {activeItemsCount}/{category.items.length}
                </Badge>
              )}
              {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </div>
          </Button>
        </CollapsibleTrigger>

        <CollapsibleContent className="space-y-2">
          {isInputType ? (
            <div className="p-3 bg-gray-50 rounded-lg">
              {category.items.map((item) => (
                <div key={item.id} className="flex items-center gap-3">
                  <label className="text-sm font-medium flex-1">{item.label}</label>
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      value={item.amount || 0}
                      onChange={(e) => handleInputChange(item.id, e.target.value)}
                      className="w-20 h-8 text-center"
                      min="0"
                      max="50"
                    />
                    <span className="text-sm text-gray-500">%</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <ChipGroup
              items={category.items}
              groupType={(category as MortgageOptionGroup).type || "default"}
              categoryId={category.id}
              panelType={panelType}
              onToggle={onToggle}
              onEdit={onEdit}
            />
          )}

          <Button
            variant="outline"
            size="sm"
            onClick={() => onAddItem(panelType, category.id)}
            className="w-full mt-2 border-dashed"
          >
            <Plus size={14} className="mr-1" />
            Add {category.name.slice(0, -1)}
          </Button>
        </CollapsibleContent>
      </Collapsible>
    </div>
  )
})

CategoryItem.displayName = "CategoryItem"

// Main component with performance optimizations
const OptimizedFinancialPanel = React.memo<FinancialPanelProps>(
  ({
    title,
    categories,
    panelType,
    onToggle,
    onEdit,
    onAddItem,
    onPersonalInputChange,
    onMortgageInputChange,
    monthlyTakeHomeIncome,
    remainingLifestyleBudget,
    livabilityPurchasePrice,
  }) => {
    const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set())

    // Memoize today's rate to prevent unnecessary API calls
    const todaysRate = useMemo(() => getTodaysMortgageRate(), [])

    // Memoize category toggle handler
    const toggleCategory = useCallback((categoryId: string) => {
      setExpandedCategories((prev) => {
        const newExpanded = new Set(prev)
        if (newExpanded.has(categoryId)) {
          newExpanded.delete(categoryId)
        } else {
          newExpanded.add(categoryId)
        }
        return newExpanded
      })
    }, [])

    // Memoize panel styling
    const panelStyles = useMemo(() => {
      const styles = {
        icon: <DollarSign size={18} />,
        color: "border-gray-200",
      }

      switch (panelType) {
        case "personal":
          styles.icon = <DollarSign size={18} className="text-green-600" />
          styles.color = "border-green-200"
          break
        case "mortgage":
          styles.icon = <Home size={18} className="text-blue-600" />
          styles.color = "border-blue-200"
          break
        case "future":
          styles.icon = <Calendar size={18} className="text-purple-600" />
          styles.color = "border-purple-200"
          break
      }

      return styles
    }, [panelType])

    // Memoize summary badges to prevent unnecessary recalculations
    const summaryBadges = useMemo(() => {
      if (panelType === "personal" && monthlyTakeHomeIncome && remainingLifestyleBudget !== undefined) {
        return (
          <div className="flex flex-wrap gap-2">
            <Badge variant="outline" className="text-green-600 bg-green-50">
              <TrendingUp size={12} className="mr-1" />${monthlyTakeHomeIncome.toLocaleString()}/mo take-home
            </Badge>
            <Badge
              variant="outline"
              className={remainingLifestyleBudget >= 0 ? "text-blue-600 bg-blue-50" : "text-red-600 bg-red-50"}
            >
              {remainingLifestyleBudget >= 0 ? (
                <TrendingUp size={12} className="mr-1" />
              ) : (
                <TrendingDown size={12} className="mr-1" />
              )}
              ${Math.abs(remainingLifestyleBudget).toLocaleString()} remaining
            </Badge>
          </div>
        )
      }

      if (panelType === "mortgage" && livabilityPurchasePrice) {
        return (
          <Badge variant="outline" className="text-blue-600 bg-blue-50">
            <Home size={12} className="mr-1" />${livabilityPurchasePrice.toLocaleString()} max price
          </Badge>
        )
      }

      return null
    }, [panelType, monthlyTakeHomeIncome, remainingLifestyleBudget, livabilityPurchasePrice])

    // Memoize input change handler selection
    const inputChangeHandler = useMemo(() => {
      return panelType === "mortgage" ? onMortgageInputChange : onPersonalInputChange
    }, [panelType, onMortgageInputChange, onPersonalInputChange])

    return (
      <Card className={`${panelStyles.color} flex flex-col border border-gray-300 bg-white h-full`}>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              {panelStyles.icon}
              {title}
            </span>
          </CardTitle>
          {summaryBadges}
        </CardHeader>
        <CardContent className="p-3 space-y-4 overflow-y-auto flex-grow">
          {categories.map((category) => (
            <CategoryItem
              key={category.id}
              category={category}
              panelType={panelType}
              isExpanded={expandedCategories.has(category.id)}
              onToggleExpanded={() => toggleCategory(category.id)}
              onToggle={onToggle}
              onEdit={onEdit}
              onAddItem={onAddItem}
              onInputChange={inputChangeHandler}
            />
          ))}
        </CardContent>
      </Card>
    )
  },
)

OptimizedFinancialPanel.displayName = "OptimizedFinancialPanel"

export default OptimizedFinancialPanel
