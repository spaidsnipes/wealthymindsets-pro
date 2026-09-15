# Baton — ABSENCE IS NOT ZERO

**Sealed:** 2026-09-15 · **Block:** eleven commits, nine defects, one law
**Law:** H1 — *absence is not zero* · LABEL-NOT-MODEL · canon §9

---

## What this block was

One law, applied four times, in four rooms, in four different disguises.

Every defect in this block had the same skeleton: **WM computed something
truthful about nothing, and then rendered it as though it were something.** The
arithmetic was correct every single time. The label was wrong every single time.

That is why no selector was modified in this entire block. Not one. The cure
was always at the render layer, and that is not a coincidence — it is the
diagnosis.

---

## The ledger

| # | Commit | Room | The disguise |
|---|---|---|---|
| 1 | `ce90890` | `/command-deck` | Opening Bell items hardcoded `completed: false` — an accusation built from zero observation |
| 2 | `b326282` | `/morning-prep` | The same panel fabricating BOTH a NOT DONE *and* a DONE stamped with a completion time |
| 3 | `42b4106` | `/command-deck` | Prep evidence gated on `chainVm` — an unobserved MARKET silencing an observable fact about the PERSON |
| 4 | `5233fa6` | `/journal` | `+$0.00` in the GREEN tint on an empty book, beside a chip reading "no trades taken" |
| 5 | `e714b04` | `/paper` | A 👑 crown and "🎉 prize zone" for ranking #1 in a field containing only the trader |
| 6 | `2c624f9` | `/paper` | `+0.0%` and `+$0` in the GREEN tint on a row reading `TRADES 0`, three cells from the `—` that WIN% gets right |
| 7 | `6635859` | `/paper` | `DAY P&L +$0.00` · `REALIZED +$0.00` · `+0.00 today (0.00%)`, all GREEN, in the account header of a book holding zero trades and zero positions |
| 8 | `9bc3844` | `/command-deck` | `MirrorPanel` gated on `chainVm` — an unobserved MARKET erasing the trader's own reflection, **eight lines below the comment that diagnoses this exact coupling** |
| 9 | `121b27a` | `/command-deck` | The Steward verdict gated on `chainVm` while dereferencing only `permission` — and the whole **Deep read container** gated with it, erasing every sibling that never needed the market |
| 10 | `fa49aee` | `/command-deck` | **Found by LOOKING, not by grep** — in the screenshot taken to verify `121b27a`. The chain's `PERMISSION` row read *"No trader rules configured"* 140px above the Steward reading `RESTRICTED · 2/8 engaged`. Two answers to one question, on one screen |
| 13 | `68d5bfb` | `/command-deck` | **The Orkin NEST of #12** — found by using the law #12 sealed as a *scan* of the live screen instead of filing it. The sentence *"No active contradiction to the thesis."* rendered **twice**, in `rgb(157, 184, 138)` (affirmative green), under a column headed **CLEARED**, directly above the line `0/9 evidence nodes paid.` — on a page reading `0/8 dimensions resolved`. Root cause is an **overloaded null**: `selectOneStory.contradiction` returned the same `null` for *"a thesis exists and nothing opposes it"* and *"no thesis was ever resolved"*, and a bare `else` converted both into an earned clearance. A contradiction TO A THESIS requires a thesis |
| 12 | `9b2c185` | `/command-deck` | **Found by LOOKING, in the very screenshot taken to prove #11 cured.** `CONTRADICTIONS 0` in the OK tone, four pixels from `UNKNOWNS 8` in the watch tone — read as a pair: *WM determined very little, and found no disagreement in what it determined.* All eight dimensions hard-code `contradictions: []`, the only reachable producer is one condition in `chartMarketStatePublisher.ts:212`, and the same panel read `0/8 dimensions resolved`. A contradiction requires **two determinations to disagree**; there were not two. The tile was rendering arithmetic about an empty set as evidence of coherence |
| 11 | `2092da4` | `/command-deck` + `/nectar/[symbol]` | **Also found by LOOKING** — same screenshot. `GAPS 0` in the OK tone, and `Gaps  None` on the detail route. Every adapter declares `sequenceState: "UNAVAILABLE"`, so `SEQUENCE_GAP` is unreachable and `gapCount` is pinned at 0 **by construction**. Both screens reported the absence of a DETECTOR as the absence of GAPS. And `canClaimRetainedCoverage` rested a rights claim on `gapCount === 0` — a condition that could never fail |

