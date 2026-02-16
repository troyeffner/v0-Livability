"use client"

import type React from "react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Pencil, Check, X } from "lucide-react"
import type { Item } from "@/lib/real-estate-types"

interface ChipItemProps {
  item: Item
  categoryId: string
  panelType: "personal" | "mortgage" | "future"
  isRadioType?: boolean
  onToggle: (panel: "personal" | "mortgage" | "future", categoryId: string, itemId: string) => void
  onEdit: (panel: "personal" | "mortgage" | "future", categoryId: string, itemId: string) => void
}

export default function ChipItem({
  item,
  categoryId,
  panelType,
  isRadioType = false,
  onToggle,
  onEdit,
}: ChipItemProps) {
  const formatAmount = (amount: number, frequency?: string) => {
    if (amount === 0) return ""
    const formatted = `$${Math.abs(amount).toLocaleString()}`
    if (frequency === "monthly") return `${formatted}/mo`
    if (frequency === "annual") return `${formatted}/yr`
    return formatted
  }

  const getChipVariant = () => {
    if (isRadioType) {
      return item.active ? "default" : "outline"
    }
    return item.active ? "default" : "secondary"
  }

  const getChipColor = () => {
    if (!item.active) return "opacity-60"

    switch (panelType) {
      case "personal":
        return "bg-green-100 text-green-800 border-green-300"
      case "mortgage":
        return "bg-blue-100 text-blue-800 border-blue-300"
      case "future":
        return "bg-purple-100 text-purple-800 border-purple-300"
      default:
        return ""
    }
  }

  const handleClick = () => {
    onToggle(panelType, categoryId, item.id)
  }

  const handleEdit = (e: React.MouseEvent) => {
    e.stopPropagation()
    onEdit(panelType, categoryId, item.id)
  }

  return (
    <div className="relative group">
      <Badge
        variant={getChipVariant()}
        className={`cursor-pointer transition-all hover:scale-105 ${getChipColor()} ${item.active ? "shadow-sm" : ""}`}
        onClick={handleClick}
      >
        <div className="flex items-center gap-2">
          {isRadioType ? (
            <div className={`w-2 h-2 rounded-full ${item.active ? "bg-current" : "border border-current"}`} />
          ) : (
            <div className="flex items-center">
              {item.active ? (
                <Check size={12} className="text-current" />
              ) : (
                <X size={12} className="text-current opacity-50" />
              )}
            </div>
          )}

          <span className="font-medium">{item.label}</span>

          {item.amount !== undefined && item.amount > 0 && (
            <span className="text-xs opacity-75">{formatAmount(item.amount, item.frequency)}</span>
          )}
        </div>
      </Badge>

      {/* Edit Button - Shows on hover */}
      {item.editable && (
        <Button
          variant="ghost"
          size="sm"
          className="absolute -top-1 -right-1 h-5 w-5 p-0 opacity-0 group-hover:opacity-100 transition-opacity bg-white border border-gray-300 shadow-sm"
          onClick={handleEdit}
        >
          <Pencil size={10} />
        </Button>
      )}
    </div>
  )
}
