"use client"

import { Home, Minus, Plus } from "lucide-react"
import {
  formatCurrency,
  estimateInterestRate,
  CREDIT_TIERS,
} from "@/lib/affordability-calculations"
import type { AffordabilityCalculation } from "@/lib/property-types"
import type { ColumnState } from "./scenario-comparison-page"

interface ScenarioColumnProps {
  column: ColumnState
  affordability: AffordabilityCalculation
  rateSensitivity: number
  onChange: (updated: ColumnState) => void
}

// ─── Helpers ────────────────────────────────────────────────

const LOAN_TERMS = [15, 20, 30] as const
const DP_OPTIONS = [10, 15, 20, 25] as const

function RadioCircle({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <div
      onClick={onClick}
      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs cursor-pointer transition-all ${
        active
          ? "border-primary bg-primary/5 text-primary font-medium"
          : "border-border text-muted-foreground hover:border-primary/40"
      }`}
    >
      <div
        className={`w-3 h-3 rounded-full border-2 flex items-center justify-center ${
          active ? "border-primary" : "border-muted-foreground/40"
        }`}
      >
        {active && <div className="w-1.5 h-1.5 rounded-full bg-primary" />}
      </div>
      {children}
    </div>
  )
}

// ─── Component ──────────────────────────────────────────────

export default function ScenarioColumn({
  column,
  affordability,
  rateSensitivity,
  onChange,
}: ScenarioColumnProps) {
  const { financialInputs, housingPercentage, downPaymentPercentage } = column
  const currentRate = financialInputs.interestRate ?? 6.85
  const currentCreditScore = financialInputs.creditScore ?? 699
  const currentLoanTerm = financialInputs.loanTerm ?? 30
  const marketRate = financialInputs.marketReferenceRate ?? 6.85

  const activeTier =
    CREDIT_TIERS.slice()
      .reverse()
      .find((t) => currentCreditScore >= t.score) ?? CREDIT_TIERS[3]

  // Derived metrics
  const grossMonthly = financialInputs.annualIncome / 12
  const takeHome = affordability.takeHomeIncome
  const fixedDebts = financialInputs.fixedDebts ?? 0
  const availableIncome = Math.max(0, takeHome - fixedDebts)
  const frontEndDTI =
    grossMonthly > 0
      ? Math.round((affordability.actualMonthlyPayment / grossMonthly) * 100)
      : 0
  const backEndDTI =
    grossMonthly > 0
      ? Math.round(
          ((affordability.actualMonthlyPayment + fixedDebts) / grossMonthly) *
            100
        )
      : 0

  // ── Updaters ──────────────────────────────────────────────

  const update = (patch: Partial<ColumnState>) => {
    onChange({ ...column, ...patch })
  }

  const updateInputs = (
    patch: Partial<typeof financialInputs>,
    recalcRate = false,
    newDpPct?: number,
    newTerm?: number
  ) => {
    const nextInputs = { ...financialInputs, ...patch }
    if (recalcRate) {
      const cs = patch.creditScore ?? currentCreditScore
      const lt = newTerm ?? currentLoanTerm
      const dp = newDpPct ?? downPaymentPercentage
      const mr = nextInputs.marketReferenceRate ?? marketRate
      nextInputs.interestRate = estimateInterestRate(cs, lt, dp, mr)
    }
    const nextCol: ColumnState = {
      ...column,
      financialInputs: nextInputs,
      ...(newDpPct !== undefined ? { downPaymentPercentage: newDpPct } : {}),
    }
    onChange(nextCol)
  }

  // ── Render ────────────────────────────────────────────────

  return (
    <div className="min-w-[340px] flex-1 rounded-xl border border-border bg-card shadow-sm">
      {/* Header */}
      <div className="px-5 py-4 border-b border-border">
        <div className="flex items-center gap-2">
          <Home size={16} className="text-primary" />
          <h2 className="text-lg font-bold text-foreground">{column.name}</h2>
        </div>
        {column.description && (
          <p className="text-xs text-muted-foreground mt-0.5">
            {column.description}
          </p>
        )}
      </div>

      {/* Metrics Table */}
      <div className="px-5 py-4 space-y-0">
        {/* Purchase Roof — hero metric */}
        <div className="flex justify-between items-baseline py-2">
          <span className="text-sm font-semibold text-foreground">
            Purchase Roof
          </span>
          <span className="text-xl font-bold text-foreground tracking-tight">
            {formatCurrency(affordability.maxPurchasePrice)}
          </span>
        </div>

        <div className="border-t border-border/50" />

        <MetricRow label="Housing %" value={`${housingPercentage}%`} warn={housingPercentage > 35} />
        <MetricRow
          label="Payment Ceiling"
          value={`${formatCurrency(affordability.maxMonthlyPayment)}/mo`}
        />
        <MetricRow
          label="Available Income"
          value={`${formatCurrency(availableIncome)}/mo`}
        />
        <MetricRow
          label="DTI (front / back)"
          value={`${frontEndDTI}% / ${backEndDTI}%`}
          warn={backEndDTI > 40}
        />
        <MetricRow
          label="Down Payment"
          value={formatCurrency(affordability.availableDownPayment)}
        />
        <MetricRow
          label="Interest Rate"
          value={`${currentRate.toFixed(2)}%`}
        />
        <MetricRow
          label="Monthly Margin"
          value={`${formatCurrency(affordability.monthlyMargin)}/mo`}
          warn={affordability.monthlyMargin < 0}
        />
        {rateSensitivity > 0 && affordability.bindingConstraint !== "cash" && (
          <MetricRow
            label="Rate Sensitivity"
            value={`+${formatCurrency(rateSensitivity)} / 1%`}
            subtle
          />
        )}
        <MetricRow
          label="Binding Constraint"
          value={
            affordability.bindingConstraint === "dti"
              ? "DTI"
              : affordability.bindingConstraint === "budget"
              ? "Budget"
              : "Cash"
          }
          subtle
        />
      </div>

      {/* Divider */}
      <div className="border-t border-border" />

      {/* Wiggle Controls */}
      <div className="px-5 py-4 space-y-4">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
          Adjust
        </p>

        {/* Housing % Slider */}
        <div className="space-y-1.5">
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Housing %</span>
            <span className="font-medium text-foreground">{housingPercentage}%</span>
          </div>
          <input
            type="range"
            min={20}
            max={50}
            step={1}
            value={housingPercentage}
            onChange={(e) =>
              update({ housingPercentage: parseInt(e.target.value) })
            }
            className="w-full h-1.5 rounded-full appearance-none bg-border accent-primary cursor-pointer"
          />
          <div className="flex justify-between text-[10px] text-muted-foreground/60">
            <span>20%</span>
            <span>50%</span>
          </div>
        </div>

        {/* Down Payment % */}
        <div className="space-y-1.5">
          <p className="text-xs text-muted-foreground">Down Payment %</p>
          <div className="flex flex-wrap gap-1.5">
            {DP_OPTIONS.map((dp) => (
              <RadioCircle
                key={dp}
                active={downPaymentPercentage === dp}
                onClick={() =>
                  updateInputs({}, true, dp)
                }
              >
                {dp}%
              </RadioCircle>
            ))}
          </div>
        </div>

        {/* Credit Score */}
        <div className="space-y-1.5">
          <p className="text-xs text-muted-foreground">Credit Score</p>
          <div className="flex flex-wrap gap-1.5">
            {CREDIT_TIERS.map((tier) => (
              <RadioCircle
                key={tier.score}
                active={activeTier.score === tier.score}
                onClick={() =>
                  updateInputs({ creditScore: tier.score }, true)
                }
              >
                <span>{tier.label}</span>
                <span className="text-[10px] text-muted-foreground/60">
                  {tier.range}
                </span>
              </RadioCircle>
            ))}
          </div>
        </div>

        {/* Loan Term */}
        <div className="space-y-1.5">
          <p className="text-xs text-muted-foreground">Loan Term</p>
          <div className="flex flex-wrap gap-1.5">
            {LOAN_TERMS.map((term) => (
              <RadioCircle
                key={term}
                active={currentLoanTerm === term}
                onClick={() =>
                  updateInputs({ loanTerm: term }, true, undefined, term)
                }
              >
                {term} Year Term
              </RadioCircle>
            ))}
          </div>
        </div>

        {/* Interest Rate Stepper */}
        <div className="space-y-1.5">
          <p className="text-xs text-muted-foreground">Interest Rate</p>
          <div className="flex items-center gap-2">
            <button
              onClick={() =>
                updateInputs({
                  interestRate: Math.max(0.5, currentRate - 0.25),
                })
              }
              className="w-7 h-7 rounded-md border border-border flex items-center justify-center hover:bg-muted transition-colors"
            >
              <Minus size={12} />
            </button>
            <div className="flex items-center gap-1">
              <input
                type="number"
                step={0.125}
                min={0.5}
                max={15}
                value={currentRate.toFixed(2)}
                onChange={(e) => {
                  const v = parseFloat(e.target.value)
                  if (!isNaN(v) && v >= 0.5 && v <= 15) {
                    updateInputs({ interestRate: v })
                  }
                }}
                className="w-16 text-center text-sm font-medium border border-border rounded-md py-1 bg-background"
              />
              <span className="text-xs text-muted-foreground">% APR</span>
            </div>
            <button
              onClick={() =>
                updateInputs({
                  interestRate: Math.min(15, currentRate + 0.25),
                })
              }
              className="w-7 h-7 rounded-md border border-border flex items-center justify-center hover:bg-muted transition-colors"
            >
              <Plus size={12} />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Metric Row ─────────────────────────────────────────────

function MetricRow({
  label,
  value,
  warn,
  subtle,
}: {
  label: string
  value: string
  warn?: boolean
  subtle?: boolean
}) {
  return (
    <div className="flex justify-between items-center py-1.5">
      <span
        className={`text-xs ${
          subtle ? "text-muted-foreground/60" : "text-muted-foreground"
        }`}
      >
        {label}
      </span>
      <span
        className={`text-sm font-medium ${
          warn
            ? "text-amber-600"
            : subtle
            ? "text-muted-foreground/60"
            : "text-foreground"
        }`}
      >
        {value}
        {warn && " \u26a0"}
      </span>
    </div>
  )
}
