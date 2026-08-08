# NOAH — Two Founder P0 emergency tickets, Sentinel pre-verified, ready now

**From:** Atlas (coordinator) · **Time:** 2026-08-07 23:10 CDT · **Repo HEAD:** `05a6534`

## Situation

Two Founder-reported P0 emergencies were filed to the bus this morning (`05a6534`, 07:11 CDT)
with Sentinel source-level pre-verification already done — both have sat unclaimed for ~16
hours because your session and the rest of the team's have been dormant since last night
(~23:20 CDT 2026-08-06). Nobody has dispatched you to these yet; this is the first.

## Ticket 1 — `WM-CHART-PROV-EMERG-01` (vendor-name exposure)

Founder, verbatim: *"stop exposing where our api keys are from."* Sentinel confirmed 3 real,
rendered (not just grep-matched) violations:

- `StockInfoPanel.tsx:237` — `"Live data via Finnhub"` rendered when `realOHLC` is true.
- `ChartToolbar.tsx:724` — `"Searching Finnhub global database…"` in symbol-search empty-state.
- `ChartToolbar.tsx:735` — `"Global results (Finnhub)"` as a live section header.

Fix: replace with vendor-agnostic copy (Micah owns label wording if you want a design pass
first, but the fix is small enough you can draft copy yourself and let Micah correct it).
Status ("DELAYED"/"LIVE") must stay truthful — only the vendor name moves. Push provenance
detail to dev-only (`console.debug` / `window.__WM_DATA_PROVENANCE__`), don't delete it.

After fixing the 3 confirmed spots, **re-grep** `DOMPanel.tsx`, `WMSessionVP.tsx`,
`WatchlistPanel.tsx`, `MainChart.tsx` — Sentinel's first pass only confirmed those 3 are clean
of *rendered* strings; a second pass after your edit can catch conditionally-rendered ones the
first pass missed.

## Ticket 2 — `WM-BROKER-TASTY-ESC-01` (tastytrade futures wiring, stalled 8+ days)

Founder, verbatim: *"Why don't I see tastytrade activated to the futures I've said many times
to have it wired up."* Forge's contract already exists:
`handoffs/forge/2026-07-31-forge-wm-broker-p0-01-tastytrade-futures.md` — no new spec needed.
Sentinel confirmed the core gap is still live: zero futures streaming/instrument function in
`src/lib/tastytrade.ts`; zero references to tastytrade anywhere under `src/components/chart/`
or `src/app/charts/`; futures still 100% Yahoo-sourced (`WatchlistPanel.tsx:73`,
`MainChart.tsx:2310`); `isFuturesApproved` (`tastytrade.ts:159`) computed but has zero
consumers.

**One correction to the ticket as originally worded:** `supportedAssetClasses` is NOT missing
a `"future"` entry — `tastytrade.ts:201` already sets
`["equity", "option", "future"]` unconditionally. Don't spend time "fixing" that string; the
real gap is (a) the missing instrument/streamer-symbol path and (b) `isFuturesApproved` having
no consumer to gate on it.

Acceptance per Forge's contract: `/ES /NQ /GC /CL` render live through tastytrade with correct
tick/point values, continuous-vs-specific contract distinction preserved (Bible §33),
`isFuturesApproved` actually gates the path. Sentinel live-verifies once futures market hours
allow it — don't block your own shipping on that.

## Priority order

Both are P0 Founder escalations. Suggest ticket 1 first (smaller, unblocks Sentinel's
grep-clean acceptance criterion #5 fast), then ticket 2 (larger, no new spec needed so you can
go straight to implementation).

## Never-do list

- Don't wait for the Founder — DEC-011.
- No live order placement on ticket 2 — DEC-005 boundary (read-only tastytrade) stays absolute.
- One primary ticket at a time within this dispatch — finish/commit ticket 1 before starting
  ticket 2 rather than interleaving.
- Don't self-close on grep alone — Sentinel re-verifies (grep + live) on submission per house
  standard.
- This is separate from your M1 scanner-reconcile branch (`noah/scanner-cache-reconciled`,
  awaiting Sentinel's §5 re-verify before merge) — don't fold these emergency fixes into that
  branch; keep them on their own commit(s) against `main`.

## To start

```bash
cd /Users/dspaidnoosleep/wealthymindsets-pro
git pull --ff-only origin main
```
