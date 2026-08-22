# SHIFT-J BATON + SLICE A DISCOVERY INVENTORY — 2026-08-21

Branch `shift-j-one-wire` off origin/main `991e350`. Serves tonight's **WM Pro
Breakthrough Night Build Contract** (Drive fileId
`1Us8O2iYlYl7fDuRe42DjZGh7dfsLXLh6ZjGA-pTZ4-0`, read this session): P0 =
"ONE TRUTH / ONE WIRE"; SLICE A = "trace the existing circuits… identify direct
component imports and half-complete paths"; anti-spaghetti law: "no direct
provider fetch from React/UI when a canonical gateway exists or can be
completed"; P0 release blocker: "no provider-specific market truth in UI/domain
logic" + "independent consumers must not disagree on LIVE vs DELAYED."

Drive deep-dive this session read the fresh (today, 13:27) Build Contract in
full plus confirmed the Founding Execution Contract (`1KBFV…6efs`) still stands.

## Discovery method
Repo-wide grep for provider egress from UI (`src/components`, `src/app`,
excluding `src/app/api/**`). Direct provider-HOST fetches from UI: **none**
(all already terminate at `/api/*` routes — good). The real finding is
provider-SHAPED truth and duplicated provider ladders inside UI components.

## FIXED THIS SHIFT (2 atoms, both remove provider-specific truth from UI)

### Atom 1 — canonical QUOTE resolver  (`c7e…`→ see git log)
`TickerTape` and `WatchlistPanel` each re-implemented the quote fallback ladder
with **divergent** rules (TickerTape gated Yahoo via `yahooQuoteObserved()` and
required Alpaca `source==="alpaca"`; WatchlistPanel accepted any `price>0`) and
**different crypto/futures symbol sets** (ATOM/UNI/VX1!/ZN1! classified
differently) — so the same symbol could show a different price/source/LIVE on
the same screen. New `src/lib/marketData/consolidatedQuote.ts` is the ONE
resolver (unified sets, one classifier, one ladder, strict gates). Both UIs
delegate. **14 tests** incl. proof two calls for one symbol are identical.

### Atom 2 — canonical SYMBOL-SEARCH helper  (`4dd897c`)
`MainLayout`, `WatchlistPanel`, `ChartToolbar`, `ChartsDashboard` each hit
`/api/finnhub?type=search` inline while the shared `SymbolSearch` used the
canonical `/api/symbol-search` — a half-done migration in 4 divergent copies.
New `src/lib/marketData/symbolSearch.ts` (`searchSymbols`) is canonical-first
with a safe Finnhub fallback (upgrades coverage when Polygon key is live, never
blanks the box if it isn't). All 4 delegate; `/api/finnhub` untouched
(reversible). **8 tests** + 2 source-contract locks.

Proof for both: 0 prod tsc; full suite **798/798**; clean `next build`; branch
merges CLEAN into origin/main; NO live-team file touched.

## REMAINING direct-provider-in-UI sites (NOT fixed — for next shift)

Ranked by leverage. Each is a real SLICE-A circuit still to terminate behind a
canonical contract.

| # | Site(s) | Provider path | Why not this shift |
|---|---------|---------------|--------------------|
| R1 | `AlpacaTradingPanel.tsx` :126/137/145/200/227 | `/api/alpaca-trading` (account/positions/orders/submit/cancel) | **Highest** — P0 broker wall. Should route through `BrokerExecutionAdapter` (shift-G `src/lib/broker/adapters/*` exist) + TradeLine/PulseLine. Needs order-lifecycle + auth cert (external-gated). |
| R2 | `paper/page.tsx` :262, `scanner/page.tsx` :237, `MainChart.tsx` :1623 | `/api/yahoo?type=quote` (single-provider) | Could delegate to `resolveConsolidatedQuote`, but that ADDS fallback → behavior change on surfaces I can't visually verify. Safe follow-up once a login/visual gate exists. |
| R3 | `OptionsChain.tsx` :111, `scanner/page.tsx` :147, `ChartsDashboard.tsx` :1573 | `/api/fmp?path=…` (fundamentals/options) | No canonical fundamentals/options client yet; build `fmpClient`/`fundamentals` gateway then migrate. Pure/testable. |
| R4 | `heatmaps/page.tsx` :562, `WatchlistGrid.tsx` :106 | `/api/yahoo?type=candles` | Needs a canonical candle client. **heatmaps/page.tsx is in the live team's dirty set — do NOT touch until they land.** |
| R5 | `news/page.tsx` :129 | `/api/finnhub?type=news` | Single consumer, low priority; wrap when a news gateway is built. |

## Recommended next atom (safe, testable, unblocked)
**R3 fundamentals/options canonical client** — mirror the pattern of atoms 1–2:
a pure `fmpClient`/`fundamentals` resolver with injectable fetch + tests, then
migrate the 3 sites. No auth/visual gate, collision-safe. R1 (broker) is higher
value but external-gated on live cert + the broker credential-model decision
(still the Founder's call).

## Constraints honored
No merge to main (NO-GO held — Founder's call). Live-team dirty set avoided:
`heatmaps/page.tsx`, `HeroTruth.*`, `WhyInspector.tsx`, `heroTruthChronology.*`,
`broker/adapters/__fixtures__`. External gates unchanged: broker live-cert,
auth-gated visual acceptance, Supabase migration apply, broker credential model.

**MISSION STATUS = ACTIVE / CONTINUATION REQUIRED.**
