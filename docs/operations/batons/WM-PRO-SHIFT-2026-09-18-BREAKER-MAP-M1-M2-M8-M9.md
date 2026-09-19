# BATON — FINAL-LAP BREAKER MAP: M1 closed live, M2 closed, M8 ratcheted, M9 measured

**Date:** 2026-09-18
**Commits:** `83742dca` · `ba0f413e` · `59b069c6` · `958b16bd` · `4cff620d` (+ this one)
**Suite:** 10176 → 10189 passed (+13), 806 files, 2 skipped. `tsc --noEmit` EXIT 0 throughout.

> Read the gate list in `docs/operations/CANON-SHIFT-GATE-STATUS.md`, not here.
> This baton records HOW the block went. That doc records WHERE things stand,
> and it is the gated one — a Sentinel fails if a row loses its owner, its date
> or its executable evidence. **If these two ever disagree, the gated doc wins.**

---

## THE ONE THING WORTH CARRYING FORWARD

**Two of the four breakers worked this block were substantially WRONG as
inherited, and both were written down with total confidence.**

M1 said `/charts` still carried the Rooms toggle and the five-door phone nav.
Half of that had already been fixed — the rail defaulted shut and the mode bar
already collapsed on the instrument view. Only the phone half was real.

M2 said the equipment layer "takes the chart away, goes fixed `inset:0`, and
reflects state through the URL". All three are literally true and **not one of
them was the defect.** Fixed `inset:0` is not the bug — it is the *mechanism*
that keeps the chart mounted underneath instead of reflowed away.

So the working rule, earned twice in one block:

> **Measure the claim before repairing it. An inherited defect is a hypothesis
> with good PR.** Acting on M2's text without reading the file would have
> "fixed" the overlay into an in-flow section and amputated the thing the
> breaker existed to protect.

M9 is the counterexample that keeps this honest: re-measured, **confirmed, and
worse than claimed.** Measurement is not a way of talking work out of existence.

---

## WHAT LANDED

### M1 — live-market destination mall · CLOSED, LIVE-PROVEN
Closed by **re-homing, not deletion** — the NO CAPABILITY AMPUTATION law forbids
the naive fix. A new `phoneDestinations` prop makes the rail itself the phone's
navigation on the instrument view, reached through the SAME masthead toggle the
desk uses.

**The trader gains sixteen doors.** The strip carried 5; the sheet carries 21.

Live on `https://wealthymindsetspro.com/charts` in the Founder's own Chrome:
`phoneNav:false`, `sheetRule:true`, `provReservation:false`, and on opening,
`doorsInRail:21`, `railClosePresent:true`.

**The first live probe returned the OLD build and was recorded as unproven
rather than claimed.** That is the only reason the row could later be upgraded
on evidence instead of on hope.

His rail was restored by clicking the **new Close control** rather than the
toggle — restoring his state and proving the sheet is not a trap in one action.

*Still not proven:* the 390px **visual**. The strip's absence is a render
branch and therefore width-independent, so that half is genuinely proven; the
pinned-sheet geometry under a real 390 viewport is not. Gate 4 remains BLOCKED
(programmatic resize does not take; `outerWidth` pinned).

### M4 — legacy tests protecting legacy architecture · CLOSED
Landed in the **same atomic commit** as M1, as the law requires. The real defect
was deeper than stated: `ShellAccessParity.test.tsx` rendered the shell exactly
once with **no route**, so every assertion described the non-instrument shape
and *nothing in the suite had an opinion about `/charts`*. That is how the two
widths disagreed with no gate able to see it. The route is now an input.

### M8 — CanonicalBar adoption · RATCHETED (row stays OPEN)
Measured, not assumed: the artery has **zero production consumers** — every
import is a test importing it to test it — while production declares its own
OHLC in **22 other places**. Not 22 styles: 22 *pasts*.

A migration across many commits characteristically **grows the thing it is
migrating away from while in flight**, so the census is frozen and may only
SHRINK. Adding fails; removing also fails, deliberately, because the list is the
scoreboard.

**It claims no adoption.** Green means only "the sprawl has not grown".

