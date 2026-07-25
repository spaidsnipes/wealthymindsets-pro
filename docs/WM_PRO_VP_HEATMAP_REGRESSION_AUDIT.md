# WM Pro — Volume Profile / Heatmap / Drawing Regression Audit (Phase 1)

**Date:** 2026-07-24 · **Scope:** VP engine, Session/Fixed VP, heatmaps, order-flow, drawing/color. Audit only — no rebuild in this document.
**Method:** source inspection of `src/components/chart/MainChart.tsx` (`drawWMVP`), `src/app/heatmaps/page.tsx`, `src/app/api/heatmap`, drawing/style code + live behavior observed this session.

---

## 0. Executive root cause (the one that matters)

**The Volume Profile is calculated from CANDLES, not from trades.** `drawWMVP(barsToUse: Bar[])` (`MainChart.tsx:5333`) builds `volMap` like this (`:5384`):

```
barsToUse.forEach(b => {
  const first = floor(b.low / tickSz), last = ceil(b.high / tickSz);
  const touched = last - first + 1;
  const perBucket = b.volume / touched;          // candle volume spread EVENLY
  ... up += isUpBar ? perBucket : 0;             // up/down by whole-candle dir
});
```

Consequences, all confirmed:
- Volume-at-price is **estimated**, never measured. A candle that traded 90% of its volume at the low still paints an even smear across its whole high→low range.
- Bid/ask (up/down) split is **per-candle direction**, not per-trade aggressor — so "delta" is an approximation of an approximation.
- **This is the accuracy ceiling.** No amount of rendering work fixes it.

---

## 1. Why 1-minute looks better and other timeframes look worse (SOLVED)

`barsToUse = barsRef.current` = the candles fetched **for the current chart timeframe**.
- **1m**: candle high–low ranges are narrow → `b.volume` spreads across few buckets → distribution stays concentrated and reads well.
- **1h / higher**: each candle spans a wide high–low → `b.volume / touched` smears across many buckets **uniformly** → chunky, flat, inaccurate "blocks."

So the **same session** profiled at 1m vs 1h produces **different distributions** purely because the candle granularity differs. This directly violates the directive's non-negotiable principle (Session/Fixed VP must be timeframe-independent). It is not a rendering bug — it is a **data-source bug**: the profile's input (candles) is timeframe-dependent.

**Fix direction:** source the profile from the finest available data — raw trades where a feed provides them (crypto via exchange WS today; Alpaca/dxFeed trades where entitled), otherwise from a **single fixed-resolution intrabar series** (e.g. always 1m sub-bars) independent of the displayed timeframe. The displayed timeframe may change candle aggregation but must feed the profile the same base series.

## 2. Bucket grid / normalization (partially fixed this session)

- `rows = 320`, `tickSz = rawRange/320` snapped to a clean increment (`:5316`). Data-anchored (stable on pan) — good.
- Normalization: **fixed this session** from `medVol × 5` (saturated every above-median level to full width → the "solid block") to the **real peak bucket** (`maxBucket`, linear, no baseline/power-curve) so bar length is now honest volume-at-price. Deployed `08ed7fe`.
- Width capped (single 13%, dual 10%) + Session VP drawn at 0.6× alpha for distinct identity. Deployed `e488d2f`.
- **Still candle-sourced**, so §0/§1 remain the ceiling.

## 3. Session vs Fixed VP

- **Fixed VP** (`:5708`): sources `barsRef.current` (full fetched history for the symbol/timeframe). POC/VAH/VAL from the whole set — stable on scroll (good) — but timeframe-dependent input (§1).
- **Session VP** (`:5733`): filters bars to NY RTH minutes 570–960 ET, then same candle-spread. Correct session intent, same candle ceiling. On **Daily** the RTH-minute filter excludes daily bars → Session VP renders empty (a real edge case to handle/label).
- Both share `drawWMVP` = one engine (good), but that engine is candle-based (bad).

## 4. Value area / POC

- Deterministic expansion from POC outward to 70% exists. **Not yet** tested against hand-calculated fixtures (directive §31). No unit tests in repo (no test runner besides the Playwright harness added this session).

## 5. Heatmaps — delay root cause (SOLVED)

- Source: `/api/yahoo?type=candles` (`heatmaps/page.tsx:504`) — **Yahoo candles**, not a live trade/quote feed.
- Cadence: `setInterval(load, tf==="1D" ? 30_000 : 120_000)` (`:593`) → **30s (1D) / 120s (historical)** polling. No WebSocket.
- Yahoo itself is commonly **~15-min delayed** for many symbols.
- So "delayed heatmap" = polling interval **+** upstream Yahoo delay. It is not real-time and is not labeled as delayed.
- It shows **executed candle volume**, not resting liquidity — must not be called a "liquidity heatmap."

**Fix direction:** label delay honestly (directive §25/§29); where a live feed exists (crypto WS, Alpaca), drive an executed-**trade** heatmap incrementally; keep Yahoo as a clearly-labeled DELAYED fallback.

## 6. Drawing / color system

- Drawings persist as absolute `{price,time}` anchors, per-user+symbol key `wm_draw:v1:<uid>:<symbol>` (survives reload/route). Corrupt-item quarantine added this session (`e0b2539`).
- Style lives in `ChartDrawing.style` (`DrawStyle`); geometry in `pts` — **one object model** (good; directive §27 is largely satisfied structurally).
- Reported unreliability (color popover, selection) needs a **live interaction audit on mouse + touch/iPad** — not yet done. Suspect: pointer-capture/selection loss when the style popover opens, and touch vs pan contention. **Open.**

## 7. Confirmed defects
- VP candle-sourced → cross-timeframe inconsistency + estimation (P0, §0/§1).
- Heatmap polled Yahoo (delayed, unlabeled) (P1, §5).
- Session VP empty on Daily, unlabeled (P2, §3).
- No VP calculation unit tests / fixtures (P1, §4).
- Drawing color/selection reliability on touch — unverified (P1, §6).

## 8. What already works / should remain
- Data-anchored 320-bucket grid (stable on pan).
- Real-peak normalization + width cap + Session translucency (this session).
- One shared `drawWMVP` engine, one drawing object model, absolute-anchor persistence + quarantine.
- Create-once chart lifecycle (blank-chart fix, this session).

## 9. Proposed repair order (matches directive Phases 3–5; NOT started)
1. **Data truth:** define one intrabar base series (raw trades where available, else fixed 1m sub-bars) feeding a timeframe-independent profile engine.
2. **Engine:** `computeProfile(trades|baseBars, {session|range, tickSize, valueAreaPct})` returning an immutable snapshot (rows, POC, VAH, VAL, delta) — pure, unit-tested against fixtures.
3. **Cross-TF test:** assert identical POC/VAH/VAL/per-bucket volume for the same session across 1m/5m/15m/30m/1h.
4. **Render:** keep the current thin-row renderer; feed it the engine snapshot (calculation/geometry/material/labels separated).
5. **Heatmap:** honest delay label + trade-based mode where a live feed exists.
6. **Drawing:** live mouse+touch interaction audit; fix pointer-capture/selection.

## 10. Rollback
- All current work is on `main` behind normal deploys; Vercel instant-rollback to any prior deployment. The engine rebuild should land behind a `NEXT_PUBLIC_VP_ENGINE=v2` flag so v1 (current candle-based) stays the default until v2 passes fixtures + founder visual sign-off.

## Data-quality reality (for the badges in directive §29)
Today every WM VP is **CANDLE-ESTIMATED** (equities/futures) except crypto where per-trade WS exists. That badge must be shown; claiming "trade-based" for equities today would be false.
