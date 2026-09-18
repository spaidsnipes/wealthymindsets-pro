# WM PRO — SHIFT BATON 2026-09-18-J
## THE GREEN RUN THAT DID NOT MOVE

Commits: `91cd493c` (Asset 17 code + tests) · `7bc2c095` (what was refused)
· `c1345fec` (live receipt) · `467e5f6b` (the wrong fix, named early)

---

## THE LESSON, IN ONE LINE

**A green run that does not move the suite total is a signal, not a pass.**

A `levels` feature landed on `selectContinuationHealth`, the suite went green,
and the total stayed at exactly **9953**. Green plus unchanged is the shape of
*nothing new was exercised*.

### THE CAUSE

Both test files shared one fixture, `structureOf()`, whose `lastSwingHigh` and
`lastSwingLow` are **null**. Every assertion about levels was passing against
an empty array without entering a line of the branch.

The repair is not a bigger fixture — it is a **SECOND** one:

```ts
const SWINGS = {
  lastSwingHigh: { time: 1_700_000_000, price: 143.5 },
  lastSwingLow:  { time: 1_699_900_000, price: 126 },
} as const;
```

Kept separate on purpose. Folding the swings into the default would have made
the *no-levels* cases stop testing the absence. Total moved **9953 → 9963**.

---

## ASSET 17 — NINE ELEMENTS REFUSED, ONE KEPT

Asset 17 draws hue-graded scores. Build Order §9: **a verdict may never be
graded in hue.** Nine of its elements are percentages with no owner anywhere in
this repo — `STRUCTURE ALIGNMENT 92%`, `MOMENTUM SUSTAINMENT 78%`, and so on.
A number with no owner is a confidence the trader cannot audit. All refused.

**One block had an owner**: `KEY LEVELS`. `selectMarketStructure` genuinely
confirms a last swing high and a last swing low. That went in.

### ITS TWO WORDS WERE REFUSED TOO

The mockup labels the block `Resistance / Support`. Both are **forward-looking
claims** — they say price WILL struggle at a number, and nothing in this repo
owns that. Shipped instead as what was observed:

> `LAST CONFIRMED SWING HIGH` / `LAST CONFIRMED SWING LOW`

Same refusal Asset 03 made of `IMPLICATION: SIDEWAYS / REVERSAL RISK`. Guarded
on **both** sides — the compiler `JSON.stringify`s its output against
`/resistance|support/i`, and the render test strips tags and does it again.

### TWO CONSEQUENCES THE PICTURE DID NOT SHOW

1. **A level IS a pivot, so it drags its disclosure with it.** The lag note used
   to be gated on `directional`. A ROTATING reading states no direction — but if
   it prints two levels, the repo's most lag-sensitive numbers would sit on
   screen with their disclosure removed. Now:

   ```ts
   confirmationLagNote:
     directional || levels.length > 0 ? structure.confirmationLagNote : null,
   ```

2. **Levels survive an UNREADABLE verdict.** Regime short, structure not — the
   exact live TSLA state. Withholding a fact THIS owner measured because a
   DIFFERENT owner is silent would be a refusal nobody asked for.

---

## MUTATION RECEIPT

| # | mutation | result |
|---|---|---|
| 1 | relabel a level `"Resistance"` | red ×5, across compiler AND markup |
| 2 | drop the `levels.length > 0` clause from the lag | red ×1, exactly the ROTATING-with-levels test |

Both restored and re-verified.

---

## GATES

- `tsc --noEmit` → **EXIT 0**
- `./node_modules/.bin/vitest run` → **EXIT 0** — 792 files, **9963** passed, 2 skipped

---

## LIVE PROOF — `/charts?symbol=TSLA`, production, after `91cd493c`

| probe | reading |
|---|---|
| `data-health` | `UNREADABLE` (unchanged — the regime is still short) |
| reason | `Neither regime nor volatility dimension has verified evidence at snapshot time.` |
| `continuation-levels` present | **true** |
| level 1 | `LAST CONFIRMED SWING HIGH · 363.94 · selectMarketStructure` |
| level 2 | `LAST CONFIRMED SWING LOW · 362.355 · selectMarketStructure` |
| lag note | present, full sentence |
| any `\d\s*%` | **false** |
| `resistance` / `support` | **false** |
| chart canvas beside it | 530px, view 504px |

