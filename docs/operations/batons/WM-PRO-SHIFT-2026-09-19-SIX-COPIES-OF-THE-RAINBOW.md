# WM PRO SHIFT — SIX COPIES OF THE RAINBOW

**Date:** 2026-09-19
**Gate:** Founding Execution Contract §13 — chart material language
**Governing visual:** `WM_NewMockup_136_Fidelity_Five_Not_A_Rainbow.jpg`
**Commits:** `82c1d8a6` → `7ecaf88d` → `b3ade3f2` → `8d4bd2b2`
**Serving version:** `eae6d466-8de3-4482-8b14-efe97ed81693` (single version at 100%)

---

## What this block closed

The chart was still painting the pre-OS casino palette — red/green candles, a
blue/violet/orange moving-average rainbow, a Volume Profile in amber/blue/purple.
The mockup's filename is the law: **NOT A RAINBOW**. The room is `FIELD #07080a`,
`GOLD #c4a574`, `PEARL #ede6d3`, `MUTED #8a8271`.

The palette did not live in one place. It lived in **six**, and each one had to
be found by measuring live pixels — not by reading code and assuming.

| # | Copy | Where | Commit |
|---|---|---|---|
| 1 | Candle bodies | `wm_chartSettings` defaults | `82c1d8a6` |
| 2 | Volume histogram | `marketFieldMaterial` | `82c1d8a6` |
| 3 | The default nobody wrote | write-once localStorage rehydrate | `82c1d8a6` |
| 4 | Volume Profile | `VP_*` + `wm_vp_schemaVersion` ladder | `7ecaf88d` |
| 5 | Moving averages | `MA_CFG` + the ribbon's `cols` | `b3ade3f2` |
| 6 | **The config table's own defaults** | `indicatorConfig.ts` | `8d4bd2b2` |

---

## The lesson worth keeping: copy #6

`b3ade3f2` stripped all 19 hue literals out of `MA_CFG` and replaced them with
one derived brass ramp (`movingAverageInk`). Tests passed. Deploy succeeded.
**The live chart did not change.**

The measurement that caught it, on the serving build's 1490x389 price pane:

```
192,132,252 -> 393 px   (#C084FC — EMA 8)
 79,163,224 -> 391 px   (#4FA3E0 — EMA 21)
255,165,0   -> 409 px   (#FFA500 — EMA 89)
```

Exactly the three legacy literals for the three active EMAs.

**Root cause.** `resolveParams` spreads `INDICATOR_CONFIG[name].defaults` over
the stored overrides. Those defaults carried a concrete `color`. So by the time
MainChart evaluated `cp.color ?? movingAverageInk(len)`, the left side was
*always* defined — the fallback could never fire. The render-site fix was
structurally correct and completely inert.

This is the **same shape** as the write-once localStorage trap from copy #3:
a concrete declared default silently and permanently outranks the product
default. The cure is the same too — don't write the literal. Derive it, so
there is nothing left to outrank anything.

> **Generalised rule.** When a value has two default layers, fixing the *inner*
> one changes nothing. Find every layer that can supply the value before
> claiming a palette fix works, and prefer derivation over declaration at each.

---

## Live proof (anti-fabrication)

Measured via `getImageData` RGB tally on the real serving build in the Founder's
Chrome. Not inferred, not assumed. `paintedNonBg = 18827` confirms the canvas
was genuinely full of chart — a zero on a blank canvas proves nothing, and an
earlier reading was discarded for exactly that reason.

