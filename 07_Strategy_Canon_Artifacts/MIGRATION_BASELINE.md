# MIGRATION_BASELINE.md

**Date:** 2026-02-28
**Repo:** https://github.com/troyeffner/v0-Livability
**Purpose:** Record what is encoded, what is missing, and execute the 7-day
migration to full Codex-driven workflow.

## Existing Encoded Foundations

| Layer | What Exists | Location |
|---|---|---|
| Routing | 4 routes (2 live, 2 stub) | `app/` |
| Build + deploy | pnpm → static export → GitHub Pages CI | `.github/workflows/nextjs.yml` |
| Math engine | `pmt()`, `piti()`, `solvePurchasePriceForMonthlyBudget()` | `lib/finance-core.ts` |
| Affordability engine | `calculateMaxAffordability()`, interest rate estimation | `lib/affordability-calculations.ts` |
| Decision Rehearsal engine | Scoring, band detection, pattern logic | `lib/decision-rehearsal-engine.ts` |
| Liquidity engine | Envelope partitions, LEI, charge workflow | `lib/liquidity-engine.ts` |
| Domain types | `Scenario`, `FinancialInputs`, `AffordabilityCalculation`, `Bucket` | `lib/property-types.ts`, `lib/finance-core.ts`, `lib/liquidity-engine.ts` |
| Brand tokens | Teal/mint palette, HSL shadcn vars | `tailwind.config.ts` |
| Local preview | `npx serve out -p 3010` | `.claude/launch.json` |
| Agent config | Bash permissions | `.claude/settings.local.json` |

## Gap Table

| Area | Current | Target | Severity | First Action |
|---|---|---|---|---|
| Agent grounding docs | None | `AGENTS.md` + `CODEX_CONTEXT.md` at root | CRITICAL | This sprint ✓ |
| Math canon doc | None | Formula spec in `08_Data_Model_and_API_Contracts/` | HIGH | Day 3–4 |
| TypeScript build errors | Suppressed (`ignoreBuildErrors: true`) | Errors fatal in build | HIGH | Set `ignoreBuildErrors: false`, fix errors |
| `incomeBasedRoof` calculation | Inline IIFE in `affordability-summary.tsx` | Uses `solvePurchasePriceForMonthlyBudget()` from `finance-core.ts` | HIGH | Migration task Day 3–4 |
| Tax rate override | State-only, not wired | Wired to `activePropertyTaxRate` | MEDIUM | Day 5–6 |
| Type duplication | `property-types.ts` ≈ `real-estate-types.ts` | Single canonical source | MEDIUM | Confirm `property-types.ts` as canon, migrate refs |
| Test suite | None | Smoke tests for core lib functions | MEDIUM | Day 5–6 |
| Liquidity Engine UI | Logic only | Ongoing Budget page using `lib/liquidity-engine.ts` | MEDIUM | Next sprint |
| `real-estate-planner/` status | Unknown (20 files, ~6 K LOC) | Confirmed active or archived | LOW | Owner decision |
| Error boundary | None on main workbench | React ErrorBoundary wrapping `PropertyAffordabilityWorkbench` | LOW | After test suite |

## 7-Day Migration Execution Plan

**Day 1–2: Grounding (this sprint)**
- [x] Create `AGENTS.md` — build commands, architecture map, working agreements, constraints
- [x] Create `CODEX_CONTEXT.md` — product context, glossary, decision policy, risk register
- [x] Create `07_Strategy_Canon_Artifacts/MIGRATION_BASELINE.md` (this file)
- [x] Create `08_Data_Model_and_API_Contracts/codex_migration_checklist.md`
- [x] Append "Using Codex Desktop" section to `README.md`
- **Outcome:** Codex can open repo and immediately understand context, commands, rules.

**Day 3–4: Math Canon**
- [ ] Write formula spec in `08_Data_Model_and_API_Contracts/` for:
  - Purchase Roof formulas (Income Roof, Down Payment Roof, Real Roof)
  - Decision Rehearsal band thresholds and scoring weights
  - LEI calculation inputs and output range
- [ ] Migrate `incomeBasedRoof` in `affordability-summary.tsx` to use `solvePurchasePriceForMonthlyBudget()`
- **Outcome:** Every formula has one canonical home. Inline logic eliminated.

**Day 5–6: Immediate Tech Debt**
- [ ] Wire `customTaxRateInput` to `activePropertyTaxRate` in calculation layer
- [ ] Set `typescript.ignoreBuildErrors: false` in `next.config.mjs`, fix all TS errors
- [ ] Add smoke tests in `scripts/` for `piti()`, `calculateMaxAffordability()`, `solvePurchasePriceForMonthlyBudget()`
- **Outcome:** Build is honest. State has no ghost fields. Core math has regression signal.

**Day 7: Verify**
- [ ] Fresh `pnpm install && pnpm build` from clean state — passes
- [ ] Codex session opens cold: reads AGENTS.md, understands what to run, what not to touch
- [ ] No drift between `lib/` formulas and component usage
- [ ] `08_Data_Model_and_API_Contracts/codex_migration_checklist.md` sign-off block filled
- **Outcome:** Repo is Codex-ready. Any agent can onboard in < 5 minutes.
