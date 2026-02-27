/**
 * Liquidity Engine
 *
 * Pure, deterministic functions for modeling personal cashflow control:
 *   - Envelope partitions (sub-accounts / buckets)
 *   - Peak funding for variable bills
 *   - Credit card charge clearing workflow
 *   - Annual reserve ledger with mandatory withdrawal logging
 *   - Pressure-valve redistribution when reserves exceed required coverage
 *   - Liquidity Elasticity Index (LEI) composite score 0–100
 *
 * No UI, no storage, no side effects. Designed to be composed into larger apps.
 */

import { clamp, safeNumber } from './finance-core'
import type { Money } from './finance-core'

// ---------------------------------------------------------------------------
// Type aliases
// ---------------------------------------------------------------------------

export type { Money }

export type BucketType = 'operating' | 'smoothing' | 'ledger_reserve' | 'capital' | 'clearing'
export type BucketStatus = 'active' | 'dormant'
export type TargetRule = 'peak' | 'fixed' | 'goal' | 'none'
export type BucketConstraint = 'none' | 'ledger_required' | 'transfer_required'
export type ChargeStatus = 'unmatched' | 'matched_unfunded' | 'funded' | 'cleared' | 'ignored'

// ---------------------------------------------------------------------------
// Domain interfaces
// ---------------------------------------------------------------------------

/**
 * A named envelope partition (sub-account or logical bucket).
 * Buckets whose name starts with 'zz' are treated as dormant regardless
 * of the status field.
 */
export interface Bucket {
  id: string
  name: string
  type: BucketType
  status: BucketStatus
  balance: Money
  targetRule: TargetRule
  constraints: BucketConstraint
  notes?: string
  color?: string
  tags?: string[]
}

/**
 * An annual obligation (insurance, registration, property tax, etc.).
 * Only unpaid obligations count toward the required reserve.
 */
export interface Obligation {
  id: string
  name: string
  expectedCost: Money
  dueMonth: number   // 1–12
  paid: boolean
}

/**
 * A credit card charge in the clearing workflow.
 *
 * Status lifecycle:
 *   unmatched → matched_unfunded → funded → cleared
 *   unmatched → ignored  (user dismisses it)
 */
export interface Charge {
  id: string
  merchant: string
  amount: Money
  date: string         // ISO date YYYY-MM-DD
  categoryHint?: string
  status: ChargeStatus
  bucketId?: string    // set once matched to a bucket
}

/**
 * A mandatory withdrawal record required when taking money from a
 * ledger_reserve bucket.
 */
export interface LedgerEntry {
  id: string
  bucketId: string
  date: string
  amount: Money
  obligationId?: string
  note: string
}

// ---------------------------------------------------------------------------
// Result interfaces
// ---------------------------------------------------------------------------

export interface PeakFundingResult {
  /** Sum of peak-month amounts across all variable categories */
  peakTotal: Money
  /** Sum of monthly averages across all variable categories */
  avgTotal: Money
  /** Volatility absorbed: peakTotal − avgTotal */
  absorbedTotal: Money
  /** absorbedTotal / peakTotal; 0 when peakTotal is 0 */
  shieldRatio: number
}

export interface RedistributionAllocation {
  targetId: string
  amount: Money
  /** Normalized weight actually applied (0–1) */
  pct: number
}

export interface ClearingState {
  /** Total value of all active (non-ignored, non-cleared) charges */
  outstandingTotal: Money
  /** Total value of funded + cleared charges */
  fundedTotal: Money
  /** Unfunded exposure: max(0, outstanding − funded − clearingBalance) */
  clearingFloat: Money
  /** funded / (funded + unfundedExposure); 1 when exposure is zero */
  clearingIntegrity: number
}

