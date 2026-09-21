#!/bin/bash
# §22 Orkin revive pass — "DATA UNAVAILABLE beside rendered candles" (3rd nesting).
#
# Each revive puts a plausible defect BACK and must make the guard fail BY NAME.
# A guard that stays green is worthless. A revive that fires via a SYNTAX or
# TYPE error is not a proof — it proves the file broke, not that the assertion
# fires. tsc runs alongside vitest to prove each neuter is valid TypeScript.
cd "$(dirname "$0")/.." || exit 1
B=scratchpad/chb_backup
SRC=src/lib/priceSource.ts
DASH=src/components/chart/ChartsDashboard.tsx
TST=src/lib/marketData/chartHeaderBarsVsQuote.enforcement.test.ts

mkdir -p "$B"
cp "$SRC"  "$B/src.bak"
cp "$DASH" "$B/dash.bak"

restore() { cp "$B/src.bak" "$SRC"; cp "$B/dash.bak" "$DASH"; }

run() {
  local label="$1" out code tsc_out tsc_code
  tsc_out=$(./node_modules/.bin/tsc --noEmit 2>&1); tsc_code=$?
  out=$(./node_modules/.bin/vitest run "$TST" 2>&1); code=$?
  echo "=============================================================="
  echo "REVIVE $label"
  echo "  tsc EXIT=$tsc_code   (must be 0 — a type error is not a proof)"
  if [ $tsc_code -ne 0 ]; then
    echo "  *** NEUTER IS NOT VALID TYPESCRIPT — REWRITE IT ***"
    echo "$tsc_out" | head -4 | sed 's/^/    /'
  fi
  echo "  vitest EXIT=$code"
  if [ $code -eq 0 ]; then
    echo "  *** SURVIVED — THE GUARD IS WORTHLESS ***"
  else
    echo "$out" | grep -E "^ *× " | sed 's/^/  FIRED: /' | head -14
  fi
  restore
}

# AA — the original hole verbatim: the guard watches only `unresolved`, so a
# refused quote on a RESOLVED provider name walks straight past it.
perl -0pi -e 's/if \(\(b\.unresolved \|\| b\.availability === "unavailable"\) && hasCandles\) \{/if (b.unresolved \&\& hasCandles) {/' "$SRC"
run "AA: guard watches only b.unresolved again (the live NQ1! path)"

# BB — the surface regresses to the raw grader. Note NO banned string appears
# and the file still type-checks: a ban-only or lint-only guard stays green.
perl -0pi -e 's/const b = resolveChartSurfaceBadge\(\n\s*source, connected, chartBars\.length > 0, sessionOpen, quoteObservation,\n\s*\);/const b = priceSourceBadge(source, connected, sessionOpen, quoteObservation);/' "$DASH"
perl -0pi -e 's/import \{ resolveChartSurfaceBadge \} from "\@\/lib\/priceSource";/import { priceSourceBadge } from "\@\/lib\/priceSource";/' "$DASH"
run "BB: /charts header calls the raw priceSourceBadge again"

# CC — subtler: the surface keeps the guard but stops handing it bar evidence,
# hard-coding presence. The chip goes quiet in the other direction.
perl -0pi -e 's/source, connected, chartBars\.length > 0, sessionOpen, quoteObservation,/source, connected, false, sessionOpen, quoteObservation,/' "$DASH"
run "CC: bar evidence withheld from the grader (hard-coded false)"

# DD — the over-correction: blanket-suppress availability whether or not bars
# exist. Kills the defect AND the honest zero-bar case with it.
perl -0pi -e 's/if \(\(b\.unresolved \|\| b\.availability === "unavailable"\) && hasCandles\) \{/if (b.unresolved || b.availability === "unavailable") {/' "$SRC"
run "DD: availability suppressed even with zero bars (over-correction)"

echo "=============================================================="
restore
echo "restored; diff vs working copies:"
diff "$B/src.bak" "$SRC" && diff "$B/dash.bak" "$DASH" && echo "  BOTH FILES BYTE-IDENTICAL"
