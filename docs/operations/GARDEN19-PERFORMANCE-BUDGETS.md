# Garden 19 — Performance budgets per device class (order §37 / §8)

Written 2026-10-10 by the MARKET-TRUTH & STABILITY lane. **Rule of this page: no
invented numbers.** Every MEASURED cell names the build, the scene, the hardware
and the browser it came from. A cell nobody measured reads **UNMEASURED**. A
budget is either a constant that already exists in code (cited) or a
**PROPOSED** target that awaits the Founder; proposals are marked as such.

## Where the numbers come from

| Instrument | What it reads | Where |
|---|---|---|
| `marketClockProbe` → `canvas.dataset.marketClock` | p50/p95 ms of three legs: print → hook state (rAF flush), state → `series.update`, series → overlay paint; prints folded per flush; backlog | `src/lib/chart/marketClockProbe.ts` |
| `canvas.dataset.mainChartRenders` | MainChart render count (renders/s = Δcount / Δt) | `MainChart.tsx` (2026-10-10) |
| `canvas.dataset.paintMeanMs / paintLongestMs / paintBudgetMs` | overlay paint cost per frame | `MainChart.tsx` paint ledger |
| rAF probe (glass script) | frame-to-frame interval of the page's own rAF | ad hoc, run in the measuring tab |
| `performance.memory.usedJSHeapSize` | JS heap (Chrome only) | ad hoc, run in the measuring tab |
| `debug=fold` → `canvas.dataset.liveFoldTail` | newest 6 bars as the chart holds them (for venue comparison) | `MainChart.tsx` (2026-10-10) |

**Hardware/browser for every MEASURED cell below:** Mac mini (Mac16,10, Apple M4, 10
cores, 16 GB), Chrome 155 (`Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) …
Chrome/155.0.0.0`), DPR 1, viewport 1910×790. The tab was in the foreground;
other lanes' tabs shared the window, so some sampling windows were throttled
(noted where it happened). Market: BTC-USD on Coinbase (CME futures and US
equities closed — Saturday).

## Budgets

| Metric | Desktop (≥1280) | Tablet (834) | Phone (390) | Budget source |
|---|---|---|---|---|
| Frame interval (page rAF) | 16.7 ms (60 fps) | 16.7 ms | 16.7 ms | PROPOSED (display refresh) |
| Overlay paint per frame | ≤ 33 ms (≤ 50 ms with profiles) | same | same | `STANDARD_OVERLAY_FRAME_MS` / `PROFILE_OVERLAY_FRAME_MS`, `src/lib/chartOverlayGovernor.ts` |
| Print → candle on screen (sum of the three legs, p95) | ≤ 100 ms | ≤ 100 ms | ≤ 150 ms | PROPOSED |
| Forming-bar emission to the dashboard | ≤ 4/s inside a bar; at once on a new bar | same | same | `LIVE_EMIT_MS = 250`, `MainChart.tsx` |
| MainChart renders/s on a live tape | ≤ 4/s | ≤ 4/s | ≤ 4/s | PROPOSED (follows from the emission pace) |
| Drag latency (pointer → chart moved) | ≤ 1 frame | ≤ 1 frame | ≤ 2 frames | PROPOSED |
| Heap drift over 30 min live | ≤ +10 MB after GC | same | same | PROPOSED |
| Red/green frames under Clarity gold | 0 | 0 | 0 | Founder defect A (2026-10-10) — desktop MEASURED 0 in 2,500 frames incl. 4 rebuilds (10ffd25, row above) |

## Measured today (2026-10-10)

| Metric | Desktop — measured | Build / scene | Tablet | Phone |
|---|---|---|---|---|
| Frame interval p50 / p95 / p99 / max | 16.7 / 18.3 / 18.6 / 18.7 ms; 0 of 4,000 frames > 33 ms | 135eec5, BTC-USD 15s, `scene=clean&on=ClarityCandle`, rAF probe | UNMEASURED | UNMEASURED |
| Overlay paint mean / longest | 5.8 / 7.6 ms (budget 50, 0 over budget) | 542ae83, BTC-USD 15s, `scene=verify` | UNMEASURED | UNMEASURED |
| print → state (p50/p95) | 8.6/32 ms (542ae83); 11/20 ms (135eec5); 11/35 ms (a60366c) | BTC-USD 15s | UNMEASURED | UNMEASURED |
| state → series (p50/p95) | 20/32 ms (542ae83, Clarity off); 7.0/9.0 ms (135eec5); 19/49 ms (a60366c, first 40 s after load) | BTC-USD 15s | UNMEASURED | UNMEASURED |
| series → paint (p50/p95) | 42/56 ms (542ae83); 25/41 ms (135eec5); 38/80 ms (a60366c, first 40 s) | BTC-USD 15s | UNMEASURED | UNMEASURED |
| Prints folded per flush (p50 / max) | 1 / 6 (542ae83); 1 / 17 (10ffd25, 5s) | BTC-USD | UNMEASURED | UNMEASURED |
| MainChart renders/s | 10.00 (c4d4d4c, 20 s window) → 3.64 (a60366c, 154 s window, after paced emission) — tick rate not controlled between windows | BTC-USD 15s, `debug=fold` | UNMEASURED | UNMEASURED |
| Red/green frames under Clarity | 3 in ~9,000 frames, one per empty-series rebuild (135eec5) → 0 in 2,500 frames incl. 4 rebuilds (10ffd25) | BTC-USD 15s/5s/1m/15m switches, ETH↔BTC | UNMEASURED | UNMEASURED |
| Heap (usedJSHeapSize) | 44.6 MB → 50.9 MB over 6.9 min; sawtooth 44.6–71.0 MB; 14 samples (timers throttled while another lane's tab was in front) | e3f7686, BTC-USD 15s live | UNMEASURED | UNMEASURED |
| Drag latency (order line: pointermove → handle label and ticket Stop field committed) | p50 4.2 / p95 11.8 / max 21.1 ms over 30 moves of 3 px; 0 missed; handle and ticket committed in the same turn every time (same-frame sync). Within the ≤ 1 frame budget | a3c3cb5, NQ1! 5m `scene=ticket-fixture&on=fvg,LivingProfile,BrickWalls`, synthetic PointerEvents on the STOP handle, MessageChannel polling, Claude-in-Chrome tab in a HIDDEN window with the visibility shim (2026-10-10 18:40 CDT) — measures the React/DOM path, not the display's paint | UNMEASURED | UNMEASURED |
| 15s bar fidelity vs venue | 17 of 19 live bars exact on O/H/L/C/V vs Coinbase public trades (the 2 others: the load bucket, and a bar still filling at read time) | e3f7686, `debug=fold` | n/a | n/a |
| Hidden-tab catch-up | hidden 37 s → 3 buckets present, 2 caught up from the closed-bar ring, no hole | c4d4d4c | UNMEASURED | UNMEASURED |

## Not yet measured — how to

* **Tablet / phone:** same probes at 834×1112 and 390×844 (the room's proof sizes) on a
  real iPad / iPhone Safari. Desktop Chrome emulation is NOT a substitute for the
  frame and heap cells.
* **Drag latency:** pointerdown timestamp → the first rAF in which
  `timeScale().getVisibleLogicalRange()` changed; p50/p95 over 50 drags.
* **Futures (tastytrade) tick-to-render:** CME opens Sunday 17:00 CT; repeat the
  marketClock reading on NQ1! 15s.
* **Heap drift over 30 min:** one foreground tab alone in its window, samples
  every 10 s, report the post-GC floor at start and end.
