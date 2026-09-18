# WM Pro shift baton — the container's edge is not the plot's edge

Block: `734c0b36` → `f0486015` (three code commits after the baton that opened it).
Sealed 2026-09-17. Every LIVE-PROVEN claim below was observed in the Founder's
own authenticated Chrome on `https://wealthymindsetspro.com/charts`, NQ1! 15m,
after the Cloudflare build landed — not inferred from a green test.

---

## The law this block discovered

> **A mark clamped against the CONTAINER's edge is invisible, and it is
> invisible in a way that no test can see.**

The overlay canvas is sized to `cont.offsetWidth` / `cont.offsetHeight` — the
whole chart container, *including the right price axis and the bottom time
axis*. `W` and `H` are therefore NOT the edges a trader's eye stops at. A mark
positioned against them is:

- **arithmetically correct** — it is inside the canvas, so nothing throws;
- **structurally correct** — it draws every frame, with the right content;
- **and painted under an axis**, where it has never been read by anyone.

This is worse than a crash. A crash announces itself. This renders a true
sentence into a strip of pixels the product has already covered with a date row
or a price ladder, and reports success.

A corollary, learned the expensive way earlier in this same block:

> **A fix aimed at the wrong edge deploys cleanly and changes nothing.**
> `52c5eae5` clamped the absorption chip to `W`. It shipped. The chip still
> read `ABSORPTION 3.86 M`. It was caught only by going back and looking at
> the same pixel after the deploy — the step that is always tempting to skip
> because the commit message already sounds finished.

The correct idiom, already present at `MainChart.tsx:5843` and now used in
three places, is to **ask the chart for its own furniture**:

```ts
const axisW = chart.priceScale("right").width();   // grows with digit count
const axisH = chart.timeScale().height();
const plotRight  = W - axisW;
const plotBottom = H - axisH;
```

---

## Atoms

### 1. `b3ebd43e` — the bubbles tile stops promising a wait the banner ruled out
**LIVE-PROVEN.**

Found by *using* the banner shipped in the previous block. On one screen, a few
hundred pixels apart:

> banner — "…it is not carried here at all, and **waiting will not change it**."
> bubbles — "**Bubbles appear the moment** real aggressor flow arrives."

This is a harder class than the five-voices redundancy the banner closed. Five
voices repeating a true fact cost the trader time. These two **disagree**, and
the trader who believes the wrong one waits on a feed that does not exist for
this symbol.

The same tile also carried a live `Levels shown` control — four 44px buttons,
one showing an `aria-pressed` selected state, directly beneath a `NO TAPE`
badge. Pressing any of them moved no pixel, on the card or on the chart. That
is agency the product does not have.

Both are **gated, not deleted** — the promise and the control are correct on a
NOT_FLOWING symbol with no banner over it. The condition is the banner's own
presence (`missingTape !== null`), not a re-derived `!flow.hasFlow`, so the
declaration and the deferral cannot drift apart.

Live readback on prod, drawer open on NQ1!:

```json
{"tile":"WM DELTA BUBBLES\nNO TAPE","levels":false,"waitPromise":false,
 "deferral":3,"banner":true}
```

Three tiles now defer to one banner; the control is gone; the contradiction is
gone.

**Sentinel mutation-verified on both halves.** Mutating the deferral condition
to `false` → EXIT=1. Mutating the gate to `{true ? (` → EXIT=1. A green test
nobody has tried to break is of unknown strength.

### 2. `dff85795` — the chip clamp was measured against the wrong edge
**LIVE-PROVEN.** Zoomed on the prod chip after deploy: `ABSORPTION 3.86 MODERATE`.
The strength word — the only part of the chip a trader acts on — was previously
severed to `M`.

### 3. `f0486015` — the window label was painted underneath the time axis
**LIVE-PROVEN, and this is the first observation of this label in the product's
history.**

The previous baton recorded `N BARS IN VIEW` as "not observed — below the 640px
viewport. Not claimed." That was honest and it was the **wrong diagnosis**.
Browser measurement:

```json
{"canvas":{"h":560},"lwcRows":[{"h":530,"top":176},{"h":28,"top":706}]}
```

The price pane is canvas y 0–530; the time axis is 530–558. `H - 18` = 542 put
the label **twelve pixels inside the axis band, under the date row**. It had
never been on screen at any viewport, at any zoom. Now reads `240 BARS IN VIEW`,
legible, sitting above the dates.

**The lesson is about the honest non-claim, not about the bug.** Declining to
claim an unobserved thing was right. But "not observed" was allowed to stand in
for "not yet looked hard enough", and a real defect lived inside that gap for a
full block. An unobserved mark deserves a measurement, not a caveat.

---

## Gate movement

- **§13 "Delta Bubbles level ownership" — CLOSED, verified, no code needed.**
  `src/lib/marketData/deltaLevelCap.ts` is already the sole owner:
  `DELTA_LEVEL_CAP_CHOICES`, `_DEFAULT`, `_STORAGE_KEY`, `_EVENT`,
  `normalizeDeltaLevelCap`, `capDeltaLevels`. Its only consumers are
  `SmartMoneyPanel.tsx` and `MainChart.tsx:1300-1315`. Work was **not**
  manufactured to make this gate look worked.

---

## Deliberately not changed

- **DELTA DOMINATION's own sentence** ("Needs aggressor-tagged ticks. We won't
  fake a winner without them.") is kept. Its comment already establishes that
  the WHY is stated once in the banner; what remains is specific to that one
  reading, not a fourth recitation of the class facts.

## Open, honest

- **Two owners of the word "absorption" on one screen** under one identical
  headline: `selectAbsorptionAnatomy` on the chart vs `selectAbsorption` in the
  drawer. Noted, not acted on. This is the redundancy class one level up — not
  two voices about one fact, but two *computations* wearing one name.
- **The dashed window edge** (drawn only when the 240-column cap bites) has not
  been visually confirmed. The cap IS biting — the live label reads `240 BARS
  IN VIEW` — so this is now checkable and should be checked, not assumed.
- **Gate 4 responsive device proof** — BLOCKED, unchanged. Programmatic window
  resize does not take effect; `outerWidth` stays pinned.
- **`/journal` detail canvas** — BLOCKED, unchanged. 0 journal entries.
- **Decision Memory sealing has zero production callers** — architectural.
  Surfaced, deliberately not rush-wired.
- **Untouched §13**: Live VP render geometry proof (the canvas dataset already
  publishes `vpDrawn="2"`, `vpRows="732"`, so this is likely provable without
  new code); paper execution state machine realism.

## Discipline held

Every `vitest run` and `tsc --noEmit` in this block ran **unpiped**
(`> /dev/null 2>/dev/null; echo "EXIT=$?"`). A pipe masks the exit code and
turns a red gate green. Every commit staged only explicitly named paths.
