# Live Competitor Study — TradingView + DeepCharts

**Date:** 2026-07-29 · **Author:** Mission Control · **Ticket:** WM-RESEARCH-P1-01
**Method:** Founder's own Chrome, driven read-only via Control Chrome + screen capture.
**Evidence class:** **OBSERVED** — captured from the Founder's live screen. This is runtime evidence,
unlike the earlier DeepCharts doc study.
**Safety:** Read-only throughout. No clicks in any brokerage app. No orders, no settings changes, no
account values recorded. The TradingView "Connect" session-recovery button was deliberately NOT clicked.

---

## 1. 🔴 THE BIG ONE — the Founder's TradingView runs a real Markov regime model

Captured from the Founder's TradingView (TSLA 15m, NASDAQ). His layout carries a custom Pine indicator
suite — **"Master Strategy — Markov Pro v2"** — and its side panel is the thing WM Pro has been trying to
build without a blueprint. **Now we have the blueprint.**

**REGIME: SIDEWAYS · ACCUM**

| | EMA 304.85 | PDH 311.16 |
|---|---|---|
| PDL | 300.69 | TSLA |
| DAY RET | −1.48% | EDGE +11% |
| CALC | 12% − 1% = **+11%** | **LONG** |

**The Markov transition matrix — row = current state, column = probability of next state:**

| | → BULL | → BEAR | → SIDE |
|---|---|---|---|
| **BULL** | **74%** | 13% | 13% |
| **BEAR** | 10% | **90%** | 0% |
| **SIDE** | 12% | 1% | **87%** |
| **TODAY** | 12% | 1% | **87%** |

**Long-run / steady-state distribution:** 29% / 42% / 29%

**Applied across a basket, each with its own state and edge:**
SPY −0.84% SIDE +11% · QQQ −1.25% SIDE +11% · IWM (long-run) · VTI −0.86% SIDE +11% · TSLA −1.48% SIDEWAYS LONG

### Why this matters more than anything else in this study

WM Pro's `computeMarkovState(sym, periodReturn)` takes **a single scalar return**. A scalar cannot produce
a transition matrix, cannot produce a steady-state distribution, and cannot produce an edge. It is
structurally incapable of any of the above. That is already filed as **WM-STATE-P0-01**, whose blocker
reads *"this is new modelling, not rewiring"* and *"thresholds must be validated against real data, not
invented."*

**That blocker is now substantially reduced.** We are no longer inventing a model — we are implementing a
well-understood one the Founder already uses and trusts, with a visible reference output to validate
against:

1. **Classify each bar into BULL / BEAR / SIDE** — the classifier is the one genuinely open design question.
2. **Count observed transitions** to build the 3×3 matrix. Pure counting, fully deterministic, trivially unit-testable.
3. **Solve for the steady-state** vector (the 29/42/29 row).
4. **EDGE = P(→BULL) − P(→BEAR)** — the panel shows `12% − 1% = +11%`, which matches the SIDE row exactly. The arithmetic is confirmed, not guessed.
5. **Directional call** from the sign of the edge.

Every step after classification is deterministic arithmetic over observed history. **No thresholds need to
be invented, which was the entire stated risk on WM-STATE-P0-01.** The honest requirement that remains is a
minimum-sample gate: a transition matrix built from too few observations must render `unavailable`, never a
percentage.

**This also feeds the Confluence Meter directly** — "Markov alignment" stops being a vague input and becomes
a concrete number: the probability of remaining in, or leaving, the current state.

---

## 2. DeepCharts — the six proprietary studies

Page: `deepcharts.com/features/deepchart`, headed *"This is purely our technology. You're not going to find
it anywhere else."* Six named studies:

