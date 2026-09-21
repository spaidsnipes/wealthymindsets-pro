#!/usr/bin/env bash
# Orkin §22 revive pass — deriveDirectionDimension (2026-09-10).
#
# A fix is not proven by its own green suite. It is proven when putting the
# defect BACK makes a named guard fail. Four revives, each restored byte-for-byte.
#
# Run from repo root:  bash scratchpad/orkin_direction_dimension.sh
set -u

SRC=src/lib/marketData/deriveDirectionDimension.ts
PUB=src/lib/marketData/chartMarketStatePublisher.ts
SUITE="src/lib/marketData/deriveDirectionDimension.test.ts src/lib/marketData/chartMarketStatePublisher.test.ts"

cp "$SRC" /tmp/orkin_dir_src.bak
cp "$PUB" /tmp/orkin_dir_pub.bak
restore() { cp /tmp/orkin_dir_src.bak "$SRC"; cp /tmp/orkin_dir_pub.bak "$PUB"; }
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

# AA — put the original defect back: Direction hard-coded unresolved.
revive "AA: Direction hard-coded into the debt ledger again" "$PUB" \
's = s.replace("...(direction.resolution === \"RESOLVED\" ? [] : [\"Direction\"]),", "\"Direction\",")'

# BB — delete the chop guard: any net drift becomes a direction.
revive "BB: chop guard removed (range-share test deleted)" "$SRC" \
's = s.replace("agg.rangeShare >= DIRECTION_MIN_RANGE_SHARE &&", "true &&")'

# CC — relax the sample threshold to 1: thin tape resolves.
revive "CC: seal threshold relaxed to a single trade" "$SRC" \
's = s.replace("DIRECTION_RESOLVE_MIN_TRADES = 12", "DIRECTION_RESOLVE_MIN_TRADES = 1")'

# DD — vocabulary break: emit a neutral word the CLC matcher cannot read.
revive "DD: neutral BALANCED verdict instead of honest PARTIAL" "$SRC" \
's = s.replace("value: agg.drift > 0 ? \"UP\" : \"DOWN\",", "value: agg.rangeShare >= 0.9 ? (agg.drift > 0 ? \"UP\" : \"DOWN\") : \"BALANCED\",")'

echo ""
echo "=============================================================="
echo "RESTORE CHECK — both files must be byte-identical to the baseline"
echo "=============================================================="
diff /tmp/orkin_dir_src.bak "$SRC" && echo "SRC identical"
diff /tmp/orkin_dir_pub.bak "$PUB" && echo "PUB identical"
