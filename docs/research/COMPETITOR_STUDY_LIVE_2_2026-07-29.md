# Live Competitor Study — Webull + tastytrade

**Date:** 2026-07-29 (session 2, ~15:20 CDT) · **Author:** Mission Control · **Ticket:** WM-RESEARCH-P1-01
**Method:** Founder's own Chrome via Control Chrome, screen captured read-only via computer-use.
**Evidence class:** **OBSERVED** — captured live from the Founder's signed-in sessions.
**Safety:** Strictly read-only. No clicks in either brokerage app. No orders, no settings changes,
no account values recorded. Only the visible UI layout and public quote data.

Companion to `COMPETITOR_STUDY_LIVE_2026-07-29.md` (TradingView + DeepCharts) and
`COMPETITOR_STUDY_DEEPCHARTS_2026-07-29.md`.

---

## 1. 🔴 THE DECISIVE FINDING — Webull ships the intervals we substitute on

Webull's TSLA chart timeframe row, captured live at TSLA `298.32`:

```
30s  1m  2m  3m  5m  10m  15m  30m  1h  2h  4h ▼
```

**11 intervals natively, including 3m, 10m and 2h — the exact three WM Pro silently substitutes on.**

This changes the framing of `WM-CHART-P0-03`. Our finding that `/api/finnhub:39` maps `2m → "1"` and
MainChart maps `2m → "5"` was originally interpreted as a Yahoo-availability constraint. **Webull proves
that constraint is not inherent.** A free retail platform serves 3m and 10m *natively*. So:

- **The substitution is a WM Pro choice**, not a provider limit.
- **We can either serve them natively** (route through a provider that supports them, or aggregate honestly
  from 1m — the module already has `aggregateCandles()` for exactly this, currently with zero importers),
- **or render them `unavailable` with a real reason.** What we cannot honestly do is what we do today:
  quietly return a different bar size labelled as the requested one.

**Add to WM-CHART-P0-03's acceptance criteria:** the Webull baseline is that these intervals are
user-expected. If we choose `unavailable`, that must be documented as a product choice, because a competitor
users compare us to ships them.

---

## 2. Webull — how they solve problems we have

### 2a. Big Trade / big print labelling — one clean anchor, not a bubble field

At the moment of the biggest afternoon drop, the low tick was **`296.16`** and Webull labelled it with a
**single small arrow-anchored callout to the right of the candle**. No stacked circles. No overprinting.
No collision with the price axis. Reads instantly.

Compare our bubble mess at the current price cluster on the same symbol at the same time.

**Design pattern for Noah:** one anchored label per notable event, not a bubble per print. Combined with the
DeepCharts aggregation rule already sent (`merge fragments of the same order, never merge distinct orders`),
this is the corrected model.

### 2b. Volume Profile — right-edge histogram, doesn't compete with candles

Webull's VP is a **right-side horizontal bar chart** sitting in the price axis gutter (labelled `VP (20,70)`).
It coexists with the candles because it occupies its own vertical column. WM Pro's `WM Fixed VP` sits over
the chart body and competes with candles for the same pixels.

### 2c. Extended hours are a **separate value**, not a modification

Webull's symbol header shows two lines:

```
TSLA  298.32  -9.12  -2.97%
      After:  296.34  -1.98  -0.66%
```

**Two labelled numbers, not one hybrid.** WM Pro currently offers an "extended hours ON/OFF" toggle that
mutates the primary series. That is faster but less truthful — the user cannot see both at once, so cannot
reason about the gap between them.

### 2d. Data timestamp is visible, always

Bottom-right of the Webull chart carries `Eastern Time 07/29/2026 16:23:36` alongside a connection icon.
Always on. Never intrusive. This is the truthful-data-status pattern; WM Pro should adopt it as a chrome
standard once the responsive layout ticket lands.

---

## 3. tastytrade — how they solve the *product* problem

### 3a. **Backtest and Journal are top-level nav.** Left rail, permanent icons.

The Founder's stated top-3 priority features are (1) Confluence Meter, (2) Alert Engine, (3) AI Journal
with auto-context — and item 4 on the wider list is a regime-aware position sizer. tastytrade's default
left-rail nav includes **Backtest** and **Journal** as core, alongside Positions, Trade, Activity,
Watchlist, Predict, Invest, News & Research, Chart, Follow Feed.

**This is validation.** These are not fringe requests — a real broker ships them as first-class nav.
Backtesting is where the Confluence Meter and the ORB engine both prove they are honest; Journal is where
the AI Journal ticket lives.

The right-rail also carries **Order Chains** as a first-class panel — the pattern for grouping orders that
share a strategy (e.g. spreads, roll cycles). Worth noting for when WM Pro starts exposing multi-leg trade
context.

### 3b. Truthful data-status labelling — top-right chrome

`Quotes: Delayed 15min · 7/29/2026 3:22:47 PM CDT` sits in the top-right, always visible. Same discipline
as Webull. Two brokerages, both showing users exactly what freshness they're looking at. WM Pro's DOM
already does this correctly ("NO FABRICATED DEPTH"); the pattern should be extended to every data surface,
not just DOM.

### 3c. Bid/Ask/Size in the header, not on the chart

Header carries `Bid(Sell) 7,337.75 · Ask(Buy) 7,338.00 · Size 3×9`. tastytrade keeps L1 quote off the chart
entirely — it belongs to the header, not the drawing surface. Cleaner canvas.

### 3d. Two accounts visible simultaneously

Both accounts (`5WI96649`, `5WI95019`) show side-by-side rows with `Net Liq / P/L Day / P/L YTD / Option BP
/ Stock BP / P/L Open / Today's Trades / Delta / Theta / Ext`. **Ten columns. All quantitative. No
promotional language.** This is what a professional trading UI looks like — data density with zero
persuasion copy.

---

## 4. What was NOT covered

- **moomoo** — the app is installed and permission is granted, but no moomoo tab is open in the Founder's
  Chrome and I did not open the desktop app. **Not skipped, just not started.** Say the word and it's next.
- **tastytrade options chain** — the Founder's tab is on `/trading/chart`; the options chain UI (tastytrade's
  primary strength) was not on screen. Would require clicking, which is a read-only breach in a live
  brokerage.
- **DeepCharts inside a real product** — we studied their marketing site. Their app is behind a paywall
  and the Founder has no account. Doc study is the ceiling until that changes.
- **Mobile/iPad views of any of these three** — desktop only in this pass. Mobile behaviour needs an actual
  device or emulator, which is the WM-RESP-P0-01 blocker as well.

## Sources
- Founder's live Chrome via Control Chrome, 2026-07-29 15:22 CDT
  - tastytrade `/trading/chart` on `/ESU6`, signed in
  - Webull `/trade` on TSLA 15m, signed in
- Companion studies:
  - `docs/research/COMPETITOR_STUDY_LIVE_2026-07-29.md` (TradingView Markov + DeepCharts studies)
  - `docs/research/COMPETITOR_STUDY_DEEPCHARTS_2026-07-29.md` (DeepCharts documentation)
