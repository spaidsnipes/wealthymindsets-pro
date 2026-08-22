# SHIFT-K BATON — 2026-08-22 (chart-truth SF-D01 gate + classification dedupe)

Branch `shift-j-one-wire` (now carries the one-wire mission shifts J+K), off
origin/main `991e350`. Merges CLEAN into current origin/main. HEAD `9b92861`.

## WHAT THE DRIVE AUTHORITY SAID
Re-read tonight's **Breakthrough Night Build Contract** (Drive
`1Us8O2iYlYl7fDuRe42DjZGh7dfsLXLh6ZjGA-pTZ4-0`) + reconciled with the Founding
Execution Contract. P0 = ONE TRUTH / ONE WIRE; no provider-specific market truth
in UI; consumers must not disagree on price/source/LIVE-DELAYED. Founding
Contract: the application must prove the work + visual verification is now a
permanent contract. Recurring-defect law: find the nest, repair it, lock it.

## WHAT WAS VERIFIED FROM THE PRIOR SHIFT (not trusted blindly)
- origin/main = `991e350` UNCHANGED (nothing merged; NO-GO held).
- Shift-J commits exist on origin (`b649ab3` quote resolver, `4dd897c` symbol
  search, `bf202fd` inventory), merge CLEAN, main untouched. Confirmed by
  `git cat-file` + `git merge-tree`.
- Live-team dirty set unchanged: `heatmaps/page.tsx`, `HeroTruth.*`,
  `WhyInspector.tsx`, `heroTruthChronology.*`, `broker/adapters/__fixtures__`,
  `heatmapMarkovDeckAccessibility.test.ts`. All avoided.
- No connected Chrome (`list_connected_browsers` → []); preview launch configs
  target the main repo, not this worktree → visual acceptance BLOCKED_AUTH.

## WHAT WAS SHIPPED (this shift)
1. `7a6ab8f` **Chart-truth SF-D01 gate** (recurring-defect nest). The chart's
   live-quote hook `useWebSocket.fetchRealQuote` was a FOURTH quote ladder that
   accepted any Yahoo `price>0` with NO observed gate — the same fake-fresh
   (previousClose-as-live) acceptance SF-D01 fixed in TickerTape/WatchlistPanel/
   paper/scanner, but the chart was missed. New pure `realQuoteGate.ts`
   (`realQuoteSourceAccepted`) is the one shared gate; applied at both Yahoo
   acceptance sites. Truth-tightening only (suppresses fake-fresh; never shows
   more). **6 tests** (unit gate + source-contract lock of both Yahoo sites).
2. `9b92861` **Classification dedupe.** useWebSocket now imports the canonical
   crypto/futures sets from consolidatedQuote (byte-identical → zero behavior
   change), making consolidatedQuote the single UI-side classification owner.
   Source-contract lock added.

## WHAT CHANGED IN THE RUNNING PRODUCT
The observed gate is now applied by EVERY price consumer — ticker + watchlist
(consolidatedQuote), chart + charts-dashboard (useWebSocket, both read the same
hook), paper + scanner (Yahoo-only + observed). On `/charts`, the chart header
can no longer show a fake-fresh Yahoo price that the watchlist rejects for the
same symbol. Behavior only changes in the fake-fresh case (blank > invented).

## WHAT DID NOT CHANGE
Ladder ORDER (incl. the crypto yahoo-first-vs-alpaca-first divergence — see
findings); server-side classification sets; any live-team file; main.

## FILES CHANGED
`src/lib/marketData/realQuoteGate.ts` (new), `realQuoteGate.test.ts` (new),
`src/hooks/useWebSocket.ts` (gate + canonical-set import).

## TESTS / BUILD
0 prod tsc; full suite **805/805** (+7 this shift); clean `next build` each commit.

## VISUAL PROOF
**BLOCKED_AUTH.** No connected Chrome; the effect only manifests on authenticated
`/charts` when `/api/yahoo` returns an UNKNOWN observation (e.g. futures on a
closed/Sunday session, or a symbol with no live trade). Non-visual proofs above
are complete.

### FOUNDER VISUAL-ACCEPTANCE CHECKLIST (do when authed)
1. Route `/charts`, pick a futures symbol (e.g. `ES1!`) during a CLOSED session.
   - EXPECT: chart shows no fake "live" price / no green LIVE badge; a delayed/
     unavailable state instead. Compare the chart header price to the same
     symbol in the watchlist — they must AGREE (both withhold, not one fake-fresh).
2. Route `/charts`, a normal equity (e.g. `AAPL`) during RTH.
   - EXPECT: unchanged — real observed Yahoo price shows normally; badge DELAYED.
3. Failure behavior: kill network to `/api/yahoo` (devtools offline) → chart
   falls to Alpaca/Finnhub (equity) or shows no live tick (futures) — never a
   fabricated price.

## AUTH-GATED ITEMS
The above checklist; also any pixel acceptance of shift-J's quote resolver +
symbol-search consolidation (same reason).

## LIVE-TEAM EXCLUSIONS
heatmaps/page.tsx, HeroTruth.*, WhyInspector.tsx, heroTruthChronology.*,
broker/adapters/__fixtures__, heatmapMarkovDeckAccessibility.test.ts.

## P0/P1 DEFECTS FOUND (documented, NOT fixed blind)
- **P1 — crypto/futures classification drift (4 definitions).** api/alpaca lists
  MATIC; api/market has MATIC but is MISSING ATOM/UNI; consolidatedQuote +
  useWebSocket have ATOM/UNI, no MATIC. Same symbol classified differently
  server vs UI → routing/price disagreement (e.g. MATIC treated as equity in UI,
  crypto server-side). Needs a founder decision on the canonical crypto list
  (MATIC→POL rebrand) then unify api/alpaca + api/market onto it.
- **P2 — crypto ladder ORDER divergence.** useWebSocket crypto = Yahoo-first;
  consolidatedQuote crypto = Alpaca-first (real-time). For crypto the chart can
  prefer delayed Yahoo while the watchlist shows real-time Alpaca. Low urgency
  (WS coinbase/binance takes over for crypto) but a real same-screen mismatch;
  verify intent then align.
- **NOTE (not a defect):** MainChart:1623 `/api/yahoo` spot is an INTERNAL
  candle-staleness validator (rejects candles >5% off spot), not a displayed
  price — correctly left alone.

## RECURRENCE ROOT CAUSE
SF-D01 fake-fresh returned because each consumer owned a copy of the quote
acceptance rule; the chart's copy was never given the gate. Repaired by extracting
ONE shared gate + a source-contract test that locks every Yahoo acceptance in the
hook to it.

## COMMITS / BRANCH / MERGE
`7a6ab8f`, `9b92861` (+ shift-J `b649ab3`,`4dd897c`,`bf202fd`) on
`shift-j-one-wire`. Merges CLEAN into origin/main `991e350`. No conflicts. Not
merged (NO-GO held — founder's call).

## EXACT NEXT SAFE ATOM
Founder decision on the canonical crypto list → unify api/alpaca + api/market
classification (P1 above). If a visual/auth gate opens: verify the crypto ladder
order (P2) and this shift's BLOCKED_AUTH checklist, then align useWebSocket crypto
to Alpaca-first. R3 (canonical FMP client) remains available as a pure atom.

**MISSION STATUS = ACTIVE / CONTINUATION REQUIRED.**
