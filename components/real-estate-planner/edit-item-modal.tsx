"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import type { FinancialItem } from "@/lib/real-estate-types"

interface EditItemModalProps {
  isOpen: boolean
  onClose: () => void
  item: FinancialItem | null
  onSave: (item: FinancialItem) => void
  isNew?: boolean
}

export default function EditItemModal({ isOpen, onClose, item, onSave, isNew = false }: EditItemModalProps) {
  const [label, setLabel] = useState(item?.label || "")
  const [amount, setAmount] = useState(item?.amount || 0)
  const [frequency, setFrequency] = useState<"monthly" | "annual">(item?.frequency || "monthly")

  const handleSave = () => {
    if (!label.trim() || amount <= 0) return

    const updatedItem: FinancialItem = {
      id: item?.id || `new-${Date.now()}`,
      label: label.trim(),
      amount,
      frequency,
      active: item?.active ?? true,
    }

    onSave(updatedItem)
    onClose()
  }

  const handleClose = () => {
    setLabel(item?.label || "")
    setAmount(item?.amount || 0)
    setFrequency(item?.frequency || "monthly")
    onClose()
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{isNew ? "Add New Item" : "Edit Item"}</DialogTitle>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="label" className="text-right">
              Name
            </Label>
            <Input
              id="label"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              className="col-span-3"
              placeholder="Enter item name"
            />
          </div>

          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="amount" className="text-right">
              Amount
            </Label>
            <Input
              id="amount"
              type="number"
              value={amount}
              onChange={(e) => setAmount(Number(e.target.value))}
              className="col-span-3"
              placeholder="0"
              min="0"
            />
          </div>

          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="frequency" className="text-right">
              Frequency
            </Label>
            <Select value={frequency} onValueChange={(value: "monthly" | "annual") => setFrequency(value)}>
              <SelectTrigger className="col-span-3">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="monthly">Monthly</SelectItem>
                <SelectItem value="annual">Annual</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={!label.trim() || amount <= 0}>
            {isNew ? "Add Item" : "Save Changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
