# QB Decision Log

## 2026-03-01
- Decision: Adopt Chief/PM/QB operating model and Chief Operating Addendum v1.
- Rationale: Establish enforceable governance, release safety, and decision traceability.
- Impacted files/routes: QB governance docs and scripts.
- Owner: Chief of Staff.

## 2026-03-01
- Decision: Complete Livability QB bring-up to full UXOS operating standard.
- Rationale: ensure this repo is portfolio-trackable with canonical governance and dispatch discipline.
- Impacted files/routes: QB status, dispatch plan, sync/report artifacts, git hygiene.
- Owner: Livability PM.

## 2026-03-01 - FFA compaction rollout
- Decision: Enable QB-native `compact` command and FFA compaction policy for this repo.
- Rationale: Keep conversation history operationally clean by retaining only durable, linked, versioned FFA updates.
- Impacted files/routes: `QB/qb`, `QB/scripts/qb_compact.sh`, `QB/policies/ffa_compaction_policy.md`, `QB/README.md`.
- Owner: QB
- Status: Adopted.

## 2026-03-01
- Decision: FFA layered inheritance instance initialized.
- Rationale: align Livability with portfolio FFA inheritance model and clean template separation.
- Impacted files/routes: `08_Data_Model_and_API_Contracts/ffa_instance.json`.
- Owner: LIVABILITY PM.

## 2026-03-01 - Bidirectional FFA-plan alignment rollout completed
- Decision: Completed deployment of FFA-plan alignment enforcement (`ffa-plan-sync`) and validated passing checks/reports.
- Rationale: Ensure every FFA change projects into planning and every active plan item is tied back to FFA or explicit no-impact rationale.
- Impacted files/routes: `QB/qb`, `QB/scripts/qb_check.sh`, `QB/scripts/qb_report.sh`, `QB/scripts/qb_ffa_plan_sync.sh`, `QB/PLAN_ALIGNMENT_STATE.json`, `QB/WORK_QUEUE.md`, `QB/report_20260301.md`.
- Owner: Coach/QB
- Status: Adopted and verified.

## 2026-03-01 - OST first-class in FFA adopted
- Decision: Adopted Opportunity Solution Tree primitives as first-class FFA structures linked to desired outcomes.
- Rationale: Keep opportunity/solution planning directly traceable to desired outcomes, jobs, and execution artifacts.
- Impacted files/routes: `08_Data_Model_and_API_Contracts/ffa_instance.json`, `QB/scripts/qb_check.sh`, `QB/report_YYYYMMDD.md`.
- Owner: Coach/QB
- Status: Adopted and verified.

## 2026-03-02
- Decision: Local domain + offline continuity protocols auto-adopted across QB operations.
- Rationale: Remove manual handoff dependency and keep PM execution aligned by default.
- Impacted files/routes: QB/LOCAL_DOMAIN.json, QB/WEB_CAPTURE_TARGETS.json, QB/scripts/qb_check.sh, QB/scripts/qb_report.sh, QB/policies/local_domain_and_offline_continuity_protocol.md.
- Owner: Coach