**PROVEN.** The Founder's view select was restored to `'Chart'`.

---

## THE WRONG FIX, NAMED BEFORE SOMEBODY SHIPS IT

`363.94` and `362.355` print with different decimal counts. That asymmetry
*invites* a reach for `formatMagnitude`. **Do not.** Verified against the real
`roundSig` source:

```
formatMagnitude(363.94)  === "364"
formatMagnitude(362.355) === "362"
```

`measuredNumber.ts` owns costs, efforts and efficiencies — quantities whose
scale is unknown to the surface. **It explicitly disclaims bounded quantities
whose surface already knows their scale.** A price is one of those. Rounding a
confirmed pivot to three significant figures destroys the number's only job.

---

## ASSET 01 — OWNER MAP, SURVEYED BUT NOT YET BUILT

Scope decided, no code written. Asset 01 is a seven-rung "long division"
worksheet with a `CAUTION + RIGHT OF WAY: WAIT` footer.

### RUNGS THE CHART ROOM ALREADY OWNS

All already computed in `src/components/chart/ChartsDashboard.tsx`:

| rung | owner |
|---|---|
| RAW EVIDENCE | `chartBars` / `recentTicks` counts |
| PARTICIPATION | `selectAbsorptionAnatomyView.aggression` (buy/sell initiated, shares) |
| RESPONSE | `selectAggressionResponse.meanResponse` + `.aggressionAxis` |
| EFFICIENCY | `selectAggressionResponse.efficiency` + `.efficiencyScaleNote` |
| CONTEXT | `selectRegime.verdict` + `.narrative` |
| INTERPRETATION | `selectContinuationHealth.health` + `.reason` |

### NO OWNER IN THIS ROOM — DRAW AS NAMED ABSENCES

`MISSING EVIDENCE` and the `RIGHT OF WAY` footer. `decisionPermissionCompiler`
is **not imported by ChartsDashboard**. Use the Asset 15 `unread` pattern: name
the absence and name the owner that would have to be in the room. Do not
rush-wire a compiler into a room it has never been in.

### TWO SURVEY CLAIMS I CHECKED AND CORRECTED — DO NOT RE-ADOPT THEM

- **`selectParticipationFilter.ts` is NOT the PARTICIPATION owner.** It lives in
  `src/lib/learningGenome/` and grades **options-contract liquidity**. Nothing
  to do with chart participation.
- **There are not two efficiency owners.** `selectAggressionResponse.ts:105-108`
  states in the source that its ratio and `AbsorptionZone.efficiencyRatio` are
  *reciprocal readings of one relationship* and **"must never be printed under
  the same label."** Printing both would be a two-owners-of-one-fact defect.
- **Do not build a second evidence ladder.**
  `src/components/experience/DecisionSpineBand.tsx` already renders
  `selectEvidenceLadder` segments and the NEXT cell.

### HOME

A new member of `MICROSTRUCTURE_TABS` in `src/lib/charts/categoryTabsFor.ts`.
A view added to the strip but **not** to the SET ships silently as a
full-screen takeover.

---

## TWO PATHS THIS SHIFT GUESSED WRONG — WRITTEN DOWN SO YOU DO NOT

- `src/lib/charts/viewBuildOrder.sentinel.test.ts` — **not** `src/__tests__/`.
- `src/components/chart/ChartsDashboard.tsx` — **`chart`, singular**.

---

## STILL BLOCKED (unchanged, not re-investigated)

Asset 08 (needs licensed Level 2 depth) · Gate 4 responsive proof (`outerWidth`
pinned, programmatic resize has no effect) · `/journal` detail canvas (0
entries) · Asset 18 (needs signed tape; honest only on crypto) ·
`executionConnectivity` orphaned — **not a live defect**, `/readiness`
discloses it honestly.
