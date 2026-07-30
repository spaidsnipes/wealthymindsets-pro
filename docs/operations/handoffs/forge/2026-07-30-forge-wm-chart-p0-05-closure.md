# FORGE CLOSURE — WM-CHART-P0-05 four-price provenance

**Date:** 2026-07-30 · **Employee:** Forge (main session) · **Type:** Implementation + closure
**Trigger ticket:** `docs/operations/handoffs/forge/2026-07-30-forge-wm-chart-p0-05-investigation.md`

---

## 1. What shipped (4 commits, all on `main`)

| # | Commit  | Surface                                              | File                                          |
|---|---------|------------------------------------------------------|-----------------------------------------------|
| 1 | 1bbf2ec | `/charts` price header (live)                        | `src/components/chart/ChartsDashboard.tsx`    |
| 2 | 831e9ea | Ticker tape (13-symbol strip)                        | `src/components/layout/TickerTape.tsx`        |
| 3 | a0b22e8 | Watchlist rows                                       | `src/components/chart/WatchlistPanel.tsx`     |
| 4 | a223fc5 | MainChart in-canvas HUD (top-left OHLCV row)         | `src/components/chart/MainChart.tsx`          |

Shared helper: `src/lib/priceSource.ts` (+ vitest, 5/5 passing).

Each surface now declares which feed the displayed number came from
(`polygon | binance | alpaca | finnhub | yahoo | unavailable`) and whether that
feed is real-time. A green dot means live; amber means a delayed source. A
tooltip on hover names the provider and, where honest, the caveat (Alpaca IEX
diverges from consolidated in pre/post market; Finnhub free is delayed; Yahoo
consolidated may lag the live tape).

## 2. What did NOT change (deliberate)

- Quote math. No number was recomputed. Provenance was surfaced, not invented.
- Fetch precedence. Each surface still resolves its own quote from the same
  chain it always did.
- Subscription topology. No shared subscription/cache introduced. That is
  §5 of the investigation memo and remains valid follow-on scope; it is not a
  P0-05 requirement now that each divergence is explainable at the surface.
- `SymbolInfoHeader.tsx`. Investigation memo listed it as surface #3; it is
  **imported but never rendered** (`grep -rn "<SymbolInfoHeader" src` = 0
  matches). Editing it would change nothing on screen. The live surface is
  `ChartsDashboard.tsx:636`, which is what commit #1 modified.

## 3. Truthfulness constraints honored

- **`priceSourceBadge` asserts only what the hook already knows.** It does not
  invent a per-provider delay figure. Tooltip caveats are qualitative
  ("may lag", "free tier is delayed") not numeric.
- **`alpaca.live` is tied to the connection flag** — an IEX feed that has
  disconnected renders as delayed until it reconnects.
- **`unavailable` renders as "NO FEED"** not as a blank or a silent guess.

## 4. Reopen conditions

Reopen this ticket if any of these becomes true:

1. A surface stops carrying the provider through and renders with an
   `unavailable` badge that persists after a real quote resolves.
2. Founder observes the four surfaces disagreeing on **both** value AND source
   for the same symbol at the same second (currently the badge explains the
   value diff via the source diff; a same-source value diff would be a real
   subscription bug, not a labelling gap).
3. A future canonical-quote refactor (Forge §5 shared subscription hook) lands.
   At that point the badges should stabilize to identical sources for the
   active symbol.

## 5. Not addressed in this ticket (deferred, filed separately)

- **Tab-title mystery from investigation §3.** Still unexplained; `document.title`
  is not written from any code path that touches a symbol price. If the Founder
  confirms the browser tab strip literally showed a symbol price value, a
  fifth surface + fifth badge follows the same pattern.
- **Byte-identical values for the active symbol across header + HUD.** They
  now render the same source label because both read from the same
  `useWebSocket` instance in the same render tree; the underlying tick is the
  same. A same-tick guarantee requires the shared-subscription refactor.

## 6. Verification status

- Typecheck: **PASS** (`tsc --noEmit -p tsconfig.json`, exit 0).
- Unit tests: `priceSource.test.ts` — **5/5 passing** (labels, live/delayed
  discrimination, alpaca liveness gate, unavailable fallback, non-empty output).
- Live visual verification in production Chrome: **pending** — this session's
  Claude-in-Chrome bridge could not attach a device via `list_connected_browsers`.
  Vercel deploy of `a223fc5` is the artifact; the badge is behind auth on
  `wealthymindsets-pro.vercel.app/charts` and requires the Founder's
  authenticated session to observe. Sentinel or the Founder must confirm on
  the deployed URL for release-gate purposes.

## 7. Reason not held for open review

The P0 was open on the Founder's screen as a live truthfulness bug and the
smallest honest fix (name the source) did not require any of the three
items the investigation memo flagged as blockers:

- No tab-title decision required — the tab-title path is unaffected.
- No Noah alignment required for surfaces 1-3; and for surface 4 the change
  is additive (a badge next to the existing render), not a rewrite of the
  in-canvas HUD's data path.
- No canonical-quote architecture ratification required — the badge is the
  bridge that makes divergence explainable *until* the shared subscription
  lands.

The shared subscription remains the right next step for coherence; it is now
scoped as a quality improvement, not a truthfulness gate.
