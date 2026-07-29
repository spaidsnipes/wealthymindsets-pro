# Competitor Study — DeepCharts (order flow)

**Date:** 2026-07-29 · **Author:** Mission Control · **Ticket:** WM-RESEARCH-P1-01
**Method:** Public documentation, help center, and third-party reviews. **No account** (Founder has none).
**Evidence class:** DOCUMENTED — read from vendor docs and reviews, **not observed running**. Nothing below was
seen in a live session. Do not cite it as runtime evidence.
**Safety:** No brokerage account touched. No orders. Public material only.

---

## 1. Why traders love it — the honest read

DeepCharts is browser-based order flow built by Volumetrica, aimed at **futures prop traders**. Its pull is
not the chart — it is that it packages tools retail traders previously could not get at all:

1. **It reconstructs institutional intent, rather than showing raw prints.** This is the whole product.
2. **Browser-based, cross-platform** — Mac/Windows/Linux/mobile, no VM. Reviewers repeatedly cite this.
3. **Effectively free through prop-firm bundles** (standalone $99/mo). It rides distribution.
4. **0.015s refresh** via dxFeed — credible for scalpers.
5. **A four-week order-flow bootcamp.** They teach the concept, then sell the tool that reads it.

**Criticisms, recorded honestly:** the learning curve is in order flow itself, not the UI; **CME/EUREX
futures only** — no equities, forex or crypto; no custom indicator scripting; tick processing strains older
machines.

### The strategic read for WM Pro

Their weakness is our opening. **DeepCharts cannot serve equities, forex or crypto.** WM Pro already does.
Their moat is depth-in-futures; ours can be *the same class of order-flow intelligence across asset classes
that DeepCharts structurally refuses to cover* — plus the creator layer they have no interest in.

We should **not** try to out-futures them. We should be the platform a trader uses for everything else, with
order-flow tooling that is honest about what it can and cannot see.

---

## 2. 🔴 DIRECT ANSWER TO OUR BIG TRADES BUBBLE DEFECT

This is the highest-value finding in the study.

Our bubble engine comment at `MainChart.tsx:813` reads *"Bubbles NEVER merge"*. That design choice is
**why they collide** into an illegible mass at the current price. We treated merging as a truthfulness
risk. **DeepCharts shows that framing is wrong**, and their docs name the exact mechanism:

> **Aggregate Trades** — *"groups small trades executed within a short time window at the same price into a
> single larger trade."*
> **Iceberg** — focuses on iceberg-type activity.

**The distinction we missed:** a large institutional order is **split by the exchange into many small
prints**. Reassembling those fragments back into the one order that actually happened is **more truthful,
not less** — it is what a human sees when they read the tape. That is entirely different from merging two
*unrelated* trades, which would be fabrication.

So our rule should be:

> **Merge fragments of the same order. Never merge distinct orders.**

That resolves the tension in the bubble ticket and removes the reason the bubbles pile up.

### Their full density/legibility toolkit — we have none of it

| DeepCharts control | What it does | WM Pro today |
|---|---|---|
| **Aggregate Trades** | Groups same-price prints inside a time window into one | ❌ explicitly refused |
| **Tick Grouping** (manual/auto) | Aggregates price levels to cut noise | ❌ none |
| **Dynamic Text Size** | Auto-scales label text to the value's magnitude | ❌ fixed |
| **Text Format "K"** | Abbreviates thousands | ❌ full numbers |
| **Min/Max Filter** | Hides values outside a range | ❌ none |
| **Single Print Min Value** | Minimum volume to be worth drawing | ⚠️ `minBigTradeLot` exists |
| **Vol Cluster Min Volume** | Threshold for a cluster to register | ❌ none |
| **Color Only Dominant Side** | Draws only the significant side | ❌ none |

We ship a bubble cap defaulting to **9999** — effectively uncapped — and nothing else. Every other lever
above is absent. That is the whole defect.

---

## 3. ⚠️ HARD CONSTRAINT — Deep Trades requires MBO Level 2

**Deep Trades requires a Level 2 feed with MBO (market-by-order) enabled.** Their own help center says the
source type must be set to MBO.

WM Pro's DOM panel already tells the truth about this in production: *"NO FABRICATED DEPTH — Equities and
futures DOM needs a licensed Level 2 feed."* That is correct and it must stay.

**Therefore: WM Pro cannot build true Deep-Trades-equivalent institutional reconstruction on the current
free data path.** Order *aggregation by price and time window* is achievable from the trade tape we already
have. **Iceberg and absorption detection are not** — they need order-level data we do not license.

**This is a fabrication tripwire.** Any ticket that claims iceberg detection, absorption, or "institutional
participation" without MBO would be the Wyckoff error repeated at the order-flow layer. Aggregation: build
it. Iceberg/absorption: label unavailable until the feed exists, and put the data cost in front of the
Founder as a business decision.

---

## 4. Feature inventory (for the gap matrix — do not duplicate existing tickets)

**Chart/analysis:** Deep Print (footprint®) · Volume Profile · TPO · DeepBars · Range · Renko ·
Long Term Volume · 80+ indicators · 5 Deep Studies · 10+ templates
**Order flow:** Deep Trades · Deep Walls (icebergs) · Stop Run Spotter · DeepDOM liquidity heatmap (Beta,
2026-05-18) · Big Trades
**Workflow:** Deep Replay (tick-by-tick historical replay) · Auto-Tracker · native Trade Copier (15
accounts) · Money Management (daily P&L limits, per-trade max loss, total loss caps) · DOM trading ·
Portfolio interface · trailing stops with auto-breakeven · IBKR + CQG connectivity

**Two that map onto Founder requests already tracked:**
- **Deep Replay** ≈ the Founder's "Session Replay + Annotation Layer". Theirs is tick-by-tick and used as a
  *training* tool — which is exactly the creator/education angle.
- **Money Management** ≈ the Founder's "regime-aware risk and position-size helper", but theirs is
  **enforcement** (hard caps), not suggestion. Enforcement is stickier. Worth a design decision.

---

## 5. What is NOT in this study

**moomoo, TradingView and tastytrade were NOT studied in this pass.** The Founder has them open and is
signed in, but the Chrome extension is not connected, and computer-use grants those apps at **read tier**
only — visible in screenshots, not drivable. They require either the extension connected or the Founder
fronting each app for visual capture. **Recorded as outstanding, not silently skipped.**

Also outstanding: **video transcripts** the Founder has now requested twice.

---

## Sources

- https://www.deepcharts.com/
- https://www.deepcharts.com/helpcenter/article/deep-print-(footprint®)
- https://www.deepcharts.com/helpcenter/article/deep-trades-deepchart
- https://www.deepcharts.com/blog/deep-trades-trading-orderflow
- https://damnpropfirms.com/trading-guides/deepcharts-trading-platform-review-2026-order-flow-tool-prop-traders/
- https://axcera.io/blog/deepcharts-launch-what-10-000-traders-learned-about-order-flow-and-why-infrastructure-matters
