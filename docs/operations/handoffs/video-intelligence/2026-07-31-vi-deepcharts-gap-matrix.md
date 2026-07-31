# VIDEO INTELLIGENCE — DeepCharts feature gap matrix (VP Worlds + full order-flow)

**From:** Video Intelligence · **Date:** 2026-07-31 · **Base commit:** `50dc7cb`
**Answers dispatch:** `docs/operations/dispatches/2026-07-31/0859-video-intel-deepcharts-vp-worlds-gap-matrix.md`
**Evidence class:** WM-side rows = **CODE-VERIFIED** (files read at `50dc7cb`, line refs given).
DeepCharts-side rows = **DOCUMENTED, not observed running** — sourced from
`docs/research/COMPETITOR_STUDY_DEEPCHARTS_2026-07-29.md` (vendor help center + reviews, no account).
**Founder rule §5 honored:** where WM Pro does not have a capability, or the data feed cannot back it,
this document says so plainly. No capability is claimed that the code does not render.

---

## 0. TL;DR for Forge / Noah / Micah

WM Pro already ships **most of the order-flow surface** DeepCharts sells — Session VP, standard Delta,
CVD (real, with honest N/A fallback), Bid×Ask imbalance, Stacked Imbalances, Big-Trades bubbles, and a
per-bar footprint. The gaps that actually block "charts fully fixed and clean → people on the app" are:

1. **VP Worlds / VP Wars — undefined.** These two terms are in the Founder's ask but appear **nowhere**
   in our DeepCharts crawl and nowhere in the WM codebase. We cannot build or even scope them until the
   mechanic is defined from a primary source. **→ file research ticket first; do not guess.**
2. **Bubble density/legibility toolkit — missing.** The documented bubble-pileup defect. Aggregate-Trades
   fragment-merge, tick grouping, dynamic text, filters — WM has the qty cap and little else.
3. **Risk Manager — design only, no ticket.** Forge draft exists; nothing wired.
4. **Markov regime — shipped but inert** (zero importers, already tracked as WM-STATE-P0-02).
5. **Hurst — absent. Wyckoff — deliberately N/A** (DEC-009 blocks Wyckoff; leave it).
6. **MBO-gated features (Deep Trades / icebergs / absorption reconstruction / DeepDOM heatmap) — cannot be
   built on the current free feed.** Business decision for the Founder, not an engineering ticket.

---

## 1. Gap matrix

