#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$ROOT"

OUT="QB/dispatch/git_sync_$(date +%Y%m%d).md"

if [[ ! -d .git ]]; then
  echo "No git repo detected; creating empty sync note"
  cat > "$OUT" <<'EOF2'
# QB Git Sync Note

No git repository found. Use manual status update.
EOF2
  echo "QB sync generated: $OUT"
  exit 0
fi

LAST_DATE="$(python3 - <<'PY'
import json
from pathlib import Path
p=Path('QB/status.json')
if not p.exists():
    print('')
else:
    obj=json.loads(p.read_text())
    print(obj.get('updated_at',''))
PY
)"

RANGE_ARG=()
if [[ -n "$LAST_DATE" ]]; then
  RANGE_ARG=(--since="$LAST_DATE")
fi

{
  echo "# QB Git Sync Note"
  echo
  echo "Generated: $(date -u +"%Y-%m-%dT%H:%M:%SZ")"
  echo "Status last updated: ${LAST_DATE:-unknown}"
  echo
  echo "## Recent Commits"
  git log "${RANGE_ARG[@]}" --pretty='- %h %ad %s' --date=short -n 30 || true
  echo
  echo "## Changed Files (recent)"
  git diff --name-only HEAD~20..HEAD 2>/dev/null | sed 's/^/- /' || true
  echo
  echo "## Suggested QB Status Review"
  echo "- Check if any goal status should change."
  echo "- Check if blockers appeared/resolved."
  echo "- Check if decisions need recording in status/brief."
} > "$OUT"

echo "QB sync generated: $OUT"
