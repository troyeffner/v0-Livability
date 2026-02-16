"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { TrendingUp, TrendingDown, DollarSign, Home, AlertTriangle } from "lucide-react"
import { formatCurrency } from "@/lib/real-estate-calculations"

interface TradeoffImpactPanelProps {
  currentAffordability: {
    maxPurchasePrice: number
    maxMonthlyPayment: number
    remainingBudget: number
    dtiRatio: number
  }
  currentFinancials: {
    annualIncome: number
    monthlyExpenses: number
    fixedDebts: number
    downPaymentSources: number
    housingPercentage: number
  }
}

export default function TradeoffImpactPanel({ currentAffordability, currentFinancials }: TradeoffImpactPanelProps) {
  // Calculate impact scenarios
  const scenarios = [
    {
      title: "Increase Income by $10k",
      icon: TrendingUp,
      color: "text-green-600 bg-green-50",
      changes: {
        priceIncrease: 50000,
        budgetIncrease: 583,
      },
    },
    {
      title: "Reduce Expenses by $500/mo",
      icon: TrendingDown,
      color: "text-blue-600 bg-blue-50",
      changes: {
        priceIncrease: 100000,
        budgetIncrease: 500,
      },
    },
    {
      title: "Add $20k Down Payment",
      icon: DollarSign,
      color: "text-purple-600 bg-purple-50",
      changes: {
        priceIncrease: 25000,
        budgetIncrease: 0,
      },
    },
    {
      title: "Accept Higher Payment (35%)",
      icon: Home,
      color: "text-orange-600 bg-orange-50",
      changes: {
        priceIncrease: 75000,
        budgetIncrease: -200,
      },
    },
  ]

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertTriangle size={20} className="text-gray-600" />
          Tradeoff Impact Analysis
        </CardTitle>
        <p className="text-sm text-gray-600">See how different changes affect your home buying power</p>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {scenarios.map((scenario, index) => {
            const Icon = scenario.icon
            const newPrice = currentAffordability.maxPurchasePrice + scenario.changes.priceIncrease
            const newBudget = currentAffordability.remainingBudget + scenario.changes.budgetIncrease

            return (
              <div
                key={index}
                className={`p-4 rounded-lg border-2 ${scenario.color.replace("text-", "border-").replace("bg-", "border-").replace("-600", "-200").replace("-50", "-100")}`}
              >
                <div className="flex items-center gap-2 mb-3">
                  <Icon size={16} className={scenario.color.split(" ")[0]} />
                  <h3 className="font-semibold text-sm">{scenario.title}</h3>
                </div>

                <div className="space-y-2 text-xs">
                  <div className="flex justify-between">
                    <span>New Max Price:</span>
                    <span className="font-semibold">{formatCurrency(newPrice)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Price Increase:</span>
                    <span
                      className={`font-semibold ${scenario.changes.priceIncrease > 0 ? "text-green-600" : "text-red-600"}`}
                    >
                      {scenario.changes.priceIncrease > 0 ? "+" : ""}
                      {formatCurrency(scenario.changes.priceIncrease)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Budget Impact:</span>
                    <span
                      className={`font-semibold ${scenario.changes.budgetIncrease >= 0 ? "text-green-600" : "text-red-600"}`}
                    >
                      {scenario.changes.budgetIncrease > 0 ? "+" : ""}
                      {formatCurrency(scenario.changes.budgetIncrease)}/mo
                    </span>
                  </div>
                </div>

                <div className="mt-3 pt-2 border-t border-gray-200">
                  <Badge variant="outline" className="text-xs">
                    {((scenario.changes.priceIncrease / currentAffordability.maxPurchasePrice) * 100).toFixed(0)}%
                    increase
                  </Badge>
                </div>
              </div>
            )
          })}
        </div>

        {/* Summary */}
        <div className="mt-6 p-4 bg-gray-50 rounded-lg">
          <h4 className="font-semibold text-gray-900 mb-2">Key Insights</h4>
          <div className="text-sm text-gray-700 space-y-1">
            <p>• Reducing expenses has the biggest impact on buying power</p>
            <p>• Income increases provide steady, long-term benefits</p>
            <p>• Higher down payments reduce monthly costs but don't increase price range significantly</p>
            <p>• Accepting higher payment percentages can be risky for long-term financial health</p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
