# THREE COUNTS, ONE INSTRUMENT — AND THE DIAGNOSES THAT WERE NEVER CHECKED

**Block:** `33f994c4` → `deca7dab` (four commits)
**Predecessor baton:** `WM-PRO-SHIFT-2026-09-18-SIX-TIMES-ONE-SHAPE.md`

---

## WHAT SHIPPED

| SHA | Atom | Live status |
|---|---|---|
| `33f994c4` | A quiet market and a silent venue are opposite facts | **DEPLOYED — in prod bundle** |
| `b63d5434` | Name which chapters were DECIDED, not just which evidence is missing | **DEPLOYED — in prod bundle** |
| `b3ba465f` | Lock four dead matcher vocabularies as dead | unit-level; no live surface |
| `deca7dab` | The strip's last bare integer gets the noun it counts | pushed; deploy not yet re-read |

Every one of the four came out of a single live reading of production
`/command-deck?symbol=BTC`. None was picked from a list.

---

## THE DEPLOY PROOF, AND WHY THE DOM COULD NOT GIVE IT

`33f994c4` and `b63d5434` are both **sentence** repairs, and neither sentence was
in the DOM when I looked. That is not evidence of a failed deploy, and assuming
either way would have been a fabrication. So the bundle was measured directly —
all 24 loaded chunks fetched in-page and searched:

```
{"done":24,"total":24,"hitVenue":1,"hitDecided":1}
```

`does not publish it` (33f994c4) and `more evidence will not change` (b63d5434)
each present in exactly one served chunk. **Deployed.**

They are absent from the DOM for a reason that is itself correct: the deck
currently *does* resolve a chapter (`BALANCE`), so `explainNoChapter` never
runs, and the per-dimension `unknowns` strings are not rendered on the collapsed
passport card — only their count is. Recorded as DEPLOYED, not as PROVEN,
because the rendered behaviour has not been observed.

**Method worth keeping:** when a repair's only visible form is a string that
appears in a state you cannot force, fetch the served chunks and grep them. It
converts "probably deployed" into a measurement.

---

## THE LIVE READING THAT PRODUCED `deca7dab`

One frame, one instrument, one instant:

```
RESOLVED        4 of 8 dimensions          <- carries its noun
...  session 24X7 . source coinbase . coverage 1 channel . unknowns 4
                                           <- BARE INTEGER
EVIDENCE DEBT   0 of 6 paid
                6 evidence nodes unpaid    <- carries its noun
```

