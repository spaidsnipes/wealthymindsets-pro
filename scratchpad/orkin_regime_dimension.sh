#!/usr/bin/env bash
# Orkin §22 revive pass — deriveRegimeDimension (2026-09-10).
#
# The claim under attack: "the /command-deck hero word moves off UNKNOWN, and
# only when the evidence earns it." Four revives, each restored byte-for-byte.
#
# Run from repo root:  bash scratchpad/orkin_regime_dimension.sh
set -u

SRC=src/lib/marketData/deriveRegimeDimension.ts
PUB=src/lib/marketData/chartMarketStatePublisher.ts
SUITE="src/lib/marketData/deriveRegimeDimension.test.ts src/lib/marketData/chartMarketStatePublisher.test.ts"

cp "$SRC" /tmp/orkin_reg_src.bak
cp "$PUB" /tmp/orkin_reg_pub.bak
restore() { cp /tmp/orkin_reg_src.bak "$SRC"; cp /tmp/orkin_reg_pub.bak "$PUB"; }
trap restore EXIT

revive() { # $1=label $2=file $3=python-replacement-expr
  echo ""
  echo "=============================================================="
  echo "REVIVE $1"
  echo "=============================================================="
  python3 - "$2" <<PY
import sys
p = sys.argv[1]
s = open(p).read()
before = s
$3
assert s != before, "REVIVE PATCH DID NOT APPLY — a silent no-op revive proves nothing"
open(p, "w").write(s)
PY
  if [ $? -ne 0 ]; then echo "REVIVE ABORTED — patch did not apply"; restore; return; fi
  ./node_modules/.bin/tsc --noEmit
  echo "TSC_EXIT=$?"
  ./node_modules/.bin/vitest run $SUITE
  echo "VITEST_EXIT=$?  <-- non-zero == the guard caught the revived defect"
  restore
}

# AA — put the original defect back: Regime hard-coded unresolved.
revive "AA: Regime hard-coded into the debt ledger again (hero returns to UNKNOWN)" "$PUB" \
's = s.replace("...(regime.resolution === \"RESOLVED\" ? [] : [\"Regime\"]),", "\"Regime\",")'

# BB — drop the volatility leg requirement: regime seals off one leg.
revive "BB: volatility leg requirement removed" "$SRC" \
's = s.replace("volatility.resolution !== \"RESOLVED\" || tradeCount < REGIME_RESOLVE_MIN_TRADES", "false")'

# CC — treat UNKNOWN direction as balance (the classic shrug-as-finding).
revive "CC: unknown direction silently becomes BALANCE" "$SRC" \
's = s.replace("if (direction.resolution === \"PARTIAL\") {", "if (direction.resolution !== \"RESOLVED\") {")'

# DD — vocabulary break: emit a word selectMarketStory cannot match.
revive "DD: RANGEBOUND/TRENDING vocabulary the story engine cannot read" "$SRC" \
's = s.replace("value: \"TREND\",", "value: \"DIRECTIONAL\",").replace("value: \"BALANCE\",", "value: \"TWO_SIDED\",")'

echo ""
echo "=============================================================="
echo "RESTORE CHECK — both files must be byte-identical to the baseline"
echo "=============================================================="
diff /tmp/orkin_reg_src.bak "$SRC" && echo "SRC identical"
diff /tmp/orkin_reg_pub.bak "$PUB" && echo "PUB identical"
