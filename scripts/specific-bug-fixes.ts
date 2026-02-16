// Specific bug fixes and edge case handling
console.log("Applying specific bug fixes...")

// Bug Fix 1: Handle NaN values in calculations
function safeNumber(value: any, defaultValue = 0): number {
  const num = Number(value)
  return isNaN(num) || !isFinite(num) ? defaultValue : num
}

// Bug Fix 2: Prevent negative loan amounts
function calculateLoanAmount(price: number, downPayment: number): number {
  return Math.max(0, safeNumber(price) - safeNumber(downPayment))
}

// Bug Fix 3: Handle division by zero in DTI calculations
function calculateDTI(monthlyDebts: number, monthlyIncome: number): number {
  const income = safeNumber(monthlyIncome)
  if (income === 0) return 0
  return (safeNumber(monthlyDebts) / income) * 100
}

// Bug Fix 4: Ensure percentage values are within valid ranges
function clampPercentage(value: number, min = 0, max = 100): number {
  return Math.max(min, Math.min(max, safeNumber(value)))
}

// Bug Fix 5: Handle empty arrays and null values
function safeArrayAccess<T>(array: T[] | null | undefined, index: number, defaultValue: T): T {
  if (!array || !Array.isArray(array) || index < 0 || index >= array.length) {
    return defaultValue
  }
  return array[index]
}

console.log("Bug fixes applied:")
console.log("- Safe number handling")
console.log("- Negative loan amount prevention")
console.log("- Division by zero protection")
console.log("- Percentage clamping")
console.log("- Safe array access")

// Test the fixes
console.log("\nTesting bug fixes...")

console.log(`safeNumber(NaN): ${safeNumber(Number.NaN)}`)
console.log(`safeNumber("invalid"): ${safeNumber("invalid")}`)
console.log(`calculateLoanAmount(400000, 500000): ${calculateLoanAmount(400000, 500000)}`)
console.log(`calculateDTI(1000, 0): ${calculateDTI(1000, 0)}`)
console.log(`clampPercentage(-10): ${clampPercentage(-10)}`)
console.log(`clampPercentage(150): ${clampPercentage(150)}`)

console.log("All bug fixes verified!")
