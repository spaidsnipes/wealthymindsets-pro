#!/bin/bash
# §22 Orkin revive pass — Yahoo crypto ticker-collision atom. Each revive puts a
# fixed bug BACK and must make the guard fail BY NAME. A guard that stays green
# is worthless. A revive that fires via a SYNTAX ERROR is not a proof — it proves
# the file broke, not that the assertion fires. Every neuter below is valid
# TypeScript that a careless future edit could plausibly produce.
cd "$(dirname "$0")/.." || exit 1
B=scratchpad/yp_backup
SYM=src/lib/yahooSymbol.ts
TST=src/lib/yahooSymbol.test.ts
SRCH=src/components/ui/SymbolSearch.tsx

mkdir -p "$B"
cp "$SYM" "$B/yahooSymbol.ts.bak"
cp "$TST" "$B/yahooSymbol.test.ts.bak"
cp "$SRCH" "$B/SymbolSearch.tsx.bak"

restore() {
  cp "$B/yahooSymbol.ts.bak" "$SYM"
  cp "$B/yahooSymbol.test.ts.bak" "$TST"
  cp "$B/SymbolSearch.tsx.bak" "$SRCH"
}

run() {
  local label="$1" out code
  out=$(./node_modules/.bin/vitest run src/lib/yahooSymbol.test.ts 2>&1)
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

# YY — the original defect: pin lookup dropped, bare {BASE}-USD returns.
perl -0pi -e 's/      return YF_CRYPTO_PINS\[base\]\?\.ticker \?\? `\$\{base\}-USD`;/      return `\${base}-USD`;/' "$SYM"
run "YY: pin lookup removed — SUI is Salmonation again"

# ZZ — table emptied (a 'cleanup' that leaves the code path intact).
perl -0pi -e 's/export const YF_CRYPTO_PINS: Readonly<Record<string, YahooCryptoPin>> = \{.*?\n\};/export const YF_CRYPTO_PINS: Readonly<Record<string, YahooCryptoPin>> = {};/s' "$SYM"
run "ZZ: pin table emptied (vacuous-pass check — every loop iterates zero times)"

# AAA — one pin reverted to the naive ticker it exists to displace.
perl -0pi -e 's/SUI:     \{ ticker: "SUI20947-USD",/SUI:     { ticker: "SUI-USD",/' "$SYM"
run "AAA: SUI pinned back to the bare ticker (dead-weight pin)"

# BBB — pin matched on the raw symbol instead of the resolved base, so the bare
# form still works and every pair form silently falls through.
perl -0pi -e 's/      return YF_CRYPTO_PINS\[base\]\?\.ticker \?\? `\$\{base\}-USD`;/      return YF_CRYPTO_PINS[up]?.ticker ?? `\${base}-USD`;/' "$SYM"
run "BBB: pin keyed on raw symbol — SUIUSD and SUI\/USD fall through"

# CCC — a pin's recorded displaced name set to the coin we actually offer, so
# the row no longer evidences a real collision.
perl -0pi -e 's/displacedName: "Salmonation"/displacedName: "Sui"/' "$SYM"
run "CCC: SUI pin claims to displace 'Sui' itself (evidence no longer justifies the row)"

# DDD — the picker label regression: two owners for one coin's name.
perl -0pi -e 's/\{ sym:"PEPEUSD",label:"Pepe \/ USD",               cat:"Crypto"/{ sym:"PEPEUSD",label:"Pepe Coin \/ USD",          cat:"Crypto"/' "$SRCH"
run "DDD: SymbolSearch calls PEPE 'Pepe Coin' again while ChartToolbar says 'Pepe'"

# EEE — simulate a picker rename: the name extractor matches nothing.
perl -0pi -e 's/const re = \/\\\{\\s\*sym:\\s\*"\(\[\^"\]\+\)"\[\^\}\]\*\?\(\?:name\|label\)/const re = \/\\{\\s*NOSUCHFIELD:\\s*"([^"]+)"[^}]*?(?:name|label)/' "$TST"
run "EEE: crypto-name extractor matches nothing (vacuous-pass check)"

echo "=============================================================="
restore
echo "restored; diff vs working copies:"
diff "$B/yahooSymbol.ts.bak" "$SYM" && diff "$B/yahooSymbol.test.ts.bak" "$TST" && diff "$B/SymbolSearch.tsx.bak" "$SRCH" && echo "  ALL THREE FILES BYTE-IDENTICAL"