Receipts: `3088369`, `c5d6435`, `98a7f30`, `3a65192`, `41fc71f`
(dispatches `2358`, `2359`, `2360`, `2361`, `2362`, `2363`, `2364`, `2365`).

**#10 and #11 are the ones that change how the rest of this block should be
read.** Nine were found by searching source. The last two could not have been: *nothing is wrong
in any single file.* `selectDecisionChain` was correct. `composeMarketCanvasVM`
was correct. `/command-deck` was correct. The contradiction existed only in the
viewport where two correct files rendered together — and it survived every prior
sweep of this exact page for that reason.

It was the Founder's standing instruction to verify visually after each
breakthrough that produced it. The screenshot taken to *close* one atom *opened*
another.

---

## The four shapes H1 wore

Worth naming separately, because the next one will wear a fifth.

1. **Fabricated absence** — rendering "not done" from having never looked.
   *A false NOT DONE can be argued with. A false DONE is a record of something
   the trader never did, wearing a timestamp.*

2. **Structural H1** — an unobserved fact in one domain silencing an observable
   fact in an unrelated domain. The deck told the trader nothing about their own
   prep because the *market* was unreadable — and an unresolved market is
   exactly when PREPARATION matters most, so the panel vanished precisely when
   it was most useful.

3. **Chromatic H1** — colour is a claim. Green asserts money was made. `0 >= 0`
   is true, so every `>= 0 ? green : red` will congratulate a trader for a day
   they did not trade.

4. **Population H1** — rank, percentile, streak and podium are claims about a
   SET. Being 1st of 1 is arithmetically true and a complete fabrication as an
   achievement.

---

**A note on the fifth shape.** This section predicted the next defect would
wear a fifth disguise. It did not — and then it did not again, twice.

`2c624f9` wore the **third** (chromatic) in a room the block had already
visited and fixed. `6635859` wore the **third again**, in a third room on that
same page. `9bc3844` wore the **second** (structural), in the room where the
second shape was first named and cured. `121b27a` wore the **second again**,
in a third room on that same page — and doubled, since the container carried
the same defect as its child.

Nine defects, four shapes, and the last four were all repeats. The prediction
was wrong in an instructive direction: **a shape does not retire when you name
it, and the surface you just cured is not thereby clean.** Left uncorrected
above, corrected here.

The structural shape now has a **sub-shape worth naming separately**, because
it is the one a panel-by-panel audit nearly misses:

> **Gate the dereference, never the container.**
> A container gated on one child's input erases every sibling that never
> needed it — silently, because a missing container leaves nothing behind to
> explain itself. Every child that needs an input should declare it itself.

---

## Method lessons that cost something to learn

**Read the receipt.** `2c624f9` was found *inside the screenshot taken to
prove `e714b04`*. The crown was gone and the row underneath it read
`+0.0%` / `+$0` in `rgb(0, 212, 170)` on a book with zero trades. The image
you capture to close one atom is also a fresh, unfiltered look at a surface
you have stopped assuming things about. Two of the last three defects in this
block were found in the act of verifying the previous one.

**A comment guards the cell it sits on and nothing else.** The WIN% column had
the entire diagnosis written above it — *"Colouring 'no closed trades yet' as
failure is the same overclaim as printing 0%"* — and the two cells three
columns to its left shipped that exact overclaim anyway, in the same row, off
the same record. That is the argument for Sentinels over comments, made by the
codebase without being asked.

