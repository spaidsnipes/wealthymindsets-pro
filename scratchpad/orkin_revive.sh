#!/bin/bash
# §22 Orkin revive pass. Each revive puts a fixed bug BACK and must make the
# guard fail BY NAME. A guard that stays green here is worthless.
cd "$(dirname "$0")/.." || exit 1
B=scratchpad/orkin_backup
HERO=src/components/command-deck/HeroTruth.tsx
PAGE=src/app/command-deck/page.tsx
IDENT=src/lib/marketData/canonicalIdentity.ts
HTNS=src/lib/heroTruthNullState.test.ts
PICK=src/lib/marketData/pickerCryptoClassification.test.ts

restore() {
  cp "$B/HeroTruth.tsx" "$HERO"
  cp "$B/page.tsx" "$PAGE"
  cp "$B/canonicalIdentity.ts" "$IDENT"
  cp "$B/heroTruthNullState.test.ts" "$HTNS"
  cp "$B/pickerCryptoClassification.test.ts" "$PICK"
  cp "$B/SymbolSearch.tsx" src/components/ui/SymbolSearch.tsx
}

run() { # run <label> <test-globs...>
  local label="$1"; shift
  local out
  out=$(./node_modules/.bin/vitest run "$@" 2>&1)
  local code=$?
  echo "=============================================================="
  echo "REVIVE $label  -> EXIT=$code"
  if [ $code -eq 0 ]; then
    echo "  *** SURVIVED — THE GUARD IS WORTHLESS ***"
  else
    echo "$out" | grep -E "^ *× " | sed 's/^/  FIRED: /' | head -12
  fi
  restore
}

SESS="src/components/command-deck/heroTruthSession.test.tsx src/lib/heroTruthNullState.test.ts"
IDT="src/lib/marketData/pickerCryptoClassification.test.ts src/components/command-deck/heroTruthSession.test.tsx"

# FF — render the STORE KEY as the human session claim again (the original bug)
perl -0pi -e 's/\{sessionPresented\?\.value \?\? "unknown"\}/{state?.session ?? "unknown"}/' "$HERO"
run "FF: HeroTruth renders state.session again" $SESS

# GG — stop passing the owner's answer from the deck
perl -0pi -e 's/^\s*sessionPresented=\{\{ value: sessionTruth\.token, detail: sessionTruth\.detail \}\}\n//m' "$PAGE"
run "GG: deck stops passing sessionPresented" $SESS

# HH — drop the quote-suffix stripping (BTCUSD becomes an equity again)
perl -0pi -e 's/for \(const suffix of CRYPTO_QUOTE_SUFFIXES\) \{.*?\n  \}\n/\n/s' "$IDENT"
run "HH: cryptoBaseTicker stops stripping USD suffixes" $IDT

# II — shrink CRYPTO_TICKERS back to the pre-fix 20 bases
perl -0pi -e 's/const CRYPTO_TICKERS = new Set\(\[.*?\]\);/const CRYPTO_TICKERS = new Set([\n  "BTC", "ETH", "SOL", "BNB", "XRP", "DOGE", "ADA", "AVAX",\n  "LINK", "DOT", "LTC", "ATOM", "UNI",\n  "MATIC", "PEPE", "SHIB", "SUI", "WIF", "BONK", "FLOKI",\n]);/s' "$IDENT"
run "II: CRYPTO_TICKERS shrinks back to 20 bases" $IDT

# JJ — drop the venue-suffix stripping (BTC.COINBASE becomes an equity)
perl -0pi -e 's/\.replace\(\/\\\.\[A-Z0-9\]\+\$\/, ""\)//' "$IDENT"
run "JJ: cryptoBaseTicker stops stripping .VENUE" $IDT

# KK — remove compact-FX recognition (EURUSD becomes an equity, CLOSED on Sunday)
perl -0pi -e 's/^\s*if \(forexPairCodes\(upper\) !== null\) return "forex";\n//m' "$IDENT"
run "KK: canonicalAssetClass forgets compact FX pairs" $IDT

# LL — neuter the comment-stripper the BAN assertions depend on
perl -0pi -e 's/const src = raw\n/const src = raw; const _unused = (""\n/' "$HTNS"
run "LL: heroTruthNullState comment-stripper neutered" src/lib/heroTruthNullState.test.ts

# MM — simulate a picker rename: the extractor matches nothing
perl -0pi -e 's/const re = \/\\\{\\s\*sym:/const re = \/\\{\\s*NOSUCHFIELD:/' "$PICK"
run "MM: picker extractor matches nothing (vacuous-pass check)" src/lib/marketData/pickerCryptoClassification.test.ts

echo "=============================================================="
restore
shasum -c scratchpad/orkin.sha
