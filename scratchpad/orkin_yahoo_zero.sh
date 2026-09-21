#!/bin/bash
# §22 Orkin revive pass — /api/yahoo manufactured-zero atom.
#
# Each revive puts a plausible defect BACK and must make the guard fail BY NAME.
# A guard that stays green is worthless. A revive that fires via a SYNTAX or TYPE
# error is not a proof — it proves the file broke, not that the assertion fires.
# Every neuter below is valid TypeScript that a careless future edit could
# plausibly produce, and tsc is run alongside vitest to prove exactly that.
cd "$(dirname "$0")/.." || exit 1
B=scratchpad/yz_backup
RT=src/app/api/yahoo/route.ts
TST=src/app/api/yahoo/route.test.ts

mkdir -p "$B"
cp "$RT"  "$B/route.ts.bak"
cp "$TST" "$B/route.test.ts.bak"

restore() {
  cp "$B/route.ts.bak"      "$RT"
  cp "$B/route.test.ts.bak" "$TST"
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

# FF — the original defect verbatim: guard asks "did Yahoo answer", chain
# terminates in `|| 0`.
perl -0pi -e 's/      const price = \[livePrice.*?\n      if \(price === undefined\).*?\n/      if (!meta \&\& !livePrice) return NextResponse.json({ error: "No data" }, { status: 404 });\n      const price = livePrice || meta?.regularMarketPrice || meta?.previousClose || 0;\n/s' "$RT"
run "FF: original chain restored — meta present, price 0, changePct -100"

# GG — the plausible careless tightening: `!== 0` becomes `> 0`, which quietly
# starts rejecting real negative settlements.
perl -0pi -e 's/&& v !== 0\);/\&\& v > 0);/' "$RT"
run "GG: guard tightened to > 0 — a negative settlement becomes 'no data'"

# HH — the predicate loosened to accept zero (a 'simplification' that leaves the
# guard, the comment and the 404 all intact).
perl -0pi -e 's/Number\.isFinite\(v\) && v !== 0\)/Number.isFinite(v))/' "$RT"
run "HH: zero accepted as a price again — the guard can no longer fire"

# II — preference order reshuffled so stale regular-market meta outranks the live
# intraday print.
perl -0pi -e 's/\[livePrice, meta\?\.regularMarketPrice, meta\?\.previousClose\]/[meta?.regularMarketPrice, livePrice, meta?.previousClose]/' "$RT"
run "II: meta ranked above the live print — quote goes stale"

# JJ — a 'cleanup' that drops the last candidate, so a payload whose only real
# number sits in previousClose is reported absent.
perl -0pi -e 's/, meta\?\.previousClose\]/]/' "$RT"
run "JJ: previousClose dropped from the chain — stops AT Yahoo's zero"

# KK — vacuity check on the FIXTURE: if the recorded payload no longer reproduces
# the defect, every assertion above is decoration.
perl -0pi -e 's/chartPreviousClose: 0\.0023591456,/chartPreviousClose: 0,/' "$TST"
run "KK: fixture no longer reproduces the -100% (vacuous-fixture check)"

echo "=============================================================="
restore
echo "restored; diff vs working copies:"
diff "$B/route.ts.bak" "$RT" && diff "$B/route.test.ts.bak" "$TST" && echo "  BOTH FILES BYTE-IDENTICAL"
