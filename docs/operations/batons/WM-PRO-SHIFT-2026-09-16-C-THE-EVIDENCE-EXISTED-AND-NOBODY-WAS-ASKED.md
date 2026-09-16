# THE EVIDENCE EXISTED AND NOBODY WAS ASKED

**Shift:** 2026-09-16-C · **Commits:** 751e4a1 → a5495c6 → 2d4fcbb (3)
**Gates at close:** `tsc --noEmit` EXIT=0 · `vitest run` EXIT=0, **653 files / 7834 tests**
**Live status:** NOT VERIFIED — see *The blocker*, below. This is stated plainly
because a baton that implies deployment it cannot show is the exact defect this
chain spent three atoms removing.

---

## The one sentence

`/command-deck` fetched 120 real candles, drew them on screen, and told every
downstream consumer — the hero, the spine, and the AI assistant — that it had
no price evidence at all.

## Why this shape is worth a baton

Each atom in this chain was **caused by the previous one**. That is not a
failure of the chain; it is the chain working. Every repair moves a surface
from one state to another, and the honest question after a repair is never
"is it green" but **"what did I just make possible that was not possible
before, and who is not ready for it?"**

Asked three times, that question produced three real defects.

---

## Atom 1 — 751e4a1 · the deck drew 120 candles and published none of them

`DeckMarketChart` fetched candles from `/api/yahoo`, rendered them, and dropped
them on the floor. The deck's `usePublishChartMarketState` call omitted `bars`,
so canonical `lastBar` was null.

**Root cause — an exemption that outlived its premise.** The publisher carried
the comment *"Optional so /command-deck (which owns no bars) is untouched."*
That was TRUE when written. It was falsified on 2026-09-11 when Ticket T put a
chart into the deck, and nothing re-read the comment. A conditional written as
a permanent fact is how a codebase lies to itself slowly.

**Honest-typing decision.** `parseCandles` deliberately discards volume, so
mapping to `OHLCVBar` would have required writing `volume: 0` — fabricating an
observation to satisfy a type. Instead `deriveLastBarClose` was widened to
accept `BarCloseCandidate { time, close }`: the narrowest shape that answers
the question actually being asked. **Widen the contract to the truth; never
pad the truth to fit the contract.**

## Atom 2 — a5495c6 · the defect atom 1 created

With `lastBar` finally populated, the deck had two price owners in one viewport:

| Owner | Read | Rendered |
|---|---|---|
| `HeroTruth` | `state.price.last` | `?` |
| `DecisionSpineBand` | `formatSpinePrice(...)` | `356.58 LAST 15m BAR CLOSE` |

Eleven pixels apart. Canon **Weakness #1** — multi-price disagreement on one
page — manufactured by a repair.

While `lastBar` was always null those two agreed, **the way two unplugged
instruments agree: neither was being asked.** That is VACUOUS AGREEMENT, and
this codebase keeps rediscovering it. A repair that moves a surface from
*silently wrong* to *visibly contradictory* is not finished.

**The fix is a selector, not a second if-chain.** Teaching `HeroTruth` the same
precedence rule (print outranks close) would have made both agree on the day it
was written — and exactly until someone edited one of them. `selectPriceEvidence`
is now the one owner of WHICH FACT WINS; each surface owns only HOW IT IS DRAWN.

**Evidence the extraction was structural, not behavioural:** the pre-existing
15-test `formatSpinePrice.test.ts` passed **unedited**.

**The second-order hazard, handled.** `356.58` drawn bare at 36px is a BIGGER
lie than the `?` it replaced — `?` at least understated. The qualifier renders
from the same selector call and rides in the `aria-label`, so a screen-reader
user is not told a print happened.

## Atom 3 — 2d4fcbb · the assistant was told nothing while the human saw everything

Same root, third surface. `#wm-chart-context` fed `/api/spaidbot` from
`price.last`, so on a deck full of candles the model received NO price and
answered *"I don't have sufficient price data"* about a screen that was
showing one.

**Understating is a truth defect in the same family as overclaiming.** The
route's own SYSTEM_PROMPT promises to *"say exactly what is missing"* — a model
cannot disclose a gap it was never shown, and it cannot decline to invent a
price it was never given.

Provenance rides with the number, re-validated **server-side** exactly as `role`
already is: `/api/spaidbot` is reachable by any authenticated client, and a
hand-crafted POST must not be able to talk the server into printing a
justification it cannot support.

**A sentinel was amended, and the amendment is the lesson.** The Ticket T guard
asserted the literal string `price: state?.price?.last`. It therefore **fenced
the defect in place** — the guard would have failed the repair. A test that
pins one component's internals blocks that component's repair. It now asserts
the *property* reaches the wire and leaves "which fact wins" to the selector
that owns that question.

---

## Triage, not sweep

Every direct `price.last` reader was enumerated. Most were **correctly left
alone**, and the reasoning matters more than the edits:

- `selectDLAR.ts` / `selectMarketStory.ts` — window scans over a tick series.
  A bar close is not a tick. Print-only is right.
- `heroTruthChronology.ts` — chronology *of a print*. A close has none.
- `page.tsx:1166` → `DeckExpressionShortlist` `spot` — **deliberately unchanged.**
  A stale close used as option-strike spot could select the wrong contracts.
  Here `null` is the safe answer and a number is the dangerous one.

A sweep would have "fixed" all four and broken the last one. **The same value
is correct in one place and dangerous in another; only the question being asked
decides.**

## Positive controls (every atom)

Reverted with an `Edit`, never `git checkout` — a checkout can silently take
more than intended.

| Atom | Break | Result |
|---|---|---|
| 1 | drop `bars: deckCandles` | 1 named failure |
| 1 | drop `onCandlesReady` | same single named failure |
| 2 | restore hero's `price.last` | exactly 2 named failures |
| 3 | drop `priceProvenance:` | exactly 1 named guard |
| 3 | drop `price: chartContextPrice.value` | exactly 1 named guard |

Atom 3's two halves are fenced **separately** because `priceProvenance` is
optional: dropping it would type-check, test green, and silently restore an
unlabelled close going to the model.

---

## The blocker — stated, not hidden

**These three commits are pushed to `main` and are NOT LIVE.** No AFTER
observation can honestly be claimed.

- `npm run deploy:cf` is the only deploy path and requires `CLOUDFLARE_API_TOKEN`.
- Confirmed this shift: `.github/workflows/` contains **only** `sentinels.yml`.
  There is no CI deploy. The token is the Founder's to supply.
- This is owner-territory and was not worked around.

**Founder action to unblock:** supply `CLOUDFLARE_API_TOKEN` or run
`npm run deploy:cf` once. Live verification of all three atoms then takes minutes.

## Next, in order

1. **Live-verify** the chain once deploy is unblocked — hero and spine agree,
   assistant quotes the close *labelled as a close*.
2. `ChartsDashboard.tsx:1017` and `selectTradeExpectation.ts:221` — enumerated,
   **not yet triaged**. Triage before touching.
3. Harness fixtures remain untypechecked (template strings in
   `measure-experience-geometry.mjs`). `UNRENDERABLE` is containment, not cure;
   the cure is a real `.tsx` module `tsc` reads.
4. The nine card-museum files: **do not sweep.** Registry → measure → repair →
   re-measure. *Repairing a surface no instrument has looked at is a guess
   wearing a test's authority.*

---

## What to carry

> **A repair is not finished when the tests go green. It is finished when you
> have asked who is now able to see something they could not see before — and
> checked whether they are ready to see it correctly.**

Asked once: the hero was blind. Asked twice: the assistant was starved. Asked a
third time: an old sentinel was guarding the wound.
