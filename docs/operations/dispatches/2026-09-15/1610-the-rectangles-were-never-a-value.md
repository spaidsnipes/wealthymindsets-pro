<!-- BEGIN:ath-historical-lineage -->
> # ⛔ HISTORICAL LINEAGE — NOT CURRENT AUTHORITY
>
> **MEMORY MAY TEACH. ONLY CURRENT AUTHORITY MAY COMMAND.**
>
> This is a **dispatch** — an instruction issued for one day's work. Its filename names its own day. It was true
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

---

## LIVE OBSERVED — both sentences, on the Founder's production chart

Verified by driving the Founder's authenticated Chrome against
`https://wealthymindsetspro.com/charts`, TSLA 15m, with a `delta-vp` drawing
loaded through the tool's own persistence path.

**Before** (pre-`a7bd635` bundle, same box, same bars):

> `Delta+VP — draw a wider box over bars`

**After** (reload, current deploy):

> `Delta+VP — no per-level tape for these bars (captured live only)`

Same box. Same dimensions — roughly **548 × 142 CSS px**, an order of magnitude
past both `DVP_MIN_BOX_W` (56) and `DVP_MIN_BOX_H` (26). The sentence changed
because the *reason* changed, not because the box did. That is the whole atom,
photographed.

`a7bd635` and `fa4ef54` are now **live-confirmed by direct observation**, not by
deploy identity.

## The raster half: attempted, and honestly blocked

With the refusal message proven, the obvious next move was to photograph an
actual *profile* — the rectangles `dvpRowPaint` now owns. That requires
per-level tape, which by the message's own definition means bars this chart
watched live.

So the box was repositioned over the live edge of the session and the page
reloaded. It did not produce a profile, and the chart itself says why:

- header symbol chip: `HISTORICAL BARS VERIFIED`
- MARKET tile: `TSLA · 15m · 359.075 LAST 15m BAR CLOSE` / `UNAVAILABLE`
- last bar: `LAST 09:00 AM`

**There is no live per-trade tape on this feed right now.** This is the
long-standing data constraint already on record (free REST is delayed; the WS
proxy has no host on the current deployment target) — not a regression, and not
something this atom introduced.

The consequence is worth stating plainly, because it is the most useful fact in
this dispatch:

> **The RASTER half of the Live VP gate is blocked by exactly the condition the
> new refusal message names.** The profile cannot be photographed until real
> per-level tape exists. The message the trader now sees is not a workaround for
> that blocker — it *is* an accurate report of it.

Marking this lane **BLOCKED — awaiting a real per-trade tape source**, rather
than substituting a synthetic footprint to make a screenshot possible. A
synthesized profile would be a filled absence, which this build forbids by name.

## Founder browser state

The `wm_draw:v1:…:TSLA` key was backed up before the probe and restored to its
exact prior value `"[]"`, verified by readback. The `:quarantine` sub-key
created during an earlier probe was removed. All eight `wm_draw:` keys are back
to `[]`.

## What these atoms do and do not claim

- **CLAIMED:** the scalar arithmetic AND its composition into rectangles are now
  gated by 65 tests across the two Delta+VP files.
- **CLAIMED:** two REVIVEs were performed by Edit and both failed by name.
- **CLAIMED:** the corrected refusal sentence renders on production. Observed.
- **NOT CLAIMED:** that `dvpRowPaint`'s rectangles have been seen on a live
  chart. They have not — no per-level tape exists to draw. See above.
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