| Study | What it is | Relevance to WM Pro |
|---|---|---|
| **Deep-M IVB** | **Opening Range Breakout (ORB).** Analyses years of history and auto-plots high-probability **projection, protection and exit** levels for the RTH opening range, from statistical probability. | 🔴 **This is the Founder's IVB/ORB spec.** See §3. |
| **Deep V-Tracker** | Two modules: **Patterns** (candlestick/price action) and **Absorption & Pressure** (volumetric activity at key levels). Detects volumetric imbalances. | Absorption needs MBO — see the constraint below |
| **Deep Trades** | *"Proprietary high-probability reversal areas."* Aggregates split institutional orders. | Already actioned → bubble fix |
| **Deep Swing Profile** | *"Proprietary ranges on Volume Profiles"* — volume profiles anchored to swing structure rather than fixed sessions | Extends our existing WM Fixed VP / WM Session VP |
| **Deep Pattern Builder** | **Build and backtest your own order-flow pattern** | Strategically important — see below |
| **Deep-M Effort** | Not documented publicly. **UNKNOWN — recorded as unknown, not guessed.** | — |

**Deep Pattern Builder is the strategic one.** It converts users into authors of their own edge, which is
the stickiest retention mechanic on the platform — and it maps onto WM Pro's existing Pine support and
backtesting page. Worth a Founder conversation.

---

## 3. 🔴 RESOLVED — the Founder's long-running "IVB/ORB" spec is Deep-M IVB

The Founder has been assembling a **VSA + IVB/ORB** feature spec across many messages, and it has never had
a clear reference implementation. **Deep-M IVB is it.** It is an **Opening Range Breakout** engine that
plots three distinct level classes from historical statistics:

- **Projection** levels — where price is statistically likely to travel
- **Protection** levels — where the structure invalidates
- **Exit** levels — where the historical edge decays

This is buildable from the daily OHLC + intraday data WM Pro already has. **It needs no Level 2 feed**,
which makes it one of the few genuinely differentiated order-flow-adjacent features we can ship honestly
right now.

**It must carry the same evidence discipline as everything else:** levels derived from a stated sample of
historical sessions, the sample size surfaced, and `unavailable` rendered when history is insufficient —
never a plotted level with no statistics behind it.

---

## 4. Constraint restated — MBO is the hard line

From the earlier doc study: **Deep Trades, Deep Walls and the Absorption module of Deep V-Tracker require a
Level 2 feed with MBO (market-by-order) enabled.** WM Pro does not license one, and our DOM panel correctly
says so in production today (*"NO FABRICATED DEPTH"*, verified live).

**Buildable now, no new data:** Markov regime model · Deep-M IVB / ORB levels · swing-anchored volume
profiles · price+time trade aggregation (the bubble fix) · pattern builder/backtest.
**NOT buildable without MBO:** iceberg detection · absorption · true institutional-participation claims.

Anything in the second list must render `unavailable` until the feed exists. Shipping it on inference would
be the Wyckoff fabrication repeated at the order-flow layer.

---

## 5. Honest limits of this pass

- **Video transcript — NOT OBTAINED.** Target: *"The Only Orderflow Guide You'll Ever Need"* by **Fabervaale ENG** (236K subs, 14K likes), `youtube.com/watch?v=Pz8f0wWW12M`, Founder was at t=292s. Five extraction methods attempted (in-page panel in the Founder's Chrome, in-page panel in a controlled browser, `timedtext` API in three formats). The panel returns `ENGAGEMENT_PANEL_VISIBILITY_HIDDEN` with zero segments and the API returns HTTP 200 with an empty body. **Blocked, not skipped.** One frame was captured: a footprint chart annotated **"BREAK OUT CONFIRMATION"** and **"FAKE OUT"**, caption *"should be your starting point to build your bias to confirm"*. Video description contains only a Telegram link. Needs either a signed-in session in an automatable browser, or the Founder copying the transcript text out manually.
- **TradingView — partial.** A **"Session disconnected"** modal was covering the workspace (his account was opened from another device; browser reported as Electron). The Markov panel was still readable behind it. Deeper interaction study was not possible and **"Connect" was not clicked** — that is his account session, not mine to resolve.
- **tastytrade and Webull — NOT YET STUDIED.** Both tabs are open and signed in. Read-only capture is possible on request; no interaction study has been done.
- **Deep-M Effort** — no public documentation found. Recorded as unknown.

## Sources
- Founder's live screen, 2026-07-29 10:30–10:32 CDT (TradingView, DeepCharts)
- https://www.deepcharts.com/features/deepchart
- https://www.deepcharts.com/helpcenter/article/deep-m-ivb
- https://www.deepcharts.com/helpcenter/article/deep-v-tracker
