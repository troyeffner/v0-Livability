"use client"

import { useState, useMemo } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { MapPin, TrendingUp, Home, Target, Compass } from "lucide-react"
import { sampleProperties, defaultUserProfile } from "@/lib/property-data"
import { calculatePropertyAffordability } from "@/lib/affordability-calculations"
import type { UserProfile, PropertyAffordability, Scenario } from "@/lib/property-types"
import PropertyCard from "./property-card"
import ScenarioSelector from "./scenario-selector"
import PropertyComparison from "./property-comparison"
import AffordabilitySummary from "./affordability-summary"

interface ActiveLocation {
  zipCode: string
  city: string
  state: string
  propertyTaxRate: number
  schoolTaxRate: number
}

export default function PropertyAffordabilityWorkbench() {
  const [userProfile, setUserProfile] = useState<UserProfile>(defaultUserProfile)
  const [selectedProperties, setSelectedProperties] = useState<string[]>([])
  const [viewMode, setViewMode] = useState<"grid" | "comparison">("grid")
  const [activeLocation, setActiveLocation] = useState<ActiveLocation | null>({
    zipCode: "62701", city: "Springfield", state: "IL",
    propertyTaxRate: 0.0060, schoolTaxRate: 0.0140,
  })

  const activeScenario = useMemo(() => {
    return userProfile.scenarios.find((s) => s.id === userProfile.activeScenarioId) || userProfile.scenarios[0]
  }, [userProfile])

  const propertyAffordabilities = useMemo(() => {
    const affordabilities: { [key: string]: PropertyAffordability } = {}
    sampleProperties.forEach((property) => {
      affordabilities[property.id] = calculatePropertyAffordability(property, activeScenario)
    })
    return affordabilities
  }, [activeScenario])

  const handlePropertySelect = (propertyId: string) => {
    setSelectedProperties((prev) => {
      if (prev.includes(propertyId)) {
        return prev.filter((id) => id !== propertyId)
      } else {
        return [...prev, propertyId].slice(0, 3) // Max 3 properties for comparison
      }
    })
  }

  const handleScenarioChange = (scenarioId: string) => {
    setUserProfile((prev) => ({
      ...prev,
      activeScenarioId: scenarioId,
    }))
  }

  const handleScenarioUpdate = (updatedScenario: Scenario) => {
    setUserProfile((prev) => ({
      ...prev,
      scenarios: prev.scenarios.map((s) => (s.id === updatedScenario.id ? updatedScenario : s)),
    }))
  }

  const handleSaveProperty = (propertyId: string) => {
    setUserProfile((prev) => ({
      ...prev,
      savedProperties: prev.savedProperties.includes(propertyId)
        ? prev.savedProperties.filter((id) => id !== propertyId)
        : [...prev.savedProperties, propertyId],
    }))
  }

  const handleMoveToPhase = (propertyId: string, phaseId: string) => {
    setUserProfile((prev) => ({
      ...prev,
      journeyPhases: prev.journeyPhases.map((phase) => {
        if (phase.id === phaseId) {
          return {
            ...phase,
            properties: phase.properties.includes(propertyId) ? phase.properties : [...phase.properties, propertyId],
          }
        }
        // Remove from other phases
        return {
          ...phase,
          properties: phase.properties.filter((id) => id !== propertyId),
        }
      }),
    }))
  }

  const handleAddScenario = () => {
    const newScenario = {
      id: `scenario-${Date.now()}`,
      name: `New Scenario`,
      description: "Custom scenario",
      active: false,
      financialInputs: {
        ...activeScenario.financialInputs,
      },
    }

    setUserProfile((prev) => ({
      ...prev,
      scenarios: [...prev.scenarios, newScenario],
    }))
  }

  const handleDeleteScenario = (scenarioId: string) => {
    if (userProfile.scenarios.length <= 1) return // Don't delete if it's the only scenario

    setUserProfile((prev) => {
      const updatedScenarios = prev.scenarios.filter((s) => s.id !== scenarioId)
      const newActiveId = prev.activeScenarioId === scenarioId ? updatedScenarios[0].id : prev.activeScenarioId

      return {
        ...prev,
        scenarios: updatedScenarios,
        activeScenarioId: newActiveId,
      }
    })
  }

  const handleRenameScenario = (scenarioId: string, newName: string) => {
    setUserProfile((prev) => ({
      ...prev,
      scenarios: prev.scenarios.map((s) => (s.id === scenarioId ? { ...s, name: newName } : s)),
    }))
  }

  const handleSaveScenario = () => {
    // Just update the current scenario - already handled by handleScenarioUpdate
    console.log("Scenario saved:", activeScenario.name)
  }

  const handleSaveAsNewScenario = () => {
    const newScenario = {
      ...activeScenario,
      id: `scenario-${Date.now()}`,
      name: `${activeScenario.name} (Copy)`,
    }

    setUserProfile((prev) => ({
      ...prev,
      scenarios: [...prev.scenarios, newScenario],
      activeScenarioId: newScenario.id,
    }))
  }

  // Filter properties by ZIP/city match when a location is set
  const locationFilteredProperties = useMemo(() => {
    if (!activeLocation) return sampleProperties
    const matched = sampleProperties.filter(
      (p) =>
        p.zipCode === activeLocation.zipCode ||
        (p.city?.toLowerCase() === activeLocation.city.toLowerCase() && p.state === activeLocation.state),
    )
    return matched.length > 0 ? matched : sampleProperties
  }, [activeLocation])

  const noZipMatch =
    activeLocation != null &&
    sampleProperties.every(
      (p) =>
        p.zipCode !== activeLocation.zipCode &&
        !(p.city?.toLowerCase() === activeLocation.city.toLowerCase() && p.state === activeLocation.state),
    )

  const affordableProperties = locationFilteredProperties.filter(
    (property) => propertyAffordabilities[property.id]?.canAfford,
  )

  const stretchProperties = locationFilteredProperties.filter(
    (property) =>
      !propertyAffordabilities[property.id]?.canAfford && propertyAffordabilities[property.id]?.affordabilityScore > 30,
  )

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="bg-card rounded-xl shadow-sm border p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-2xl font-bold text-foreground">Property Affordability Workbench</h1>
              <p className="text-muted-foreground">Find and compare homes that fit your budget and lifestyle</p>
            </div>
            <div className="flex items-center gap-3">
              <Link
                href="/navigating-a-change-rehearsal.v9.html"
                target="_blank"
                rel="noopener noreferrer"
              >
                <Button variant="outline" className="flex items-center gap-2 border-primary text-primary hover:bg-primary/10">
                  <Compass size={16} />
                  Decision Rehearsal
                </Button>
              </Link>
              <Button
                variant={viewMode === "comparison" ? "default" : "outline"}
                onClick={() => setViewMode(viewMode === "grid" ? "comparison" : "grid")}
                disabled={selectedProperties.length === 0}
                className="flex items-center gap-2"
              >
                <Target size={16} />
                Compare ({selectedProperties.length})
              </Button>
            </div>
          </div>

          {/* Scenario Selector */}
          <ScenarioSelector
            scenarios={userProfile.scenarios}
            activeScenarioId={userProfile.activeScenarioId}
            onScenarioChange={handleScenarioChange}
            onAddScenario={handleAddScenario}
            onDeleteScenario={handleDeleteScenario}
            onRenameScenario={handleRenameScenario}
            onSaveScenario={handleSaveScenario}
            onSaveAsNewScenario={handleSaveAsNewScenario}
          />

          {/* Journey Tracker */}
        </div>

        {/* Financial Settings + Affordability Summary - with real-time updates */}
        <AffordabilitySummary
          scenario={activeScenario}
          onScenarioUpdate={handleScenarioUpdate}
          onLocationChange={(loc) => setActiveLocation(loc ?? null)}
        />

        {/* Main Content */}
        {viewMode === "grid" ? (
          <Tabs defaultValue="affordable" className="space-y-6">
            {/* Location context label */}
            {activeLocation && (
              <div className="flex items-center gap-2 text-sm text-gray-500 px-1">
                <MapPin size={13} className="text-purple-500 shrink-0" />
                {noZipMatch ? (
                  <span>No sample listings for <strong>{activeLocation.city}, {activeLocation.state}</strong> — showing all properties</span>
                ) : (
                  <span>Showing homes in <strong>{activeLocation.city}, {activeLocation.state}</strong> within your margins</span>
                )}
              </div>
            )}
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="affordable" className="flex items-center gap-2">
                <Home size={16} />
                Affordable ({affordableProperties.length})
              </TabsTrigger>
              <TabsTrigger value="stretch" className="flex items-center gap-2">
                <TrendingUp size={16} />
                Stretch Goals ({stretchProperties.length})
              </TabsTrigger>
              <TabsTrigger value="all" className="flex items-center gap-2">
                <MapPin size={16} />
                All Properties ({locationFilteredProperties.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="affordable" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {affordableProperties.map((property) => (
                  <PropertyCard
                    key={property.id}
                    property={property}
                    affordability={propertyAffordabilities[property.id]}
                    isSelected={selectedProperties.includes(property.id)}
                    isSaved={userProfile.savedProperties.includes(property.id)}
                    onSelect={() => handlePropertySelect(property.id)}
                    onSave={() => handleSaveProperty(property.id)}
                    onMoveToPhase={(phaseId) => handleMoveToPhase(property.id, phaseId)}
                    journeyPhases={userProfile.journeyPhases}
                  />
                ))}
              </div>
            </TabsContent>

            <TabsContent value="stretch" className="space-y-4">
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
                <h3 className="font-semibold text-yellow-800 mb-2">Stretch Goal Properties</h3>
                <p className="text-sm text-yellow-700">
                  These properties are currently outside your budget but might become affordable with scenario changes.
                  Try the "With Roommate" or "After Promotion" scenarios to see how they impact affordability.
                </p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {stretchProperties.map((property) => (
                  <PropertyCard
                    key={property.id}
                    property={property}
                    affordability={propertyAffordabilities[property.id]}
                    isSelected={selectedProperties.includes(property.id)}
                    isSaved={userProfile.savedProperties.includes(property.id)}
                    onSelect={() => handlePropertySelect(property.id)}
                    onSave={() => handleSaveProperty(property.id)}
                    onMoveToPhase={(phaseId) => handleMoveToPhase(property.id, phaseId)}
                    journeyPhases={userProfile.journeyPhases}
                  />
                ))}
              </div>
            </TabsContent>

            <TabsContent value="all" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {locationFilteredProperties.map((property) => (
                  <PropertyCard
                    key={property.id}
                    property={property}
                    affordability={propertyAffordabilities[property.id]}
                    isSelected={selectedProperties.includes(property.id)}
                    isSaved={userProfile.savedProperties.includes(property.id)}
                    onSelect={() => handlePropertySelect(property.id)}
                    onSave={() => handleSaveProperty(property.id)}
                    onMoveToPhase={(phaseId) => handleMoveToPhase(property.id, phaseId)}
                    journeyPhases={userProfile.journeyPhases}
                  />
                ))}
              </div>
            </TabsContent>
          </Tabs>
        ) : (
          <PropertyComparison
            properties={sampleProperties.filter((p) => selectedProperties.includes(p.id))}
            affordabilities={selectedProperties.map((id) => propertyAffordabilities[id])}
            scenarios={userProfile.scenarios}
            activeScenarioId={userProfile.activeScenarioId}
            onScenarioChange={handleScenarioChange}
          />
        )}
      </div>
    </div>
  )
}
