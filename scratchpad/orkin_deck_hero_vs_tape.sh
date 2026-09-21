#!/bin/bash
# §22 Orkin revive pass — "deck hero says STALE while the tape says
# ACTIVE DEGRADED about the same quote" (Canon Weakness #1, deck nesting).
#
# Each revive puts a plausible defect BACK and must make the guard fail BY NAME.
# A revive that fires via a SYNTAX or TYPE error is not a proof — it proves the
# file broke, not that the assertion fires. tsc runs alongside vitest so every
# neuter is demonstrably valid TypeScript.
cd "$(dirname "$0")/.." || exit 1
B=scratchpad/dhvt_backup
SRC=src/lib/priceSource.ts
PUB=src/lib/marketData/chartMarketStatePublisher.ts
TST=src/lib/marketData/deckHeroVsTapeFidelity.enforcement.test.ts
LOCK=src/lib/marketData/chartMarketStatePublisher.test.ts

mkdir -p "$B"
cp "$SRC" "$B/src.bak"
cp "$PUB" "$B/pub.bak"

restore() { cp "$B/src.bak" "$SRC"; cp "$B/pub.bak" "$PUB"; }

run() {
  local label="$1" out code tsc_out tsc_code
  tsc_out=$(./node_modules/.bin/tsc --noEmit 2>&1); tsc_code=$?
  out=$(./node_modules/.bin/vitest run "$TST" "$LOCK" 2>&1); code=$?
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

# AA — the original hole verbatim: the tape budget is aimed at every provider
# again, so a minutes-old yahoo REST quote reads STALE PIPELINE on the deck.
perl -0pi -e 's/const fresh = REST_QUOTE_SOURCES\.has\(source\) \? undefined : tapeFresh;/const fresh = tapeFresh;/' "$PUB"
run "AA: tape freshness budget aimed at REST-quote providers again (the live NQ1! path)"

# BB — the over-correction in the other direction: freshness withheld from
# EVERY source, so a genuinely stalled alpaca tape stops reporting STALE.
perl -0pi -e 's/const fresh = REST_QUOTE_SOURCES\.has\(source\) \? undefined : tapeFresh;/const fresh = undefined;/' "$PUB"
run "BB: freshness withheld from every source (kills real staleness too)"

# CC — silent set expansion: a broker feed is quietly declared REST-quote, so
# it loses its staleness budget without anyone naming the decision.
perl -0pi -e 's/export const REST_QUOTE_SOURCES: ReadonlySet<PriceSource> = new Set\(\[\n  "yahoo", "finnhub",\n\]\);/export const REST_QUOTE_SOURCES: ReadonlySet<PriceSource> = new Set([\n  "yahoo", "finnhub", "webull",\n]);/' "$SRC"
run "CC: REST_QUOTE_SOURCES silently expanded to swallow a broker feed"

# DD — the grader itself is neutered: STALE PIPELINE removed as an outcome, so
# the deck agrees with the tape for the WRONG reason (no staleness detection
# left anywhere). No banned string appears; the file still type-checks.
perl -0pi -e 's/  if \(observation\.fresh === false\) \{/  if (false) {/' "$SRC"
run "DD: freshness failure no longer produces STALE PIPELINE at all"

echo "=============================================================="
restore
echo "restored; diff vs working copies:"
diff "$B/src.bak" "$SRC" && diff "$B/pub.bak" "$PUB" && echo "  BOTH FILES BYTE-IDENTICAL"