### M2 — Workspace/Tools FULL stage · CLOSED
Largely refuted (above). The one genuinely unguarded property: **that every open
depth is an overlay.** Thirty-plus assertions next door check where the grammar
is wired and what it refuses; none checked that the shell stays out of the
room's layout flow. A future simplification of FULL into an in-flow section
would reflow the chart out of the room and the whole suite would stay green.

> A property everything depends on and nothing asserts is not a safe property.
> It is a lucky one.

Three tests, **no implementation change** — the implementation was already
right; only its reasons were load-bearing.

### M9 — replay · RE-MEASURED, CONFIRMED, NOT REPAIRED
Reproducible with grep: `replayActive` and `replayBars` each appear **twice** in
`MainChart.tsx` — props interface, destructure, nothing else. `replayBars` is
never passed at all.

Meanwhile the controls are fully alive: an interval advances `replayIdx`, and a
BAR REPLAY badge, a position-of-total counter and a walking timestamp all move.

**The trader presses play, watches the clock walk through the session, and the
chart behind it never moves.** Same class as the NO FEED badge that contradicted
a loaded chart.

Two separable repairs, and they must not be confused:
1. **Disclosure** — do not show a moving replay position over a chart that is
   not replaying.
2. **The real wire** — frozen CanonicalBar ancestry and truth epochs. Depends on
   the M8 adoption half.

> **DO NOT FAKE-WIRE THIS BY SLICING TODAY'S BARS.** That converts a visible lie
> into an invisible one, and an invisible one is the expensive kind.

---

## DISCIPLINE RECEIPTS

**Seven mutation receipts**, every one landing on the intended test, every one
restored and re-verified:

| Mutation | Fired on |
|---|---|
| `phoneDestinations="bar"` forced | draws NO pinned destination strip |
| Close control removed | gives the opened sheet a way back out |
| Vacuity guard asserting the OLD shape | *earned honestly* — see below |
| 23rd OHLC interface appended | holds at twenty-two private pasts |
| Phantom entry in the frozen list | the removed branch, scoreboard message |
| FULL → `position:relative` | out-of-flow AND inset, both |
| `data-decision-id` deleted | carries ONE decision identity |

The third was not planned. A vacuity guard asserted the instrument view still
contained a destination anchor — and it failed *correctly*, because with the
strip gone and the rail shut there is no such anchor. Recorded in the test:
**a vacuity guard that assumes the old architecture is a vacuity guard that
argues for it.**

**Other standing habits held:** every gate run unpiped (`> log 2>&1; echo $?` —
a pipe masks the exit code, and `${PIPESTATUS[0]}` does not work in this shell);
every commit staged **only named paths**, never sweeping the ~180 untracked
`scratchpad/*` entries or the `public/*-sample.html` files the suite itself
rewrites; suite total checked to have MOVED each time, because a green run that
does not move the total is a signal, not a pass.

---

## NEXT, IN ORDER

1. **M9 disclosure** — smallest honest repair available anywhere on the board,
   and it is a live trader-facing lie. Do this before anything larger.
2. **M8 adoption half** — migrate the first real ingress, and lower
   `FROZEN_PRIVATE_BAR_SHAPES` **in the same commit**.
3. **M3** — re-measure before repairing. Inventory legitimate organs first; the
   anti-amputation law applies hardest here.
4. **M6** — generalise the dated-status rule from `viewBuildOrder.sentinel.test.ts`
   to route and shell prose.
5. **M7** — truthful decision-birth seam. **Do not fabricate an intent to
   persist the row.** Shares an owner with the Decision Memory sealing row;
   close them together or they will disagree.
6. **M10** — the bounded certification harness. Definitions are not
   commissioning, and "connected" cannot mean EXECUTABLE.

**BLOCKED, unchanged, honestly:** Gate 4 responsive proof (resize does not
take); `/journal` detail canvas (0 entries); Asset 08 (licensed L2 depth);
Asset 18 (signed tape).

**M5** remains partly refuted on measurement — decide whether anything is left
of it rather than working it on faith.
