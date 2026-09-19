<!-- BEGIN:ath-historical-lineage -->
> # ⛔ HISTORICAL LINEAGE — NOT CURRENT AUTHORITY
>
> **MEMORY MAY TEACH. ONLY CURRENT AUTHORITY MAY COMMAND.**
>
> This is a **shift baton** — a hand-off written at the end of one shift. Its filename names its own day. It was true
> on that day and is preserved as evidence of what was observed and decided
> then. Do not take a current action, diagnosis, release decision or task claim
> from it.
>
> **The current front door is in Drive, not in this repository.** A worker who
> arrived here from a search result or a shared link has not passed through
> `README.md` and has not met its demotion notice — this block is that notice,
> delivered at the door of the document itself.
>
> **Current production is `https://wealthymindsetspro.com`** (Cloudflare Workers /
> OpenNext). Any `*.vercel.app` reference below is a `GHOST_HOST` signal: the
> Vercel host was retired 2026-08-24 and cannot serve this app.
>
> Demoted 2026-09-19 by `src/lib/ops/datedDocsAreDemoted.sentinel.test.ts`, which
> until that day scanned only the top level of `docs/operations` and could not
> see this directory at all. See `docs/operations/CANON-SHIFT-GATE-STATUS.md`.
<!-- END:ath-historical-lineage -->

# WM Pro — Market field has ONE material owner

**Date:** 2026-09-15
**Commit:** `462757f`
**Route:** `/charts`
**Status:** CLOSED — PROVEN LIVE on https://wealthymindsetspro.com
**Law:** SCENE_FRAGMENTATION · VACUOUS AGREEMENT · ONE DECISION. ONE MARKET ROOM.

---

## 1. What was wrong

`chartsRoomChrome.test.ts` cured five files that painted their own opaque slab
around MARKET. Its FRAME list is:

> ChartToolbar · LeftDrawingSidebar · StockInfoPanel · ChartsDashboard · TimeframeSelector

`MainChart.tsx` is not on it — **and MainChart owns the market field itself.**
So the largest surface in the product kept the defect after its five
neighbours were fixed.

The wrapper paints the canonical material:

```tsx
background: chartSettings?.background ?? "#0B0E1A"
```

The 28px OHLCV strip directly inside it restated that value as a bare literal:

```tsx
background: "#0B0E1A"
```

This is the **VACUOUS AGREEMENT** shape — a duplicate owner that agrees with
the true owner in the DEFAULT case, and *that agreement is precisely what let
it survive review*. It diverges the instant the trader changes the chart
background in Appearance.

---

## 2. Proof — this was NOT latent

Measured live on production, `/charts?symbol=TSLA`, with the Founder's
`wm_chartSettings.background` temporarily set to `#241014`.

| | strip | market field | |
|---|---|---|---|
| **BEFORE** (`2182581`) | `rgb(11, 14, 26)` | `rgb(36, 16, 20)` | **divergent** |
| **AFTER** (`462757f`) | `rgba(0, 0, 0, 0)` | `rgb(36, 16, 20)` | inherits |

Before: a blue-black slab floating directly above the candles inside a maroon
market field. After: one continuous surface.

**Founder-state protocol.** `wm_chartSettings` was backed up before the probe
(raw length 533, `background: "#0B0E1A"`), and restored afterwards and
verified by readback — `restoredTo: "#0B0E1A"`, `restoredRawLen: 533`,
byte-identical. Confirmed at default after reload: strip `rgba(0,0,0,0)`,
field `rgb(11, 14, 26)`.

Canon §COMPOSITION CONTRACT: *"NOW belongs to MARKET … embedded into the
market environment rather than another dashboard card."* A band that refuses
to follow the room's material is not embedded in the room.

---

## 3. Why a source-level gate

`tsc --noEmit` is **structurally blind** to every line of this: `background:
"#0B0E1A"` is a perfectly well-typed `React.CSSProperties`. Mounting tests are
blind too — the defect is a COLOUR, and it renders happily at the default
setting, which is the only setting a fixture would use.

Verified by **REVIVE (§22)**: the defect was reintroduced via Edit, compiled
clean at `TSC_EXIT=0`, and failed four gates **by name**. A revived defect that
compiles is the definition of a class the type system cannot hold.

New Sentinel: `src/lib/experience/marketFieldMaterialOwner.test.ts` (6 tests).

### Traps it encodes for its next reader

1. **Comment-stripped negatives.** The explanatory comment in MainChart names
   `#0B0E1A` several times. A naive `not.toMatch` would fail on the very prose
   documenting the cure.
2. **Bounded to the field value.** MainChart's interior popovers
   (`#0E1322` / `#141824` / `#2A3350`) are **required to stay opaque** — they
   float over live candles and glass there is an accessibility regression.
   That is the sibling suite's load-bearing popover exception. Widening this
   sweep to every hex would make the gate a demand to break it.