`4` and `6` are both correct. `state.unknowns` is built one-per-unresolved
**DIMENSION** (`chartMarketStatePublisher` — *"ONE UNKNOWN PER UNRESOLVED
DIMENSION"*); the ledger counts decision-chain **NODES**, which include
non-dimension nodes such as permission. Two counts of different sets, adjacent,
with nothing on screen saying so. Canon Weakness #1.

The striking part: `selectPassportStamp.ts` had **already diagnosed this exact
pair**, in 2026-09-16, and stated the general fix in its own words —

> The repair is a NOUN, never a number.

— and applied it to the RESOLVED band only. The strip was missed. A repair
carrying a correct general statement of itself still survived incompletely,
because nothing checked that the statement had been applied everywhere it
claimed to hold.

The grammar to copy was one span away: `coverage` already prints `1 channel`,
not `1`. This was the only member of the strip carrying a bare integer.

Neither count is re-derived. `4` and `6` keep their separate owners (§24: a
second CALLER of one owner is fine, a second ANSWER is not).

---

## THE RECURRING SPECIES THIS BLOCK NAMES

**A CLAIM THAT IS NOT ITSELF CHECKED DRIFTS SILENTLY.** Three separate
instances, all found this block, all the same shape:

1. **A diagnosis that was not measured** (`b63d5434`). `explainNoChapter` listed
   unresolved dimensions and the reader inferred them to be the CAUSE. Some
   chapters had every input they needed and simply did not match — telling the
   trader to wait for evidence that would change nothing. Now each guard is
   re-run against a recording `Proxy` to observe which dimensions it actually
   touched, splitting non-matching chapters into DECIDED and BLOCKED.
   Measured, not declared: a per-chapter dependency list would be a second place
   to state one fact, and would drift.

2. **A coverage claim that was not checked** (`b3ba465f`). `dimensionVocabulary`
   opened by claiming it covered every dimension a guard reads by VALUE, naming
   `direction` as the single deliberate absence. It covered two of six. Feeding
   each producer's exported verdicts to its own matcher bucket proved all four
   remaining matchers hear nothing their producer can say.

3. **A sentinel that made its own header's mistake** (`deca7dab`).
   `heroTruthNullState.test.ts` opens with *ASSERT THE BEHAVIOUR YOU CARE ABOUT,
   NOT AN IMPLEMENTATION STRING THAT HAPPENS TO CONTAIN IT* — and one assertion
   below pinned the entire ternary verbatim, including the defective non-null
   branch. It would have failed the correct repair. A guard that fails on a
   correct change is its own defect.

The file scoped by a prose sentence, the diagnosis stated rather than observed,
and the guard pinned to an implementation string are one failure wearing three
costumes.

---

## THE FOUNDER QUESTION THIS BLOCK RAISES

`b3ba465f` deliberately **rewires nothing**. Measured fact: no verdict any of
these four producers can emit is heard by any matcher that reads it.

| Producer | Emits | Matcher listens for |
|---|---|---|
| structure | HIGHER HIGHS / LOWER LOWS / ROTATING IN RANGE | bos, sweep |
| location | ABOVE / INSIDE / BELOW VALUE | athigh (vah, resistance), atlow |
| aggression | EFFORT ABSORBED/MATCHED/REWARDED, BUYERS/SELLERS PRESSING, TWO-SIDED | high, low |
| profile | TIGHT / DEFINED / BROAD VALUE | migrating |

Consequence: **SWEEP, BREAKOUT, LIQUIDITY_PROBE, ABSORPTION and VALUE_MIGRATION
cannot occur** for any market, on any venue, in any session — five of fourteen
chapters.

The mapping is a question about what those words MEAN in the market, not a
refactor:

- Should `EFFORT ABSORBED` trip the ABSORPTION chapter? (Closest to a real
  mapping — and "almost by definition" is the voice a fabrication uses.)
- Should `BUYERS/SELLERS PRESSING` count as `aggression.high`?
- Should `ABOVE VALUE` count as `location.atHigh`? (Price beyond the value area
  and price sitting ON a level are different facts; LIQUIDITY_PROBE wants the
  second.)
- `profile.migrating` is a **different case entirely**: migration is a claim
  about value MOVING, which needs two snapshots. The single-snapshot
  TIGHT/DEFINED/BROAD vocabulary cannot answer it at any wording.

Locked as dead, the way `rotation` already is. The lock and the unreachable-
chapter list fail together the moment either side moves.

---

## ALSO ESTABLISHED

- **CHoCH is a BUILD, not a wire-up.** It appears only in doc comments.
  `MarketStructureVM` has no BOS and no CHoCH field. Building it would also give
  `structure.bos` something real to hear.
- **`6dca05ae` (auction matchers) remains unproven live.** Structure now
  resolves on the deck, so the Auction dimension is worth re-checking.
- **`LIQUIDITY_SWEEP_LOOKBACK = 4`** is still unexplained. Naming it did not
  justify it. Deciding it is a separate atom, with the Founder in the room.

---

## METHOD NOTES

- **Every sentinel in this block was mutation-tested.** `33f994c4`'s mutation
  reproduced the live production sentence *verbatim* — the strongest available
  confirmation that a test reproduces the real defect rather than a rehearsal of
  it. `b3ba465f`'s mutation (`"higherhighs"` → `structure.bos`) failed exactly
  the two intended tests. `deca7dab`'s (revert the noun) failed exactly two.
- **A test can be silently vacuous.** One assertion in
  `structureNeedsNoVolume.test.ts` compared `.narrative`, a field that does not
  exist on `MarketStateDimension`. It PASSED — `undefined === undefined` — and
  only `tsc --noEmit` objected. A test policing the silence of unread fields was
  itself saying nothing.
- **My own new test used a wrong split point** and passed for the wrong reason.
  The production code was correct; the heuristic was not. Recorded inline where
  the next reader will hit it.
- **A single DOM snapshot can be mid-hydration.** Observed `len 3166` with every
  probe returning NOMATCH, and the hydrated truth moments later. Re-read before
  concluding anything from an empty match.

---

## GATES

Green, unpiped, at every commit. Final: `tsc --noEmit` clean;
`759 files, 9328 passed, 2 skipped`.

---

## STILL BLOCKED (unchanged, recorded honestly)

- **Gate 4 responsive device proof** — programmatic window resize does not take
  effect; `outerWidth` stays pinned.
- **`/journal` detail canvas** — 0 journal entries exist to open.
- **Level-2 depth family (Assets 08/19/20)** — behind a licensed depth provider.
- **Decision Memory sealing has zero production callers** — architectural.
  Surfaced, deliberately not rush-wired.
