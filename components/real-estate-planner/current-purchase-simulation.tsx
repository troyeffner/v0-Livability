"use client"

import { useState, useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ChevronUp, ChevronDown, Printer } from "lucide-react"

// Update the props interface to match the new calculation names:
interface CurrentPurchaseSimulationProps {
  grossAnnualIncome: number
  taxes: number
  healthcare: number
  retirement: number
  annualTakeHome: number
  grossPurchasePrice: number
  monthlyTakeHomeIncome: number
  livabilityMonthlyMortgagePayment: number
  escrowPaymentMonthly: number
  lifestyleExpensesMonthly: number // Renamed from totalCurrentExpensesMonthly
  futureExpensesMonthly: number // Renamed from totalFutureExpensesMonthly
  futureIncomeMonthly: number // Renamed from totalFutureIncomeIncome
  remainingLifestyleBudget: number
  livabilityPurchasePrice: number
  downPaymentAmount: number
  transactionCosts: number
  oneTimePurchasePaymentTotal: number
  gppLoanAmount: number
  fixedDebtsMonthly: number // Renamed from currentFixedDebtsMonthly
  selectedMortgageOptions: {
    livabilityIncomePercentage: number
    interestRate: number
    termLength: number
    availableDownPayment: number
    effectiveDownPaymentPercentage: number
    propertyTaxRate: number
    homeownersInsuranceAnnual: number
    downPaymentPercentage: number
  }
  lppLoanAmount: number
  adjustedTakeHome: number // Renamed from adjustedMonthlyTakeHome
  futureOneTimeExpenses: number // Renamed from totalFutureOneTimeExpenses
  requiredDownPayment: number
  excessDownPayment: number
  excessApplication: string
  downPaymentConstraintDetails: {
    isConstrained: boolean
    additionalDownPaymentNeeded: number
    purchasePriceIncrease: number
    maxPriceFromIncome: number
  } | null
  movingFirstMonthExpenses: number
}

// --- safe currency formatter ---
const formatCurrency = (raw?: number) => {
  const amount = typeof raw === "number" && Number.isFinite(raw) ? raw : 0

  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}

const formatPercentage = (decimal: number) => {
  return `${(decimal * 100).toFixed(1)}%`
}

// Function to calculate monthly mortgage payment
const calculateMonthlyMortgagePaymentForPrice = (
  loanAmount: number,
  interestRate: number,
  termLength: number,
): number => {
  const monthlyInterestRate = interestRate / 12
  const numberOfPayments = termLength * 12
  const presentValue = loanAmount

  const monthlyPayment =
    (presentValue * monthlyInterestRate) / (1 - Math.pow(1 + monthlyInterestRate, -numberOfPayments))

  return monthlyPayment
}

