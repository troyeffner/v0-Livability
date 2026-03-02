# Web Instrumentation Policy

Status: canonical
Owner: QB

## Scope
This package standardizes three operational lanes:
1. UI capture instrumentation (screen captures and visual checks)
2. Marketing telemetry instrumentation
3. Research loop instrumentation

## Activation
Use:
- `./QB/qb instrument --enable-ui-capture`
- `./QB/qb instrument --enable-marketing`
- `./QB/qb instrument --enable-research`

Optional screenshot:
- `./QB/qb instrument --capture-url <project>.localhost:8080/`

## Required Behavior
- When enabled, corresponding status artifacts must stay current and pass `./QB/qb check`.
- Screens/evidence should be attached to dispatch/report artifacts for traceability.
