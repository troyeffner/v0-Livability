#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$ROOT"

python3 - <<'PY'
import json
import hashlib
from pathlib import Path
from datetime import datetime, timezone

status=json.loads(Path('QB/status.json').read_text())
ffa_path = Path('08_Data_Model_and_API_Contracts/ffa_instance.json')
alignment_path = Path('QB/PLAN_ALIGNMENT_STATE.json')
local_domain_path = Path('QB/LOCAL_DOMAIN.json')
tagging_registry_path = Path('08_Data_Model_and_API_Contracts/page_tagging.registry.json')
alignment='unknown'
if alignment_path.exists():
  try:
    obj=json.loads(alignment_path.read_text())
    alignment=obj.get('alignment_status','unknown')
    if ffa_path.exists():
      cur=hashlib.sha256(ffa_path.read_bytes()).hexdigest()
      if obj.get('last_ffa_hash') != cur:
        alignment='drifted'
  except Exception:
    alignment='unknown'
local_domain = None
if local_domain_path.exists():
  try:
    local_domain = json.loads(local_domain_path.read_text())
  except Exception:
    local_domain = None

tagging = {
  "entries_total": 0,
  "entries_active_or_canon": 0,
  "unique_surfaces_tagged": 0,
  "coverage_target_pages": 0,
  "coverage_pct": "n/a",
}
if tagging_registry_path.exists():
  try:
    tr = json.loads(tagging_registry_path.read_text())
    entries = tr.get('entries', [])
    tagging["entries_total"] = len(entries)
    tagged_surfaces = set()
    active = 0
    for row in entries:
      if not isinstance(row, dict):
        continue
      if row.get('surface_id'):
        tagged_surfaces.add(str(row.get('surface_id')))
      if row.get('tag_status') in {'active', 'canon'}:
        active += 1
    tagging["entries_active_or_canon"] = active
    tagging["unique_surfaces_tagged"] = len(tagged_surfaces)
    targets = tr.get('metadata', {}).get('coverage_target_pages', [])
    if isinstance(targets, list):
      tagging["coverage_target_pages"] = len(targets)
      if len(targets) > 0:
        tagging["coverage_pct"] = f"{round((len(tagged_surfaces) / len(targets)) * 100, 1)}%"
  except Exception:
    pass

out=Path('QB') / f"report_{datetime.now(timezone.utc).strftime('%Y%m%d')}.md"
lines=[
  '# QB Status Report',
  '',
  f"Project: {status.get('project','')}",
  f"Updated at: {status.get('updated_at','')}",
  f"Mode: {status.get('mode','')}",
  f"Health: {status.get('health','')}",
  f"FFA plan alignment: {alignment}",
  '',
  '## Local Domain',
]
if local_domain:
  lines += [
    f"- domain: {local_domain.get('domain','')}",
    f"- base_url: {local_domain.get('base_url','')}",
    f"- upstream: {local_domain.get('upstream_host','')}:{local_domain.get('upstream_port','')}",
    f"- gateway_port: {local_domain.get('gateway_port','')}",
  ]
else:
  lines += ['- QB/LOCAL_DOMAIN.json unreadable or missing']

lines += [
  '',
  '## Goals',
]
lines += [
  '',
  '## FFA Page Tagging Pilot',
  f"- entries_total: {tagging['entries_total']}",
  f"- entries_active_or_canon: {tagging['entries_active_or_canon']}",
  f"- unique_surfaces_tagged: {tagging['unique_surfaces_tagged']}",
  f"- coverage_target_pages: {tagging['coverage_target_pages']}",
  f"- coverage_pct: {tagging['coverage_pct']}",
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
