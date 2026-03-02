# Codex Reconciliation Note (Claude One-Time Knowledge Pack)

Date: 2026-03-02
Source reviewed: `07_Strategy_Canon_Artifacts/migration_inputs/CLAUDE_FINAL_KNOWLEDGE_PACK_20260302.md`
Scope: Reconcile Claude one-time handoff against current Livability repo/QB/FFA state.

## 1. Adopted Items

The following Claude findings are confirmed and adopted as current guidance:

- Canon lock and governance orientation remains valid:
  - `lib/finance-core.ts` as math canon
  - `lib/property-types.ts` as Workbench type canon
  - `08_Data_Model_and_API_Contracts/codex_migration_checklist.md` as governance record
- Drift risks remain valid and active:
  - Inline `incomeBasedRoof` drift risk in `components/property-workbench/affordability-summary.tsx`
  - `customTaxRateInput` currently UI-only
  - Partial type overlap between `lib/property-types.ts` and `lib/real-estate-types.ts`
- Build/quality posture concerns remain valid:
  - TS suppression concerns and CI gate gaps remain part of active risk set
- Product-surface inventory remains directionally valid:
  - Live Mortgage & Move Planner + Decision Rehearsal
  - Liquidity engine logic present, UI surface still pending

## 2. Superseded or Updated Since Claude Snapshot

The following Claude statements are now stale or superseded by current repo state:

- FFA status is no longer "not audited":
  - `08_Data_Model_and_API_Contracts/ffa_instance.json` has been actively reviewed and backfilled.
- FFA content density is no longer scaffold-only:
  - Seed backfill now exists across assumptions, hypotheses, experiments, cognitive frames, execution modes, workflow patterns, tasks, desired outcomes, opportunities, solutions, and OST links.
- JTBD extraction and seeding has been completed:
  - JTBD seed items were added as `JTBD-001` through `JTBD-007` in FFA `tasks`.
- FFA-plan governance is currently synchronized and passing:
  - `./QB/qb ffa-plan-sync` run successfully after backfills.
  - `./QB/qb check` and `./QB/qb report` regenerated and passing.
- Coach protocol updates referenced by Claude as pending context have since been processed in this workspace:
  - Local domain/offline continuity protocol artifacts are present.
  - Page tagging pilot contract + registry are present and passing checks.

## 3. Items Still Open (Not Resolved by Migration)

These remain actionable and should stay in queue until explicitly closed:

- Migrate inline income roof logic to canonical `finance-core` solver path.
- Wire `customTaxRateInput` into active affordability calculations.
- Resolve type duplication strategy between `property-types.ts` and `real-estate-types.ts`.
- Confirm and align property-tax default discrepancy (1.5% vs checklist reference values).
- Determine disposition of `components/real-estate-planner/` (active vs legacy), then resolve associated TS/type drift.
- Decide CI gate expansion timing for `pnpm lint` and `pnpm tsc --noEmit` enforcement.
- Audit `hooks/use-memoized-calculations.ts` for logic placement and purity boundaries.

## 4. Current Reconciliation Verdict

Claude handoff is accepted as a useful migration baseline and risk inventory.

Codex has integrated the handoff and advanced repository state beyond the snapshot by:

- materially backfilling FFA seed records,
- adding JTBD-oriented seed tasks,
- and validating current QB/FFA alignment via command checks.

Use this note + the Claude pack together:

- Claude pack = baseline snapshot
- This note = current-state correction layer

