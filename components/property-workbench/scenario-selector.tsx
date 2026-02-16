"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Users, TrendingUp, User, Plus, Pencil, Trash2, Save, Copy } from "lucide-react"
import type { Scenario } from "@/lib/property-types"

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

  const getScenarioIcon = (scenarioId: string) => {
    switch (scenarioId) {
      case "current":
        return <User size={16} />
      case "with-roommate":
        return <Users size={16} />
      case "after-promotion":
        return <TrendingUp size={16} />
      default:
        return <User size={16} />
    }
  }

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

  const activeScenario = scenarios.find((s) => s.id === activeScenarioId)

  return (
    <div className="space-y-4">
      {/* Active Scenario Display with Actions */}
      <div className="flex items-center justify-between p-4 bg-blue-50 rounded-lg">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            {getScenarioIcon(activeScenarioId)}
            <h2 className="font-semibold text-lg text-blue-900">{activeScenario?.name || "Current Scenario"}</h2>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={onSaveScenario} size="sm" className="flex items-center gap-1">
            <Save size={14} />
            Save
          </Button>
          <Button
            onClick={onSaveAsNewScenario}
            variant="outline"
            size="sm"
            className="flex items-center gap-1 bg-transparent"
          >
            <Copy size={14} />
            Save as New
          </Button>
        </div>
      </div>

      {/* Scenario Selection */}
      <div className="flex items-center gap-3">
        <span className="text-sm font-medium text-gray-700">Switch to:</span>
        <div className="flex gap-2 flex-wrap">
          {scenarios.map((scenario) => (
            <div key={scenario.id} className="flex items-center gap-1 group">
              <Button
                variant={activeScenarioId === scenario.id ? "default" : "outline"}
                size="sm"
                onClick={() => onScenarioChange(scenario.id)}
                className="flex items-center gap-2 pr-2"
                disabled={activeScenarioId === scenario.id}
              >
                {getScenarioIcon(scenario.id)}
                {scenario.name}
              </Button>

              {/* Pencil and Trash Icons */}
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0 hover:bg-blue-100"
                  onClick={() => handleRenameClick(scenario)}
                  title="Rename scenario"
                >
                  <Pencil size={12} />
                </Button>
                {scenarios.length > 1 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0 hover:bg-red-100 text-red-600"
                    onClick={() => onDeleteScenario(scenario.id)}
                    title="Delete scenario"
                  >
                    <Trash2 size={12} />
                  </Button>
                )}
              </div>
            </div>
          ))}

          {/* Add New Scenario Button */}
          <Button
            onClick={onAddScenario}
            variant="outline"
            size="sm"
            className="flex items-center gap-2 border-dashed bg-transparent"
          >
            <Plus size={16} />
            Add Scenario
          </Button>
        </div>
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
