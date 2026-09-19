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

# A CARD SAYING A LEVEL MATTERS IS NOT THE LEVEL

**Shift baton — WM Pro — 2026-09-18**
**Block:** five order-flow readings audited for drawer-trapped geometry; four moved to the glass, one proven to own none.

---

## THE FINDING

The Founder's named failure mode, stated in his own words: *a card saying a
level matters is not the level.*

`useOrderFlowReadings` compiles five readings off one gated tick array —
`stackedImbalance`, `valueCandle`, `deltaDivergence`, `liquidityWeather`,
`absorption`. Every one of them was complete, tested, and rendered into a
drawer panel. Four of the five were computing **PRICES** — actual levels on the
same axis the candles are drawn on — and those prices were being printed as
text in a panel the trader has to open, next to a chart that knew nothing about
them.

That is not a missing feature. It is the product naming a level and then
declining to point at it.

---

## WHAT SHIPPED

Four commits, one per reading, each with a pure glass compiler, a compiler test
suite, a source-reading sentinel, and a mutation receipt.

| SHA | Reading | What reached the axis |
|---|---|---|
| `290c243e` | Stacked imbalance | The stack's own price rungs |
| `3175cc12` | WM Value Candle | Per-bin rungs at their two price edges, the value band, the CoG spine |
| `26895afe` | Delta divergence | The two pivot prices — and nothing else |
| `b2a7b7fa` | Liquidity weather | The stall shelves — and nothing else |

### The fifth reading is the interesting one

`selectAbsorption` exposes `buyEffort`, `sellEffort`, `netEffort`, `imbalance`,
`displacement`, `displacementInSpread`, `efficiency`. It reads the first and
last print internally to compute travel, but it **publishes no level** —
displacement is a DISTANCE, not a coordinate. Absorption owns no geometry, so
it stays in the drawer and that is the correct home for it.

Recorded here explicitly so a later reader does not "finish the set" by
inventing an anchor for it.

---

## THE PATTERN THAT MADE IT SAFE — THE GLASS COMPILER

Each reading got a pure `select*Glass(vm)` module that decides **everything
settleable before a coordinate exists**: whether to draw at all, which extents,
which words. The canvas block that follows owns arithmetic and ink only.

Three properties fall out of that, and each is worth more than the layer:

1. **§9 becomes structurally enforceable.** The compilers emit **no colour
   field at all**. A canvas block cannot grade a verdict in hue when it was
   never handed a hue to grade with. Every sentinel additionally scans the
   block's literal `rgba()` values and fails on any green-dominant or
   red-dominant colour.

2. **Canon Weakness #1 (one reading, two renderings) is blocked by test.** Each
   sentinel asserts the engine selector name is *absent* from `MainChart.tsx` —
   `selectDeltaDivergence(` may not appear, only `selectDeltaDivergenceGlass`.
   The chart may never recompute what the drawer already computed.

3. **The refusals live where the temptation is not.** The compiler never hands
   the canvas the thing it should not draw, so "don't draw it" is not a rule
   somebody has to remember at 3am.

---

## THE REFUSALS, NAMED

These are the substance of the block. Each is encoded in a compiler and
asserted by a sentinel.

- **Cumulative delta never becomes a coordinate.** Delta is counted in
  CONTRACTS; the axis is denominated in DOLLARS. Any mapping is a scale the
  house invented, and a trader who sees two lines in one frame reads them as
  crossing. `selectDeltaDivergenceGlass` emits no `segments` field at all.

- **A segment index is not a timestamp.** The divergence pivots are indexed by
  segment. `timeKnown` is `false` — permanently, by construction — and the
  canvas refuses to place anything while it says so. A mark at the wrong bar is
  a specific false claim, which is worse than no mark. The marks sit in a
  fixed-width lane; `timeToCoordinate` does not appear in the block.

- **A cost has no price.** Liquidity weather measures size per unit of the
  window's own volume-weighted spread. THINNING is true of the *window*, not of
  $431.40. A THINNING band at any level invents a location for a finding that
  has none, so the stage and its statistics travel as WORDS in the chrome.

- **A stalled segment IS a price**, and it is the one thing liquidity weather
  puts on the axis: every print landed at the same number, so size went in and
  the market did not move. Drawn dotted and short, because "nothing moved here"
  is an observation and a solid full-width line reads as a level somebody is
  defending — a claim about intent the reading did not make.

- **A segment marked stalled whose high and low disagree is REFUSED**, not
  resolved. `high === low` by construction; edges that disagree are a
  contradiction upstream, and drawing the high is silently choosing one of two
  numbers that were supposed to be the same one.

- **Band coverage, never concentration.** The value candle's headline is
  coverage, because a hollow barbell reports 100% concentration and says
  nothing.

- **CONFIRMED is silent.** Delta divergence prints no `findingLabel` when the
  move was paid for. §9: the absence of a warning is only honest if the calm
  state is genuinely quiet.

