#!/bin/bash
# §22 Orkin revive pass — finnhubSymbol atom. Each revive puts a fixed bug BACK
# and must make the guard fail BY NAME. A guard that stays green is worthless.
# A revive that fires via a SYNTAX ERROR is not a proof — it proves the file
# broke, not that the assertion fires. Every neuter below is valid TypeScript.
cd "$(dirname "$0")/.." || exit 1
B=scratchpad/fh_backup
SYM=src/lib/finnhubSymbol.ts
TST=src/lib/finnhubSymbol.test.ts
RTE=src/app/api/finnhub/route.ts

mkdir -p "$B"
cp "$SYM" "$B/finnhubSymbol.ts.bak"
cp "$TST" "$B/finnhubSymbol.test.ts.bak"
cp "$RTE" "$B/route.ts.bak"

restore() {
  cp "$B/finnhubSymbol.ts.bak" "$SYM"
  cp "$B/finnhubSymbol.test.ts.bak" "$TST"
  cp "$B/route.ts.bak" "$RTE"
}

run() {
  local label="$1"
  local out code
  out=$(./node_modules/.bin/vitest run src/lib/finnhubSymbol.test.ts src/app/api/finnhub/route.test.ts 2>&1)
  code=$?
  echo "=============================================================="
  echo "REVIVE $label  -> EXIT=$code"
  if [ $code -eq 0 ]; then
    echo "  *** SURVIVED — THE GUARD IS WORTHLESS ***"
  else
    echo "$out" | grep -E "^ *× " | sed 's/^/  FIRED: /' | head -14
  fi
  restore
}

# SS — drop the crypto derivation entirely (the original bug: coins sent as equities)
perl -0pi -e 's/  const base = cryptoBaseTicker\(up\);.*?\n  \}\n//s' "$SYM"
run "SS: toFinnhubSym stops deriving crypto — coins fall to the equity branch"

# TT — derived base no longer reproduces the retired FH_MAP rows
perl -0pi -e 's/\$\{base\}USDT/\$\{base.toLowerCase()\}USDT/' "$SYM"
run "TT: derived symbol no longer reproduces the retired FH_MAP rows"

# UU — venue guard removed: a Coinbase request answered with a Binance price
perl -0pi -e 's/    if \(up\.includes\("\."\)\) return null;\n//' "$SYM"
run "UU: venue-pinned rows silently re-pointed at Binance"

# VV — resolve futures/forex BEFORE crypto, so "BTC/USD" is refused again
perl -0pi -e 's{  // Crypto is resolved BEFORE the slash guard}{  if (up.endsWith("1!") || up.includes("=F") || up.includes("/")) return null;\n  // Crypto is resolved BEFORE the slash guard}' "$SYM"
run "VV: slash guard runs before crypto (BTC/USD refused again)"

# WW — route stops disclosing which instrument it actually fetched
perl -0pi -e 's/        providerSymbol: fhSym,\n//' "$RTE"
run "WW: quote response drops providerSymbol (substitution goes unnamed)"

# XX — simulate a picker rename: the extractor matches nothing (vacuous-pass check)
perl -0pi -e 's/const re = \/\\\{\\s\*sym:/const re = \/\\{\\s*NOSUCHFIELD:/' "$TST"
run "XX: picker extractor matches nothing (vacuous-pass check)"

echo "=============================================================="
restore
echo "restored; diff vs working copies:"
diff "$B/finnhubSymbol.ts.bak" "$SYM" && diff "$B/finnhubSymbol.test.ts.bak" "$TST" && diff "$B/route.ts.bak" "$RTE" && echo "  ALL THREE FILES BYTE-IDENTICAL"
