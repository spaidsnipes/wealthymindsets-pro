#!/usr/bin/env bash
# audit-dec012.sh — DEC-012 continuous audit (M29)
#
# DEC-012 (ratified 2026-07-30): Atlas never edits src/. Under the one-thread
# supersede (2026-08-08) that discipline still applies to any Atlas-scope work:
# operational docs, queue coordination, checkpoint publishes — none of that
# touches src/.
#
# This script grep-checks recent history for any commit that mixes an Atlas-
# scope subject line with a change under src/. Exits non-zero on hit so it can
# be wired into CI or a pre-push hook.
#
# Usage:  ./scripts/audit-dec012.sh [since]
#   since defaults to 24 hours ago; accepts any git rev/date.

set -euo pipefail

SINCE="${1:-24 hours ago}"

# Atlas-scope subject prefixes. Add here if the convention evolves.
ATLAS_PATTERNS='ops\(atlas\)|docs\(ops\)|docs\(atlas\)|atlas:'

echo "DEC-012 audit — commits since \"$SINCE\" with Atlas-scope subject touching src/"
echo

hits=0
while IFS='|' read -r sha subject; do
  files_in_src=$(git show --stat --name-only --pretty=format: "$sha" -- 'src/*' | sed '/^$/d' | head -20)
  if [ -n "$files_in_src" ]; then
    echo "── VIOLATION ────────────────────────────────────────────"
    echo "  Commit:  $sha"
    echo "  Subject: $subject"
    echo "  Files under src/:"
    echo "$files_in_src" | sed 's/^/    /'
    echo
    hits=$((hits + 1))
  fi
done < <(
  git log --since="$SINCE" --pretty=format:'%H|%s' -E --grep="$ATLAS_PATTERNS" --all
)

if [ "$hits" -eq 0 ]; then
  echo "OK — no DEC-012 violations in the audited window."
  exit 0
else
  echo "FAIL — $hits DEC-012 violation(s) found in the window."
  echo "Under one-thread mode, refile the src/ change under the appropriate"
  echo "engineering-scope subject (fix / feat / sec / arch / test) and issue a"
  echo "correction commit noting the mislabel."
  exit 1
fi
