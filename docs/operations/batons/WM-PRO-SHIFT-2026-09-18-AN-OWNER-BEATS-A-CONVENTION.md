# AN OWNER BEATS A CONVENTION

**Block:** `cfa1eb3e` → `bb8c28bb` (five commits)
**Predecessor baton:** `WM-PRO-SHIFT-2026-09-18-THREE-COUNTS-ONE-INSTRUMENT.md`

---

## WHAT SHIPPED

| SHA | Atom | Live status |
|---|---|---|
| `cfa1eb3e` | A bubble's size and its sentence now claim the same number | pushed; **canvas has no DOM witness — unproven** |
| `ab574fe7` | Bubble size is a claim about the frame, not about one bar | pushed; **same — unproven** |
| `bd8b1d2e` | Saying nothing numeric became saying nothing at all | **LIVE — PROVEN** |
| `f6c516a6` | The suffix had an owner; the phrase did not | pushed; **observable only in a state I did not force** |
| `bb8c28bb` | The clip deleted pixels the receipt still counted | owner-proven; **live half PROVEN, corrected half not** |

---

## THE PROVEN ONE

Production `/command-deck?symbol=BTC`, one instant, one read:

```
EVIDENCE DEBT   6 OPEN · unpaid information
QUESTION FOCUS  Unpaid evidence: Direction + Location +4
```

2 named + 4 disclosed = 6, reconciling exactly with the cell beside it. Before
`bd8b1d2e` that line ended at "Location" — five unpaid, two named, and nothing
on the screen said so. Canon Weakness #1, two cells apart.

The file's own header had codified the wrong rule — *"the focus names the
sample and says nothing numeric"* — written to prevent a REAL defect (a count
derived from the capped array, which once rendered `9 evidence nodes unpaid:
regime + direction +1`). It banned the cure along with the disease. A test
asserted `not.toMatch(/\d/)`, so the incomplete rule had a guard. **A test that
fails on a correct change is its own defect**; it was replaced, not worked
around.

---

## THE LAW THIS BLOCK NAMED

Fixing `selectQuestionFocus` made it the **seventh** copy of the same three
lines. Auditing the other six found this:

| Call site | Branch | State |
|---|---|---|
| `selectOneStory.missingPhrase` | missing | correct |
| `selectOneStory.missingPhrase` | warn | correct |
| `computeRightOfWay` | missing | correct |
| `selectOneNextThing` | missing | correct |
| `CommandContextRibbon` detail | missing | correct |
| `CommandContextRibbon` detail | warn | **DRIFTED — no remainder** |

The sixth is **one line below the fifth, in one template literal, in one file.**
Five correct copies did not make the sixth correct; they only made it look
correct, because a reader scanning the file sees `hiddenRemainder` and stops.

> **A convention is re-decided at every call site, and the sixth decision was
> wrong.**

`hiddenRemainder` owned the `+N`. It did not own the three lines that must
surround it. `sampledLabelPhrase(labels, trueCount, {limit, lowercase})` now
does. §24: a second CALLER of one owner is fine; a second ANSWER is not.

Casing stayed a parameter because it is genuinely per-surface — the ribbon and
the story speak lowercase mid-sentence, the question focus speaks Title Case as
a label. That is typography, not a second answer about what is hidden.

**Evidence the migration is behaviour-preserving:** the full suite stayed green
across five call-site rewrites. That is the only evidence that the five
previously-correct sites emit byte-identical strings through the new owner.

**Mutation coverage, measured before and after:**

```
BEFORE  mutating a caller        →  3–4 tests fail
AFTER   mutating the owner       → 11 tests fail, codebase-wide, both directions
                                   (remainder-from-capped-array; drop-the-remainder)
```

---

## §13 LIVE VP RENDER GEOMETRY PROOF — OBSERVED

Production `/charts?symbol=BTC`, PROFILES → Session VP, read off the canvas
dataset:

```
vpRequested=1  vpDrawn=1  vpDeclined=0  vpRows=250  vpAxisClearance=6
canvas 1564x560 @ dpr 1 · no decline notice
```

The profile was requested, it drew, and the histogram cleared the price axis by
the 6px `VP_AXIS_MARGIN_PX` reserves. 250 rows into 560px is consistent — nothing
on this frame contradicts itself. **This gate is closed by observation, not
assumption.**

Before this read, the receipt was legitimately ABSENT on `/charts` and that was
correct: no profile was requested. Absence of a receipt is not a broken
renderer. The `PROFILES` dropdown shipped earlier this shift is what turned it
on, so the invention proved the invention.

### …and reading the loop to check that number found the next defect

`drawWMVP` clips the profile to pane 0 and says why: with indicator panes
stacked below, `priceToCoordinate` **extrapolates** prices outside pane 0 to
y-values beneath it, and without the clip the bars bleed into the
Speed-of-Tape / CVD panes.

Extrapolated coordinates are **finite**. `vpRowRect` therefore returns a
perfectly valid rectangle for them — its null case is *"the price scale could
not place this row"*, which is a different thing — and the loop counted every
one of those into `rowsPainted`. The canvas then threw the pixels away.

`vpRenderReceipt`'s own header forbids exactly this one level up:

> "A DRAWN column that painted zero rows is counted as DECLINED … a column that
> painted nothing is not a column the trader can see."

The row count is the number that decides it, and it was counting rows nobody
could see. **A receipt that counts clipped rows is certifying work, not
recording it.**

`vpRowVisible(rect, paneHeight)` now owns the decision. Intersection, not
containment — a row straddling the boundary IS partly visible, and the cheap
guard (`y >= 0 && y <= pane`) gets those wrong in the other direction. An
unreadable `paneHeight` returns true: this function may not invent a decline out
of a number it could not read, the rule `columnClearance` already follows two
files over.

---

## HONEST LIMITS — WHAT IS *NOT* PROVEN

1. **`bb8c28bb`'s corrected count is proven at the owner, not on the deck.** The
   pre-fix overcount is a reading of the loop, not a screenshot. I tried to force
   a live frame with indicator panes stacked; the Indicators menu's rows are not
   `button`/`li`/`[role]` elements, so the DOM channel could not enumerate or
   click them. Recorded as a limit rather than chased.
2. **`f6c516a6` has no live proof.** Its only observable change is the ribbon
   EVIDENCE tile's WARN detail, which needs `missing === 0 && warn > 2`. I did
   not force that state. The ribbon is a `.tsx` with no test file, so the WARN
   branch's repair is proven at the owner, not at the surface.
3. **`cfa1eb3e` / `ab574fe7` remain unproven.** Neither introduces a new
   user-facing string and canvas has no DOM witness.

---

## SPECIES LEDGER — THIS REPO HAS NOW NAMED IT FOUR TIMES

**A CLAIM THAT IS NOT ITSELF CHECKED DRIFTS SILENTLY.**

Every instance in this block is one shape: a number or a picture asserted by one
piece of code, consumed by another, with nothing executable joining them.

- the capped array used as a count
- the sample printed without its remainder
- the sixth copy of a convention
- the clipped row counted as painted

The repair is always the same and it is never a number: **give the claim an
owner, and make the owner's answer the only answer.**

---

## NEXT

- Force `missing === 0 && warn > 2` on the deck to close `f6c516a6` live.
- Find a click path into the Indicators list (it is not DOM-enumerable through
  the current channel) to close `bb8c28bb`'s corrected half live.
- Remaining truncation candidates, lower value: `WhyInspector.tsx:285`
  `unknowns.slice(0, 5)` (true count IS in the header, so weaker) and
  `state.coverage.slice(0, 6)` (no count in the header at all);
  `selectMateriality.ts:97` `reasons.slice(0, 2)`.
- Open architectural question, unchanged: Decision Memory sealing still has
  **zero production callers**. Surface it; do not rush-wire it.