// Update the component parameter names to match:
export default function CurrentPurchaseSimulation({
  grossAnnualIncome,
  taxes,
  healthcare,
  retirement,
  annualTakeHome,
  grossPurchasePrice,
  monthlyTakeHomeIncome,
  livabilityMonthlyMortgagePayment,
  escrowPaymentMonthly,
  lifestyleExpensesMonthly,
  futureExpensesMonthly,
  futureIncomeMonthly,
  remainingLifestyleBudget,
  livabilityPurchasePrice,
  downPaymentAmount,
  transactionCosts,
  oneTimePurchasePaymentTotal,
  gppLoanAmount,
  fixedDebtsMonthly,
  selectedMortgageOptions,
  lppLoanAmount,
  adjustedTakeHome,
  futureOneTimeExpenses,
  requiredDownPayment,
  excessDownPayment,
  excessApplication,
  downPaymentConstraintDetails,
  movingFirstMonthExpenses,
}: CurrentPurchaseSimulationProps) {
  const [isCollapsed, setIsCollapsed] = useState(true)

  const toggleCollapse = () => {
    setIsCollapsed(!isCollapsed)
  }

  const handlePrintScenario = () => {
    // Temporarily expand the panel if it's collapsed for better printing
    const wasCollapsed = isCollapsed
    if (wasCollapsed) {
      setIsCollapsed(false)
      // Wait for the DOM to update, then print
      setTimeout(() => {
        window.print()
        // Restore collapsed state after printing
        if (wasCollapsed) {
          setIsCollapsed(true)
        }
      }, 100)
    } else {
      window.print()
    }
  }

  // Calculate GPP monthly mortgage payment
  const gppMonthlyMortgagePayment = useMemo(() => {
    if (grossPurchasePrice <= 0 || gppLoanAmount <= 0) return 0
    return calculateMonthlyMortgagePaymentForPrice(
      gppLoanAmount,
      selectedMortgageOptions.interestRate,
      selectedMortgageOptions.termLength,
    )
  }, [gppLoanAmount, selectedMortgageOptions])

  // Calculate GPP escrow payment
  const gppEscrowPaymentMonthly = useMemo(() => {
    if (grossPurchasePrice <= 0) return 0
    const propertyTaxMonthly = (grossPurchasePrice * selectedMortgageOptions.propertyTaxRate) / 12
    const insuranceMonthly = selectedMortgageOptions.homeownersInsuranceAnnual / 12
    return propertyTaxMonthly + insuranceMonthly
  }, [grossPurchasePrice, selectedMortgageOptions])

  // Check if there's insufficient down payment for bank purchase
  const bankDownPaymentShortfall =
    requiredDownPayment > selectedMortgageOptions.availableDownPayment
      ? requiredDownPayment - selectedMortgageOptions.availableDownPayment
      : 0

  // Calculate Current DTI (only fixed debts, no mortgage)
  const currentDTI = useMemo(() => {
    const grossMonthlyIncome = grossAnnualIncome / 12
    if (grossMonthlyIncome === 0) return 0
    return (fixedDebtsMonthly / grossMonthlyIncome) * 100
  }, [fixedDebtsMonthly, grossAnnualIncome])

  // Calculate New DTI (with mortgage + escrow + fixed debts)
  const newDTI = useMemo(() => {
    const grossMonthlyIncome = grossAnnualIncome / 12
    if (grossMonthlyIncome === 0) return 0
    return ((livabilityMonthlyMortgagePayment + escrowPaymentMonthly + fixedDebtsMonthly) / grossMonthlyIncome) * 100
  }, [livabilityMonthlyMortgagePayment, escrowPaymentMonthly, fixedDebtsMonthly, grossAnnualIncome])

  return (
    <Card className="shadow-md border border-gray-300 bg-white transition-all duration-300 ease-in-out">
      <CardHeader className="pb-2 pt-4 px-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold text-gray-700">
            Prototype - Purchase Simulation - Calculations for demonstration only
          </CardTitle>
          <div className="flex items-center gap-2">
            <Button
              onClick={handlePrintScenario}
              variant="outline"
              size="sm"
              className="text-gray-700 border-gray-400 hover:bg-gray-100 bg-transparent"
            >
              <Printer size={16} className="mr-1" />
              Print Scenario
            </Button>
            <button
              onClick={toggleCollapse}
              className="p-1 hover:bg-gray-100 rounded-full transition-colors duration-200"
              aria-label={isCollapsed ? "Expand panel" : "Collapse panel"}
            >
              {isCollapsed ? (
                <ChevronDown size={20} className="text-gray-600" />
              ) : (
                <ChevronUp size={20} className="text-gray-600" />
              )}
            </button>
          </div>
        </div>
      </CardHeader>

      {/* Collapsed State - Show all 3 LPP panels */}
      {isCollapsed && (
        <CardContent className="p-3 space-y-4">
          {/* All 3 Livability panels when collapsed */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Livability Income - Condensed */}
            <div className="p-3 border-2 border-green-200 rounded-lg bg-green-50">
              <h4 className="text-sm font-semibold text-green-800 mb-2">Livability Income</h4>
              <p className="text-xs text-green-600 mb-2">
                Conservative purchase price using current income and 30% housing budget rule.
              </p>
              <div className="space-y-1 text-xs">
                <div className="flex justify-between">
                  <span>Monthly Take-Home:</span>
                  <span className="font-bold text-green-800">{formatCurrency(monthlyTakeHomeIncome)}</span>
                </div>
                <div className="flex justify-between text-green-700">
                  <span>
                    Desired monthly payment ({Math.round(selectedMortgageOptions.livabilityIncomePercentage * 100)}% of
                    take home):
                  </span>
                  <span className="font-semibold">
                    {formatCurrency(monthlyTakeHomeIncome * selectedMortgageOptions.livabilityIncomePercentage)}
                  </span>
                </div>
              </div>
            </div>

            {/* Livability Purchase Price - Condensed */}
            <div className="p-3 border-2 border-green-200 rounded-lg bg-green-50">
              <h4 className="text-sm font-semibold text-green-800 mb-2">Livability Purchase Price</h4>
              <p className="text-xl font-bold text-green-900 mb-1">{formatCurrency(livabilityPurchasePrice)}</p>
              <div className="text-xs">
                <p>Loan: {formatCurrency(lppLoanAmount)}</p>
                <p>Mortgage + Escrow: {formatCurrency(livabilityMonthlyMortgagePayment + escrowPaymentMonthly)}</p>
                <p>
                  Down Payment: {formatCurrency(selectedMortgageOptions.availableDownPayment)} (
                  {formatPercentage(selectedMortgageOptions.effectiveDownPaymentPercentage / 100)})
                </p>
                {excessDownPayment > 0 && <p>Excess Down Payment: {formatCurrency(excessDownPayment)}</p>}
              </div>
            </div>

            {/* Livability Monthly Budget - Condensed */}
            <div className="p-3 border-2 border-green-200 rounded-lg bg-green-50">
              <h4 className="text-sm font-semibold text-green-800 mb-2">Livability Monthly Budget</h4>
              <div className="space-y-1 text-xs">
                <div className="flex justify-between">
                  <span>Take-Home:</span>
                  <span>{formatCurrency(adjustedTakeHome)}</span>
                </div>
                <div className="flex justify-between text-red-600">
                  <span>(-) Mortgage + Escrow:</span>
                  <span>{formatCurrency(livabilityMonthlyMortgagePayment + escrowPaymentMonthly)}</span>
                </div>
                <div className="flex justify-between text-red-600">
                  <span>(-) Future Monthly Expenses:</span>
                  <span>{formatCurrency(futureExpensesMonthly)}</span>
                </div>
                <div className="flex justify-between text-red-600">
                  <span>(-) Current Expenses:</span>
                  <span>{formatCurrency(lifestyleExpensesMonthly)}</span>
                </div>
                <div className="flex justify-between text-red-600">
                  <span>(-) Fixed Debts:</span>
                  <span>{formatCurrency(fixedDebtsMonthly)}</span>
                </div>
                <hr className="border-green-300" />
                <div className="flex justify-between font-bold">
                  <span>Remaining:</span>
                  <span className={remainingLifestyleBudget >= 0 ? "text-green-600" : "text-red-600"}>
                    {formatCurrency(remainingLifestyleBudget)}
                  </span>
                </div>
                {remainingLifestyleBudget < 0 && (
                  <div className="mt-1 text-xs italic text-gray-500">
                    <p>Ways to break even:</p>
                    <p>• Increase income by {formatCurrency(Math.abs(remainingLifestyleBudget))}/month</p>
                    <p>
                      • Reduce desired payment to{" "}
                      {Math.max(
                        15,
                        Math.round(
                          ((monthlyTakeHomeIncome * selectedMortgageOptions.livabilityIncomePercentage +
                            remainingLifestyleBudget) /
                            monthlyTakeHomeIncome) *
                            100,
                        ),
                      )}
                      %
                    </p>
                    <p>• Remove {formatCurrency(Math.abs(remainingLifestyleBudget))}/month of expenses</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      )}

      {/* Expanded State - Full Content */}
      {!isCollapsed && (
        <CardContent className="p-3 space-y-4">
          {/* Top Row: Bank Qualification & Bank Purchase Price (Blue Theme) */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Bank Qualification Summary - Simple version */}
            <div className="p-4 border-2 border-blue-200 rounded-lg bg-blue-50">
              <h3 className="text-lg font-semibold text-blue-800 mb-3">Bank Qualification (DTI Method)</h3>
              <p className="text-xs text-blue-600 mb-3">Based on gross income and 43% debt-to-income ratio standard.</p>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between items-center">
                  <span>Gross Annual Income:</span>
                  <span className="font-semibold">{formatCurrency(grossAnnualIncome)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span>Gross Monthly Income:</span>
                  <span className="font-semibold">{formatCurrency(grossAnnualIncome / 12)}</span>
                </div>
                <div className="flex justify-between items-center text-red-600">
                  <span>(-) Fixed Debts:</span>
                  <span className="font-semibold">{formatCurrency(fixedDebtsMonthly)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span>Max DTI (43%):</span>
                  <span className="font-semibold">{formatCurrency((grossAnnualIncome / 12) * 0.43)}</span>
                </div>
                <hr className="my-2 border-blue-300" />
                <div className="flex justify-between items-center">
                  <span>Available for Monthly Mortgage + Escrow:</span>
                  <span className="font-bold text-lg text-blue-800">
                    {formatCurrency((grossAnnualIncome / 12) * 0.43 - fixedDebtsMonthly)}
                  </span>
                </div>
              </div>
            </div>

            {/* Bank Purchase Price */}
            <div className="p-4 border-2 border-blue-200 rounded-lg bg-blue-50">
              <h3 className="text-lg font-semibold text-blue-800 mb-3">Bank Purchase Price</h3>
              <p className="text-2xl font-bold text-blue-900 mb-2">{formatCurrency(grossPurchasePrice)}</p>
              <p className="text-sm text-blue-700 mb-3">
                Maximum purchase price using current qualifying income and fixed debts only.
              </p>

              {/* Bank Down Payment Warning */}
              {bankDownPaymentShortfall > 0 && (
                <p className="text-xs text-gray-600 italic mb-2">
                  Need {formatCurrency(bankDownPaymentShortfall)} more for 20% down payment
                </p>
              )}

              <div className="space-y-2 text-sm">
                <div className="flex justify-between items-center">
                  <span>Purchase Price:</span>
                  <span className="font-semibold">{formatCurrency(grossPurchasePrice)}</span>
                </div>
                <div className="flex justify-between items-center text-red-600">
                  <span>(-) Required Down Payment (20%):</span>
                  <span className="font-semibold">{formatCurrency(requiredDownPayment)}</span>
                </div>
                <hr className="my-1 border-blue-300" />
                <div className="flex justify-between items-center">
                  <span>Loan Amount:</span>
                  <span className="font-bold text-lg">{formatCurrency(gppLoanAmount)}</span>
                </div>
              </div>

              <div className="mt-3 pt-3 border-t border-blue-300 text-xs">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <p>Monthly Mortgage: {formatCurrency(gppMonthlyMortgagePayment)}</p>
                    <p>Monthly Escrow: {formatCurrency(gppEscrowPaymentMonthly)}</p>
                  </div>
                  <div>
                    <p>Interest: {formatPercentage(selectedMortgageOptions.interestRate)}</p>
                    <p>Term: {selectedMortgageOptions.termLength} years</p>
                    <p>Down: 20% (Standard)</p>
                    <p>DTI Target: 43%</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Middle Row: Livability Income, Livability Purchase Price & Livability Monthly Budget (Green Theme) */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Livability Income - Detailed version for LPP */}
            <div className="p-4 border-2 border-green-200 rounded-lg bg-green-50">
              <h3 className="text-lg font-semibold text-green-800 mb-3">Livability Income</h3>
              <p className="text-xs text-green-600 mb-3">
                Conservative purchase price using current income and 30% housing budget rule.
              </p>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between items-center">
                  <span>Gross Annual Income:</span>
                  <span className="font-semibold">{formatCurrency(grossAnnualIncome)}</span>
                </div>
                <div className="flex justify-between items-center text-orange-600">
                  <span>(-) Taxes:</span>
                  <span className="font-semibold">{formatCurrency(taxes)}</span>
                </div>
                <div className="flex justify-between items-center text-orange-600">
                  <span>(-) Healthcare:</span>
                  <span className="font-semibold">{formatCurrency(healthcare)}</span>
                </div>
                <div className="flex justify-between items-center text-orange-600">
                  <span>(-) Retirement:</span>
                  <span className="font-semibold">{formatCurrency(retirement)}</span>
                </div>
                <hr className="my-2 border-green-300" />
                <div className="flex justify-between items-center">
                  <span>Monthly Take-Home Income:</span>
                  <span className="font-bold text-lg text-green-800">{formatCurrency(monthlyTakeHomeIncome)}</span>
                </div>
                <div className="flex justify-between items-center text-green-700">
                  <span>
                    Desired monthly payment ({Math.round(selectedMortgageOptions.livabilityIncomePercentage * 100)}% of
                    take home):
                  </span>
                  <span className="font-semibold">
                    {formatCurrency(monthlyTakeHomeIncome * selectedMortgageOptions.livabilityIncomePercentage)}
                  </span>
                </div>
                <div className="mt-1 pt-1 border-t border-green-200">
                  <p className="font-medium text-xs">Current DTI: {currentDTI.toFixed(1)}%</p>
                </div>
              </div>
            </div>

            {/* Livability Purchase Price */}
            <div className="p-4 border-2 border-green-200 rounded-lg bg-green-50">
              <h3 className="text-lg font-semibold text-green-800 mb-3">Livability Purchase Price</h3>
              <p className="text-2xl font-bold text-green-900 mb-2">{formatCurrency(livabilityPurchasePrice)}</p>
              <p className="text-sm text-green-700 mb-3">
                Purchase price limited by available down payment sources and conservative income approach.
              </p>

              <div className="space-y-2 text-sm">
                <div className="flex justify-between items-center">
                  <span>Purchase Price:</span>
                  <span className="font-semibold">{formatCurrency(livabilityPurchasePrice)}</span>
                </div>
                <div className="flex justify-between items-center text-green-600">
                  <span>(-) Down Payment ({selectedMortgageOptions.downPaymentPercentage}%):</span>
                  <span className="font-semibold">
                    {formatCurrency((livabilityPurchasePrice * selectedMortgageOptions.downPaymentPercentage) / 100)}
                  </span>
                </div>
                {selectedMortgageOptions.availableDownPayment >
                  (livabilityPurchasePrice * selectedMortgageOptions.downPaymentPercentage) / 100 && (
                  <div className="flex justify-between items-center text-blue-600">
                    <span>(-) Excess Down payment to increase purchase price:</span>
                    <span className="font-semibold">
                      {formatCurrency(
                        selectedMortgageOptions.availableDownPayment -
                          (livabilityPurchasePrice * selectedMortgageOptions.downPaymentPercentage) / 100,
                      )}
                    </span>
                  </div>
                )}
                <hr className="my-1 border-green-300" />
                <div className="flex justify-between items-center">
                  <span>Loan Amount:</span>
                  <span className="font-bold text-lg">{formatCurrency(lppLoanAmount)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span>Monthly Mortgage + Escrow Payment:</span>
                  <span className="font-bold text-lg text-green-800">
                    {formatCurrency(livabilityMonthlyMortgagePayment + escrowPaymentMonthly)}
                  </span>
                </div>
                {downPaymentConstraintDetails?.isConstrained && (
                  <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded-md">
                    <p className="text-xs text-yellow-700 font-medium">
                      💡 Add {formatCurrency(downPaymentConstraintDetails.additionalDownPaymentNeeded)} to your down
                      payment and your purchase price increases by{" "}
                      {formatCurrency(downPaymentConstraintDetails.purchasePriceIncrease)} to max out your desired
                      monthly payment
                    </p>
                  </div>
                )}
              </div>

              <div className="mt-3 pt-3 border-t border-green-300 text-xs">
                <div className="grid grid-cols-1 gap-1">
                  <p>Monthly Mortgage: {formatCurrency(livabilityMonthlyMortgagePayment)}</p>
                  <p>Monthly Escrow: {formatCurrency(escrowPaymentMonthly)}</p>
                  <p>Down Payment: {formatPercentage(selectedMortgageOptions.effectiveDownPaymentPercentage / 100)}</p>
                  <p>Based on Available Sources</p>
                  <div className="mt-1 pt-1 border-t border-green-200">
                    <p className="font-medium">New DTI: {newDTI.toFixed(1)}%</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Livability Monthly Budget */}
            <div className="p-4 border-2 border-green-200 rounded-lg bg-green-50">
              <h3 className="text-lg font-semibold text-green-800 mb-3">Livability Monthly Budget</h3>
              <p className="text-xs text-green-600 mb-3">Includes future income/expenses for realistic planning.</p>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between items-center">
                  <span>Base Take-Home Income:</span>
                  <span className="font-semibold">{formatCurrency(monthlyTakeHomeIncome)}</span>
                </div>
                {futureIncomeMonthly > 0 && (
                  <div className="flex justify-between items-center text-green-600">
                    <span>(+) Future Income:</span>
                    <span className="font-semibold">{formatCurrency(futureIncomeMonthly)}</span>
                  </div>
                )}
                <div className="flex justify-between items-center text-red-600">
                  <span>(-) Mortgage + Escrow:</span>
                  <span className="font-semibold">
                    {formatCurrency(livabilityMonthlyMortgagePayment + escrowPaymentMonthly)}
                  </span>
                </div>
                {futureExpensesMonthly > 0 && (
                  <div className="flex justify-between items-center text-red-600">
                    <span>(-) Future Monthly Expenses:</span>
                    <span className="font-semibold">{formatCurrency(futureExpensesMonthly)}</span>
                  </div>
                )}
                <div className="flex justify-between items-center text-red-600">
                  <span>(-) Current Expenses:</span>
                  <span className="font-semibold">{formatCurrency(lifestyleExpensesMonthly)}</span>
                </div>
                <div className="flex justify-between items-center text-red-600">
                  <span>(-) Fixed Debts:</span>
                  <span className="font-semibold">{formatCurrency(fixedDebtsMonthly)}</span>
                </div>
                <hr className="my-2 border-green-300" />
                <div className="flex justify-between font-bold">
                  <span>Remaining Lifestyle Budget:</span>
                  <span
                    className={`font-bold text-lg ${remainingLifestyleBudget >= 0 ? "text-green-600" : "text-red-600"}`}
                  >
                    {formatCurrency(remainingLifestyleBudget)}
                  </span>
                </div>
                {remainingLifestyleBudget < 0 && (
                  <div className="mt-2 text-xs italic text-gray-500">
                    <p className="font-medium mb-1">Ways to break even:</p>
                    <p>• Increase income by {formatCurrency(Math.abs(remainingLifestyleBudget))}/month</p>
                    <p>
                      • Reduce desired payment to{" "}
                      {Math.max(
                        15,
                        Math.round(
                          ((monthlyTakeHomeIncome * selectedMortgageOptions.livabilityIncomePercentage +
                            remainingLifestyleBudget) /
                            monthlyTakeHomeIncome) *
                            100,
                        ),
                      )}
                      %
                    </p>
                    <p>• Remove {formatCurrency(Math.abs(remainingLifestyleBudget))}/month of expenses</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Bottom Row: Livability One-Time Purchase Cash Requirements (Green Theme) */}
          <div className="p-4 border-2 border-green-200 rounded-lg bg-green-50">
            <h3 className="text-lg font-semibold text-green-800 mb-3">
              Livability One-Time Purchase Cash Requirements
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Left side - Description */}
              <div>
                <p className="text-2xl font-bold text-green-900 mb-2">{formatCurrency(oneTimePurchasePaymentTotal)}</p>
                <p className="text-sm text-green-700">
                  Total cash needed at closing and for immediate home-related expenses (based on Livability Purchase
                  Price).
                </p>
              </div>

              {/* Right side - Breakdown */}
              <div className="space-y-2 text-sm">
                <div className="flex justify-between items-center">
                  <span>
                    Down Payment ({formatPercentage(selectedMortgageOptions.effectiveDownPaymentPercentage / 100)}):
                  </span>
                  <span className="font-semibold">{formatCurrency(selectedMortgageOptions.availableDownPayment)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span>Transaction Costs (3% est.):</span>
                  <span className="font-semibold">{formatCurrency(transactionCosts)}</span>
                </div>
                {movingFirstMonthExpenses > 0 && (
                  <div className="flex justify-between items-center">
                    <span>Moving & First-Month:</span>
                    <span className="font-semibold">{formatCurrency(movingFirstMonthExpenses)}</span>
                  </div>
                )}
                <hr className="my-2 border-green-300" />
                <div className="flex justify-between items-center font-bold text-lg">
                  <span>Total Cash Needed:</span>
                  <span className="text-green-900">{formatCurrency(oneTimePurchasePaymentTotal)}</span>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      )}
    </Card>
  )
}
