"use client"

import { useState, useMemo } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { DollarSign, TrendingDown } from "lucide-react"
import type { FinancialItem } from "@/lib/real-estate-types"
import { DEFAULTS } from "@/lib/finance-core"

interface EditItemModalProps {
  isOpen: boolean
  onClose: () => void
  item: FinancialItem | null
  onSave: (item: FinancialItem) => void
  onDelete?: (item: FinancialItem) => void
  isNew?: boolean
  categoryId?: string
}

export default function EditItemModal({ isOpen, onClose, item, onSave, isNew = false }: EditItemModalProps) {
  const isIncome = item?.itemType === "income"

  // Base fields
  const [label, setLabel] = useState(item?.label || "")
  const [amount, setAmount] = useState(item?.amount || 0)
  const [frequency, setFrequency] = useState<"monthly" | "annual">(
    item?.frequency === "annual" ? "annual" : "monthly",
  )

  // Income-specific fields
  const [incomeEntry, setIncomeEntry] = useState<"gross" | "net">(item?.incomeEntry ?? "gross")
  const [withholdingTaxPct, setWithholdingTaxPct] = useState(
    item?.withholdingTaxPct ?? DEFAULTS.withholdingTaxPct,
  )
  const [withholding401kPct, setWithholding401kPct] = useState(
    item?.withholding401kPct ?? DEFAULTS.withholding401kPct,
  )
  const [withholdingHealthcarePct, setWithholdingHealthcarePct] = useState(
    item?.withholdingHealthcarePct ?? DEFAULTS.withholdingHealthcarePct,
  )
  const [withholdingHSAPct, setWithholdingHSAPct] = useState(item?.withholdingHSAPct ?? 0)
  const [withholdingOtherPct, setWithholdingOtherPct] = useState(item?.withholdingOtherPct ?? 0)

  // Live take-home preview for income items
  const estimatedMonthlyTakeHome = useMemo(() => {
    if (!isIncome || amount <= 0) return 0
    const annualAmount = frequency === "monthly" ? amount * 12 : amount
    if (incomeEntry === "net") {
      return frequency === "monthly" ? amount : Math.round(amount / 12)
    }
    const totalPct =
      withholdingTaxPct +
      withholding401kPct +
      withholdingHealthcarePct +
      withholdingHSAPct +
      withholdingOtherPct
    return Math.round((annualAmount * (1 - totalPct / 100)) / 12)
  }, [
    isIncome,
    amount,
    frequency,
    incomeEntry,
    withholdingTaxPct,
    withholding401kPct,
    withholdingHealthcarePct,
    withholdingHSAPct,
    withholdingOtherPct,
  ])

  const totalWithholdingPct = withholdingTaxPct + withholding401kPct + withholdingHealthcarePct + withholdingHSAPct + withholdingOtherPct

  const handleSave = () => {
    if (!label.trim() || amount <= 0) return

    const updatedItem: FinancialItem = {
      ...item,
      id: item?.id || `new-${Date.now()}`,
      label: label.trim(),
      amount,
      frequency,
      active: item?.active ?? true,
      itemType: item?.itemType ?? "expense",
      editable: item?.editable ?? true,
      ...(isIncome && {
        incomeEntry,
        withholdingTaxPct:        incomeEntry === "gross" ? withholdingTaxPct : undefined,
        withholding401kPct:       incomeEntry === "gross" ? withholding401kPct : undefined,
        withholdingHealthcarePct: incomeEntry === "gross" ? withholdingHealthcarePct : undefined,
        withholdingHSAPct:        incomeEntry === "gross" ? withholdingHSAPct : undefined,
        withholdingOtherPct:      incomeEntry === "gross" ? withholdingOtherPct : undefined,
      }),
    }

    onSave(updatedItem)
    onClose()
  }

  const handleClose = () => {
    // Reset all state to item values
    setLabel(item?.label || "")
    setAmount(item?.amount || 0)
    setFrequency(item?.frequency === "annual" ? "annual" : "monthly")
    setIncomeEntry(item?.incomeEntry ?? "gross")
    setWithholdingTaxPct(item?.withholdingTaxPct ?? DEFAULTS.withholdingTaxPct)
    setWithholding401kPct(item?.withholding401kPct ?? DEFAULTS.withholding401kPct)
    setWithholdingHealthcarePct(item?.withholdingHealthcarePct ?? DEFAULTS.withholdingHealthcarePct)
    setWithholdingHSAPct(item?.withholdingHSAPct ?? 0)
    setWithholdingOtherPct(item?.withholdingOtherPct ?? 0)
    onClose()
  }

  const pctInput = (value: number, onChange: (v: number) => void) => (
    <div className="flex items-center gap-1">
      <Input
        type="number"
        value={value}
        onChange={(e) => onChange(Math.max(0, Math.min(100, Number(e.target.value))))}
        className="w-16 text-right tabular-nums"
        min={0}
        max={100}
        step={1}
      />
      <span className="text-sm text-muted-foreground">%</span>
    </div>
  )

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className={isIncome ? "sm:max-w-[500px]" : "sm:max-w-[425px]"}>
        <DialogHeader>
          <DialogTitle>
            {isNew
              ? isIncome ? "Add Income Source" : "Add New Item"
              : isIncome ? "Edit Income Source" : "Edit Item"}
          </DialogTitle>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          {/* Name */}
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="label" className="text-right">
              Name
            </Label>
            <Input
              id="label"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              className="col-span-3"
              placeholder={isIncome ? "e.g. Dale's Salary" : "Enter item name"}
            />
          </div>

          {/* Amount + Frequency */}
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="amount" className="text-right">
              Amount
            </Label>
            <div className="col-span-3 flex gap-2">
              <div className="relative flex-1">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">$</span>
                <Input
                  id="amount"
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(Number(e.target.value))}
                  className="pl-6"
                  placeholder="0"
                  min="0"
                />
              </div>
              <Select value={frequency} onValueChange={(value: "monthly" | "annual") => setFrequency(value)}>
                <SelectTrigger className="w-28">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="monthly">Monthly</SelectItem>
                  <SelectItem value="annual">Annual</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Income-specific section */}
          {isIncome && (
            <>
              {/* Divider */}
              <div className="border-t pt-3">
                <p className="text-sm font-medium text-muted-foreground mb-3">How is this amount entered?</p>
                <div className="flex flex-col gap-2">
                  <label className="flex items-start gap-3 cursor-pointer group">
                    <input
                      type="radio"
                      name="incomeEntry"
                      value="gross"
                      checked={incomeEntry === "gross"}
                      onChange={() => setIncomeEntry("gross")}
                      className="mt-0.5 accent-blue-600"
                    />
                    <div>
                      <span className="text-sm font-medium">Gross income</span>
                      <p className="text-xs text-muted-foreground">Before taxes, 401k, and other paycheck deductions</p>
                    </div>
                  </label>
                  <label className="flex items-start gap-3 cursor-pointer group">
                    <input
                      type="radio"
                      name="incomeEntry"
                      value="net"
                      checked={incomeEntry === "net"}
                      onChange={() => setIncomeEntry("net")}
                      className="mt-0.5 accent-blue-600"
                    />
                    <div>
                      <span className="text-sm font-medium">Net take-home</span>
                      <p className="text-xs text-muted-foreground">Already after all deductions — what hits your bank account</p>
                    </div>
                  </label>
                </div>
              </div>

              {/* Withholding breakdown — only when gross */}
              {incomeEntry === "gross" && (
                <div className="border rounded-lg p-3 bg-muted/30 space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium">Paycheck Withholding</p>
                    <span className="text-xs text-muted-foreground">{totalWithholdingPct}% total deducted</span>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <p className="text-sm">Federal &amp; State Taxes</p>
                      </div>
                      {pctInput(withholdingTaxPct, setWithholdingTaxPct)}
                    </div>
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <p className="text-sm">401(k) / Retirement</p>
                      </div>
                      {pctInput(withholding401kPct, setWithholding401kPct)}
                    </div>
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <p className="text-sm">Health Insurance</p>
                      </div>
                      {pctInput(withholdingHealthcarePct, setWithholdingHealthcarePct)}
                    </div>
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <p className="text-sm">HSA Contribution</p>
                      </div>
                      {pctInput(withholdingHSAPct, setWithholdingHSAPct)}
                    </div>
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <p className="text-sm">Other</p>
                      </div>
                      {pctInput(withholdingOtherPct, setWithholdingOtherPct)}
                    </div>
                  </div>
                </div>
              )}

              {/* Take-home preview */}
              {amount > 0 && (
                <div className="flex items-center justify-between rounded-md bg-green-50 border border-green-200 px-4 py-2.5">
                  <div className="flex items-center gap-2 text-green-700">
                    <DollarSign size={15} />
                    <span className="text-sm font-medium">Estimated monthly take-home</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-base font-semibold text-green-700">
                      ${estimatedMonthlyTakeHome.toLocaleString()}/mo
                    </span>
                    {incomeEntry === "gross" && totalWithholdingPct > 0 && (
                      <span className="text-xs text-muted-foreground flex items-center gap-0.5">
                        <TrendingDown size={11} />
                        {totalWithholdingPct}% withheld
                      </span>
                    )}
                  </div>
                </div>
              )}
            </>
          )}
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
