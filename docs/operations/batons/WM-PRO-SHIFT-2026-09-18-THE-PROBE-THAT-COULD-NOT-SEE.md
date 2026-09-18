# WM PRO SHIFT — THE PROBE THAT COULD NOT SEE

**Commits:** `06da4454`, `c3d516e4`, `7c37caed`
**Block:** Asset 01 (the long-division worksheet) built, wired, gated, shipped, live-observed — plus a canon drift repair caught by the canon's own sentinel.

---

## THE LESSON, IN ONE LINE

**A probe that cannot observe the thing it is asked about returns a WRONG answer, not a pending one.**

Four times this shift I fetched the raw `/charts` HTML and read `hasWorksheet: false`,
and four times I concluded "the deploy has not landed yet." The deploy had landed.
`/api/build-identity` was already answering `06da4454` — the exact commit. The category
strip is CLIENT-RENDERED, so the SSR markup was never going to carry the word
`Worksheet` no matter how long I waited. The probe had no capacity to see its subject,
and its silence read exactly like a negative result.

The cost was small here (some waiting). The shape is not small. A check that cannot
fail for the right reason is a check that will eventually certify something false —
and a "not yet" is the most comfortable wrong answer there is, because it asks you to
do nothing and promises the truth is coming.

**The repair that generalises:** before believing a negative probe, ask what a POSITIVE
result would have looked like through that same instrument. If you cannot describe it,
the probe proved nothing. Here, the positive was `document.querySelector('select[aria-label="Symbol view category"]')`
in the live DOM — which returned all fourteen options on the first try.

---

## MUTATION RECEIPTS

Every guard below was deliberately broken, observed red on the RIGHT test, and restored.

| Mutation | Expected red | Observed | Restored |
|---|---|---|---|
| Let the reciprocal efficiency (`7.4`) reach the render | render test `PRINTS ONE EFFICIENCY, NEVER THE RECIPROCAL` | red ×2 | yes |
| Make rung 7 (MISSING EVIDENCE) readable instead of a named absence | `data-step="7" data-state="UNREAD"` + blank/value counts | red ×4 | yes |
| Drop `"Worksheet"` from `MICROSTRUCTURE_TABS` | `microstructureKeepsTheCandles.sentinel` set check | red ×1, exactly the set sentinel | yes |

---

## GATES

| Gate | Result |
|---|---|
| `tsc --noEmit` | **EXIT 0** |
| `./node_modules/.bin/vitest run` (unpiped) | **EXIT 0** — 794 files, **10000 passed**, 2 skipped |
| Suite total moved | **9963 → 10000 (+37)** — the run is a pass, not just a green |
| `viewBuildOrder.sentinel.test.ts` after the canon edit | EXIT 0, 6 passed |
| `deltaBubbleLevels` / `bigTradeLevels` / `bubbleDrawGeometry` adoption sentinels | EXIT 0, 18 passed |

`tsc` earned its keep: the first draft of the continuation fixture wrote `version: 1`,
but that owner versions with a namespaced STRING while the anatomy owner sitting
beside it in the same fixture genuinely uses a NUMBER. The fixture now imports
`CONTINUATION_HEALTH_VERSION` rather than guessing. A fixture that guesses a shape is
a fixture that can go green against a VM nobody ships.

---

## LIVE PROOF — TSLA 5m, prod, `06da4454`

Read off a rendered frame in the Founder's own authenticated Chrome. Not inferred.

| Claim | Observed |
|---|---|
| Tab reachable | `Worksheet` present in `select[aria-label="Symbol view category"]`, position 7, directly after `Continuation` |
| All seven rungs drawn | `7 × worksheet-rung` |
| Worked vs named-absent | `data-read="3" data-unread="4"`; 4 blanks + 3 values = 7 |
| Rung 1 reads the real feed | `390 bars, 0 prints` |
| Rung 2 refuses honestly | `NOT READ HERE` — TSLA's tape states no aggressor side |
| Rung 7 stays a named absence | `data-step="7" data-state="UNREAD"` |
| Footer names its owner | `computeRightOfWay` |
| Division chain intact | 7 × `divided:` |
| Mockup's canvas dimensions refused | no `421`, no `532`, no `423` in visible text |
| §9 — nothing graded in hue | no percentage in visible text |
| Candles survive the split | `wm-chart-category-panel-chart` 112→376; worksheet panel 376→740 |

