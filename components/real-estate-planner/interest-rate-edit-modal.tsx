"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Slider } from "@/components/ui/slider"

interface InterestRateEditModalProps {
  isOpen: boolean
  onClose: () => void
  currentRate: number
  onSave: (rate: number) => void
}

export default function InterestRateEditModal({ isOpen, onClose, currentRate, onSave }: InterestRateEditModalProps) {
  const [rate, setRate] = useState(currentRate)

  const handleSave = () => {
    onSave(rate)
    onClose()
  }

  const handleClose = () => {
    setRate(currentRate)
    onClose()
  }

  const presetRates = [
    { label: "Excellent Credit (740+)", rate: 6.25 },
    { label: "Good Credit (680-739)", rate: 6.85 },
    { label: "Fair Credit (620-679)", rate: 7.45 },
    { label: "Poor Credit (<620)", rate: 8.25 },
  ]

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Adjust Interest Rate</DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Current Rate Display */}
          <div className="text-center">
            <div className="text-3xl font-bold text-blue-600">{rate.toFixed(2)}%</div>
            <p className="text-sm text-gray-600">Current Interest Rate</p>
          </div>

          {/* Slider */}
          <div className="space-y-4">
            <Label>Adjust Rate</Label>
            <Slider
              value={[rate]}
              onValueChange={(value) => setRate(value[0])}
              max={12}
              min={3}
              step={0.05}
              className="w-full"
            />
            <div className="flex justify-between text-sm text-gray-600">
              <span>3.0%</span>
              <span>12.0%</span>
            </div>
          </div>

          {/* Manual Input */}
          <div className="space-y-2">
            <Label htmlFor="rate-input">Or Enter Exact Rate</Label>
            <Input
              id="rate-input"
              type="number"
              value={rate}
              onChange={(e) => setRate(Number(e.target.value))}
              min="3"
              max="12"
              step="0.01"
              className="text-center"
            />
          </div>

          {/* Preset Options */}
          <div className="space-y-3">
            <Label>Quick Select by Credit Score</Label>
            <div className="grid grid-cols-1 gap-2">
              {presetRates.map((preset) => (
                <button
                  key={preset.label}
                  onClick={() => setRate(preset.rate)}
                  className={`p-3 text-left rounded-lg border transition-colors ${
                    Math.abs(rate - preset.rate) < 0.01
                      ? "bg-blue-50 border-blue-200 text-blue-900"
                      : "bg-white border-gray-200 hover:bg-gray-50"
                  }`}
                >
                  <div className="flex justify-between items-center">
                    <span className="font-medium">{preset.label}</span>
                    <span className="text-blue-600 font-bold">{preset.rate}%</span>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Rate Impact */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <h4 className="font-medium text-gray-900 mb-2">Rate Impact on $400k Loan</h4>
            <div className="text-sm text-gray-600 space-y-1">
              <div className="flex justify-between">
                <span>Monthly Payment:</span>
                <span className="font-semibold">
                  ${((400000 * (rate / 100 / 12)) / (1 - Math.pow(1 + rate / 100 / 12, -360))).toFixed(0)}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Total Interest (30 years):</span>
                <span className="font-semibold">
                  $
                  {(((400000 * (rate / 100 / 12)) / (1 - Math.pow(1 + rate / 100 / 12, -360))) * 360 - 400000).toFixed(
                    0,
                  )}
                </span>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          <Button onClick={handleSave}>Apply Rate</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