**The neighbour rule, stated properly.** Three times in this block a defect
was found beside an element that already handled absence correctly — the WR
chip beside the P&L chip, the Win% column beside the rank badge, the Win% cell
beside its own row's RETURN. When one element on a surface gets absence right
and its neighbour does not, that is not reassurance. Somebody already thought
about this here and stopped at the cell they were working on. **Look at the
whole row.**

**Gate the dereference, never the container.** Defect #9's second half. The
"Deep read" drawer was gated on `chainVm` because three of its eight children
need it — and those three already declare it themselves. The gate deleted the
five that never did. Worse, a missing container leaves nothing behind to
explain itself: the note inside, written because *"a trader who opens Deep read
and finds 1 then 4 has no way to tell a refusal from a bug,"* could not reach
one level up to the container it was sitting in. **A refusal with no note
attached is the failure that note exists to prevent.**

**The selector can be right while the screen is wrong.** Every evaluator in
`selectPermission` degrades honestly with no market — *"Cannot evaluate —
conservative R unresolved"*, *"No CLC evaluation available."* — and the
data-quality rule engages by name with the state spelled out, `UNAVAILABLE`.
The compiler even carries an explicit null-chain path so `permission` is always
defined. All of that correctness was thrown away by one conjunct at the render
layer. **Reading the selector is how you find out the render layer is lying;
it is not evidence that the screen is honest.**

**Sentinel the over-corrections — twice in a row is a pattern, not a
precaution.** Both `e714b04` and `2c624f9` needed guards against the two wrong
fixes (delete the honest half; fake the population / mute everything). This is
now the assumed shape of a Sentinel set, not an extra.


