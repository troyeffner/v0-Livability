# Artifact Thread Map Guidance

## Purpose
Map artifact types to primary/secondary execution lanes.

## Rules
1. Every active artifact type must include a valid `primary_thread`.
2. Allowed thread codes: `00_QB`, `01`, `02`, `03`, `04`, `05`, `06`, `07`, `08`, `09`.
3. Use project-scoped subset only; do not copy full portfolio matrix by default.
4. Keep this map aligned with `QB/status.json` and current operating reality.
