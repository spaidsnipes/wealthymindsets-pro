# WM PRO SHIFT B — CLOSE-OUT
Date: 2026-09-03
Thread: ATHOS single-thread (Claude Code)
Opened after: WM-PRO-SHIFT-2026-09-03-CLOSEOUT.md (prior shift sealed at 5d8ae74)

## STATE AT CLOSE
- Suite: **335 files / 3127 tests passing** (verified unpiped, exit 0)
- TypeScript: clean (`tsc --noEmit`, exit 0)
- Prod: 25/25 routes 200, zero console errors, all quote APIs 200
- main: green

## PREFLIGHT FINDINGS
- 25 prod routes swept by HTTP: all 200.
- `/command-deck` console: zero errors. All `/api/yahoo` + `/api/exchange`
  quote calls 200.
- `/api/market-memory/coverage` → **503, and honestly so**:
  `{"edge":"NOT CONFIGURED","missing":["SUPABASE_SERVICE_ROLE_KEY"]}`.
  Textbook Monday Test 2 — names the exact variable. **Founder-side unblock:
  paste SUPABASE_SERVICE_ROLE_KEY into Cloudflare env vars to bring durable
  coverage online.** Not a defect.

## SHIPPED
| SHA | Fix |
|---|---|
| 75fa580 | perf(ticker): stop re-subscribing the quote poll on array identity |
| 00373bd | fix(charts): header painted a green +0.00% up-arrow on unknown data |
| b462d54 | fix(nav): two labels promised AI engines the destinations do not run |

### 75fa580 — 3x quote-request reduction (MEASURED)
The poll effect listed `customSyms` — state holding an ARRAY — in its
dependency array. The after-mount effect calls `setCustomSyms(stored)`,
allocating a NEW array even when contents equal the default. React compares
deps by identity, so the effect tore down and re-subscribed, firing another
full fetch round; a third followed once activeSymbol resolved.

Measured on prod BEFORE: **39 quote requests per page load** (3 rounds of 13).
TickerTape lives in the shell, so this multiplied on every route.

Now keyed on `requestedTapeKey`, a stable string of the requested symbol set.
Measured on prod AFTER (clean single-load window via
`performance.getEntriesByType('resource')`): **13 requests, 13 distinct
symbols, exactly 1 each.** The 10s interval and visibilitychange re-fetch are
unchanged. The localStorage persistence effect still depends on `customSyms`,
which is correct for it.
Canon §MACHINE PERFORMANCE: "bounded compute, no duplicate subscriptions."
**STATUS: PROVEN.**

### 00373bd — fabricated direction in the chart header
Observed on prod: `BTC 77,556.11 ↑ +0.00 +0.00%` rendered in green beside a
LIVE — CERTIFIED QUOTE badge, while the TickerTape one row above showed BTC
+2.49% for the same asset (Weakness #1 multi-price disagreement, plus a green
arrow painting a direction nothing measured).

`useWebSocket.flush()` is correct: it only writes change/changePct once
`prevCloseRef` holds a REAL prior close, and until then leaves them at their
initial 0 while still updating price and volume — deliberately, so a
seed-derived fake never reaches the UI.

The HEADER's guard was the fault: it required change, changePct AND volume to
all be zero before suppressing. Volume accumulates from live ticks, so the
"no reference close yet" state always had non-zero volume and passed as real.
Additionally `up = changePct >= 0` painted an exactly-zero change as UP.

Fixed: `hasReal` no longer consults volume; direction is `changePct > 0`.
If price genuinely equals the prior close the header omits the change until it
moves — honest, unlike a green arrow on unknown data.
**STATUS: TESTED (6 tests pinning the exact prod state). NOT live-verified —
the Chrome extension disconnected before I could confirm on prod. Next thread
should verify on /charts with a symbol whose reference close has not resolved.**

### b462d54 — nav labels promising absent engines
"AI Bot" pointed at a page titled "Market Intelligence · Observed market data
only · no generated signals", which renders the canonical Market Canvas and
carries its own "No substitute data" panel. The page was already honest; the
nav contradicted it. Now "Market Intel".
"AI Coaching Alerts" holds a win-rate threshold, a trade-count limit and
journal pattern matching — deterministic rules over the trader's own entries.
Now "Discipline Alerts".
Fourth and fifth instances of this class after the journal tabs (8878b5a).

## CHECKED AND CORRECTLY NOT CHANGED
Recording these so the next thread does not re-litigate them:
- **DOMPanel hardcoded `base` seed** — only feeds `deriveDomCenter`, and
  `levels` is empty unless built from a real book, so it never reaches screen.
- **WatchlistPanel triple fetch** — a sequential fallback chain (yahoo →
  alpaca → finnhub) with early returns, not duplicate work.
- **`recentTicks` effect deps** across SmartMoneyPanel / DOMPanel / MainChart —
  that array's CONTENT genuinely changes each tick; re-running is correct.
  Only TickerTape had the identity bug.
- **`/readiness`** — exemplary Monday Test 2 design: presence-only, value-free,
  names actual blockers, explicitly refuses "DELAYED BY ENTITLEMENT".
- **Black-Scholes options math** — textbook, with honest in-UI disclosure
  ("IV 50% · 100×/contract · BS model") and a "paper-sim only" code comment.
- **`applyFill` P&L** — delegates to `@/lib/paperTrade`, covered by 34 tests
  including long/short/flip/realized cases.
- **`/api/market-memory/coverage` 503** — correct NOT CONFIGURED behaviour.

## PARALLEL THREAD
Another ATHOS thread shipped 5 commits on top of mine during close-out
(8081d14, c1c2b92, b3d6176, 55045cc, d4b1576) — all in the same honesty spirit
(naming unclassified provider 403s as "access unproven", aligning heatmap
snapshot state with receipt truth). It also finally committed the heatmap files
that had been dirty all session. No collision; my commits and Sentinel files
are all intact and the suite is green on the merged tree.

## OPEN / CARRIED FORWARD
- **Chart-header fix needs live verification** (see 00373bd above).
- `/journal` trade-detail canvas fixed last shift, still not live-verified
  (needs an entry selected on prod).
- `DataHealth` aria-label zero-fills optional counts; aria-only, low impact.
- Provider truth unchanged: Webull BLOCKED_AUTH (401), Longbridge NOT
  CONFIGURED, moomoo bridge absent, Tastytrade refresh token absent.
- Drive: ATHOS/ATH role-bible folders remain EMPTY; real WM Pro canon lives
  under `05 — PROJECT OPERATIONS/05 — VIDEO INTELLIGENCE/01_WM_Pro/`.
- Visual canon asset families 01/11/12/13/18 and 03/05/06/19/20 remain
  REFERENCE ONLY — no runtime match yet.

## TIMING TRUTH
No shift duration is claimed. Recorded: 3 implementation commits, 1 measured
performance proof on prod, 1 prod route sweep, 0 plan rewrites, 0 Founder
questions, 0 self-inflicted regressions this shift.