**Deploy identity is not observation.** A poll for a literal string returned
`FOUND on poll 1` seconds after a push — impossible for a Cloudflare build. The
string had shipped in a *previous* commit. The reliable proxy is **chunkset
identity** (md5 of the route's sorted chunk URLs, polled until it CHANGES) — and
even that only proves a build arrived, never that the pixel is right.

**The strongest finding of the block came after the tests were green.** From
dispatch `2358`:

> The unit tests were green, the Sentinels were green, the component was
> correct, and the panel still was not on the screen.

Defect #3 exists only because someone opened the page. Live verification is a
step, not a formality.

**A Sentinel can pin syntax rather than intent.** `dataQuality: coverageQuality`
broke on a correct refactor to `dataQuality={coverageQuality}`. Update the
assertion *and write down why it moved* — "I updated the failing test" is
exactly the sentence a weakened Sentinel hides behind.

**Guard on the owner's own counters.** The empty-book branch reads
`recordedTotal.counted === 0 && recordedTotal.unreadable === 0`, and the
leaderboard reads `board.length > 1`. Never a second, independent notion of
"empty" — it will drift away from the thing it describes. If the world changes,
these guards re-light on their own.

**Sentinel the over-corrections too.** Two of the six on `e714b04` guard against
deleting the honest half and against inventing opponents. A set that only
forbids the defect leaves both wrong fixes wide open.

**A screen that looks right is not a screen that proves you right.** On
`121b27a` the deck rendered every sentence the fix was written to restore — and
the observation still proved nothing about the fix, because `chainVm` was
non-null on that load and the same pixels would have appeared before the
commit. The trap was a **banner that reads the same in two different states**:
`MARKET STATE UNKNOWN · 0/8 dimensions resolved` is a *non-null* state with
nothing resolved, while the gates keyed on `state === null`. I had written the
two as the same condition in the receipt, and the screenshot is what exposed it.

So: **before calling an observation a proof, name the variable the fix keys on
and show that variable took the value under test.** "The page looks right"
answers a different question. Where the condition cannot be reached honestly,
say the claim is Sentinel-proven and stop — do not manufacture the condition to
photograph it, which would be this block's own sin wearing a lab coat.

`fa49aee` is the counter-example that makes the rule usable rather than
paralysing. There the variable under test — the chain's permission node — *did*
take the pre-fix value in the Founder's live session. Before: `PERMISSION ·
NOT_EVALUATED / "No trader rules configured"`. After: `PERMISSION · RESTRICTED /
"Your rule says Trustworthy market data required."`, identical to the Steward
below it. Same route, same session, same screen region, both values observed.
**PROVEN**, and nothing had to be withheld. The discipline is not "never claim
proof" — it is "name the variable first, then look."

**The fallback narrates the INPUT, never the world.** `permission === null` in
`selectDecisionChain` means exactly one thing: no `permissionInputs` were handed
to that selector. It is not evidence about whether the trader configured rules,
and the selector has no way to find out. It said *"No trader rules configured"*
anyway — reaching past its own inputs to assert a state of the world it had not
observed. Every sibling link in the same chain already got this right and is
true by construction: *"No proposed setup — Available R not evaluated."*, *"No
CLC evaluation available."*, *"No open position — management not active."* Each
names its missing INPUT. Only permission named the WORLD. This is H1 shape 1
(fabricated absence) hiding inside a fallback string, and fallbacks are where it
will keep hiding, because nobody reads a default branch looking for a claim.

**Two computations of one value on one page is the defect, not the symptom.**
The contradiction was not fixed by correcting the wrong string — that would have
left two rival writers one refactor away from disagreeing again. The deck now
feeds the chain, and the compiler **reads** `chain?.permission` instead of
deriving its own. canon §Single-Writer / Many-Readers. The `??` fallback is not
dead code (`/journal` detail has no chain), and a Sentinel forbids deleting it.

**Sentinels must check the INVARIANT, not one spelling.** Two existing Sentinels
failed on `fa49aee`, and both were right to. The single-writer breadcrumb
forbade `/command-deck` importing from `selectPermission` — honored by
re-exporting `defaultFounderRules` from the compiler rather than routing around
the rule. Sentinel #4 from `121b27a` demanded the literal `const permission:
PermissionVM = selectPermission(` and failed on the `??` refactor; `2364` had
written that this exact change must force a RE-ARGUMENT, so it was re-argued in
the test file and the assertion broadened to what actually matters — the
non-nullable annotation, a reachable fallback, and not-inside-`if (chain)`.

> **A Sentinel that fails on correct refactors is a Sentinel that gets deleted.**

**The cure ships in ONE component.** `OpeningBellEvidence` exists because the
defect was found twice, in two rooms, and the second copy had mutated further
from the truth. Non-forkable wording cannot rot on one screen while looking
healthy on the other. `describeGapCoverage` (`2092da4`) is the same law applied
to a *claim* rather than a component: two surfaces, one writer.

**A contradiction requires TWO determinations to disagree.** Below that
threshold a contradiction count is not a measurement of the world — it is a
measurement of how little was measured. Defect #12 rendered `CONTRADICTIONS 0`
in the affirmative tone on a packet where `0/8` dimensions were resolved. The
law generalises past this one cell: **every count rendered in an affirmative
tone must be able to state its denominator.** If it cannot name what it
compared, it is not reporting a finding — it is reporting the absence of a
detector.

**A disclosure sentence is the one sentence on the screen whose entire job is to
be read and believed.** `36ee7d9` fixed *"1 of 1 channel stamp no usable
sequence"* — subject and verb pluralising in opposite directions, so one `s`
could not serve both. That is not cosmetic: broken grammar is exactly what makes
a reader skim, which would have quietly returned the screen to the state
`2092da4` was shipped to fix. The Sentinel locks agreement in BOTH directions so
the next edit cannot fix the singular by breaking the plural.

**An overloaded null is a defect generator.** When one `null` carries two
meanings, every consumer must GUESS which one it holds — and consumers guess in
favour of the affirmative reading, because the affirmative reading is the one
that needs no extra code. Defect #13's `contradiction: null` meant both *"a
thesis exists and nothing opposes it"* and *"no thesis was ever resolved"*;
`selectDecisionWhyNot` guessed the first and printed a clearance in green under
a column headed CLEARED. Splitting the null is not a refactor, it is the fix —
the `else` branch was only the place the guess became visible. Note the revived
form **compiled clean**: `null` is perfectly well-typed for both meanings, which
is exactly why this class is invisible to a type system and must be split in the
DOMAIN rather than the checker.

Joined to the denominator law above, the general form is: **every affirmative
sentence must be able to name the thing it is affirming ABOUT.** A count must
state its denominator; a clearance must state its subject.

**H1 shape 1 hides in DEFAULT BRANCHES.** *Nobody reads a fallback looking for a
claim.* Defect #11 lived in a `?:` on one screen and a `reduce` on another —
both of which looked like arithmetic, not assertion. When hunting fabricated
absence, read the `else`, the `??`, the `: "None"`, the `|| 0`. That is where a
sentence about the world gets written by someone who thought they were writing a
default.

**A condition that cannot fail is not a requirement.** `canClaimRetainedCoverage`
listed `gapCount === 0` among its conjuncts. It read as diligence. It was
unreachable-by-construction and therefore *always satisfied* — decoration
wearing the costume of a safety check. When auditing any predicate that grants a
right, ask of **every** clause: *can this ever be false in production?* If not,
the predicate is weaker than it looks, and the weakest clause is the one nobody
audits.

**You cannot add a real zero to an unknown and get a real zero.** Aggregation
launders provenance. `describeGapCoverageTotal` returns `measured: false` if any
single channel is unmeasurable, because a total is a claim about all of its
inputs. Any sum, average or count displayed across heterogeneous sources inherits
the *worst* evidence quality in the set, never the best.

**`undefined` must mean UNKNOWN, never zero.** `unsequencedEventCount` is
optional on purpose. A summary restored from an older persisted schema genuinely
does not know what it looked at; defaulting it to `0` would re-assert the exact
claim the field exists to stop making. Every `?? 0` on a persisted field is a
candidate H1 — the one in `observeChannel` survived only because it is annotated
with why it is safe *there and only there*.

---

## Gates at seal

```
Test Files  597 passed (597)
Tests       6972 passed (6972)
VITEST_EXIT=0
TSC_EXIT=0
```

Test count across the block:
6935 → 6936 → 6938 → 6944 → 6950 → 6957 → 6964 → 6972.

REVIVE §22 proven **by name** on every code fix, via the Edit tool only, each
file restored byte-identical.

**And the revive itself got stronger at the end of the block.** On `121b27a`
both gates were reinstated *complete with their closing parens*, so the revived
file was a fully compilable defect — `tsc --noEmit` returned **exit 0** on it.
The type checker had nothing to say; only the Sentinels caught it.

> A revive that does not compile proves the Sentinel matches a string.
> A revive that compiles cleanly proves the Sentinel is the **only** thing
> standing between the codebase and the defect returning.

That is the form to use from now on. It costs two extra edits.

---

## Live status — honest

| Commit | Status |
|---|---|
| `b326282` | **PROVEN** — observed on `/morning-prep` |
| `42b4106` | **PROVEN** — observed on `/command-deck`, PREP phase, with the deck simultaneously reading MARKET STATE UNKNOWN (the exact condition that used to erase it) |
| `5233fa6` | **PROVEN** — observed on `/journal`, empty book, zero `$0.00` spans on the page |
| `e714b04` | **PARTIALLY PROVEN** — the podium half observed on `/paper` (row `1 · You ⭐ · +0.0% · +$0 · 0 · —`, no 👑 in the row's `outerHTML`; the remaining crown is the external contest's prize-tier legend, checked not assumed). The `NO FIELD TO RANK AGAINST` callout is gated on `myTrades > 0` and the Founder's book reads `Blotter (0)` — **not observable today, therefore not claimed.** |
| `2c624f9` | **PROVEN** — observed on `/paper`. The row reads `1 · You ⭐ · — · — · 0 · —` with RETURN and P&L both computing `rgb(139, 149, 165)`; no `+0.0%` anywhere on the page. The surviving green span in the row is the `You ⭐` identity marker (`isMe ? green`), checked not assumed. |
| `6635859` | **PROVEN** — observed on `/paper`. `DAY P&L —` and `REALIZED —` both `rgb(139, 149, 165)`; `EQUITY $100,000` and `CASH $100,000` untouched; the equity card reads *"No trades placed — nothing to measure yet"*. A scan for leaf nodes matching `^[+-]?\$?0\.00$` returns **0**. |
| `121b27a` | **SPLIT — half PROVEN, half honestly withheld.** Observed on `/command-deck` with a screenshot: section `4 STEWARD · RULES VERDICT` renders, verdict `STEWARD RULES · RESTRICTED`, headline *"Your rule says Trustworthy market data required."*, `HARD` row *Market data quality is UNAVAILABLE — below your declared floor*, `2/8 engaged · phase: preparation`, Story Ribbon *"Market state cannot be resolved yet."* — **PROVEN.** But the observation **does not discriminate the fix**: the Decision Chain rows are rendering, so `chainVm` is non-null on this load, and the same screen would have appeared before the commit. I had written that `MARKET STATE UNKNOWN · 0/8 dimensions` was the condition under test; **it is not.** That banner is a non-null `state` with nothing resolved. The gates keyed on `state === null`. Corrected in `2364` rather than left standing. The drawer-survives-null claim is **Sentinel-proven (compilable REVIVE, `TSC_EXIT=0`, caught by name), not live-observed.** |
| `9bc3844` | **CURE NOT OBSERVABLE — not claimed. One over-correction guard PROVEN.** The deck was driven to `Phase: Review` with the page simultaneously reading `MARKET STATE UNKNOWN` (0/8 dimensions resolved) — the exact intersection under test — and **no empty frame appeared**. That proves the self-silencing the ungating depends on, live. It does *not* prove the gate was removed: `MirrorPanel` returns null at zero patterns and the Founder has no decisions, so the panel is absent under old and new code alike. |
| `fa49aee` | **PROVEN — and the observation DISCRIMINATES.** Unlike `121b27a`, the Founder's live session genuinely exhibited the pre-fix value of the variable under test. **Before** (the screenshot taken to verify `121b27a`, same route, same session, same screen region): `! PERMISSION  NOT_EVALUATED / "No trader rules configured — Permission not evaluated."` ~140px above `STEWARD RULES · RESTRICTED / 2/8 engaged · phase: preparation`. **After** the deploy landed (chunkset `3a940611…` → `864359fe…`), all `<details>` forced open: the string `"No trader rules configured"` is **absent from the page**; the chain row reads `! PERMISSION  RESTRICTED / "Your rule says Trustworthy market data required."` and now carries the rule chips it never had — `HARD: Trustworthy market data req…` `SOFT: CLC setup evidence required`; the Steward four rows below reads `STEWARD RULES · RESTRICTED / "Your rule says Trustworthy market data required." / 2/8 engaged · phase: preparation`. **Both rows, one screen, the same sentence.** No page error. Screenshot captured. |
| `2092da4` | **PROVEN — and the observation DISCRIMINATES.** `599 files / 6995 tests VITEST_EXIT=0`, `TSC_EXIT=0`. REVIVE §22: all four defect halves reintroduced via Edit in compilable form (`TSC_EXIT=0` **on the revived defect** — a type system would not have caught this), five Sentinels failed **BY NAME**, then restored byte-identical. Deploy confirmed behaviourally (chunkset `864359fe…` → `2c427f05…`, poll 6). Observed on `/command-deck` in the Founder's session, all 17 `<details>` forced open: `GAPS` renders **`n/a`** in **`rgb(138, 130, 113)`** (the dim token) where it previously read `0` in the OK tone, carrying the explanatory `title`; and `/Gaps\s*None/i` is **absent from the page body**. Zoom screenshot captured — `OBSERVED 38273` bright beside `GAPS n/a` dim is exactly the design intent: a number WM measured, versus a claim it cannot make. |
| `36ee7d9` | **PROVEN.** Grammar of the gap disclosure sentence. `599 files / 6996 tests VITEST_EXIT=0`, `TSC_EXIT=0`. Re-observed live on `/command-deck`: the `title` now reads verbatim *"1 of 1 channel **stamps** no usable sequence, so gaps cannot be detected there. Zero gaps observed is not evidence of zero gaps."* The Sentinel locks subject–verb agreement in BOTH directions, so the next edit cannot fix the singular by breaking the plural. |
| `9b2c185` | **PROVEN — and the observation DISCRIMINATES.** `600 files / 7006 tests VITEST_EXIT=0`, `TSC_EXIT=0`. REVIVE §22: the raw `String(state.contradictions.length)` reinstated via Edit **compiled clean** (`TSC_EXIT=0` — a type system would never have caught this) and the Sentinel *"THE DEFECT: /command-deck routes CONTRADICTIONS through the claim compiler"* failed **BY NAME**; restored byte-identical. **Before** (captured live in the Founder's session while the cure was still in flight): `CONTRADICTIONS 0` in `rgb(237, 230, 211)`, the bright OK tone, four pixels from `UNKNOWNS 8` in amber — the defect and its already-cured neighbour `GAPS n/a` in one image. **After** the deploy landed (chunkset `6338ad87…` → `a67b6ff4…`, poll 4; the first chunkset change had proved to be `36ee7d9`, **not** this commit, and the tile was re-read to establish that rather than assumed): the same tile reads **`n/a`** in **`rgb(138, 130, 113)`**, carrying the `title` *"WM has resolved nothing yet, so there is nothing that could contradict anything. Zero contradictions here is not evidence of agreement."* Same route, same session, same screen region. Zoom screenshot captured: `COVERAGE 1 ch` / `UNKNOWNS 8` amber / `CONTRADICTIONS n/a` dim / `OBSERVED 38273` bright / `GAPS n/a` dim. |
| `68d5bfb` | **PROVEN — and the observation DISCRIMINATES.** `601 files / 7016 tests VITEST_EXIT=0`, `TSC_EXIT=0`. REVIVE §22: the bare `else` reinstated via Edit **compiled clean** (`TSC_EXIT=0` — `null` is well-typed for both meanings, which is precisely why an overloaded null is invisible to a checker) and **two** Sentinels failed **BY NAME** — *"THE DEFECT: with NO thesis resolved, the clearance sentence is ABSENT"* and *"THE DEFECT: the clearance is not pushed from a bare `else`"*; restored byte-identical, gates re-green. **Before** — captured live on `/command-deck` in the Founder's session with all 17 `<details>` forced open, BEFORE this deploy landed: the sentence *"No active contradiction to the thesis."* occurs **2×**, computed colour **`rgb(157, 184, 138)`** (affirmative green), while the same page reads `0/8 dimensions resolved` and *"No chapter resolved"*. Zoom screenshot captured showing the block verbatim: `CLEARED` / *"No active contradiction to the thesis."* / `0/9 evidence nodes paid.` — an unearned clearance stacked directly on the honest line that says nothing was paid. **After** the deploy landed (chunkset `a67b6ff4…` → `92b85bc1…`, poll 8) — and read from the PIXEL, not the digest, per the law sealed on `9b2c185`: the sentence occurs **0×** on the page, while `0/8 dimensions resolved` and *"No chapter resolved"* **still render** (the condition under test is unchanged, so the observation DISCRIMINATES) and `0/9 evidence nodes paid.` is **still present in `rgb(157, 184, 138)`** — over-correction guard #3 confirmed LIVE, not merely in a Sentinel. Zoom screenshots of both states, same route, same session, same screen region:<br>**before** `CLEARED` / *"No active contradiction to the thesis."* / `0/9 evidence nodes paid.`<br>**after** `CLEARED` / `0/9 evidence nodes paid.`<br>The unearned clearance is gone; the one that states its denominator survives untouched. |

---

## Open, carried forward

**Found while verifying, deliberately not rushed:**

- The Opening Bell region on `/command-deck` sits inside
  `<details class="wm-cd-secondary-workspace">`, **closed by default**. Nothing
  false is on screen — it is a placement question. During PREPARATION, the panel
  that answers "am I prepared" is one collapsed disclosure away. Where it
  belongs is a canon call.
- ~~`src/app/command-deck/page.tsx` still has six other `chainVm &&` gates,
  including MirrorPanel.~~ **CLOSED as defect #8 (`9bc3844`).** It *was* the
  same nest in a sibling slot: `selectMirror` was read end to end and touches
  market state at no depth.
- ~~Five `chainVm &&` gates remain — 1617, 1667, 1679, 1707, 1713 — each needs
  the same question asked individually.~~ **CLOSED as defect #9 (`121b27a`).**
  The audit was run panel by panel and split **three correct / two spurious**:

  | Line | Panel | Verdict |
  |---|---|---|
  | 1667 | `DLARStrip` | `dlar={chainVm.dlar}` — **correct, kept** |
  | 1679 | `DecisionChainPanel` | `vm={chainVm}` — **correct, kept** |
  | 1707 | `StructureContextNote` | `vm={chainVm}` — **correct, kept** |
  | 1846 | `ATHOSInterventionPanel` | compiled *with* `chainVm` — **correct, kept, Sentinel-required** |
  | 1713 | Steward · Rules Verdict | **spurious — removed** |
  | 1617 | the Deep read container | **spurious — removed** |

  **Three of the five were right.** Any sweep that treated them as a class
  would have been wrong either way round — stripping all five crashes the page,
  keeping all five keeps the defect. That is the argument for the
  panel-by-panel rule, made by the codebase.

  **Zero `chainVm &&` gates now remain unaudited on `/command-deck`.**

**Swept clean this block (recorded, not manufactured into atoms):**

- Streak badges on `/morning-prep` and `/journal` — already silent at zero, and
  they disclose unreadable records separately from a genuine zero.
- `/creator` — `CREATORS` is empty and the page already says *"No creator
  earnings have been verified and published yet."*
- Eleven of the twelve green-tint sites — legitimate; a scratched trade really
  is a flat result.
- **The shape-4 population sweep specified in `2360`/`2361` was run and came
  back clean.** `src/app` + `src/components`, pattern
  `percentile | findIndex(…isMe) | streak | rank | leaderboard | top N`, asking
  each hit *"what is the population, and did we observe it?"*:
  `/tv` carries an explicit *"No fabricated leaderboards"* comment; `/paper`
  `RANK_BADGES` and `myRank` already carry the cure and its docblock; MainChart
  "Percentile Rank" is a technical indicator computed over observed price bars —
  a **genuine** population, not an unobserved one; the education hits are quiz
  prose. **Zero new defects.** Recorded as a swept-clean result. A sweep that
  finds nothing is a finding; inventing an atom to justify the sweep would be
  the same fabrication this block exists to remove.

**Still blocked, untouched, do not retry:**

- Gate 4 responsive device proof — programmatic window resize does not take
  effect, `outerWidth` pinned. Script route classifier-denied.
- `/journal` detail canvas — 0 journal entries in the Founder's book.
- Delta + VP raster half — no per-trade tape available.
- Decision Memory sealing — zero production callers. **Architectural. Surface
  it; do not rush-wire it to close a gate. It needs a decision surface first.**
- `executionConnectivity` orphaned — not a live defect; `/readiness` discloses
  it honestly.

---

## The next sweep, already specified

Ask of every ranking, streak, badge, percentile and podium on the product:
**what is the population, and did we observe it?**

Grep targets: `.findIndex(… isMe)`, `top N`, `percentile`, `rank`, and any
surface whose population is the trader alone.
