# AGENTS.md

## Mission and Scope
Livability is a static-export Next.js app hosted on GitHub Pages. It helps
people reason about housing affordability, decision pressure, and cashflow.
It is a personal financial **thinking tool** — not a financial advisor, not a
data product. All logic is local; no backend, no auth, no APIs.

## Tech Stack
| Layer | Tool | Version |
|---|---|---|
| Framework | Next.js (App Router, `output: 'export'`) | 15.2.6 |
| UI runtime | React | 19 |
| Language | TypeScript (strict) | 5.x |
| Styling | Tailwind CSS | 3.4.17 |
| Component kit | shadcn/ui (local copy in `components/ui/`) | latest |
| Package manager | pnpm | 9 |
| Hosting | GitHub Pages via GitHub Actions | — |
| Preview MCP | `npx serve out -p 3010` | — |

## Canonical Commands
```bash
pnpm install                     # install dependencies
pnpm dev                         # dev server → http://localhost:3000 (no basePath)
pnpm build                       # static export → out/
pnpm lint                        # ESLint
pnpm tsc --noEmit                # TypeScript check (errors NOT fatal in build — see Constraints)
npx serve out -p 3010            # preview built output → http://localhost:3010
```
**No test runner configured.** `scripts/` contains manual-run Node.js validation files.

## Architecture Map
```
app/                           Next.js App Router routes
  page.tsx                     → PropertyAffordabilityWorkbench (home, live)
  decision-rehearsal/          → DrPage (live)
  home-sale/                   → stub page ("coming soon")
  ongoing-budget/              → stub page ("coming soon")

components/
  app-shell.tsx                Global nav; update NAV_ITEMS here for new routes
  property-workbench/          Mortgage & Move Planner (7 files, ~5 K LOC)
    affordability-summary.tsx  Largest file (2,933 LOC) — highest drift risk
  real-estate-planner/         Real Estate Planner tab (20 files, ~6 K LOC) — may be legacy
  decision-rehearsal/
    dr-page.tsx                Decision Rehearsal UI (574 LOC)
  ui/                          59 shadcn/ui primitives — DO NOT hand-edit

lib/                           Pure TypeScript engines — no DOM, no side effects
  finance-core.ts              pmt(), piti(), solvePurchasePriceForMonthlyBudget(), clamp
  affordability-calculations.ts  estimateInterestRate, calculateMaxAffordability
  decision-rehearsal-engine.ts   Scoring, band detection, pattern logic
  liquidity-engine.ts            Envelope budgeting, Liquidity Elasticity Index
  property-types.ts              Canonical type definitions for Workbench
  real-estate-types.ts           Type definitions for Planner (partial overlap — see Risks)

hooks/
  use-memoized-calculations.ts   Perf memoization (7.5 K LOC — large)

scripts/                       Manual validation only; not part of CI
.github/workflows/nextjs.yml   CI: pnpm install → pnpm next build → upload out/ → GitHub Pages
```

## Working Agreements for AI Agents

### Branch Naming
```
feat/<short-description>       new feature
fix/<short-description>        bug fix
docs/<short-description>       docs/config only (no code)
refactor/<short-description>   structural change, no behavior change
```

### Forbidden Git Operations
- NEVER `--force` push to `main`
- NEVER `git reset --hard` without explicit user instruction
- NEVER `git clean -f` or `git checkout .` on unrelated files
- NEVER `git rebase -i` without explicit user instruction
- NEVER amend a commit that has already been pushed

### Handling Unrelated Dirty Files
- If unrelated modified files exist when staging, commit only the specific
  files relevant to the current task. Never use `git add -A` or `git add .`
  without reviewing what is staged.
- If dirty files are ambiguous, stop and ask before committing.

### Test Requirements Before Merge
- `pnpm build` must complete without error
- `pnpm tsc --noEmit` must run (TypeScript errors are currently suppressed in
  build — do not introduce new ones)
- `pnpm lint` must pass with no new errors
- If touching `lib/`, manually verify: same inputs → same outputs for core formulas

### Code Review Expectations
- UI-only changes (copy, layout, Tailwind classes): no review gate
- Math/calculation changes: require explicit owner sign-off before merging
- New lib functions: must be pure (no DOM, no fetch, no storage)
- New dependencies: must not add >10 KB gzipped without justification

## UXOS Alignment Rules

### Versioned Changes Only
Every material change to calculation logic or domain types must be traceable
to a commit (no silent drift). Use the commit message to state intent.

### Canon Lock Expectations
- `lib/finance-core.ts` is the canonical math layer. Do not re-implement
  `pmt()`, `piti()`, or `solvePurchasePriceForMonthlyBudget()` elsewhere.
- `lib/property-types.ts` is the canonical type source for the Workbench.
  Do not add duplicate type definitions in component files.
- `08_Data_Model_and_API_Contracts/codex_migration_checklist.md` is the
  governance record. Update it when rules or entity contracts change.

### Drift Detection Expectations
- The inline `incomeBasedRoof` calculation in `affordability-summary.tsx`
  (~line 525) MUST match the `solvePurchasePriceForMonthlyBudget` spec in
  `finance-core.ts`. If they diverge, that is drift.
- `real-estate-types.ts` partially duplicates `property-types.ts`. Any change
  to shared types must be applied in both files until deduplication is done.
- `customTaxRateInput` state in `affordability-summary.tsx` is UI-only and
  NOT wired to calculations. This is a known gap, not a feature.

## Definition of Done Checklist
- [ ] `pnpm build` passes cleanly → `out/` generated
- [ ] `pnpm tsc --noEmit` runs without new errors
- [ ] `pnpm lint` passes
- [ ] No new `useEffect` used for calculations (use `useMemo`)
- [ ] No business logic added to component files (belongs in `lib/`)
- [ ] No hand-edits to `components/ui/` files
- [ ] Commit message clearly states what changed and why
- [ ] If math touched: owner sign-off obtained
- [ ] If new route added: registered in `app-shell.tsx` NAV_ITEMS
- [ ] If new entity type: added to `08_Data_Model_and_API_Contracts/codex_migration_checklist.md`
