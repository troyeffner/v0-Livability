"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { TrendingUp, TrendingDown, DollarSign, Activity } from "lucide-react"
import { formatCurrency } from "@/lib/real-estate-calculations"
import type { TradeoffImpact } from "@/lib/real-estate-types"

interface TradeoffImpactPanelProps {
  tradeoffLog: TradeoffImpact[]
}

export default function TradeoffImpactPanel({ tradeoffLog }: TradeoffImpactPanelProps) {
  const getIcon = (type: string) => {
    if (type === "income") return TrendingUp
    if (type === "expense") return TrendingDown
    if (type === "info") return DollarSign
    return Activity
  }

  const getImpactColor = (lppImpact: number) => {
    if (lppImpact > 0) return "text-green-600 bg-green-50 border-green-200"
    if (lppImpact < 0) return "text-red-600 bg-red-50 border-red-200"
    return "text-gray-600 bg-gray-50 border-gray-200"
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-sm font-semibold text-gray-700">
          <Activity size={16} className="text-gray-500" />
          Tradeoff Log
        </CardTitle>
        <p className="text-xs text-gray-500">Recent changes and their impact on purchase price</p>
      </CardHeader>
      <CardContent className="p-3">
        {tradeoffLog.length === 0 ? (
          <p className="text-xs text-gray-400 italic text-center py-4">
            Toggle income and expense items to see how they affect your buying power.
          </p>
        ) : (
          <div className="space-y-2 max-h-80 overflow-y-auto">
            {tradeoffLog.map((entry) => {
              const Icon = getIcon(entry.type)
              return (
                <div
                  key={entry.id}
                  className={`p-2 rounded border text-xs ${getImpactColor(entry.lppImpact)}`}
                >
                  <div className="flex items-start gap-1.5 mb-1">
                    <Icon size={12} className="mt-0.5 flex-shrink-0" />
                    <span className="font-medium leading-tight">{entry.itemLabel}</span>
                  </div>
                  <div className="flex justify-between items-center mt-1">
                    <Badge variant="outline" className="text-xs px-1 py-0">
                      {entry.impactCategory}
                    </Badge>
                    <span className={`font-semibold ${entry.lppImpact >= 0 ? "text-green-700" : "text-red-700"}`}>
                      {entry.lppImpact > 0 ? "+" : ""}
                      {formatCurrency(entry.lppImpact)}
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