| probe | BEFORE (`b3ade3f2`) | AFTER (`eae6d466`) |
|---|---|---|
| `43,86,117` | 567 | **0** → `103,98,88` @ 567 |
| `61,124,171` | 496 | **0** → `151,143,127` @ 495 |
| `100,70,131` | 513 | **0** → `122,119,111` @ 512 |
| `79,163,224` (#4FA3E0) | 391 | **0** |
| `192,132,252` (#C084FC) | 393 | **0** |
| `255,165,0` (#FFA500) | 409 | **0** |

A one-to-one swap at matching pixel counts. Every replacement satisfies
`r > g > b` — ramp ink between `#ede6d3` and `#6e5a3c`.

VP slice (`7ecaf88d`) proof, for the record: casino red `255,77,10x` on the
74x389 price axis went **508 px → 0**, and `wm_vp_schemaVersion === "1"` read
back from the real browser — a key that did not exist before that commit.

---

## Orkin revive-attempts

Both went RED on the reintroduced bug, then green after restore from `/tmp`:

- `b3ade3f2` — re-added `c: "#4FA3E0"` to `MA_CFG`; the MainChart source-scan
  guard caught it. (This guard is what found the ribbon's *second* rainbow,
  `const cols = [...]`, during the original run.)
- `8d4bd2b2` — re-added a `#4FA3E0` literal beside `ma(21)`; the new
  `indicatorConfig` source-scan guard caught it.

---

## Gates

- Suite: **818 files / 10432 passed | 2 skipped** — `vitest run` unpiped, exit 0
- Types: `tsc --noEmit` unpiped, **exit 0**
- Deploy: `wrangler deployments status` → single version at 100%, `eae6d466`

---

## Honest blockers — carried forward, not closed

- **Founder's tab `773539222` renders the stale bundle.** Background reads
  `11,14,26` (legacy navy `#0B0E1A`) vs `7,8,10` on a fresh load; candles read
  casino red/green. Verified **not a code defect** — the freshly-reloaded tab on
  the same URL reads brass with zero casino pixels. It resolves on his next
  reload. Tab left untouched as instructed.
- **Gate 4 responsive device proof** — programmatic window resize does not take
  effect, `outerWidth` stays pinned. No device-width claim can be made.
- **/journal detail canvas** — 0 journal entries exist, so the surface cannot be
  exercised.
- **Decision Memory sealing has zero production callers** — architectural.
  Surfaced deliberately; not rush-wired.
- **executionConnectivity orphaned** — not a live defect; `/readiness` discloses
  it honestly.

## Parked, recorded, NOT condemned

A deliberately distinct vocabulary, or opt-in surfaces the mockup does not govern:

- ORDER FLOW / footprint (`OF_DEFAULT` royal blue / purple, `wm_of_buy` / `wm_of_sell`)
- `DRAW_COLORS` and `FIB_COLORS` (MainChart L942–947) — drawing tools
- The oscillator / `refLine` `rgba(0,192,118)` / `rgba(255,77,103)` family in the
  opt-in indicator panes; `Bollinger Bands`, `Keltner Channel`, `RSI` config defaults
- `addCumCandles` (CVD only) — the orange line in the lower pane is this, and is expected
- Pattern markers, `dataWindow` low colour, ChartsDashboard's non-VP
  `#00C076` / `#FF4D67` at L78, L2105, L2701, L2817, L3651

---

## Still open from the V01 silhouette

Named so the next shift does not have to re-derive them:

- The dense horizontal toolbar row on live `/charts` (symbol picker, nine
  timeframes, RTH, Indicators, PROFILES, Smart Money, Chart tools) — the Canon
  has no such row
- The bottom `SANCTUARY PROTOCOL • ACTIVE | STRUCTURE TREND LIQUIDITY SETUP |
  MARKET HOURS • OPEN` bar
- The quiet right-edge `FOCUS / DISCIPLINE / PATIENCE`
- The **inset framed chart panel + brass hairline room frame with HONESTY
  PLAQUE** — mockup 136 shows `CHART INTEGRITY / WOUNDED`,
  `DATA FIDELITY: DEGRADED`, `RESOLUTION: TENTATIVE`,
  `ATTACHMENT CHIP / FOOTPRINT MISSING`, `DEBT / UNATTACHED`

---

## Addendum — Live VP render geometry proof: HONEST NEGATIVE

Attempted immediately after the baton was sealed. Recorded rather than dropped.

`VP_UP_DEFAULT === CANDLE_UP_DEFAULT`, so colour alone cannot prove the Volume
Profile renders — the same brass is in every candle body. **Geometry** is the
only discriminator: VP rows are long horizontal runs sharing one anchor edge;
candles are ~2-6px wide.

Measured on the live 1490x389 price pane (`eae6d466`), longest contiguous
non-background run per scanline:

```
run length   scanlines
0                23
1-6             241     <- candle wicks/bodies
7-19             86
20-49            30
50-99             8
100+              1
```

39 scanlines carry a run >= 20px. But they share **no common anchor**: the most
frequent start-x occurs 1 time, the most frequent end-x 2 times, across all 39.
A VP histogram would put all ~39 rows on one anchor. These runs are instead the
near-horizontal moving averages in the flat region plus dense right-edge price
action.

**Conclusion: no VP histogram is painting on the price pane.**

**This is not a silent failure.** The chart itself renders the disclosure
`Delta+VP — no per-level tape for these bars (captured live only)`. The app is
telling the truth about what it does not have. `wm_sessionVP=false`,
`wm_fixedVP=false`, `wm_sessionVP_chart=true`.

Root constraint is the one already on record: per-level volume needs real
per-trade tape, and the free data path is 15-minute delayed. The palette work in
`7ecaf88d` is still correct and still proven (casino red 508px -> 0 on the price
axis) — it governs the VP's ink whenever the VP has data to draw.

**Gate status: BLOCKED on data, not on code.** It cannot be closed by editing
the renderer. Closing it requires a per-trade tape source. Do not mark this gate
PROVEN from a screenshot of an empty profile.
