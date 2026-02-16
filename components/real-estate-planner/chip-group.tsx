"use client"

import ChipItem from "./chip-item"
import type { ItemCategory, FinancialItem, MortgageOptionGroup } from "@/lib/real-estate-types"

interface ChipGroupProps {
  category: ItemCategory<FinancialItem> | MortgageOptionGroup
  panelType: "personal" | "mortgage" | "future"
  onToggle: (panel: "personal" | "mortgage" | "future", categoryId: string, itemId: string) => void
  onEdit: (panel: "personal" | "mortgage" | "future", categoryId: string, itemId: string) => void
}

export default function ChipGroup({ category, panelType, onToggle, onEdit }: ChipGroupProps) {
  const isRadioType =
    (category as MortgageOptionGroup).type === "radio" || (category as MortgageOptionGroup).type === "select"

  return (
    <div className="flex flex-wrap gap-2">
      {category.items.map((item) => (
        <ChipItem
          key={item.id}
          item={item}
          categoryId={category.id}
          panelType={panelType}
          isRadioType={isRadioType}
          onToggle={onToggle}
          onEdit={onEdit}
        />
      ))}
    </div>
  )
}