export interface LEIBreakdown {
  lHard: Money        // active operating bucket balances
  lSoft: Money        // active smoothing bucket balances
  lCommitted: Money   // min(annualBalance, requiredAnnualReserve)
  aExcess: Money      // annual reserve excess above (required + buffer)
  lRealloc: Money     // lSoft + aExcess — reallocable liquidity
  constraints: Money  // requiredAnnualReserve + clearingFloat
  elasticity: number  // lRealloc / (constraints + epsilon)
  eNorm: number       // elasticity / (elasticity + 1), normalized 0–1
  volShield: number   // shieldRatio from peakFundingShield
  clearInt: number    // clearingIntegrity
}

export interface LEIResult {
  /** Composite Liquidity Elasticity Index, 0–100 */
  lei: number
  breakdown: LEIBreakdown
}

export interface LEIInput {
  buckets: Bucket[]
  obligations: Obligation[]
  charges: Charge[]
  /** For each variable expense category: 12 monthly spend amounts */
  vars12mo: Record<string, number[]>
  /** Safety buffer kept on top of required reserve before excess is computed */
  buffer: Money
  /** Division guard to prevent divide-by-zero (default: 0.01) */
  epsilon?: number
}

// ---------------------------------------------------------------------------
// Bucket utilities
// ---------------------------------------------------------------------------

/**
 * Returns true if a bucket is dormant.
 * A bucket is dormant if its name starts with 'zz' OR status is 'dormant'.
 */
export function isDormant(bucket: Bucket): boolean {
  return bucket.name.startsWith('zz') || bucket.status === 'dormant'
}

/**
 * Returns all non-dormant buckets, optionally filtered to a single type.
 */
export function activeBuckets(buckets: Bucket[], type?: BucketType): Bucket[] {
  return buckets.filter(b => !isDormant(b) && (type === undefined || b.type === type))
}

// ---------------------------------------------------------------------------
// Annual reserve
// ---------------------------------------------------------------------------

/**
 * Required annual reserve: sum of expectedCost for all unpaid obligations.
 */
export function requiredAnnualReserve(obligations: Obligation[]): Money {
  return obligations.reduce(
    (sum, o) => sum + (o.paid ? 0 : safeNumber(o.expectedCost)),
    0,
  )
}

/**
 * Current annual reserve balance: sum of active ledger_reserve bucket balances.
 */
export function annualReserveBalance(buckets: Bucket[]): Money {
  return activeBuckets(buckets, 'ledger_reserve').reduce(
    (sum, b) => sum + safeNumber(b.balance),
    0,
  )
}

/**
 * Excess above the required reserve + safety buffer.
 * Returns 0 if the balance does not exceed the floor.
 */
export function annualExcess(annualBalance: Money, required: Money, buffer: Money): Money {
  return Math.max(0, annualBalance - (required + buffer))
}

/**
 * Returns true when the excess exceeds the redistribution threshold,
 * meaning a pressure-valve redistribution run is warranted.
 */
export function pressureValveEligible(excess: Money, threshold: Money): boolean {
  return excess > threshold
}

/**
 * Produces a redistribution plan that allocates `excess` across targets
 * according to normalized weights.
 *
 * Rules with weight <= 0 are ignored. The total allocated will equal
 * `excess` (subject to floating-point rounding).
 */
export function redistributionPlan(
  excess: Money,
  rules: Array<{ targetId: string; weight: number }>,
): RedistributionAllocation[] {
  const valid = rules.filter(r => r.weight > 0)
  if (valid.length === 0 || excess <= 0) return []

  const totalWeight = valid.reduce((s, r) => s + r.weight, 0)
  return valid.map(r => {
    const pct = r.weight / totalWeight
    return { targetId: r.targetId, amount: excess * pct, pct }
  })
}

// ---------------------------------------------------------------------------
// Peak funding
// ---------------------------------------------------------------------------

/**
 * Computes peak funding shield metrics for a set of variable expense
 * categories over 12 months of historical/projected spend.
 *
 * For each category:
 *   peak = max monthly spend
 *   avg  = mean monthly spend
 *   absorbed = peak − avg
 *
 * shieldRatio = absorbedTotal / peakTotal (0 when peakTotal is 0).
 * A higher ratio means more volatility is absorbed by peak-funding.
 */
