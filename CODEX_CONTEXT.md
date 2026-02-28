# CODEX_CONTEXT.md

## Product Context
Livability is a personal housing decision toolkit — a static web app with no
backend, no auth, and no data collection. It is directional thinking support,
explicitly **not financial advice**.

**Live:** https://troyeffner.github.io/v0-Livability/
**Repo:** https://github.com/troyeffner/v0-Livability

Three working tools:
1. **Mortgage & Move Planner** — income, down payment, mortgage inputs → affordability ceiling
2. **Decision Rehearsal** — slider-based scoring across 3 pressure modes → decision band
3. **Liquidity Engine** — envelope budgeting, Liquidity Elasticity Index (logic complete, UI not yet built)

Two stub pages: Home Sale, Ongoing Budget.

## Current Status (2026-02)
| Feature | State | Notes |
|---|---|---|
| Mortgage & Move Planner | Live | Core affordability workbench |
| Decision Rehearsal | Live | `/decision-rehearsal` route |
| Liquidity Engine | Logic only | `lib/liquidity-engine.ts` — no UI |
| Home Sale | Stub | Placeholder page |
| Ongoing Budget | Stub | Placeholder page |
| Tax rate override | UI-only | `customTaxRateInput` stored in state, not wired to math |
| Type deduplication | Gap | `property-types.ts` and `real-estate-types.ts` overlap |

## Active Priorities
**Now**
- Wire `customTaxRateInput` to `activePropertyTaxRate` in calculation layer
- Enable TypeScript errors in build (`ignoreBuildErrors: false` in `next.config.mjs`)

**Next**
- Build Ongoing Budget UI using `lib/liquidity-engine.ts`
- Build Home Sale scenario planner
- Deduplicate `property-types.ts` vs `real-estate-types.ts`
- Migrate `incomeBasedRoof` inline logic to use `solvePurchasePriceForMonthlyBudget()` from `lib/finance-core.ts`

## Domain Glossary
| Term | Definition |
|---|---|
| Purchase Roof | Maximum purchase price a user can afford under a constraint |
| Income Roof | Purchase Roof from Housing Payment Ceiling (income-driven) |
| Down Payment Roof | Purchase Roof from available equity: `availableDownPayment / (dpPct / 100)` |
| Real Purchase Roof | `min(IncomeRoof, DownPaymentRoof)` — the actual binding ceiling |
| Limiting Factor | The constraint (income or equity) that produces the Real Purchase Roof |
| Housing Payment Ceiling | `income × (housingPct / 100)` — max monthly housing payment |
| PITI | Principal + Interest + Tax + Insurance — full monthly housing cost |
| Affordability Band | fragile / reactive / managing / stable / resilient (Decision Rehearsal scoring) |
| LEI | Liquidity Elasticity Index — composite 0–100 score of cashflow buffer |
| Bucket | Named envelope partition in the liquidity engine (`operating`, `smoothing`, `ledger_reserve`, `capital`, `clearing`) |
| Scenario | Named user config: income sources + down payment sources + mortgage terms |
| basePath | `/v0-Livability` — injected by CI only; empty on local dev |
| canon lock | Rule that a given calculation or type lives in exactly one source file |

## Decision Policy
| Situation | Policy |
|---|---|
| UI-only change (styling, copy) | Implement directly |
| Calculation / formula change | Get owner sign-off; update `08_Data_Model_and_API_Contracts/codex_migration_checklist.md` |
| New feature / route | Plan first, confirm scope |
| New dependency | Evaluate bundle cost first; pnpm only |
| Ambiguous requirement | Stop and ask; do not assume |
| Conflict between files | `lib/` is source of truth; components are display layer |

## Risk Register
| Risk | Severity | Mitigation |
|---|---|---|
| `affordability-summary.tsx` is 2,933 LOC | HIGH | Do not add logic here; extract to `lib/`. Track drift. |
| TypeScript errors suppressed in build | HIGH | Enable `ignoreBuildErrors: false` as first tech debt task |
| `property-types.ts` and `real-estate-types.ts` duplicate types | MEDIUM | Deduplicate; `property-types.ts` is canonical |
| `customTaxRateInput` does nothing | MEDIUM | Wire to `activePropertyTaxRate` before launch |
| `incomeBasedRoof` inline IIFE diverges from `finance-core.ts` | MEDIUM | Migrate to `solvePurchasePriceForMonthlyBudget()` |
| Liquidity Engine has no UI | LOW-MEDIUM | Unblock with Ongoing Budget page |
| No automated test suite | MEDIUM | Add smoke tests for core lib functions |
| `real-estate-planner/` status unknown (active vs legacy) | LOW | Confirm with owner; archive if legacy |

## Start Here — Codex Desktop Session Boot
```
1. Confirm working directory: /Users/troyeffner/Dropbox/DEV/Livability
2. Read AGENTS.md — build commands, architecture, safety constraints
3. Read this file — product state, glossary, decision policy
4. For calculation work: read lib/finance-core.ts first — it is the math canon
5. For entity changes: read 08_Data_Model_and_API_Contracts/codex_migration_checklist.md
6. For migration status: read 07_Strategy_Canon_Artifacts/MIGRATION_BASELINE.md
7. Run: pnpm build && npx serve out -p 3010 — confirm baseline works before touching code
```
