#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$ROOT"

echo "QB check: validating required files"
for f in \
  QB/goals.md QB/status.json QB/README.md QB/policies/pm_hybrid_update_policy.md \
  QB/AUTONOMY_MATRIX.md QB/WORK_QUEUE.md QB/DECISION_LOG.md QB/RELEASE_GATE_CHECKLIST.md QB/RACI_LITE.md; do
  [[ -f "$f" ]] || { echo "Missing $f"; exit 1; }
done

echo "QB check: validating status.json"
python3 - <<'PY'
import json
from pathlib import Path
p=Path('QB/status.json')
obj=json.loads(p.read_text())
required=['project','updated_at','mode','health','goals','blockers','next_actions']
missing=[k for k in required if k not in obj]
if missing:
    raise SystemExit(f"Missing keys in QB/status.json: {missing}")
print('status.json OK')
PY

echo "QB check: validating decision log"
if ! rg -n "^## [0-9]{4}-[0-9]{2}-[0-9]{2}" QB/DECISION_LOG.md >/dev/null 2>&1; then
  echo "DECISION_LOG missing dated entry header (## YYYY-MM-DD)"
  exit 1
fi

echo "QB check: validating marketing telemetry requirements (if enabled)"
python3 - <<'PY'
import json
from pathlib import Path

status = json.loads(Path('QB/status.json').read_text())
if not status.get('marketing_surface_enabled', False):
    print('marketing telemetry: not enabled for this repo')
    raise SystemExit(0)

status_file = Path('QB/MARKETING_TELEMETRY_STATUS.json')
scoreboard = Path('QB/MARKETING_TELEMETRY_SCOREBOARD.md')

if not status_file.exists():
    raise SystemExit('Missing QB/MARKETING_TELEMETRY_STATUS.json while marketing_surface_enabled=true')
if not scoreboard.exists():
    raise SystemExit('Missing QB/MARKETING_TELEMETRY_SCOREBOARD.md while marketing_surface_enabled=true')

obj = json.loads(status_file.read_text())
required = ['enabled','owner','last_updated','event_schema_version','kpis','data_sources','review_cadence','blockers']
missing = [k for k in required if k not in obj]
if missing:
    raise SystemExit(f'Missing keys in QB/MARKETING_TELEMETRY_STATUS.json: {missing}')

if obj.get('enabled') is not True:
    raise SystemExit('QB/MARKETING_TELEMETRY_STATUS.json enabled must be true when marketing_surface_enabled=true')
if not isinstance(obj.get('owner'), str) or not obj['owner'].strip():
    raise SystemExit('Telemetry owner must be non-empty')
if not isinstance(obj.get('last_updated'), str) or not obj['last_updated'].strip():
    raise SystemExit('Telemetry last_updated must be non-empty string')
if not isinstance(obj.get('event_schema_version'), str) or not obj['event_schema_version'].strip():
    raise SystemExit('Telemetry event_schema_version must be non-empty string')
if not isinstance(obj.get('kpis'), list) or len(obj['kpis']) < 3:
    raise SystemExit('Telemetry kpis must include at least 3 entries')
if not isinstance(obj.get('data_sources'), list) or len(obj['data_sources']) < 1:
    raise SystemExit('Telemetry data_sources must include at least 1 source')
if not isinstance(obj.get('review_cadence'), str) or not obj['review_cadence'].strip():
    raise SystemExit('Telemetry review_cadence must be non-empty')
if not isinstance(obj.get('blockers'), list):
    raise SystemExit('Telemetry blockers must be an array')

score_text = scoreboard.read_text()
import re
if not re.search(r'^##\s+\d{4}-\d{2}-\d{2}', score_text, flags=re.M):
    raise SystemExit('MARKETING_TELEMETRY_SCOREBOARD.md must include dated section header: ## YYYY-MM-DD')

print('marketing telemetry: OK')
PY

echo "QB check: OK"
