# WM Pro — the room disagreeing with itself

**Date:** 2026-09-16
**Commits:** `8d53c81`, `0a04a4b`, `8370953` (all on `main`)
**Gates at seal:** `vitest run` 655 files / 7863 tests PASS · `tsc --noEmit` EXIT 0
**Receipts:** local `npm run dev`, measured DOM + rendered pixels, per atom. **NOT production.**

---

## THE HONESTY LINE, FIRST

Every receipt below was taken against **local dev at the working SHA**.
`npm run deploy:cf` is Founder-blocked, so these three commits are on `main`
and **are not live**. Anything currently observable at wealthymindsetspro.com
reflects an earlier deploy and says nothing about this work. No atom here is
marked PROVEN in production, because none was observed there.

---

## What linked these three atoms

All three were found by **reading the deck**, not the code. And all three were
the same failure: **one screen giving two answers to one question** — first in
numbers, then in scope, then in ink.

The previous block's through-line was *the room had the fact and was not
saying it*. This block's is narrower and nastier: **the room said it twice,
differently**. That is canon Weakness #1, and it is worse than silence,
because both halves look authoritative.

---

## Atom 1 — `8d53c81` · two counts, neither saying what it counted

**Found by USE.** Reading the live deck top to bottom:

```
MARKET OBJECT PASSPORT  …  RESOLVED  0 of 8
01 MARKET POSTURE       …  (0/8 dimensions resolved)
03 EVIDENCE DEBT        …  0 of 9 paid
   9 evidence nodes unpaid: regime + direction +6; 1 warned: permission
```

**Both numbers are correct and neither is a bug.** 8 is the market DIMENSION
list (`selectMarketObjectPassport` maps `DIMENSION_ORDER`). 9 is the
decision-chain NODE count (`selectDecisionChain` adds non-dimension nodes such
as `permission`). The defect was that the passport band printed a bare `N of
M`, which made it *silently comparable* to its neighbour 150px below.

**The repair is a NOUN, never a number.** Re-deriving either count to make
them match would mint a second answer to a question that already has two
correct owners — §24, a second CALLER of one owner is fine, a second ANSWER is
not. `dimensions` introduces no vocabulary either (§H19): cell 01 already
prints "(0/8 dimensions resolved)" for the identical set.

The never-opened ledger keeps its bare em-dash. Naming a set that was never
counted would imply one was.

Receipt: `0 of 8 dimensions` beside `0 of 9 paid`.

## Atom 2 — `0a04a4b` · the frame said 8 while its own room said 9

**Found by USE, in the same screenshot.**

```
rail  ·  EVIDENCE DEBT   8 OPEN     unpaid information
cell  ·  EVIDENCE DEBT   0 of 9 paid
```

Unlike Atom 1, these claim the **same set** under the **same label**, so one
was simply wrong. `standingFromOneStory` published `debt.missing`, which omits
the WARN bucket. `payable = resolved + missing + warn` is a test-enforced
invariant, so UNPAID is `payable - resolved`.

**This is the third head of one defect** — the ledger sentence (2026-09-03),
the lead count (`99a87fd`), now the frame. The Orkin reading: the bucket was
never the bug. **The arithmetic was restated by hand at every site instead of
derived once.** So the guard is written against `payable - resolved` across
the full 4×4×4 cross-product; a fourth bucket cannot revive it here either.

Worth naming *where* it landed. `standingFromOneStory` exists because the
frame once read UNKNOWN while the room beneath it had an answer, and the canon
treats a frame less confident than its room as an overclaim's exact mirror. **A
frame softer by one node is that same failure in a smaller coat.**

A latent second head closed with it: a warn-only ledger (`missing 0, warn 1`)
published `0`, which the chrome renders **"EVIDENCE DEBT PAID"** — a live
warning drawn as a clean bill of health.

Every pre-existing fixture in that suite used `warn: 0`. That is precisely why
it was green while the rail was wrong.

Receipt: rail `9 OPEN` against the room's `9`.

## Atom 3 — `8370953` · an absence wearing the ink reserved for findings