- **AIRLESS is not danger and HEAVY is not safety.** A thin tape is where a
  stop slips and also where a breakout runs. Seven stages is a gradient and a
  gradient is the easiest thing in the world to paint red-to-green. The
  compiler emits identical key sets for both, with no severity, score or rank
  field, and the canvas selects no colour from `glass.stage`.

---

## THE TWO MECHANICAL RULES THE BLOCK OBEYED

**Ref, not deps.** Every tape-rate value reaches the rAF overlay through
`useRef` plus a one-line `useEffect`, never through the overlay effect's
dependency array. Naming a tape-rate value there tears the rAF loop down
several times a second — the documented cause of VP and footprint flashing off
on crypto. Each sentinel slices the dep array and asserts the prop name is
absent from it.

**`vpColumnLayout` owns the right edge.** The value candle's rungs take the
*next* column from the canonical allocator rather than being hand-placed, and
decline with `ds.valueCandle = "NO_ROOM"` when the pane is too narrow.
`fits: false` is a real answer, not an error — that refusal is exactly what the
allocator was extracted to make possible.

---

## GATES

Run UNPIPED every time. A pipe masks the exit code.

| | `tsc --noEmit` | `vitest run` |
|---|---|---|
| `3175cc12` | EXIT=0 | EXIT=0 — 782 files, 9817 passed \| 2 skipped |
| `26895afe` | EXIT=0 | EXIT=0 — 784 files, 9851 passed \| 2 skipped |
| `b2a7b7fa` | EXIT=0 | EXIT=0 — 786 files, 9884 passed \| 2 skipped |

### Mutation receipts

A sentinel that has never failed is decoration. Each was deliberately broken,
observed failing on the right assertion, and restored.

- **Value candle** — `srs.priceToCoordinate(r.hiPrice)` → `(r.hiPrice + 0)`
  failed *"draws EVERY bin at its OWN two price edges"* (1 failed | 15 passed).
- **Delta divergence** — dropping `&& !glass.timeKnown` failed *"refuses to
  place anything while the compiler says time is unknown"* (1 failed | 15
  passed).
- **Liquidity weather** — `srs.priceToCoordinate(p)` → `(p + 0)` in the shelf
  loop failed *"places every stall price on the same scale the candles use"*
  (1 failed | 14 passed).

---

## LIVE OBSERVATION — WHAT WAS AND WAS NOT PROVEN

A Chrome channel became available after the four commits deployed. The Founder's
own browser, on `https://wealthymindsetspro.com/charts`, TSLA at 363, market
state **DEGRADED**. Reading the overlay canvas dataset off the live page:

```
canvas[7].dataset = {
  valueCandle:      "UNMEASURED",
  imbalanceStack:   "UNMEASURED",
  deltaDivergence:  "UNMEASURED",
  liquidityWeather: "UNMEASURED"
}
```

**PROVEN: the wire.** All four layers reached production, all four are running
inside the rAF overlay, and all four are stamping their reason every frame. One
canvas carries all four receipts, which is also the proof they share the single
overlay rather than having quietly forked into separate ones.

**NOT PROVEN: the drawing.** Every reading reports UNMEASURED, which is the
correct and expected state: the feed is DEGRADED, so `hasVerifiedAggressorTape`
is false, the gated tick array is null, and each selector returns its own
"nothing measured" verdict rather than inventing one. **No ink has been observed
on the axis.** Nothing in this document claims otherwise.

The first observation had to be taken twice: the initial read found nine
canvases and zero dataset keys, because the tab was holding a bundle from before
the deploy. A reload produced the receipts above. Worth remembering — a stale
bundle looks exactly like a missing feature.

## HONEST GAPS — READ THIS BEFORE CLAIMING THE BLOCK IS PROVEN

**No layer has been observed PAINTING.** No PROVEN claim about the drawing is
made here and none should be inherited from this document.

1. The wire is proven; the ink is not. See the live observation above.
2. These layers paint only on **real per-trade tape with an open session**. The
   readings are compiled from a tick array that `hasVerifiedAggressorTape`
   gates; without a subscribed feed during market hours every one of them
   returns its own "nothing measured" state and the glass correctly draws
   nothing. A screenshot of an empty chart would prove nothing either way.

What *is* proven: the wire exists and is held in place by 63 assertions across
three sentinels, each of which has been shown to fail when the wire is cut.

Every layer publishes a `canvas.dataset` receipt in every state — including the
silent ones — precisely so live verification does not depend on seeing ink:

- `ds.valueCandle` / `ds.valueCandleRungs` / `ds.valueCandleCog`
- `ds.deltaDivergence` / `ds.deltaDivergenceLean`
- `ds.liquidityWeather` / `ds.liquidityWeatherStage` / `ds.liquidityWeatherShelves`

Each drawing receipt is `delete`d when its drawing goes away, so a stale
dataset key can never describe a tape that is no longer being measured. **To
verify live:** open `/charts` on a real-tape symbol during an open session and
read those keys off the overlay canvas.

