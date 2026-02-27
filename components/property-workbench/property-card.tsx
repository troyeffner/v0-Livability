"use client"

import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Heart, MapPin, Bed, Bath, Square, Calendar, Star, CheckCircle, AlertTriangle } from "lucide-react"
import { formatCurrency } from "@/lib/affordability-calculations"
import type { Property, PropertyAffordability, JourneyPhase } from "@/lib/property-types"

interface PropertyCardProps {
  property: Property
  affordability: PropertyAffordability
  isSelected: boolean
  isSaved: boolean
  onSelect: () => void
  onSave: () => void
  onMoveToPhase: (phaseId: string) => void
  journeyPhases: JourneyPhase[]
}

export default function PropertyCard({
  property,
  affordability,
  isSelected,
  isSaved,
  onSelect,
  onSave,
  onMoveToPhase,
  journeyPhases,
}: PropertyCardProps) {
  const getAffordabilityColor = (score: number) => {
    if (score >= 80) return "bg-green-100 text-green-800 border-green-200"
    if (score >= 60) return "bg-amber-100 text-amber-900 border-amber-200"
    return "bg-red-100 text-red-800 border-red-200"
  }

  const getAffordabilityIcon = (canAfford: boolean) => {
    return canAfford ? (
      <CheckCircle size={16} className="text-green-600" />
    ) : (
      <AlertTriangle size={16} className="text-red-600" />
    )
  }

  return (
    <Card className={`transition-all duration-200 hover:shadow-lg ${isSelected ? "ring-2 ring-primary" : ""}`}>
      <CardHeader className="p-0">
        <div className="relative">
          <img
            src={property.imageUrl || "/placeholder.svg"}
            alt={property.address}
            className="w-full h-48 object-cover rounded-t-lg"
          />
          <div className="absolute top-3 right-3 flex gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={onSave}
              className={`bg-white/90 hover:bg-white ${isSaved ? "text-red-500" : "text-muted-foreground"}`}
            >
              <Heart size={16} fill={isSaved ? "currentColor" : "none"} />
            </Button>
          </div>
          <div className="absolute bottom-3 left-3">
            <Badge className="bg-white/90 text-gray-900 font-bold text-lg">{formatCurrency(property.price)}</Badge>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-4 space-y-4">
        {/* Property Details */}
        <div>
          <div className="flex items-start gap-2 mb-2">
            <MapPin size={16} className="text-primary mt-0.5 flex-shrink-0" />
            <div>
              <h3 className="font-semibold text-foreground">{property.address}</h3>
              <p className="text-sm text-muted-foreground">{property.neighborhood}</p>
            </div>
          </div>

          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <div className="flex items-center gap-1">
              <Bed size={16} />
              <span>{property.bedrooms} bed</span>
            </div>
            <div className="flex items-center gap-1">
              <Bath size={16} />
              <span>{property.bathrooms} bath</span>
            </div>
            <div className="flex items-center gap-1">
              <Square size={16} />
              <span>{property.squareFeet.toLocaleString()} sqft</span>
            </div>
          </div>

          <div className="flex items-center gap-4 text-sm text-gray-600 mt-2">
            <div className="flex items-center gap-1">
              <Calendar size={16} />
              <span>Built {property.yearBuilt}</span>
            </div>
            {property.walkScore && (
              <div className="flex items-center gap-1">
                <Star size={16} />
                <span>Walk Score {property.walkScore}</span>
              </div>
            )}
          </div>
        </div>

        {/* Affordability Status */}
        <div className={`p-3 rounded-lg border ${getAffordabilityColor(affordability.affordabilityScore)}`}>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              {getAffordabilityIcon(affordability.canAfford)}
              <span className="font-semibold">{affordability.canAfford ? "Affordable" : "Stretch Goal"}</span>
            </div>
            <Badge variant="outline" className="text-xs">
              {affordability.affordabilityScore.toFixed(0)}% match
            </Badge>
          </div>

          <div className="space-y-1 text-sm">
            <div className="flex justify-between">
              <span>Monthly Payment:</span>
              <span className="font-semibold">{formatCurrency(affordability.monthlyPayment)}</span>
            </div>
            <div className="flex justify-between">
              <span>Down Payment:</span>
              <span className="font-semibold">{formatCurrency(affordability.downPaymentNeeded)}</span>
            </div>
            <div className="flex justify-between">
              <span>Monthly Margin:</span>
              <span
                className={`font-semibold ${affordability.monthlyMargin >= 0 ? "text-green-600" : "text-red-600"}`}
              >
                {formatCurrency(affordability.monthlyMargin)}
              </span>
            </div>
          </div>
        </div>

        {/* Key Features */}
        {property.features.length > 0 && (
          <div>
            <h4 className="font-medium text-gray-900 mb-2">Key Features</h4>
            <div className="flex flex-wrap gap-1">
              {property.features.slice(0, 3).map((feature, index) => (
                <Badge key={index} variant="secondary" className="text-xs">
                  {feature}
                </Badge>
              ))}
              {property.features.length > 3 && (
                <Badge variant="secondary" className="text-xs">
                  +{property.features.length - 3} more
                </Badge>
              )}
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-2">
          <Button onClick={onSelect} variant={isSelected ? "default" : "outline"} className="flex-1">
            {isSelected ? "Selected" : "Compare"}
          </Button>

          {/* Journey Phase Selector */}
          <select
            onChange={(e) => onMoveToPhase(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md text-sm bg-white"
            defaultValue=""
          >
            <option value="" disabled>
              Move to...
            </option>
            {journeyPhases.map((phase) => (
              <option key={phase.id} value={phase.id}>
                {phase.name}
              </option>
            ))}
          </select>
        </div>

        {/* Recommendations/Constraints */}
        {(affordability.recommendations.length > 0 || affordability.constraints.length > 0) && (
          <div className="text-xs space-y-1">
            {affordability.recommendations.slice(0, 1).map((rec, index) => (
              <div key={index} className="flex items-start gap-1 text-green-700">
                <CheckCircle size={12} className="mt-0.5 flex-shrink-0" />
                <span>{rec}</span>
              </div>
            ))}
            {affordability.constraints.slice(0, 1).map((constraint, index) => (
              <div key={index} className="flex items-start gap-1 text-red-700">
                <AlertTriangle size={12} className="mt-0.5 flex-shrink-0" />
                <span>{constraint}</span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
