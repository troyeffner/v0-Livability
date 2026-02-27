"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import {
  Home,
  Users,
  TrendingUp,
  MapPin,
  Star,
  Briefcase,
  Plus,
  Pencil,
  Trash2,
  Save,
  Copy,
} from "lucide-react"
import type { Scenario } from "@/lib/property-types"

const SCENARIO_ICONS = [Home, Users, TrendingUp, MapPin, Star, Briefcase]

const formatCurrency = (n: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(n)

interface ScenarioSelectorProps {
  scenarios: Scenario[]
  activeScenarioId: string
  onScenarioChange: (scenarioId: string) => void
  onAddScenario: () => void
  onDeleteScenario: (scenarioId: string) => void
  onRenameScenario: (scenarioId: string, newName: string) => void
  onSaveScenario: () => void
  onSaveAsNewScenario: () => void
}

export default function ScenarioSelector({
  scenarios,
  activeScenarioId,
  onScenarioChange,
  onAddScenario,
  onDeleteScenario,
  onRenameScenario,
  onSaveScenario,
  onSaveAsNewScenario,
}: ScenarioSelectorProps) {
  const [isRenameModalOpen, setIsRenameModalOpen] = useState(false)
  const [renamingScenarioId, setRenamingScenarioId] = useState<string | null>(null)
  const [newScenarioName, setNewScenarioName] = useState("")

  const handleRenameClick = (scenario: Scenario) => {
    setRenamingScenarioId(scenario.id)
    setNewScenarioName(scenario.name)
    setIsRenameModalOpen(true)
  }

  const handleRenameSubmit = () => {
    if (renamingScenarioId && newScenarioName.trim()) {
      onRenameScenario(renamingScenarioId, newScenarioName.trim())
    }
    setIsRenameModalOpen(false)
    setRenamingScenarioId(null)
    setNewScenarioName("")
  }

  return (
    <div className="space-y-3">
      {/* Scenario Cards */}
      <div className="flex flex-wrap gap-3">
        {scenarios.map((scenario, idx) => {
          const isActive = scenario.id === activeScenarioId
          const Icon = SCENARIO_ICONS[idx % SCENARIO_ICONS.length]
          const fi = scenario.financialInputs

          return (
            <div
              key={scenario.id}
              className={`relative group rounded-lg border-2 p-3 min-w-[180px] transition-all ${
                isActive
                  ? "border-blue-400 bg-blue-50 cursor-default"
                  : "border-gray-200 bg-white hover:border-gray-300 cursor-pointer"
              }`}
              onClick={() => !isActive && onScenarioChange(scenario.id)}
            >
              {/* Header row */}
              <div className="flex items-center gap-2 mb-1 pr-12">
                <Icon size={14} className={isActive ? "text-blue-600" : "text-gray-400"} />
                <span
                  className={`font-semibold text-sm leading-tight ${
                    isActive ? "text-blue-900" : "text-gray-700"
                  }`}
                >
                  {scenario.name}
                </span>
                {isActive && (
                  <Badge className="ml-auto text-xs bg-blue-100 text-blue-700 border-0 h-4 px-1.5 font-medium">
                    active
                  </Badge>
                )}
              </div>

              {/* Metrics summary */}
              <p className="text-xs text-gray-400 leading-relaxed">
                {formatCurrency(fi.annualIncome)}/yr
                {fi.futureIncomeMonthly
                  ? ` + ${formatCurrency(fi.futureIncomeMonthly)}/mo`
                  : ""}
                {" · "}
                {formatCurrency(fi.downPaymentSources)} down
              </p>

              {/* Save actions — only on active card */}
              {isActive && (
                <div className="flex gap-1 mt-2 pt-2 border-t border-blue-200">
                  <Button
                    onClick={(e) => { e.stopPropagation(); onSaveScenario() }}
                    size="sm"
                    variant="ghost"
                    className="h-6 text-xs px-2 text-blue-700 hover:bg-blue-100"
                  >
                    <Save size={11} className="mr-1" />
                    Save
                  </Button>
                  <Button
                    onClick={(e) => { e.stopPropagation(); onSaveAsNewScenario() }}
                    size="sm"
                    variant="ghost"
                    className="h-6 text-xs px-2 text-gray-500 hover:bg-gray-100"
                  >
                    <Copy size={11} className="mr-1" />
                    Duplicate
                  </Button>
                </div>
              )}

              {/* Hover actions (pencil + trash) */}
              <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0 hover:bg-blue-100"
                  onClick={(e) => { e.stopPropagation(); handleRenameClick(scenario) }}
                  title="Rename scenario"
                >
                  <Pencil size={11} />
                </Button>
                {scenarios.length > 1 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0 hover:bg-red-100 text-red-500"
                    onClick={(e) => { e.stopPropagation(); onDeleteScenario(scenario.id) }}
                    title="Delete scenario"
                  >
                    <Trash2 size={11} />
                  </Button>
                )}
              </div>
            </div>
          )
        })}

        {/* Add New Scenario */}
        <button
          onClick={onAddScenario}
          className="flex items-center gap-2 rounded-lg border-2 border-dashed border-gray-200 bg-transparent px-4 py-3 text-sm text-gray-400 hover:border-gray-300 hover:text-gray-500 transition-colors min-w-[120px] justify-center"
        >
          <Plus size={14} />
          Add Scenario
        </button>
      </div>

      {/* Rename Modal */}
      <Dialog open={isRenameModalOpen} onOpenChange={setIsRenameModalOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Rename Scenario</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <label htmlFor="scenario-name" className="text-right text-sm font-medium">
                Name
              </label>
              <Input
                id="scenario-name"
                value={newScenarioName}
                onChange={(e) => setNewScenarioName(e.target.value)}
                className="col-span-3"
                onKeyPress={(e) => e.key === "Enter" && handleRenameSubmit()}
                autoFocus
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsRenameModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleRenameSubmit} disabled={!newScenarioName.trim()}>
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
