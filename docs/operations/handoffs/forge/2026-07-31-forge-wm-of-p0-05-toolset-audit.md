# WM-OF-P0-05 — Order-flow toolset per-tool audit (Forge)

**From:** Forge (Principal Architect) · **Date:** 2026-07-31 · **Repo HEAD:** `50dc7cb`
**Type:** Per-tool audit + one shared root-cause contract for Noah. Forge does not ship (DEC-008/DEC-012).
**Founder claim:** Bid×Ask / Delta / Vol Profile / Imbalance / Agg-Passive / Big Trades — "they all need to function properly, right now there not fully working."

> **Deliberate consolidation.** The dispatch asked for one file per tool. I am giving **one** audit because the five profile tools share **one** root cause — six files would falsely imply six independent bugs. Each tool still gets an explicit GREEN / NEEDS-NOAH verdict below.

---

## 1. How each tool is wired (verified)

All six modes **do** mount correctly. `footprintType` → `effectiveFP` (MainChart.tsx:1940) dispatches to a real draw branch for each:

| Tool | `effectiveFP` branch | Data source | Mounts? |
|---|---|---|---|
| Bid × Ask | L4494 `MODE 1` | `getBarFootprint` → `getBarSubProfile` | ✅ |
| Delta | L4620 `MODE 2` | same | ✅ |
| Volume Profile | L4834 `MODE 3` | same | ✅ |
| Imbalance | L4907 `MODE 4` | same | ✅ |
| Aggressive/Passive | L4980 `MODE 5` | `getBarSubProfile` via `getBarRoles` | ✅ |
| Big Trades | L5162 `MODE 6` | `getRealBigTradeLevels` → `tickAccRef` | ✅ |

So the toggles are **not** dead. The problem is the **data underneath five of them.**

## 2. Root cause (shared by the five profile tools)

`getBarSubProfile` (MainChart.tsx:4057–4085) is **honest by design** — it returns **real captured tape only** (`tickAccRef`), and when no tape exists for a bar it returns `null` and **never synthesizes** (L4083–4084: *"leave the footprint empty—never synthesize it"*). That satisfies Founder truth rule §5 — but it produces the exact symptom the Founder sees:

- **`tickAccRef` accumulates live trades going forward only.** There is **no historical tape backfill.** Every bar that closed *before* the chart was opened has `getBarSubProfile → null`.
- Therefore Bid×Ask / Delta / Vol-Profile / Imbalance / Agg-Passive render **empty on all historical candles**, and only populate the handful of bars printed since the panel opened.
- **The empty result is drawn silently.** When `getBarSubProfile` returns `null`/empty the canvas simply paints nothing for that bar — **no `unavailable` indicator, no "capturing live tape…" state.** That is a truth-rule §5 gap: *missing feed must render `unavailable`, not silently render empty.*

Net: the tools "work" but look broken because they are **live-capture-only with no honest empty-state.** That is one architectural defect, not five.

## 3. Per-tool verdict

| Tool | Verdict | Reason |
|---|---|---|
| **Bid × Ask** | **NEEDS-NOAH** | Mounts + honest, but blank on history + silent empty (shared root cause) |
| **Delta** | **NEEDS-NOAH** | Same |
| **Volume Profile** | **NEEDS-NOAH** | Same — note: total *volume* per bar is available from OHLCV even without tape, so VP can show real total volume with an honest "no aggressor split" label instead of blank |
| **Imbalance** | **NEEDS-NOAH** | Same; imbalance is meaningless without bid/ask split → must show `unavailable` on tapeless bars, not empty |
| **Aggressive/Passive** | **NEEDS-NOAH** | Same |
| **Big Trades** | **GREEN (with caveat)** | Correctly live-stream-only from real tape (`getRealBigTradeLevels`); inherently forward-looking, so "blank until a big print" is expected. Caveat: add the same "live capture" status chip for consistency |

## 4. Contract for Noah — `WM-OF-P0-05`

**One bounded change, applied uniformly to the five profile tools:**

1. **Honest empty-state (required, truth §5).** When `getBarSubProfile` returns `null`/empty for the visible range, render an explicit overlay/label — `"Order-flow: capturing live tape · N trades so far"` or, if the feed is genuinely unavailable for this symbol/provider, `"unavailable"`. **Never** a silent blank canvas.
2. **Volume Profile exception.** VP should fall back to **real per-bar total volume** (available from OHLCV) with an honest `"total volume — no aggressor split (no tape)"` label, rather than blank. Do not fabricate a bid/ask split.
3. **Historical tape (scope decision — route through Forge, do not guess).** True historical footprint needs a real historical *trades* endpoint (Alpaca `/v2/stocks/{sym}/trades` or Polygon trades). That is a **provider-capability question** → belongs in `WM-CHART-P0-01A`'s matrix, not an ad-hoc fetch. For this ticket: label honestly; do **not** silently backfill or synthesize.

**Files:** `src/components/chart/MainChart.tsx` (draw branches L4485–5260, add empty-state rendering per mode); `src/components/chart/FootprintControls.tsx` (if the status chip lives there).

**Tests:**
- Each of the 5 profile tools, on a symbol with zero captured tape, renders the honest status label — assert the canvas is **not** left blank and **no** synthetic bid/ask is produced.
- VP with no tape renders real total volume + the "no split" label.
- With injected fake tape, each tool renders and Σtotal is zoom-invariant (existing invariant preserved).

**Acceptance:** every tool either shows real order-flow data or an honest `unavailable`/`capturing` state — never a silent empty overlay; type-check + tests + 69-page build; **Sentinel** confirms on a live symbol that tapeless bars show the honest state.