3. **The named lawful exception.** `color: active ? "#0B0E1A"` paints
   FOREGROUND text knocked out of a gold pill — a contrast pairing, not a claim
   about the room's material. It is named in the arithmetic rather than
   tolerated silently. *An unnamed exception is how the original duplicate
   survived in the first place.*
4. **Two over-correction guards.** Removing the duplicate is only correct
   because the wrapper has the real fill; transparency is the cure but erasing
   the boundary between controls and candles is not. Both pinned.
5. **Vacuity guard** (per `lib/ops/sentinelsProveTheyScanned.test.ts`): the
   suite proves its own read found material, so a typo'd path cannot make every
   negative assertion pass while policing nothing.

### Regex lesson worth keeping

A first attempt at the foreground bucket used `/color:\s*[^;,]*?"#0B0E1A"/g`
and returned **3, not 1** — `[^;,]*?` spans newlines and swallowed the
lightweight-charts option objects `background: { color: chartSettings?.background ?? "#0B0E1A" }`,
which were already counted as `guarded`. Pinned to the ternary instead.
**Character classes are not line-anchored; a lazy quantifier still crosses
newlines.**

---

## 4. Gates

```
vitest run   → 7034 passed (7034), 603 files passed (603)   EXIT 0
tsc --noEmit →                                              EXIT 0
```

Deploy arrival confirmed behaviourally: `/charts` chunkset digest
`ba477e43f7ed3b7a081d175f29997cd2` → `92bdabf4fae4238ef782043d336c513c`.

---

## 5. Open findings measured during this atom (NOT fixed — recorded honestly)

### 5.1 Top chrome consumes 21.2% of the viewport before a candle

`/charts` at 1920×840. Four stacked full-width bands:

| y | h | owner |
|---|---|---|
| 0 | 69 | job-mode band (wordmark + PREP/OBSERVE/WAIT/EXECUTE/MANAGE/REVIEW/LEARN) |
| 69 | 45 | `wm-chart-room-header` (breadcrumb + symbol + fidelity) |
| 114 | 36 | `wm-room-chrome wm-chart-toolbar` (timeframes + RTH/ETH) |
| 150 | 28 | OHLCV strip |

Canvas begins at `y=178`. **178 / 840 = 21.2%.** This is the canon's named
CURRENT VISUAL DEBT — *"top chrome/nav/tool controls are visually expensive and
compete with the market field."* Candidate: fuse the 45px room header into the
36px toolbar row.

### 5.2 Decision spine price is one bar behind the strip, and does not say so

> **CLOSED** by `bd35b7a` — see `WM-PRO-SHIFT-2026-09-15-BAR-CLOSE-RE-ASK.md`.
> The root cause was not a wrong owner. `deriveLastBarClose` is pure and
> correct, but its proof is **not time-invariant**: it flips because the CLOCK
> ADVANCED, and `usePublishChartMarketState` recomputed only on input change.
> Repaired by **re-asking** at the computed instant, never by relaxing the
> proof (§35). PROVEN LIVE across a real bar boundary without a reload.

Measured simultaneously in one DOM read at `2026-09-15T18:23:39Z`:

- OHLCV strip: `C 357.87`, tooltip *"this bar's interval has fully elapsed …
  It will not change."*
- Decision spine MARKET: `TSLA · 15m · 357.47 LAST 15m BAR CLOSE`, with
  `UNAVAILABLE · asOf 18:14:00Z` on the line beneath.

Both are internally honest — the spine's `asOf` predates the 18:15 bar close,
so `357.47` is the *previous* bar. But the price line itself is labelled
`LAST 15m BAR CLOSE`, a claim about the present, and a trader reading the two
numbers side by side has no way to know one is a bar behind.

This is canon **Weakness #1 — multi-price disagreement on one page.** It is
**not** fixed here: the blast radius is the Founder's canonical decision spine,
and picking a side without knowing which owner is authoritative could make the
disagreement worse. Recorded for a dedicated atom.

### 5.3 Rail permission language — checked, NOT a defect

`WAIT` renders three times in the right rail (canvas summary pill y=225,
WHY y=472, NEXT y=782). Traced: the canvas pill derives from the same
`permission` object via `composeMarketCanvasVM → selectDecisionWhyNot →
selectMarketCanvas`. **One owner, layered detail** — which is what canon asks
for. No divergence is possible. Filed as checked so the next reader does not
re-open it.

---

## 6. Still blocked (unchanged)

- Decision Memory sealing — zero production callers. **Architectural; surface,
  do not rush-wire.** It needs a decision surface first.
- `executionConnectivity` orphaned — not a live defect; `/readiness` discloses
  honestly.
- Gate 4 responsive device proof — programmatic window resize does not take
  effect, `outerWidth` pinned.
- `/journal` detail canvas — 0 journal entries.
- Delta Bubbles / Live VP raster half — no per-trade tape on the free tier.