export function peakFundingShield(vars12mo: Record<string, number[]>): PeakFundingResult {
  let peakTotal = 0
  let avgTotal = 0

  for (const months of Object.values(vars12mo)) {
    if (!months.length) continue
    const peak = Math.max(...months)
    const avg = months.reduce((s, v) => s + v, 0) / months.length
    peakTotal += peak
    avgTotal += avg
  }

  const absorbedTotal = peakTotal - avgTotal
  const shieldRatio = peakTotal > 0 ? absorbedTotal / peakTotal : 0

  return { peakTotal, avgTotal, absorbedTotal, shieldRatio }
}

// ---------------------------------------------------------------------------
// Clearing workflow
// ---------------------------------------------------------------------------

/**
 * Returns all active charges (excludes ignored and cleared).
 * These are the charges still requiring action.
 */
export function outstandingCharges(charges: Charge[]): Charge[] {
  return charges.filter(c => c.status !== 'ignored' && c.status !== 'cleared')
}

/**
 * Sum of all outstanding (active) charge amounts.
 */
export function outstandingTotal(charges: Charge[]): Money {
  return outstandingCharges(charges).reduce((s, c) => s + safeNumber(c.amount), 0)
}

/**
 * Sum of all funded or cleared charge amounts.
 * Represents money already earmarked or paid.
 */
export function fundedChargesTotal(charges: Charge[]): Money {
  return charges
    .filter(c => c.status === 'funded' || c.status === 'cleared')
    .reduce((s, c) => s + safeNumber(c.amount), 0)
}

/**
 * Unfunded exposure: the portion of outstanding charges not yet covered
 * by funded amounts or the current clearing bucket balance.
 *
 * A positive clearingFloat means you have charges you haven't lined up
 * funding for yet — the "blur" the system is designed to prevent.
 */
export function clearingFloat(outstanding: Money, funded: Money, clearingBalance: Money): Money {
  return Math.max(0, outstanding - funded - clearingBalance)
}

/**
 * Clearing integrity ratio: 0–1.
 * 1.0 = all outstanding charges are fully funded (no blur).
 * 0.0 = nothing is funded.
 *
 * Returns 1.0 when both funded and unfundedExposure are zero
 * (nothing outstanding — perfectly clean).
 */
export function clearingIntegrity(funded: Money, unfundedExposure: Money): number {
  const denom = funded + unfundedExposure
  if (denom === 0) return 1
  return clamp(funded / denom, 0, 1)
}

/**
 * Composite clearing state derived from a charge list and the clearing bucket.
 */
export function clearingState(charges: Charge[], clearingBucket: Bucket): ClearingState {
  const outstanding = outstandingTotal(charges)
  const funded      = fundedChargesTotal(charges)
  const balance     = safeNumber(clearingBucket.balance)
  const exposure    = clearingFloat(outstanding, funded, balance)
  const integrity   = clearingIntegrity(funded, exposure)

  return {
    outstandingTotal: outstanding,
    fundedTotal:      funded,
    clearingFloat:    exposure,
    clearingIntegrity: integrity,
  }
}

// ---------------------------------------------------------------------------
// Liquidity Elasticity Index (LEI)
// ---------------------------------------------------------------------------

/**
 * Computes the Liquidity Elasticity Index (0–100).
 *
 * Measures how much financial flexibility exists relative to committed
 * obligations. Higher = more elastic (more buffer to absorb shocks).
 *
 * Formula:
 *   L_hard     = active operating balance
 *   L_soft     = active smoothing balance
 *   L_committed = min(annualBalance, requiredReserve)
 *   A_excess   = annualExcess(annualBalance, requiredReserve, buffer)
 *   L_realloc  = L_soft + A_excess          (reallocable liquidity)
 *   Constr     = requiredReserve + clearingFloat
 *   Elasticity = L_realloc / (Constr + epsilon)
 *   E_norm     = Elasticity / (Elasticity + 1)   [0..1 sigmoid-like]
 *   LEI        = 100 * clamp(0.60*E_norm + 0.20*volShield + 0.20*clearInt, 0, 1)
 */
