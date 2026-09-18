# WM PRO SHIFT — A FALSE REASON ACQUIRES A PASSING TEST

**Block:** `cd4f9edd` → `0626083b` (8 commits)
**Lane:** Canon view build order (`docs/operations/CANON-VIEW-BUILD-ORDER-2026-09-17.md`)
**Gates at seal:** `tsc --noEmit` EXIT=0 · `vitest run` EXIT=0, **792 files /
9953 passed | 2 skipped** — both run unpiped.

---

## THE ONE SENTENCE

The most expensive thing shipped in this block was not a view. It was the
DELETION of two ledger entries whose stated reason was false, because a false
reason does not sit quietly — **it acquires a passing test.**

---

## WHAT HAPPENED

`23c15ac4` compiled Asset 15 (Continuation Health) and, finding no surface to
mount it on, registered both new modules in the screenReach LEDGER as
`AWAITING_SURFACE`. The reason it wrote was:

> "/charts has no CanonicalMarketState + history to hand selectRegime"

**That was false at the moment it was written.** `/charts` has had both since
`b46fa64`. `ChartsDashboard` publishes canonical state through
`usePublishChartMarketState` and already memoised a `canvasIdentity` from
`canonicalMarketStateIdentity` — the exact identity the note said did not exist,
roughly eighty lines from where the note's author was working.

The note was written from *memory of the repo* rather than from a grep of it.
This is the same failure the build-order file itself was created to fix, one
week earlier, in a different medium: **believing a source of words about the
code instead of looking at the code.**

The remedy was not to rewrite the sentence into something less wrong. A ledger
entry is a PROMISE that an orphan has a stated reason; the enforcement suite
then goes green over that promise, and the falsehood is now *protected by a
passing test*. The remedy was to wire the surface the sentence called
impossible, which took one identity that already existed. A headstone comment
sits at the removal site so the mechanism stays legible to whoever reads it next.

---

## ASSET 15 — THE ATOM ITSELF

Shipped as the `Continuation` view, fifth member of `MICROSTRUCTURE_TABS`.
Full evidence lives in the build-order file's Asset 15 section; the parts worth
carrying forward are:

**The refusal is in the COMPILER, not the renderer.** The mockup wants four
percentages over filled green bars (`92%`, `78%`, `84%`, `85%`) — §9 twice over,
a verdict graded in hue at the reward end with a number painted on it. None of
the four has an owner. `ContinuationHealthVM` therefore carries **no numeric
field at all**, so the view could not print a score if it wanted to. A renderer
can be edited by someone who never reads the docblock; "somebody adds a bar
because the picture wants one" is the natural failure mode of a mockup like
this one.

**Asserted a second time at the markup level**, against markup compiled from the
real owner rather than a hand-built VM — a view test that mocks its own reading
can go green while the two files disagree about the shape they share.

**That assertion runs on visible text, not raw markup.** My first draft asserted
`not.toContain("%")` against the HTML and failed on valid output: `100%` in a
gradient stop, `2.4vw` in a `clamp`. The test was wrong, not the component. A
guard that reddens on an unrelated style edit trains the next reader to weaken
it, so the tags come off first — what is banned is a percentage a *trader* can
read.

**Mutation receipt taken, not claimed.** Injecting `85%` into the verdict span
failed exactly `PRINTS NO PERCENTAGE, on any of the four states` (1 failed |
6 passed). Restored; `85%` then occurred only in the two docblock mentions.

---

## THE LIVE READING, AND WHY IT SAYS UNREADABLE

Observed on TSLA via the Founder's already-authenticated Chrome; the category
select was switched to `Continuation` and **restored to `Chart`** afterwards.

It read `UNREADABLE`. **This is not a wiring gap and must not be "fixed."** The
compiler took its second branch — structure measured, regime UNKNOWN — and that
is corroborated rather than assumed: the story ribbon, an independent owner in
the same room, said at the same instant that `direction, regime, volatility,
order flow` were unresolved, with structure the one resolved dimension. Asset 15
carries `selectRegime`'s own sentence verbatim rather than minting one, so the
two surfaces cannot drift apart. It will resolve on its own when the regime
dimension does.

Also measured: zero percentages in the visible text, and the candles survive
beneath the reading (262px chart beside a 374px view) — the Founder's second
acceptance question answered by measurement rather than by a comment claiming it.

No screenshot: the Chrome window was backgrounded (`document.hidden === true`),
which makes canvas receipts unreadable. Recorded as absent rather than implied.

---

## TWO "SECOND OWNER" TRAPS CAUGHT DURING WIRING

1. My first draft opened `useCanonicalMarketState(canvasIdentity)` — and a grep
   showed the room **already had one** eighty lines down. Two readers of one
   fact, harmless today only because the store is single-valued, which is not a
   property to build on. Deleted mine; reused `chartCanvasState`.
2. The swing sequence reads the room's existing `chartBars`, so it describes the
   same candles the chart drew. A view that measured a *different* window would
   be a second owner of "what happened here."

---

## THE SENTINEL EARNED ITS KEEP, ON ME

The final doc commit failed `viewBuildOrder.sentinel.test.ts` on its first run:
a subheading I wrote used the word **SHIPPED** in ungated prose with no date or
commit attached. That is precisely the drift the gate exists to stop — an
undated status word is what sent an operator to rebuild three already-shipped
views on 2026-09-18. Reworded, because the heading was never making a status
claim. Worth recording that the guard fired on its own author.

---

## STATE FOR THE NEXT OPERATOR

**Read `docs/operations/CANON-VIEW-BUILD-ORDER-2026-09-17.md` FIRST.** The §13
gate list in the standing `/loop` prompt is STALE and names no canon asset. The
gated `VIEW-STATUS` table is the authority; prose in that file is commentary.

> **AN OWNER BEATS A CONVENTION.**

**Next unblocked canon atoms**, in Founder Asset Ledger order:

| Asset | Note |
|---|---|
| 17 | Presentation layer for 15 — reuses `selectContinuationHealth`, no new compiler |
| 01 | Long Division Worksheet — owners `measuredNumber.ts`, `selectEvidenceLadder.ts`, `selectAbsorptionAnatomyView.ts` |
| 11 | Asset 01 in app context |
| 12 | Progressive scaffolding — BUILDABLE if depth is user-chosen; UNCLEAR if auto-derived from `selectAnalysisMaturity.ts` |
| 13 | Mastery Path — `src/lib/learningGenome/` is the single richest unclaimed surface in the repo |
| 19 / 20 | Alternate compositions of 06 / 05 |

**Still genuinely blocked, unchanged:** Asset 08 (needs licensed Level 2 depth);
Gate 4 responsive proof (programmatic resize does not take — `outerWidth`
pinned); `/journal` detail canvas (0 entries); Asset 18 (needs signed tape,
honest only on crypto).

**Standing operator constraints:** stage ONLY named paths — the tree carries
~180 untracked `scratchpad/*` entries, and the vitest run itself rewrites
`public/founder-room-sample.html` and `public/decision-rail-sample.html`, which
therefore always show dirty after a gate run. Never force-push. Never enter the
Founder's password or forge a JWT; live-verify only by driving his already
authenticated Chrome, and restore any UI state you toggle.