### AMENDED 2026-09-18 — THE RECEIPTS ARE UNREADABLE FROM A BACKGROUND TAB, AND THE CHART SAYS SO

The instruction above is true but incomplete, and the missing half cost an
attempt. Reading the overlay canvas from a Chrome tab whose window is not
frontmost returns an EMPTY dataset — no `valueCandle`, no `liquidityWeather`,
nothing. The natural conclusion is "the build is stale" or "the layer is
missing", and both are wrong.

The overlay carries exactly one attribute in that state:

```
data-vp-suspended="hidden"     (document.visibilityState === "hidden")
```

`overlayFrameVerdict` deliberately performs no background paint, and `draw()`
is the only publisher of every layer receipt — so on a hidden tab the receipts
are not stale, they were never written. The chart is not withholding; it is
saying so in the one channel still open to it. That attribute is the product
working, and it is the first thing a probe should read.

**Consequence for any future live-verification:** a canvas receipt can only be
read with the Chrome window actually in the foreground. A DOM-level probe
driving a backgrounded browser cannot prove OR disprove anything painted, and
must report BLOCKED rather than ABSENT. The DOM-rendered surfaces — the
profiles menu, its `aria-checked` state, its refusal sentences — are readable
either way, which is why the menu half of `6ac949dd` could be proven above and
the receipt half could not.

---

## NEXT

- **Live-verify `290c243e`, `3175cc12`, `26895afe`, `b2a7b7fa`** via the
  dataset receipts above, once a Chrome channel and an open session coincide.
- ~~**`ProfilesMenu` / `selectProfileMenu` still offers only FIXED_RANGE /
  SESSION / ABSORPTION / DELTA_VP.**~~ **CLOSED by `6ac949dd`, LIVE-VERIFIED.**
  The menu now lists eight, and the four new entries are individually
  switchable. Observed on `https://wealthymindsetspro.com/charts` (TSLA) after
  reload: the chip reads `PROFILES · 4`, the panel header reads
  `PROFILES · 3 OF 8 CAN DRAW NOW`, and the eight rows are Fixed Range VP /
  Session VP / Delta + VP / Absorption / Stacked Imbalance / WM Value Candle /
  Delta Divergence / Liquidity Weather. Clicking Fixed Range VP flipped its
  `aria-checked` `false → true → false`, so the switch is real and not a label.
  The four checked rows all carry the one shared tape-gate sentence — "this
  tape has not stated an aggressor side" — rather than four separate excuses,
  which is the behaviour `useOrderFlowReadings` was restructured to produce.
  `20e0826b` is a source-reading sentinel and has no live surface to verify.
- **Magnet + Path is ABSENT, not mis-homed.** `grep -rln
  "MagnetPath|magnetPath|Magnet \+ Path|MAGNET_PATH|magnetAndPath" src` returns
  zero. The `magnetActive` in `MainChart` is the unrelated drawing-tool snap.
  Mockups 25 and 62 exist and have not been built against.
- ~~**Extend the §9 verdict-colour sweep** to `/paper`, `/proof-lane`,
  `/profile`, `/morning-prep`.~~ **CLOSED by `a05a65c3`**, and closed as a
  MECHANISM rather than a sweep, because the suspicion recorded here turned out
  to be right: the sweep is not exhaustive anywhere. Eight more graded verdicts
  were repaired — `PlaybookDNAPanel`, `MirrorPanel`, `PersonalEdgePanel`,
  `PersonalEdgeChip`, `/proof-lane` (two sites), `/paper`, `DLARStrip` (two
  sites), `OpeningBellPanel` — and **three of those were found by the machine
  AFTER a human sweep the same day read six surfaces and missed them.**
  `src/lib/design/aVerdictIsNeverGraded.sentinel.test.ts` now enforces the rule
  repo-wide: a grade word in a condition may not select a green.

  Two findings from that block worth carrying forward:
  1. `PersonalEdgeChip` was found by grepping the SHADE (`5cb85c`) rather than
     walking surfaces. It was the same `vm.resolution` ternary as
     `PersonalEdgePanel`, on a route nobody had listed. **Sweep by colour, not
     by page.**
  2. `OpeningBellPanel` painted `READY` green nine lines below its own docblock
     promising that WM "does not grant or withhold permission to trade". The
     prose disclaimer did not stop the hue, because the hue is read first.

### Unchanged blockers, restated so they are not re-discovered

- Gate 4 responsive device proof — programmatic window resize does not take
  effect, `outerWidth` stays pinned.
- Canvas dataset receipts cannot be read while the Chrome window is
  backgrounded (`data-vp-suspended="hidden"`). See the amendment above. This is
  correct product behaviour, not a defect, and it bounds what any background
  probe may claim.
- `/journal` detail canvas — 0 entries exist to render.
- Decision Memory sealing has zero production callers. **Architectural. Surface
  it; do not rush-wire it.**
- `executionConnectivity` is orphaned. Not a live defect — `/readiness`
  discloses it honestly.