Founder UI state restored: view select returned to `Chart`.

---

## THE WRONG FIX I NAMED EARLY

The worksheet needs `selectRegime`, which already existed in this room — but INSIDE the
`continuationHealthVM` memo, unexposed. The obvious move was to call `selectRegime` a
second time in the worksheet memo.

That is two authors of one reading. They agree today and drift the moment either memo's
dependency list changes, and when they drift, two surfaces in the same room state
different regimes with equal confidence. On a product whose entire claim is that a
number can be audited, that is the worst available bug: silent, plausible, and
self-confirming.

Lifted it to `chartRegimeVM` instead. **One owner, two readers.**

---

## A GUARD FOUND WEAK WHILE PASSING THROUGH IT

`microstructureKeepsTheCandles.sentinel.test.ts` checks that every microstructure panel
is ordered ABOVE the chart in source. Its ordering loop listed only the ORIGINAL FOUR
panel ids. `Continuation` had already shipped without being added; `Worksheet` would
have been the second. Either could have been placed below the candles and the guard
would have stayed green.

**A guard that does not grow with the set it guards shrinks relative to it.** Widened,
with a comment naming the mistake rather than just listing the ids.

The same disease was in the prose: the heading read `THE FOUR MICROSTRUCTURE VIEWS`
while there were six. It now carries no count at all — the array below it is the only
place the count is allowed to live. A comment that must be edited to stay true is a
comment that will eventually lie.

---

## THE CANON DRIFTED AGAIN, AND ITS OWN SENTINEL CAUGHT IT

`CANON-VIEW-BUILD-ORDER-2026-09-17.md` has a gated `VIEW-STATUS` table and an ungated
prose header. The prose still listed 01, 15 and 17 under **NOT BLOCKED, NOT PRIORITISED**
after all three had shipped. The sentinel reads the TABLE, not the prose, so the prose
drifted freely.

Repair (`c3d516e4`): shrink that row toward nothing rather than keep retyping it, and
state in the file that **when the two disagree, the table wins.** The governing law of
that document — *an owner beats a convention* — applies to the document itself.

Note also: the §13 gate list in the standing shift prompt is STALE. "Delta Bubbles level
ownership" is named there as open; it is closed, by `deltaBubbleLevels.ts` plus an
adoption sentinel, 18 tests green. Gates named in a prompt are a convention. The
sentinels are the owner.

---

## WHAT THE WORKSHEET ACTUALLY IS

Asset 01's mockup prints seven values: `421 × 532` six times and `421 × 423` once.
Those are the image generator's own canvas dimensions. The picture carries **no market
data at all.**

The compiler mints none of them, and the render test bans those digits from the visible
text. What survives is the IDEA — long division shows its working — so every rung prints
WHAT IT DIVIDED, blank rungs included. Six rungs compose owners already in the room.
The seventh, MISSING EVIDENCE, is UNREAD on every possible input, as is the RIGHT OF WAY
footer: both belong to `decisionPermissionCompiler`, which compiles an evidence debt from
decision nodes this room has never had.

They are drawn as NAMED ABSENCES where the mockup put them, rather than omitted, and the
owner is named as a *string* so the module does not enter the chart bundle and invite a
rush-wire. A surface that quietly draws six of seven teaches the reader the seventh was
never asked for.

---

## NEXT

- Canon atoms after 01: **11** (01 in app context), **12** (progressive scaffolding —
  buildable if depth is user-chosen, unclear if auto-derived from `selectAnalysisMaturity.ts`),
  **13** (Mastery Path — `src/lib/learningGenome/` is the richest unclaimed surface in the repo),
  **19/20** (alternate compositions of 06/05), **04**.
- Re-audit the remaining §13 gates for staleness the way Delta Bubbles was:
  Live VP render geometry proof (`deltaVPGeometry.adoption.sentinel.test.ts`,
  `npm run prove:vp-pixels`); paper execution state-machine realism; Decision Memory
  sealing having zero production callers (**architectural — surface it, do not rush-wire**).
- Still blocked, unchanged: Asset 08 (needs licensed L2 depth); Gate 4 responsive proof
  (`outerWidth` pinned, programmatic resize does not take); `/journal` detail canvas
  (0 entries); Asset 18 (needs signed tape, honest only on crypto); `executionConnectivity`
  orphaned (not a live defect — `/readiness` discloses it honestly).
