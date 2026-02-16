"use client"

import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { MapPin, Bed, Bath, Square, Calendar, CheckCircle, AlertTriangle } from "lucide-react"
import { formatCurrency } from "@/lib/affordability-calculations"
import type { Property, PropertyAffordability, Scenario } from "@/lib/property-types"
import ScenarioSelector from "./scenario-selector"

interface PropertyComparisonProps {
  properties: Property[]
  affordabilities: PropertyAffordability[]
  scenarios: Scenario[]
  activeScenarioId: string
  onScenarioChange: (scenarioId: string) => void
}

export default function PropertyComparison({
  properties,
  affordabilities,
  scenarios,
  activeScenarioId,
  onScenarioChange,
}: PropertyComparisonProps) {
  if (properties.length === 0) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <p className="text-gray-500">Select properties to compare them side by side</p>
        </CardContent>
      </Card>
    )
  }

  const getAffordabilityColor = (score: number) => {
    if (score >= 80) return "bg-green-100 text-green-800"
    if (score >= 60) return "bg-yellow-100 text-yellow-800"
    return "bg-red-100 text-red-800"
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Property Comparison</h2>
        <ScenarioSelector
          scenarios={scenarios}
          activeScenarioId={activeScenarioId}
          onScenarioChange={onScenarioChange}
        />
      </div>

      {/* Comparison Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {properties.map((property, index) => {
          const affordability = affordabilities[index]

          return (
            <Card key={property.id} className="h-full">
              <CardHeader className="p-0">
                <img
                  src={property.imageUrl || "/placeholder.svg"}
                  alt={property.address}
                  className="w-full h-48 object-cover rounded-t-lg"
                />
              </CardHeader>

              <CardContent className="p-4 space-y-4">
                {/* Basic Info */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <Badge className="bg-blue-100 text-blue-800 font-bold">{formatCurrency(property.price)}</Badge>
                    <Badge className={getAffordabilityColor(affordability.affordabilityScore)}>
                      {affordability.affordabilityScore.toFixed(0)}% match
                    </Badge>
                  </div>

                  <div className="flex items-start gap-2 mb-3">
                    <MapPin size={16} className="text-gray-500 mt-0.5 flex-shrink-0" />
                    <div>
                      <h3 className="font-semibold text-gray-900">{property.address}</h3>
                      <p className="text-sm text-gray-600">{property.neighborhood}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-sm text-gray-600">
                    <div className="flex items-center gap-1">
                      <Bed size={14} />
                      <span>{property.bedrooms} bed</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Bath size={14} />
                      <span>{property.bathrooms} bath</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Square size={14} />
                      <span>{property.sqft.toLocaleString()} sqft</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Calendar size={14} />
                      <span>{property.yearBuilt}</span>
                    </div>
                  </div>
                </div>

                {/* Affordability Details */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    {affordability.canAfford ? (
                      <CheckCircle size={16} className="text-green-600" />
                    ) : (
                      <AlertTriangle size={16} className="text-red-600" />
                    )}
                    <span className="font-semibold">{affordability.canAfford ? "Affordable" : "Stretch Goal"}</span>
                  </div>

                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span>Monthly Payment:</span>
                      <span className="font-semibold">{formatCurrency(affordability.monthlyPayment)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Down Payment:</span>
                      <span className="font-semibold">{formatCurrency(affordability.downPaymentNeeded)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>DTI Ratio:</span>
                      <span className="font-semibold">{affordability.dtiRatio.toFixed(1)}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Remaining Budget:</span>
                      <span
                        className={`font-semibold ${affordability.remainingBudget >= 0 ? "text-green-600" : "text-red-600"}`}
                      >
                        {formatCurrency(affordability.remainingBudget)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Key Features */}
                {property.features.length > 0 && (
                  <div>
                    <h4 className="font-medium text-gray-900 mb-2">Features</h4>
                    <div className="flex flex-wrap gap-1">
                      {property.features.slice(0, 4).map((feature, idx) => (
                        <Badge key={idx} variant="secondary" className="text-xs">
                          {feature}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {/* Recommendations/Constraints */}
                <div className="space-y-1 text-xs">
                  {affordability.recommendations.slice(0, 1).map((rec, idx) => (
                    <div key={idx} className="flex items-start gap-1 text-green-700">
                      <CheckCircle size={12} className="mt-0.5 flex-shrink-0" />
                      <span>{rec}</span>
                    </div>
                  ))}
                  {affordability.constraints.slice(0, 2).map((constraint, idx) => (
                    <div key={idx} className="flex items-start gap-1 text-red-700">
                      <AlertTriangle size={12} className="mt-0.5 flex-shrink-0" />
                      <span>{constraint}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
