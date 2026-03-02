# QB Intro Sequence (Threads 00-08)

Project: Livability

## Rule
Bootstrap output gives user only the 00_QB intro prompt first.
From 00_QB (`00` folder), QB must generate thread intro prompts for 01-08.

## Required format per thread intro
1. Project
2. Destination
3. Prompt
4. Acceptance
5. Return

## Required payload inside each Prompt
1. Thread Responsibilities
2. Thread Jobs
3. Environment Variables (required + optional)
4. First 3 Actions
5. Acceptance Signals

## Thread list
- 00_QB: 00 (QB Command Center)
- 01: 01_Design_System_Anchor (Design System Anchor)
- 02: 02_Builder_and_Admin_Workspace (Builder and Admin Workspace)
- 03: 03_Public_Surface (Public Surface)
- 04: 04_Submit_Pipeline (Submit Pipeline)
- 05: 05_Verification_Guardrails (Verification Guardrails)
- 06: 06_Marketing_and_Research_Surface (Marketing and Research Surface)
- 07: 07_Strategy_Canon_Artifacts (Strategy Canon Artifacts)
- 08: 08_Data_Model_and_API_Contracts (Data Model and API Contracts)

## Acceptance
- All 8 intro prompts (01-08) exist in QB dispatch as dated artifact.
- Every intro includes responsibilities, jobs, and environment variables.
- QB confirms 00_QB ownership and sequencing policy.
- No implementation dispatches run before intro sequence is complete.
