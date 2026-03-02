Project
Livability

Destination
00_QB

Prompt
New pilot assignment from Coach/FFA: Livability is piloting page-level tagging of assumptions and FFA artifacts.

Pilot objective:
- Attach canonical assumptions and FFA artifacts to web pages/surfaces.
- Validate traceability and drift detection at the page layer.

Required execution:
1. Thread 08 drafts/implements tagging contract fields:
   - page_id/surface_id
   - assumption_id(s)
   - artifact_ref(s)
   - tag_status (draft|active|canon)
   - version_id
2. Thread 03 applies the contract to priority pages and exposes tag coverage status.
3. Thread 05 defines guardrail checks and drift triggers:
   - page purpose changed without tag review
   - broken assumption/artifact references
4. Thread 07 records pilot scope, confidence assumptions, and success criteria.

Acceptance
- Contract exists and is versioned.
- At least one priority surface has working assumption/artifact tags.
- Drift rules documented and checkable.
- Pilot status reflected in next QB report.

Return
- Implementation brief
- Contract path
- Coverage snapshot
- Open blockers + next actions
