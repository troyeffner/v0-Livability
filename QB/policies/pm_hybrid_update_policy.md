# PM Hybrid Update Policy

## Source of Truth
- `QB/status.json` is the canonical project state.
- `QB/DECISION_LOG.md` is the canonical decision record.
- Git history is advisory context, not the source of PM truth.

## Required Update Cadence
1. Event-based updates (required)
- Update `QB/status.json` whenever one of these occurs:
  - goal status change
  - blocker appears or is resolved
  - major decision is made
  - scope changes
  - milestone hit or missed

2. Daily heartbeat (required)
- Generate an end-of-day report in `QB/report_YYYYMMDD.md`.
- Keep it short and factual.

3. Prompt-driven deep updates (as needed)
- Use explicit planning prompts for pivots, resets, and milestone replans.

## Dispatch QA Requirement
Every dispatch prompt must include:
- scope (in-scope / out-of-scope)
- acceptance criteria
- return format
- constraints
- validation commands

## Changelog Sync Rule
- Use `./QB/qb sync` to collect recent git changes into a sync note.
- Sync notes can propose status edits, but they do not auto-overwrite `QB/status.json`.

## Enforcement
- `./QB/qb check` must pass before major handoffs.
