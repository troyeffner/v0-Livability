# Thread Introduction Standard (00-08)

Project: __PROJECT__

Use this standard for the first message placed into each thread at bootstrap.

## Thread 00_QB (Command Center)
Required sections:
1. Command Center Responsibilities
2. Orchestration Jobs
3. Environment + Bootstrap References
4. Dispatch Sequencing Rules
5. Escalation Rules

## Threads 01-08
Required sections:
1. Thread Responsibilities
2. Thread Jobs
3. Environment Variables
4. Discovery of local environment values and variables
5. Project documents within the repo
6. First 3 Actions
7. Acceptance Signals

### Security rule
- Discover key names and policy paths only.
- Never print, store, or repeat secret values in thread outputs.

### Environment discovery baseline
- `<repo>/.env.example`
- `<repo>/QB/SUPABASE_ENV_REF.json`
- latest QB report (`<repo>/QB/report_YYYYMMDD.md`)

## Required Dispatch Envelope
Every intro dispatch must include:
1. Project
2. Destination
3. Prompt
4. Acceptance
5. Return

## Thread Mapping
- 01: Design System Anchor
- 02: Builder and Admin Workspace
- 03: Public Surface
- 04: Submit Pipeline
- 05: Verification Guardrails
- 06: Marketing and Research Surface
- 07: Strategy Canon Artifacts
- 08: Data Model and API Contracts