Legend — **WM has it?** ✅ full · 🟡 partial/heuristic · ❌ none · 🚫 feed-blocked (can't build honestly).

### Volume Profile family

| DeepCharts feature | Category | WM Pro has it? | Same fidelity? | Blocked by feed we don't license? | Suggested WM ticket |
|---|---|---|---|---|---|
| Session Volume Profile | Volume Profile | ✅ [`WMSessionVP.tsx`](src/components/chart/WMSessionVP.tsx) — RTH/ETH/24H/2D/1W/1M windows, live bid/ask per level, POC/VAH/VAL, session progress | 🟡 High for the live session; per-level bid/ask only where real ticks were captured — not backfilled | No (uses trade tape we already have) | — (shipped) |
| Fixed-range Volume Profile | Volume Profile | 🟡 "Delta + VP Box" drawing tool — user draws a range box → per-level delta + VP bars + POC, numbers on every row. [`DrawingToolsPanel.tsx:127`](src/components/chart/DrawingToolsPanel.tsx), [`deltaVP.ts`](src/lib/deltaVP.ts) | 🟡 Functionally a manual fixed-range VP; not a persistent/anchored auto-VP object | No | `WM-CHART-FIXEDVP-01` (Forge: decide if manual box is sufficient or a persistent fixed-VP object is needed) |
| Visual / Value-Area VP (POC/VAH/VAL, VA highlight) | Volume Profile | ✅ POC/VAH/VAL computed + colored; VP candles get gold POC/value-area borders. [`MainChart.tsx:1260-1278`, `:1812-1828`](src/components/chart/MainChart.tsx) | 🟡 Value area rendered; top-20%-volume heuristic for POC bars | No | — (shipped) |
| **VP Worlds** | Volume Profile | ❌ **not present and not defined in our crawl** | n/a — mechanic unknown | Unknown until defined | `WM-VP-WORLDS-DEF-01` (VI research → Forge spec) |
| **VP Wars** | Volume Profile | ❌ **not present and not defined in our crawl** | n/a — mechanic unknown | Unknown until defined | `WM-VP-WORLDS-DEF-01` (same ticket) |

> **Honesty flag on VP Worlds / VP Wars:** the DeepCharts study (`COMPETITOR_STUDY_DEEPCHARTS_2026-07-29.md`
> §4 feature inventory) lists Deep Print, Volume Profile, TPO, DeepBars, Range, Renko, Long-Term Volume,
> Deep Studies — **but not "VP Worlds" or "VP Wars."** Those names came from the Founder, not from our
> evidence. I will not describe or architect a feature whose behavior I have not observed. First deliverable
> is a definition from a primary source (their help center / a Founder-clicked video), then Forge scopes it.

### Delta family

| DeepCharts feature | Category | WM Pro has it? | Same fidelity? | Blocked by feed we don't license? | Suggested WM ticket |
|---|---|---|---|---|---|
| Standard Delta (per-level buy/sell) | Delta | ✅ footprint mode `delta`; `getBarFootprint` real captured aggressor side. [`FootprintControls.tsx`](src/components/chart/FootprintControls.tsx), [`deltaVP.ts`](src/lib/deltaVP.ts) | 🟡 Real where aggressor side was captured; bars without capture are not fabricated | No | — (shipped) |
| Cumulative Delta (CVD) | Delta | ✅ CVD candles (TradingView-style) + CVD Oscillator. [`MainChart.tsx:2542-2599`, `:2893-2894`](src/components/chart/MainChart.tsx); real cvd in [`SmartMoneyPanel.tsx:50,121`](src/components/smart-money/SmartMoneyPanel.tsx) | ✅ Honest — shows **"N/A — no aggressor tape"** when the feed lacks per-trade side | No (degrades honestly) | — (shipped) |
| Delta Divergence | Delta | ✅ [`SmartMoneyPanel.tsx:116-118`](src/components/smart-money/SmartMoneyPanel.tsx) — real cumulative delta vs candle direction | 🟡 Panel-level signal, not a chart-overlay marker series | No | `WM-CHART-DELTADIV-01` (Micah/Noah: promote to a chart overlay if Founder wants it on-chart) |
| Aggressive vs Passive | Delta | 🟡 footprint mode `aggressive-passive`, 4-way legend. [`FootprintControls.tsx:476-488`](src/components/chart/FootprintControls.tsx) | ⚠️ **Fidelity caveat:** true *passive* (resting-limit) volume needs order-book/MBO data. Verify the passive side is derived honestly, not inferred as capability we can't see | Passive side is MBO-adjacent — **flag for audit** | `WM-CHART-AGGPASS-AUDIT-01` (Forge/Sentinel: confirm passive side is real or relabel) |

### Imbalance family

| DeepCharts feature | Category | WM Pro has it? | Same fidelity? | Blocked by feed we don't license? | Suggested WM ticket |
|---|---|---|---|---|---|
| Bid×Ask Imbalance | Imbalance | ✅ footprint mode `imbalance` + "Imbalance Tracker" — *"live captured executed-trade imbalances only; historical OHLCV never reconstructed."* [`ChartToolbar.tsx:380`](src/components/chart/ChartToolbar.tsx) | ✅ Honest scope | No | — (shipped) |
| Stacked Imbalances | Imbalance | ✅ 3+ consecutive imbalanced rows → level line. [`MainChart.tsx:3504-3517`](src/components/chart/MainChart.tsx), [`ChartToolbar.tsx:384`](src/components/chart/ChartToolbar.tsx) | ✅ From captured live executed trades only | No | — (shipped) |

### Big Trades / Bubbles

| DeepCharts feature | Category | WM Pro has it? | Same fidelity? | Blocked by feed we don't license? | Suggested WM ticket |
|---|---|---|---|---|---|
| Big-Trades bubbles (qty presets, custom, delta levels, sound/pause) | Big Trades | ✅ [`FootprintControls.tsx`](src/components/chart/FootprintControls.tsx), [`bubbleQty.ts`](src/lib/bubbleQty.ts) — presets 25/50/75/100/150/200, custom 1–5000 (reject-not-clamp), delta levels, sound, pause | 🟡 Qty controls solid; **density toolkit missing** | No | `WM-CHART-P0-05b` (custom qty, already filed) |
| **Density/legibility toolkit** — Aggregate Trades (fragment-merge), Tick Grouping, Dynamic Text Size, "K" format, Min/Max filter, Vol-Cluster Min, Color-Dominant-Side | Big Trades | ❌ **the documented bubble-pileup defect** — WM ships the qty cap and none of these levers | ❌ | No — *aggregation of same-order fragments is buildable from our tape*; iceberg reassembly is **not** (see MBO row) | `WM-CHART-BUBBLE-DENSITY-01` (Forge arch → Noah). See study §2 for the fragment-merge rule already worked out. |

### Risk Manager (Founder roadmap #6)

| DeepCharts feature | Category | WM Pro has it? | Same fidelity? | Blocked by feed we don't license? | Suggested WM ticket |
|---|---|---|---|---|---|
| Money Management — daily loss/profit limits, per-trade caps, auto-flatten, portfolio caps | Risk Manager | ❌ **design only**, no runtime. Forge draft [`WM_RISK_MANAGER_ARCHITECTURE_2026-07-30.md`](docs/WM_RISK_MANAGER_ARCHITECTURE_2026-07-30.md) | n/a | ⚠️ Theirs is **enforcement** (hard caps auto-flatten). Enforcement requires brokerage write access — WM policy is read-only on live accounts. **Suggestion/overlay is buildable; auto-flatten is a Founder/compliance decision** | `WM-RISK-MGR-01` (Forge design exists → claim + implement as *overlay/advisory*, not order execution) |

### Regime detection

| DeepCharts feature | Category | WM Pro has it? | Same fidelity? | Blocked by feed we don't license? | Suggested WM ticket |
|---|---|---|---|---|---|
| Markov regime | Regime | 🟡 deterministic core **shipped but inert** — [`markov.ts`](src/lib/markov.ts) has **zero importers**; gated behind `NEXT_PUBLIC_MARKOV_ENGINE=v1`, returns `insufficient-evidence` honestly | 🟡 Engine correct, not surfaced | No | **WM-STATE-P0-02** (already filed — wire ≥1 honest consumer) |
| Inferred regime (delta + trend) | Regime | ✅ [`SmartMoneyPanel.tsx:129-130`](src/components/smart-money/SmartMoneyPanel.tsx) — labeled *"Price location only; not a full market-regime classification"* when no tape | ✅ Honest about being a lightweight inference, not Markov | No | — (shipped, honest) |
| Wyckoff phase/schematic | Regime | 🟡 present as **explicit N/A** — *"phase model not implemented"* / *"structure history required."* [`SmartMoneyPanel.tsx:131-132`](src/components/smart-money/SmartMoneyPanel.tsx) | ✅ Correctly refuses to fabricate a phase | No | **None — DEC-009 blocks Wyckoff work.** Leave the honest N/A. |
| Hurst exponent | Regime | ❌ **absent** — no Hurst anywhere in `src/` | n/a | No (computable from price series) | `WM-REGIME-HURST-01` (Forge: assess value vs Markov before building) |

### Order-flow footprint chart

| DeepCharts feature | Category | WM Pro has it? | Same fidelity? | Blocked by feed we don't license? | Suggested WM ticket |
|---|---|---|---|---|---|
| Footprint / Deep Print (per-bar bid/ask/delta in the candle) | Footprint | ✅ footprint modes render per-bar bid/ask/delta/imbalance via `getBarFootprint`. [`FootprintControls.tsx`](src/components/chart/FootprintControls.tsx), [`MainChart.tsx`](src/components/chart/MainChart.tsx) | 🟡 Real per-bar footprint where ticks were captured live; **historical bars lack captured aggressor side** and are not reconstructed | No — honest scope | — (shipped) |

### 🚫 MBO-gated — cannot build honestly on the current feed

| DeepCharts feature | Category | WM Pro has it? | Feed we'd need | Suggested WM ticket |
|---|---|---|---|---|
| Deep Trades (institutional-intent reconstruction) | Order Flow | 🚫 | **Level 2 + MBO (market-by-order)** | None — Founder business/data-cost decision |
| Deep Walls (iceberg detection) | Order Flow | 🚫 | MBO | None — fabrication tripwire without the feed |
| True Absorption / Exhaustion | Order Flow | 🟡 heuristic only — Absorption/Exhaustion Detectors flag high-vol narrow-range bars, labeled *"confirmation required."* [`ChartToolbar.tsx:382,385`](src/components/chart/ChartToolbar.tsx). **Not** order-level absorption | MBO for true absorption | None — keep the "possible / confirmation required" labeling |
| DeepDOM liquidity heatmap | Order Flow | 🚫 DOM panel already tells the truth: *"NO FABRICATED DEPTH — needs a licensed Level 2 feed."* | Level 2 depth feed | None — Founder data-cost decision |

---

## 2. Tickets to file in `ACTIVE_TASK_QUEUE.md`

Surfacing the gap and naming the lane only — **not** prescribing implementation (Forge's call, §39 of dispatch).

| Ticket | Lane | Gap it closes |
|---|---|---|
| `WM-VP-WORLDS-DEF-01` | VI research → Forge spec | Define VP Worlds + VP Wars from a primary source; they are undefined in our evidence |
| `WM-CHART-BUBBLE-DENSITY-01` | Forge arch → Noah | Bubble density/legibility toolkit (fragment-merge etc.) — the documented pileup defect |
| `WM-RISK-MGR-01` | Forge (design exists) → Noah | Risk Manager as advisory overlay; auto-flatten stays a Founder/compliance decision |
| `WM-REGIME-HURST-01` | Forge assess → Noah | Hurst regime detector — absent from codebase |
| `WM-CHART-FIXEDVP-01` | Forge decide | Whether the manual Delta+VP box suffices or a persistent fixed-VP object is needed |
| `WM-CHART-AGGPASS-AUDIT-01` | Forge/Sentinel | Confirm the "passive" side in Aggressive-vs-Passive is real, not MBO-inferred capability |
| `WM-CHART-DELTADIV-01` | Micah/Noah | Optionally promote Delta Divergence from panel signal to chart overlay |
| `VI-WM-P0-03` | Video Intelligence | Fabio / order-flow video queue — carried over from `2023-video-intel-next-matrix-row.md`, still unfiled |

Referenced-not-duplicated: **WM-STATE-P0-02** (Markov wiring) and **WM-CHART-P0-05b** (custom bubble qty) already exist.

---

## 3. Sources

- `docs/research/COMPETITOR_STUDY_DEEPCHARTS_2026-07-29.md` (crawl, no account)
- `docs/WM_RISK_MANAGER_ARCHITECTURE_2026-07-30.md` (Forge design)
- WM code at `50dc7cb`: `WMSessionVP.tsx`, `MainChart.tsx`, `FootprintControls.tsx`, `ChartToolbar.tsx`,
  `SmartMoneyPanel.tsx`, `deltaVP.ts`, `bubbleQty.ts`, `markov.ts`, `DrawingToolsPanel.tsx`