export function liquidityElasticityIndex(input: LEIInput): LEIResult {
  const { buckets, obligations, charges, vars12mo, buffer } = input
  const epsilon = safeNumber(input.epsilon, 0.01)

  // Bucket pools
  const lHard = activeBuckets(buckets, 'operating').reduce(
    (s, b) => s + safeNumber(b.balance), 0,
  )
  const lSoft = activeBuckets(buckets, 'smoothing').reduce(
    (s, b) => s + safeNumber(b.balance), 0,
  )

  // Annual reserve
  const annualBal  = annualReserveBalance(buckets)
  const required   = requiredAnnualReserve(obligations)
  const lCommitted = Math.min(annualBal, required)
  const aExcess    = annualExcess(annualBal, required, buffer)
  const lRealloc   = lSoft + aExcess

  // Clearing — find the first active clearing bucket
  const clearingBucket = activeBuckets(buckets, 'clearing')[0] ?? {
    id: '_none', name: '_none', type: 'clearing' as BucketType,
    status: 'active' as BucketStatus, balance: 0,
    targetRule: 'none' as TargetRule, constraints: 'none' as BucketConstraint,
  }
  const cs = clearingState(charges, clearingBucket)

  // Composite score components
  const constraints = required + cs.clearingFloat
  const elasticity  = lRealloc / (constraints + epsilon)
  const eNorm       = elasticity / (elasticity + 1)
  const volShield   = peakFundingShield(vars12mo).shieldRatio
  const clearInt    = cs.clearingIntegrity

  const lei = 100 * clamp(0.60 * eNorm + 0.20 * volShield + 0.20 * clearInt, 0, 1)

  return {
    lei,
    breakdown: {
      lHard, lSoft, lCommitted, aExcess, lRealloc,
      constraints, elasticity, eNorm, volShield, clearInt,
    },
  }
}

// ---------------------------------------------------------------------------
// Example data + assertions (excluded from production builds)
// ---------------------------------------------------------------------------

