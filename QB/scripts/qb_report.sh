#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$ROOT"

python3 - <<'PY'
import json
from pathlib import Path
from datetime import datetime, timezone

status=json.loads(Path('QB/status.json').read_text())
out=Path('QB') / f"report_{datetime.now(timezone.utc).strftime('%Y%m%d')}.md"
lines=[
  '# QB Status Report',
  '',
  f"Project: {status.get('project','')}",
  f"Updated at: {status.get('updated_at','')}",
  f"Mode: {status.get('mode','')}",
  f"Health: {status.get('health','')}",
  '',
  '## Goals',
]
for g in status.get('goals',[]):
  lines.append(f"- {g.get('id')}: {g.get('name')} [{g.get('status')}] progress={g.get('progress')}")
lines += ['', '## Blockers']
blockers=status.get('blockers',[])
if blockers:
  lines += [f"- {b}" for b in blockers]
else:
  lines.append('- none')
lines += [
  '',
  '## Notes',
  '- Daily heartbeat generated from canonical QB status.',
  '- Use ./QB/qb sync to review git changes before adjusting status.',
]
out.write_text('\n'.join(lines)+'\n')
print(out)
PY

echo "QB report generated"
