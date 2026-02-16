"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { CheckCircle, Clock, Target, Star } from "lucide-react"
import type { JourneyPhase } from "@/lib/property-types"

interface JourneyTrackerProps {
  phases: JourneyPhase[]
  className?: string
}

export default function JourneyTracker({ phases, className = "" }: JourneyTrackerProps) {
  const getPhaseIcon = (phaseId: string) => {
    switch (phaseId) {
      case "research":
        return <Target size={16} />
      case "viewing":
        return <Clock size={16} />
      case "offers":
        return <CheckCircle size={16} />
      case "favorites":
        return <Star size={16} />
      default:
        return <Target size={16} />
    }
  }

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg">Your Home Buying Journey</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-4 overflow-x-auto pb-2">
          {phases.map((phase, index) => (
            <div key={phase.id} className="flex items-center gap-4 flex-shrink-0">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-full ${phase.color}`}>{getPhaseIcon(phase.id)}</div>
                <div>
                  <h3 className="font-semibold text-sm">{phase.name}</h3>
                  <p className="text-xs text-gray-600">{phase.description}</p>
                  {phase.properties.length > 0 && (
                    <Badge variant="secondary" className="text-xs mt-1">
                      {phase.properties.length} properties
                    </Badge>
                  )}
                </div>
              </div>
              {index < phases.length - 1 && <div className="w-8 h-px bg-gray-300" />}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
