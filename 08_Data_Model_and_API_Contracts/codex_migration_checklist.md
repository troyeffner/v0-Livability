# Codex Migration Checklist

## Canonical Entity Mapping

| Entity | TypeScript Type | Canonical Source | Notes |
|---|---|---|---|
| Scenario | `Scenario` | `lib/property-types.ts` | Named config: income + mortgage inputs |
| FinancialInputs | `FinancialInputs` | `lib/property-types.ts` | Extended version (has `annualTakeHomeIncome`, `marketReferenceRate`) |
| AffordabilityCalculation | `AffordabilityCalculation` | `lib/property-types.ts` | Output of `calculateMaxAffordability()` |
| LoanParams | `LoanParams` | `lib/finance-core.ts` | Input to `piti()` and binary-search solvers |
| SolveParams | `SolveParams` | `lib/finance-core.ts` | Input to `solvePurchasePriceForMonthlyBudget()` |
| Property | `Property` | `lib/property-types.ts` | Extended version with `zipCode`, `schoolDistrict`, etc. |
| FinancialItem | `FinancialItem` | `lib/real-estate-types.ts` | Planner-layer items with withholding fields (gross/net) |
| ComputeResult | `ComputeResult` | `lib/decision-rehearsal-engine.ts` | DR scoring output |
| BandKey | `BandKey` | `lib/decision-rehearsal-engine.ts` | `fragile` / `reactive` / `managing` / `stable` / `resilient` |
| Bucket | `Bucket` | `lib/liquidity-engine.ts` | Envelope partition |
| BucketType | `BucketType` | `lib/liquidity-engine.ts` | `operating` / `smoothing` / `ledger_reserve` / `capital` / `clearing` |

**Drift Risk:** `lib/real-estate-types.ts` partially duplicates `lib/property-types.ts`
with fewer fields. `property-types.ts` is canonical for the Workbench.
TODO(troy): Deduplicate — have `real-estate-types.ts` re-export shared types from `property-types.ts`.

## Epistemic Ingestion

Track open assumptions and hypotheses. Do not delete rows — mark Confirmed / Refuted as evidence lands.

| ID | Type | Statement | Status | Owner |
|---|---|---|---|---|
| E-01 | Assumption | Users will enter gross income; withholding defaults (25% tax, 5% 401k) are acceptable approximations | Unverified | TODO(troy) |
| E-02 | Assumption | 1.81% default property tax rate is a reasonable national fallback | Unverified | TODO(troy) |
| E-03 | Hypothesis | Pairing Sustainability + Location panels reduces confusion about which panel affects the other | Not tested | TODO(troy) |
| E-04 | Experiment | "Limiting Factor" badge on Purchase Roof cards — does it reduce support questions? | Not measured | TODO(troy) |
| E-05 | Assumption | `real-estate-planner/` is active and not legacy | Unconfirmed | TODO(troy) |

## Metaphor + Public Copy Alignment

Metaphors on the UI surface must not drift from underlying math. Audit this table on every formula change.

| UI Copy / Metaphor | Underlying Concept | Source | Drift Risk |
|---|---|---|---|
| "Purchase Roof" | `min(IncomeRoof, DownPaymentRoof)` | `affordability-summary.tsx` | HIGH — formula change requires updating badge labels and copy |
| "Limiting Factor" badge | `isIncomeRoofLimiting = incomeBasedRoof <= maxPriceFromDownPayment` | `affordability-summary.tsx` | MEDIUM — badge logic must match derivation |
| "Affordability Band" labels | `BandKey` thresholds in `MODES` config | `decision-rehearsal-engine.ts` | MEDIUM — threshold change requires UI copy update |
| "Liquidity Elasticity Index" | LEI composite score 0–100 | `lib/liquidity-engine.ts` | LOW — not yet surfaced in UI |
| "Housing Payment Ceiling" | `income × housingPct%` slider | `affordability-summary.tsx` | LOW — direct display, low drift risk |

**Rule:** If a metaphor label or tooltip changes, verify the underlying formula is still consistent.
**Rule:** If a formula changes, audit all UI copy that references it.

## Governance Rule Activation

| Rule ID | Rule | Status | Gate |
|---|---|---|---|
| GOV-01 | All business logic in `lib/`; no inline calculation logic in components | Partial | `incomeBasedRoof` IIFE in `affordability-summary.tsx` violates this — migration pending |
| GOV-02 | `lib/` functions must be pure (no DOM, no fetch, no side effects) | Active | Review all PRs touching `lib/` |
| GOV-03 | `components/ui/` must not be hand-edited | Active | Use `npx shadcn@latest add` only |
| GOV-04 | Math formula changes require owner sign-off | Active | Stated in `AGENTS.md` |
| GOV-05 | New dependencies must not add >10 KB gzipped without justification | Active | Check bundle with `pnpm build` output |
| GOV-06 | `pnpm build` must pass before any merge | Active | CI enforces this |
| GOV-07 | TypeScript errors must not be introduced (currently suppressed in build) | Partial | Enable `ignoreBuildErrors: false` to make this automatic |
| GOV-08 | New routes must register in `app-shell.tsx` NAV_ITEMS | Active | Checked manually |
| GOV-09 | No `--force` push to `main` | Active | Stated in `AGENTS.md` |

## Drift Scan and Blocking Issue Triage

Run before any major refactor or sprint close:

- [ ] `pnpm tsc --noEmit` — record all current errors as baseline before enabling strict mode
- [ ] Confirm `incomeBasedRoof` in `affordability-summary.tsx` uses same algorithm as `solvePurchasePriceForMonthlyBudget()` in `finance-core.ts`
- [ ] Confirm `actualRoof = Math.min(incomeBasedRoof, affordability.maxPriceFromDownPayment)`
- [ ] Confirm `customTaxRateInput` has a code comment marking it as not-yet-wired
- [ ] Confirm no calculation logic exists in component files outside `lib/`
- [ ] Confirm shared types in `real-estate-types.ts` match `property-types.ts` intent
- [ ] Confirm `MODES` band thresholds in `decision-rehearsal-engine.ts` match "Affordability Band" UI labels

## CI/Merge Gate Wiring

**Current CI** (`.github/workflows/nextjs.yml`):
- ✅ `pnpm install`
- ✅ `pnpm next build` (TypeScript errors suppressed)
- ✅ Upload `out/` → GitHub Pages

**Missing gates** — add to workflow when ready:
- [ ] `pnpm lint` step in CI
- [ ] `pnpm tsc --noEmit` step in CI (after `ignoreBuildErrors: false` is enabled)
- [ ] Automated test runner step (after test suite exists)

TODO(troy): Add lint + typecheck steps to `.github/workflows/nextjs.yml` before enabling `ignoreBuildErrors: false`.

## Ownership and Sign-Off

| Area | Owner | Sign-off Required For |
|---|---|---|
| Product direction | Troy Effner | New features, priority changes |
| Math / calculation changes | Troy Effner | Any change to `lib/` formulas |
| Type contracts | Troy Effner | New entities, field additions |
| UI / UX | Troy Effner | Major layout changes |
| Migration checklist updates | Troy Effner | Marking items complete |

**Migration baseline signed off by:** _____________ **Date:** _____________