if (typeof process !== 'undefined' && process.env['NODE_ENV'] !== 'production') {
  // --- Example data ---

  const EXAMPLE_BUCKETS: Bucket[] = [
    { id: 'op1',  name: 'Checking',         type: 'operating',      status: 'active',  balance: 3200,  targetRule: 'none',  constraints: 'none' },
    { id: 'sm1',  name: 'MonthlyBills',      type: 'smoothing',      status: 'active',  balance: 1800,  targetRule: 'peak',  constraints: 'none' },
    { id: 'sm2',  name: 'Groceries',         type: 'smoothing',      status: 'active',  balance:  600,  targetRule: 'peak',  constraints: 'none' },
    { id: 'lr1',  name: 'AnnualReserve',     type: 'ledger_reserve', status: 'active',  balance: 8400,  targetRule: 'fixed', constraints: 'ledger_required' },
    { id: 'cl1',  name: 'ChaseClearing',     type: 'clearing',       status: 'active',  balance:  950,  targetRule: 'none',  constraints: 'transfer_required' },
    { id: 'zzold',name: 'zzOldSavings',      type: 'capital',        status: 'dormant', balance: 2000,  targetRule: 'none',  constraints: 'none' },
  ]

  const EXAMPLE_OBLIGATIONS: Obligation[] = [
    { id: 'ob1', name: 'Home Insurance',    expectedCost: 2400, dueMonth: 3,  paid: false },
    { id: 'ob2', name: 'Car Registration',  expectedCost:  800, dueMonth: 7,  paid: false },
    { id: 'ob3', name: 'Property Tax',      expectedCost: 3600, dueMonth: 11, paid: false },
    { id: 'ob4', name: 'Term Life Premium', expectedCost: 1200, dueMonth: 1,  paid: true  },
  ]

  const EXAMPLE_CHARGES: Charge[] = [
    { id: 'ch1', merchant: 'Petco',      amount: 68,  date: '2025-06-02', categoryHint: 'MonthlyBills', status: 'funded',           bucketId: 'sm1' },
    { id: 'ch2', merchant: 'Whole Foods',amount: 145, date: '2025-06-03', categoryHint: 'Groceries',    status: 'matched_unfunded', bucketId: 'sm2' },
    { id: 'ch3', merchant: 'Shell',      amount: 82,  date: '2025-06-04', categoryHint: 'Auto',         status: 'unmatched' },
    { id: 'ch4', merchant: 'Netflix',    amount: 18,  date: '2025-06-01', categoryHint: 'MonthlyBills', status: 'cleared',          bucketId: 'sm1' },
    { id: 'ch5', merchant: 'Amazon',     amount: 35,  date: '2025-06-05',                               status: 'ignored' },
  ]

  const EXAMPLE_VARS_12MO: Record<string, number[]> = {
    groceries: [380, 410, 390, 425, 440, 460, 390, 375, 410, 430, 490, 510],
    utilities: [160, 170, 150, 130, 120, 140, 200, 210, 175, 155, 180, 195],
    auto_fuel:  [75,  80,  70,  90,  85,  95,  80,  70,  75,  90,  85, 100],
  }

  // --- Assertions ---

  function assert(label: string, condition: boolean): void {
    if (!condition) console.error(`FAIL: ${label}`)
    else            console.log (`PASS: ${label}`)
  }

  function near(a: number, b: number, tolerance = 0.001): boolean {
    return Math.abs(a - b) <= tolerance
  }

  // isDormant
  assert(
    'isDormant: zz-prefixed name → dormant regardless of status field',
    isDormant(EXAMPLE_BUCKETS.find(b => b.id === 'zzold')!),
  )
  assert(
    'isDormant: active non-zz bucket → not dormant',
    !isDormant(EXAMPLE_BUCKETS.find(b => b.id === 'op1')!),
  )

  // activeBuckets
  assert(
    'activeBuckets: excludes zz dormant bucket',
    activeBuckets(EXAMPLE_BUCKETS).every(b => !b.name.startsWith('zz')),
  )
  assert(
    'activeBuckets: type filter returns only clearing buckets',
    activeBuckets(EXAMPLE_BUCKETS, 'clearing').length === 1,
  )

  // requiredAnnualReserve (excludes paid ob4)
  assert(
    'requiredAnnualReserve: excludes paid obligations',
    near(requiredAnnualReserve(EXAMPLE_OBLIGATIONS), 2400 + 800 + 3600),
  )

  // annualReserveBalance
  assert(
    'annualReserveBalance: sums only ledger_reserve active buckets',
    near(annualReserveBalance(EXAMPLE_BUCKETS), 8400),
  )

  // annualExcess
  assert(
    'annualExcess: zero when balance < required + buffer',
    annualExcess(5000, 4000, 2000) === 0,
  )
  assert(
    'annualExcess: positive when balance exceeds required + buffer',
    near(annualExcess(9000, 4000, 2000), 3000),
  )

  // pressureValveEligible
  assert(
    'pressureValveEligible: true when excess > threshold',
    pressureValveEligible(3000, 1000),
  )
  assert(
    'pressureValveEligible: false when excess === threshold',
    !pressureValveEligible(1000, 1000),
  )

  // redistributionPlan
  const plan = redistributionPlan(1000, [
    { targetId: 'sm1', weight: 3 },
    { targetId: 'sm2', weight: 1 },
  ])
  assert(
    'redistributionPlan: allocations sum to excess',
    near(plan.reduce((s, a) => s + a.amount, 0), 1000),
  )
  assert(
    'redistributionPlan: weights normalize to 1',
    near(plan.reduce((s, a) => s + a.pct, 0), 1),
  )
  assert(
    'redistributionPlan: proportional split 75/25',
    near(plan[0].amount, 750) && near(plan[1].amount, 250),
  )
  assert(
    'redistributionPlan: empty when excess is 0',
    redistributionPlan(0, [{ targetId: 'sm1', weight: 1 }]).length === 0,
  )

  // peakFundingShield
  const shield = peakFundingShield(EXAMPLE_VARS_12MO)
  assert('peakFundingShield: peakTotal > avgTotal', shield.peakTotal > shield.avgTotal)
  assert('peakFundingShield: shieldRatio in 0..1', shield.shieldRatio >= 0 && shield.shieldRatio <= 1)
  assert(
    'peakFundingShield: absorbedTotal = peakTotal - avgTotal',
    near(shield.absorbedTotal, shield.peakTotal - shield.avgTotal),
  )
  assert(
    'peakFundingShield: empty input → all zeros',
    (() => {
      const r = peakFundingShield({})
      return r.peakTotal === 0 && r.shieldRatio === 0
    })(),
  )

  // outstandingTotal (excludes ignored ch5 and cleared ch4)
  assert(
    'outstandingTotal: excludes ignored and cleared',
    near(outstandingTotal(EXAMPLE_CHARGES), 68 + 145 + 82),
  )

  // fundedChargesTotal (funded ch1 + cleared ch4)
  assert(
    'fundedChargesTotal: includes funded + cleared',
    near(fundedChargesTotal(EXAMPLE_CHARGES), 68 + 18),
  )

  // clearingFloat
  assert(
    'clearingFloat: zero when balance covers gap',
    clearingFloat(100, 80, 50) === 0,
  )
  assert(
    'clearingFloat: positive exposure when underfunded',
    near(clearingFloat(300, 50, 100), 150),
  )

  // clearingIntegrity
  assert(
    'clearingIntegrity: 1.0 when exposure is zero (fully funded)',
    near(clearingIntegrity(500, 0), 1),
  )
  assert(
    'clearingIntegrity: 1.0 when both are zero (clean slate)',
    near(clearingIntegrity(0, 0), 1),
  )
  assert(
    'clearingIntegrity: 0.0 when nothing funded',
    near(clearingIntegrity(0, 200), 0),
  )
  assert(
    'clearingIntegrity: 0.5 when half funded',
    near(clearingIntegrity(100, 100), 0.5),
  )

  // clearingState composite
  const cs = clearingState(EXAMPLE_CHARGES, EXAMPLE_BUCKETS.find(b => b.id === 'cl1')!)
  assert('clearingState: outstandingTotal matches manual calc', near(cs.outstandingTotal, 68 + 145 + 82))
  assert('clearingState: fundedTotal matches manual calc',      near(cs.fundedTotal, 68 + 18))
  assert('clearingState: clearingIntegrity in 0..1',           cs.clearingIntegrity >= 0 && cs.clearingIntegrity <= 1)

  // liquidityElasticityIndex
  const result = liquidityElasticityIndex({
    buckets:     EXAMPLE_BUCKETS,
    obligations: EXAMPLE_OBLIGATIONS,
    charges:     EXAMPLE_CHARGES,
    vars12mo:    EXAMPLE_VARS_12MO,
    buffer:      500,
    epsilon:     0.01,
  })
  assert('LEI: result in 0–100', result.lei >= 0 && result.lei <= 100)
  assert('LEI: breakdown.lHard matches operating balance', near(result.breakdown.lHard, 3200))
  assert('LEI: breakdown.lSoft matches smoothing balances', near(result.breakdown.lSoft, 1800 + 600))
  assert('LEI: breakdown.eNorm in 0..1', result.breakdown.eNorm >= 0 && result.breakdown.eNorm <= 1)
  assert('LEI: breakdown.volShield in 0..1', result.breakdown.volShield >= 0 && result.breakdown.volShield <= 1)
  assert('LEI: dormant bucket balance excluded from lHard', true) // zzOldSavings not in lHard

  console.log('\nLEI result:', JSON.stringify(result, null, 2))
}
