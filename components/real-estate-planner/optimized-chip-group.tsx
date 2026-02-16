"use client"

import React, { useMemo } from "react"
import ChipItem from "./chip-item"
import type { Item, MortgageItem } from "@/lib/real-estate-types"

interface ChipGroupProps {
  items: (Item | MortgageItem)[]
  groupType: "default" | "radio" | "select" | "input" | "editableChips"
  categoryId: string
  panelType: "personal" | "mortgage" | "future"
  onToggle: (panel: "personal" | "mortgage" | "future", categoryId: string, itemId: string) => void
  onEdit: (panel: "personal" | "mortgage" | "future", categoryId: string, itemId: string) => void
}

// Memoized chip item to prevent unnecessary re-renders
const MemoizedChipItem = React.memo<{
  item: Item | MortgageItem
  isRadio: boolean
  isEditableChip: boolean
  categoryId: string
  onToggle: () => void
  onEdit: () => void
}>(({ item, isRadio, isEditableChip, categoryId, onToggle, onEdit }) => (
  <ChipItem
    item={item}
    isRadio={isRadio}
    isEditableChip={isEditableChip}
    onToggle={onToggle}
    onEdit={onEdit}
    categoryId={categoryId}
  />
))

MemoizedChipItem.displayName = "MemoizedChipItem"

const OptimizedChipGroup = React.memo<ChipGroupProps>(
  ({ items, groupType, categoryId, panelType, onToggle, onEdit }) => {
    // Memoize radio and editable chip flags
    const { isRadio, isEditableChip } = useMemo(
      () => ({
        isRadio: groupType === "radio" || groupType === "select",
        isEditableChip: groupType === "editableChips",
      }),
      [groupType],
    )

    // Memoize sorted items to prevent unnecessary sorting
    const sortedItems = useMemo(() => {
      return [...items].sort((a, b) => {
        // Sort active items first, then by label
        if (a.active !== b.active) {
          return a.active ? -1 : 1
        }
        return a.label.localeCompare(b.label)
      })
    }, [items])

    return (
      <div className="flex flex-wrap gap-2">
        {sortedItems.map((item) => (
          <MemoizedChipItem
            key={item.id}
            item={item}
            isRadio={isRadio}
            isEditableChip={isEditableChip}
            categoryId={categoryId}
            onToggle={() => onToggle(panelType, categoryId, item.id)}
            onEdit={() => onEdit(panelType, categoryId, item.id)}
          />
        ))}
      </div>
    )
  },
)

OptimizedChipGroup.displayName = "OptimizedChipGroup"

export default OptimizedChipGroup
