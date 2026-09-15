# The rectangles were never a value

**Commits:** `fa4ef54` (capture-condition disclosure) · `16a36a0` (dvpRowPaint)
**Files:** `src/lib/deltaVPGeometry.ts`, `src/lib/deltaVPGeometry.test.ts`,
`src/lib/deltaVPGeometry.adoption.sentinel.test.ts`, `src/components/chart/MainChart.tsx`
**Gates:** `vitest run` 585 files / **6785** tests PASS · `tsc --noEmit` EXIT=0

---

## Atom 1 — the message named the absence but not the reason (`fa4ef54`)

The previous dispatch fixed a refusal sentence that sent the trader to resize a
box that was already large enough. The replacement said:

> Delta+VP — no per-level trade data for these bars

True, and still not enough. It told the trader **what** was missing and left
them guessing **whether the tool was broken**. It is not broken. Per-level tape
exists for exactly one population of bars, and that population is knowable.

Traced in `MainChart.tsx`:

1. `getBarSubProfile` returns `null` rather than synthesising a footprint —
   *"Historical OHLCV does not contain aggressor-side executions at each price.
   Without captured real tape, leave the footprint empty — never synthesize
   it."*
2. the `tickAccRef` accumulator it reads is an **in-memory ref**, reset on every
   symbol / source / timeframe change and bounded to 400 bars. Never persisted.

So the tool's real domain is: **bars whose ticks arrived while this chart was
open on this timeframe.** The sentence now says so.

> Delta+VP — no per-level tape for these bars (captured live only)

### A claim and its justification must fail together

"Captured live only" is not a slogan — it rests on those two code facts. A new
Sentinel binds them:

```ts
it("only claims 'captured live only' while the footprint is actually live-only", …)
```

If a future edit backfills the footprint from OHLCV, or persists the
accumulator, the claim becomes false **and the gate goes red by name** rather
than the trader being told to watch bars live for data they already have.

---

## Atom 2 — the composition half of the Live VP gate (`16a36a0`)

`deltaVPGeometry.ts` had gated the **scalars**: bin counts, bar lengths, row
boxes. Its own header admitted the rest — *"this proves the arithmetic, not the
pixels."*

The reason the pixels stayed open is worth naming precisely, because it is a
general failure class:

> **`dvpBarWidth` returned a LENGTH. The draw loop turned each length into an
> ORIGIN, inline, against a live `ctx`.**

```ts
ctx.fillRect(midX - gap - dBarW, rowTop, dBarW, rowH);   // delta
ctx.fillRect(vx0 + askW, rowTop, vBarW - askW, rowH);    // bid
```

Every scalar on those lines was under test. The *sum* of scalars was not. A bar
drawn past the box edge, a column growing the wrong way, a one-pixel seam
between the two translucent volume fills — all of them live in that addition,
in arithmetic no test could name.

`dvpRowPaint` now **returns the rectangles**. The draw loop keeps colour, alpha
and the clip — the only part a canvas genuinely has to own.

### Ten laws that could not previously be stated

| Law | The defect it forbids |
|---|---|
| delta bar's RIGHT edge sits on the gutter | a length-only test cannot say which way a bar grows |
| no rect leaves the box, across seven fractions | a containment bug that only appears at full extension |
| neither bar crosses the gutter | a column bleeding into its neighbour's meaning |
| **ask + bid tile the bar exactly** | see below |
| POC is ONE bar | an aggressor split competing with the mark |
| every rect shares top and height | two prices read on one line, undisclosed |
| zero volume stays finite | `NaN` reaches `fillRect` and draws **nothing**, silently |

**On the tiling.** `bid.w` is the *remainder* — `volume.w - ask.w` — never a
second independent `Math.round`. Two roundings disagree with the whole by a
pixel about half the time: a hairline of box background showing through the
bar, or a one-pixel band where the two translucent fills stack and darken.
Either one reads as data.

### REVIVE ledger (§22, Edit-only)

| Revive | Method | Result |
|---|---|---|
| The rectangle math walks back into the canvas | Re-introduced direct `dvpBarWidth(...)` / `dvpAskWidth(...)` calls in the draw block | **FAILED BY NAME** — `lets dvpRowPaint own the rectangles, not just the lengths`, quoting **both** scalars back |
| The "captured live only" claim outlives its justification | Deleted `getBarSubProfile`'s no-synthesis note | **FAILED BY NAME** — `only claims 'captured live only' while the footprint is actually live-only` |

Both restored byte-identical; `git diff --stat` clean before commit.

### Why a second, narrower Sentinel was needed

The existing adoption Sentinel asserts *every import is used in the block*. For
a while that was satisfied while the defect class was wide open: the loop called
`dvpBarWidth` and `dvpAskWidth`, used every import, gated every length — and
composed them into origins inline. **A gate can be green and still be looking at
the wrong layer.** The new test asks for the *rectangle* and fails if a *length*
call reappears.

---

## What these atoms do and do not claim

- **CLAIMED:** the scalar arithmetic AND its composition into rectangles are now
  gated by 65 tests across the two Delta+VP files.
- **CLAIMED:** two REVIVEs were performed by Edit and both failed by name.
- **NOT CLAIMED:** that either changed surface has been **seen live**. At the
  time of writing, production still serves `turbopack-0zhc-jmb6pzv7.js` — the
  pre-`fa4ef54` bundle. Deploy identity is not observation, and neither is a
  green push.
- **NOT CLAIMED:** that the RASTER is proven. Colour, alpha, stacking order and
  the clip remain the canvas's own and no test in this repo witnesses them.
  `deltaVPGeometry.ts` and its test header both say so, in those words.

## Gate status

| §13 gate | Status |
|---|---|
| Delta Bubbles level ownership | CLOSED (measured 2026-09-15) |
| Paper execution state-machine realism | SUBSTANTIALLY ADVANCED |
| Decision Memory sealing | SURFACED, intentionally unwired — do not rush-wire |
| executionConnectivity orphaned | NOT A LIVE DEFECT — `/readiness` discloses honestly |
| **Live VP render geometry proof** | **COMPOSITION HALF CLOSED** — rectangles are a tested value; **RASTER half still OPEN** and labelled as such in source |
| Gate 4 responsive device proof | BLOCKED |
| `/journal` detail canvas | BLOCKED — 0 journal entries |
| Vacuous-scanner class | RATCHETED — frozen at 26, can only shrink |