**Found by USE.** The band rendered `STATE QUALITY  UNAVAILABLE` in `#ede6d3`
— the ivory reserved for findings — at the same weight as the protocol version
beside it.

The lazy repair is to fold UNAVAILABLE into `unresolved`, and it is wrong in
the direction this codebase keeps having to undo:

| word | meaning |
|---|---|
| `UNKNOWN` | the passport's own sentinel — NO state was compiled |
| `UNAVAILABLE` | a real reading from `produceCanonicalMarketState` — measured, no coverage and no **canonical** price |

`UNAVAILABLE` does not mean the screen is numberless. `hasCanonicalPrice` is
`matchingPriceTick(...) != null` (`chartMarketStatePublisher.ts:126`) — a price
the engine can tie to a real tick. A last bar close is a different, separately
labelled fact, so `29443 · LAST 15M BAR CLOSE` beside `STATE QUALITY
UNAVAILABLE` is two honest owners, not a contradiction — already pinned by
`chartMarketStatePublisher.test.ts` *"omits an unmatched displayed price
instead of inventing its event time"*. Corrected here after re-tracing; the
original line in this baton said "no price", which would send the next reader
to repair the wrong one.

"We never looked" and "we looked and there is nothing" are opposite facts
about the engine, exactly as FLAT and POSITION UNREAD are opposite facts about
an account (§14.1).

So it is a **third state that mints no new token**:

```
finding      #ede6d3 upright   a reading the trader can act on
absence      #8a8271 upright   a reading whose content is "nothing"
no reading   #8a8271 italic    nothing was compiled at all
```

The INK answers *is this a finding?*; the FACE answers *is this a reading at
all?* `CapitalPostureLine` already carries this exact flag under the same rule,
so the grammar was **adopted, not invented**.

Scope is deliberately tight and pinned: DELAYED / STALE / PROXY / REPLAY /
PARTIAL are degraded FINDINGS and keep finding ink — a degraded reading that
dims itself is the absent-cell defect in reverse. `0 of 8 dimensions` likewise
stays bright: alarming, but it is the number the trader most needs.

Receipt (measured, then photographed): `State Quality` at `rgb(138,130,113)`
upright; `Resolved` at `rgb(237,230,211)`.

---

## Positive controls run

| Atom | Break applied | Failure observed | Reverted by |
|---|---|---|---|
| 1 | removed the noun | fixture pin + set-naming invariant, quoting `totalCount=1` | Edit |
| 2 | restored `debt.missing` | all three new cases, quoting `expected 8 to be 9` (the live shape) and `resolved=0 missing=0 warn=1` | Edit |
| 3 | broke selector AND view together | `marks UNAVAILABLE an absence` + `the band draws THREE states`, the latter quoting the missing `f.absence` | Edit, `diff` confirmed byte-exact |

Never `git checkout` — a checkout can silently take more than intended.

---

## Open, and honest about it

- **Deploy is owner-blocked.** Fourteen commits now sit on `main` unshipped.
- `MainLayout.tsx` is still two shells in one file branching on
  `isFounderOperatingRoom`. The one-OS law says this should converge.
  Untouched this block, carried from the previous baton.
- Still blocked, unchanged: Gate 4 responsive device proof (programmatic
  window resize does not take effect, `outerWidth` pinned); `/journal` detail
  canvas (0 journal entries to render).

---

## The through-line for whoever picks this up

Last block's lesson was *read the room before reading the code*. This block
sharpens it: **when the room says a thing twice, do not assume one is a bug.**

Atom 1 and Atom 2 produced visually identical symptoms — two numbers, one
page. In Atom 1 both owners were **correct** and the repair was a word. In
Atom 2 one owner was **wrong** and the repair was arithmetic. Guessing either
way would have been a defect: re-deriving Atom 1's count would have destroyed a
true distinction, and re-labelling Atom 2's would have papered over a real
error.

**Trace both owners before choosing a repair.** The question is never "which
number is right" — it is "do these two counts even claim the same set."
