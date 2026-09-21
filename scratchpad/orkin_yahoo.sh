#!/bin/bash
# §22 Orkin revive pass — yahooSymbol atom. Each revive puts a fixed bug BACK
# and must make the guard fail BY NAME. A guard that stays green is worthless.
# A revive that fires via a SYNTAX ERROR is not a proof — it proves the file
# broke, not that the assertion fires. Every neuter below is valid TypeScript.
cd "$(dirname "$0")/.." || exit 1
B=scratchpad/yahoo_backup
SYM=src/lib/yahooSymbol.ts
TST=src/lib/yahooSymbol.test.ts

mkdir -p "$B"
cp "$SYM" "$B/yahooSymbol.ts.bak"
cp "$TST" "$B/yahooSymbol.test.ts.bak"

restore() {
  cp "$B/yahooSymbol.ts.bak" "$SYM"
  cp "$B/yahooSymbol.test.ts.bak" "$TST"
}

run() {
  local label="$1"
  local out code
  out=$(./node_modules/.bin/vitest run src/lib/yahooSymbol.test.ts 2>&1)
  code=$?
  echo "=============================================================="
  echo "REVIVE $label  -> EXIT=$code"
  if [ $code -eq 0 ]; then
    echo "  *** SURVIVED — THE GUARD IS WORTHLESS ***"
  else
    echo "$out" | grep -E "^ *× " | sed 's/^/  FIRED: /' | head -12
  fi
  restore
}

# NN — drop the crypto derivation entirely (the original bug: 71 dead symbols)
perl -0pi -e 's/  if \(!UNLISTED_CRYPTO_QUOTES.*?\n  \}\n//s' "$SYM"
run "NN: toYahooSymbol stops deriving crypto from the identity layer"

# OO — derivation emits a base that no longer matches the retired YF_MAP rows
perl -0pi -e 's/\$\{base\}-USD/\$\{base.toLowerCase()\}-USD/' "$SYM"
run "OO: derived ticker no longer reproduces the retired YF_MAP rows"

# PP — neuter the unlisted-quote guard (silently answer USDT with the USD price)
perl -0pi -e 's/\(\?:USDT\|USDC\)/(?:ZZ_NEVER_MATCHES)/' "$SYM"
run "PP: USDT/USDC quotes get silently substituted with USD"

# QQ — resolve forex BEFORE crypto, so "BTC/USD" becomes a currency pair again
perl -0pi -e 's{  // Crypto is resolved BEFORE forex}{  if (up.includes("/")) return `\$\{up.replace("/", "")\}=X`;\n  // Crypto is resolved BEFORE forex}' "$SYM"
run "QQ: forex resolved before crypto (BTC/USD becomes BTCUSD=X)"

# RR — simulate a picker rename: the extractor matches nothing (vacuous-pass check)
perl -0pi -e 's/const re = \/\\\{\\s\*sym:/const re = \/\\{\\s*NOSUCHFIELD:/' "$TST"
run "RR: picker extractor matches nothing (vacuous-pass check)"

echo "=============================================================="
restore
echo "restored; diff vs HEAD-working copies:"
diff "$B/yahooSymbol.ts.bak" "$SYM" && diff "$B/yahooSymbol.test.ts.bak" "$TST" && echo "  BOTH FILES BYTE-IDENTICAL"
