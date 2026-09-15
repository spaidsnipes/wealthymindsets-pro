# 2363 — The Mirror reflects the trader, not the tape

**Commit:** `9bc3844` · **Room:** `/command-deck`, `MirrorPanel`
**Law:** H1 — *absence is not zero* · shape 2, **structural**
**Live status:** **NOT OBSERVABLE — therefore not claimed**

---

## The defect

```tsx
{chainVm && (phase === "REVIEW" || phase === "POST_EXIT") && <MirrorPanel/>}
```

`chainVm` is null whenever canonical market state has not resolved. So on any
session where the deck reads `MARKET STATE UNKNOWN`, the trader's own Mirror
disappeared.

This is `42b4106` exactly — an unobserved MARKET silencing an observable fact
about the PERSON — including its inversion: **REVIEW after a session you could
not read the tape on is precisely when you most want to look at what you
actually did.** The panel vanished when it was most useful.

---

## Eight lines below the comment that already explained it

The Opening Bell sits four lines above this gate, carrying twenty lines of
prose diagnosing this exact coupling, written when `42b4106` shipped.

It did not stop the sibling panel underneath it from shipping the same gate.

That is the **second** time in this block that a comment failed to protect
anything beyond the cell it sat on — the first being the WIN% column on
`/paper`, which carried the full diagnosis while the two cells three columns to
its left shipped that exact overclaim. Twice is a pattern:

> **A comment guards the cell it sits on and nothing else.**
> A Sentinel guards the law.

---

## Why this panel in particular

Every input is the trader's own record:

| Input | Source |
|---|---|
| `phase` | selected by the trader on the phase rail, not read off the tape |
| `sessionDecisions` | the decision store plus their journal |
| `ownerId`, `nowMs` | identity and the clock |

`selectMirror` was read end to end before the gate was removed. It touches
market state at **no depth** — a grep for `market`, `chain` and `quality`
returns exactly one hit, the label string `"Process quality by trade number"`.

A Sentinel now **checks** that claim rather than restating it, because the
whole fix rests on it. If `selectMirror` ever grows a market input, the
ungating stops being obviously correct and must be re-argued.

---

## The three over-corrections, all guarded

1. **Do not open the panel everywhere.** The cure removes *one conjunct*. The
   phase gate survives — a Mirror during PREPARATION would be a different
   overclaim, reflecting on a session that has not happened.

2. **Do not turn it into design theater.** `MirrorPanel` returns `null` at
   `vm.patterns.length === 0`, and `selectMirror`'s empty VM says so in words —
   *"No decisions in scope — Mirror has nothing to reflect yet"* — rather than
   in zeros. Both are pinned by Sentinels, because the *safety of the ungating
   depends on them*. If either regressed, this fix would start rendering an
   empty frame at every REVIEW.

3. **Do not strip every `chainVm &&` on the page.** ATHOS interventions are
   compiled *with* `chainVm`; that gate is correct and a Sentinel requires it
   to stay. Rendering market claims built from an unresolved market is the
   opposite error, not the cure.

---

## Sentinels

`src/lib/design/theMirrorIsNotAMarketPanel.enforcement.test.ts` — **+7**

| # | Guards |
|---|---|
| 1 | MirrorPanel is not gated behind market-state resolution |
| 2 | the phase gate survives — REVIEW and POST_EXIT are still the only moments |
| 3 | the panel's inputs are the trader's own record and nothing else |
| 4 | the claim that `selectMirror` ignores the market is checked, not asserted |
| 5 | **OVER-CORRECTION** — MirrorPanel still self-silences at zero patterns |
| 6 | **OVER-CORRECTION** — the empty case says so in words, not in zeros |
| 7 | **OVER-CORRECTION** — panels that genuinely ARE about the market keep their gate |

---

## Gates

```
Test Files  596 passed (596)
Tests       6964 passed (6964)
VITEST_EXIT=0
TSC_EXIT=0
```

**REVIVE §22 proven BY NAME.** The `chainVm &&` conjunct was reinstated via the
Edit tool; two Sentinels failed by name —

```
× THE DEFECT: MirrorPanel is not gated behind market-state resolution
× the phase gate survives — REVIEW and POST_EXIT are still the only moments
```

— and the file was restored byte-identical.

---

## Live status — honest

**The CURE is NOT OBSERVABLE and is NOT CLAIMED. One OVER-CORRECTION guard
WAS observed, and that half is recorded as seen.**

The deck was driven to `Phase: Review` on production after the route's chunkset
changed (poll 5 from baseline `8bcf453d…`), and the page simultaneously read
**`MARKET STATE UNKNOWN`** — `No chapter resolved. Unresolved: direction,
location, aggression, regime, structure, volatility, profile, orderFlow (0/8
dimensions resolved)`.

That is the **exact intersection under test**: REVIEW phase, market
unresolved — the precise condition in which the old gate erased the panel.

What was seen:

| Check | Result |
|---|---|
| `aria-selected` phase | `Review` |
| Market state | **UNKNOWN**, 0/8 dimensions resolved |
| Mirror rendered | **no** |
| Empty frame / stray heading | **none** |
| Page error | **none** |

**What this does and does not prove.**

It does **not** prove the cure. `MirrorPanel` returns null at zero patterns and
the Founder has no decisions in scope, so the panel is absent under both the
old code and the new code. Seeing nothing here is not evidence that the gate
was removed.

It **does** prove over-correction guard #2, live. The single most likely way
this fix could have gone wrong was rendering an **empty frame at every REVIEW**
— and this is the one screen where that failure would have appeared. It did
not. The self-silencing the ungating depends on works on production, not just
in the Sentinel.

The remaining half is the same honest gap as the callout in `e714b04`: it needs
a book with decisions in it. Written down so nobody later reads this file and
believes more was seen than was seen.

---

## The pattern to carry

**Ask the question panel by panel, not page by page.** Five `chainVm &&` gates
remain on `/command-deck` (1617, 1667, 1679, 1707, 1713) and one more at 1846
that is **correct**. The audit is not "remove the coupling"; it is *does this
panel's content depend on the market, or only on the person?* — asked once per
panel, with the answer read out of the selector rather than guessed from the
name.
