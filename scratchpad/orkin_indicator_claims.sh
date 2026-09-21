#!/bin/bash
# §22 Orkin revive pass — indicator help-text participant-identity atom.
#
# Each revive puts a plausible defect BACK and must make the guard fail BY NAME.
# A guard that stays green is worthless. A revive that fires via a SYNTAX or
# TYPE error is not a proof — it proves the file broke, not that the assertion
# fires. tsc runs alongside vitest to prove each neuter is valid TypeScript.
cd "$(dirname "$0")/.." || exit 1
B=scratchpad/ic_backup
SRC=src/components/chart/indicatorDescriptions.ts
PANEL=src/components/smart-money/SmartMoneyPanel.tsx
TST=src/components/chart/indicatorDescriptions.claims.test.ts

mkdir -p "$B"
cp "$SRC"   "$B/src.bak"
cp "$PANEL" "$B/panel.bak"

restore() {
  cp "$B/src.bak"   "$SRC"
  cp "$B/panel.bak" "$PANEL"
}

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

# LL — the original defect verbatim: the bubbles are called institutional.
perl -0pi -e 's/surfacing size that a normal candle would hide/surfacing institutional-sized order flow that a normal candle would hide/' "$SRC"
run "LL: 'institutional-sized order flow' restored on Big Trades"

# MM — the motive reading returns in howToUse: clusters become accumulation.
perl -0pi -e 's/repeated large buys at one level show sustained demand there/clusters of large buys at a level signal institutional accumulation/' "$SRC"
run "MM: clusters read as accumulation again"

# NN — the honest limit sentence is deleted as 'wordy'. Nothing else changes:
# no banned word appears, so a naive ban-only guard would stay green.
perl -0pi -e 's/ The tape does not say who placed a print or why, so read these as where size went, not as a participant.s plan\.//' "$SRC"
perl -0pi -e 's/ — size only; the tape carries no participant identity//' "$SRC"
run "NN: the stated limit removed — silence is not honesty"

# OO — anti-vacuity: the measured facts are dropped while the copy stays clean.
perl -0pi -e 's/individual prints whose notional size is unusually large for this instrument/individual prints that stand out/' "$SRC"
perl -0pi -e 's/Each trade.s notional size is compared to a rolling baseline; //' "$SRC"
run "OO: notional + rolling baseline deleted — clean but no longer measured"

# PP — Imbalance re-asserts positioning the overlay cannot observe.
perl -0pi -e 's/marking spots where one side of the book was run over\./marking spots where one side of the book was run over and trapped traders may be forced to cover./' "$SRC"
run "PP: 'trapped traders' restored on Imbalance"

# QQ — the contradiction reopens from the OTHER end: the panel that declined
# the question starts answering it.
perl -0pi -e 's/"Trapped Traders", value: "N\/A/"Trapped Traders", value: "HIGH/' "$PANEL"
run "QQ: SmartMoneyPanel starts asserting trapped positioning"

echo "=============================================================="
restore
echo "restored; diff vs working copies:"
diff "$B/src.bak" "$SRC" && diff "$B/panel.bak" "$PANEL" && echo "  BOTH FILES BYTE-IDENTICAL"
