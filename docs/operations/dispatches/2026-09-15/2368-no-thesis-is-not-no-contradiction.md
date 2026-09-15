# 2368 — "No thesis" is not "no contradiction"

**Commit:** `68d5bfb` · **Route:** `/command-deck` → Decision WHY / WHY NOT
**Gates:** 601 files / 7016 tests `VITEST_EXIT=0`; `TSC_EXIT=0`
**Class:** H1 shape 1 (fabricated absence) — the **Orkin nest** of dispatch 2367.

---

## How it was found

Dispatch 2367 sealed a law. This defect was found by immediately **using that law
as a scan** on the live screen rather than filing it and moving on.

The structured Data Fidelity tiles came back clean. A broader text scan of the
same page did not: the sentence

```
No active contradiction to the thesis.
```

rendered **twice**, as prose, in different DOM from the tile that had just been
fixed. Same overclaim, different clothes. That is the Orkin definition of a nest.

---

## The screen — captured BEFORE the cure deployed

Live read of `https://wealthymindsetspro.com/command-deck`, all 17 `<details>`
forced open, in the Founder's own session:

| Probe | Value |
|---|---|
| occurrences of the sentence | **2** |
| `N/8 dimensions resolved` on the same page | **`0/8`** |
| "No chapter resolved" present | **true** |
| computed colour of the sentence | **`rgb(157, 184, 138)`** — the affirmative green |

And the zoom capture shows the surrounding block, which is the real indictment:

```
CLEARED
No active contradiction to the thesis.
0/9 evidence nodes paid.
```

A column headed **CLEARED**. First line: a clearance WM did not earn. Second
line: `0/9` — an honest statement that **nothing at all had been paid**. The two
lines are four pixels apart and they contradict each other.

---

## Root cause — an OVERLOADED NULL

`selectOneStory.contradiction` returned the same `null` for two unrelated facts:

| The `null` meant | Is it a finding? |
|---|---|
| a thesis exists and nothing materially opposes it | **yes** |
| no thesis was ever resolved | **no** |

`selectDecisionWhyNot` then collapsed both into one affirmative sentence from a
bare `else`:

```ts
  if (oneStory.contradiction) {
    blockers.push({ kind: "CONTRADICTION", … });
  } else {
    clearances.push("No active contradiction to the thesis.");
  }
```

`clearances` is documented on `DecisionWhyVM` as
*"What IS satisfied — the affirmative side of the ledger."*

A contradiction **TO A THESIS** requires a thesis. `story.current` **is** the
resolved thesis; with `0/8` dimensions resolved there was none. The sentence was
therefore the absence of a **SUBJECT** reported as the absence of an
**OBJECTION** — and reported in the cleared column, in green.

Two prior laws converge here exactly:

- **H1 shape 1 hides in DEFAULT BRANCHES.** Nobody reads a bare `else` looking
  for a claim. This is the third default branch to fall in this block.
- **A contradiction requires two determinations to disagree** (dispatch 2367).
  This is the same law one layer up the stack: 2367 governed the *count*, 2368
  governs the *sentence*.

---

## The cure — split the null

`OneStoryVM` gains a second, non-overloaded output:

```ts
readonly contradictionDetectability: ContradictionDetectability;
//   "COMPARABLE"          a thesis exists; an objection WOULD have been visible
//   "NOTHING_TO_COMPARE"  no thesis resolved; nothing COULD have opposed one
```

The vocabulary is deliberately imported from
`canonicalMarketState.ContradictionDetectability` so WM has **one word** for this
idea rather than a synonym per surface. The clearance is then gated:

| `contradiction` | detectability | Renders in CLEARED |
|---|---|---|
| a string | any | nothing — it becomes a `CONTRADICTION` **blocker** |
| `null` | `COMPARABLE` | the sentence (an earned finding) |
| `null` | `NOTHING_TO_COMPARE` | **nothing at all** |

Under `NOTHING_TO_COMPARE` the honest output is **silence**, not a rephrased
disclosure. The surrounding panel already says *"No chapter resolved … (0/8
dimensions resolved)"*. A second sentence restating that would be noise, and the
cure for an overclaim is never more prose. The ledger simply does not get to
count a clearance it never earned.

---

## LABEL-NOT-MODEL

No new contradiction detectors. No changed market computation. No invented
number. The only thing that changed is which sentences WM is entitled to print.

---

## Over-corrections GUARDED, not merely avoided

Five of the ten Sentinels exist only to stop the cure becoming its own defect:

1. **A REAL thesis with nothing opposing it STILL earns the clearance.** Making
   the sentence permanently unprintable would discard a genuine finding the
   moment WM starts resolving dimensions.
2. **An observed contradiction is still a `CONTRADICTION` blocker even when
   detectability says `NOTHING_TO_COMPARE`.** Finding one *proves* something was
   comparable; a denominator claim can never suppress an observation. Same guard
   as 2367.
3. **The `"N/M evidence nodes paid."` clearance is untouched** — it states its
   denominator, so it was never lying. `0/9` was the honest line on that screen.
4. **The `contradiction` field is not deleted** from the VM.
5. **A source-level lock** asserts the gate exists and that no unguarded
   `else { clearances.push("No active contradiction…` returns. Every behavioural
   test would still pass on a `COMPARABLE` fixture if a refactor restored the
   default branch — so behaviour alone cannot hold this line.

---

## REVIVE §22 (Orkin)

The bare `else` was reinstated **via the Edit tool only**:

| Check | Result |
|---|---|
| `tsc --noEmit` on the REVIVED defect | **`TSC_EXIT=0`** — it compiles clean |
| Sentinel outcome | **`VITEST_EXIT=1`** (2 failed / 8 passed) |
| Failing tests, by name | `× THE DEFECT: with NO thesis resolved, the clearance sentence is ABSENT`<br>`× THE DEFECT: the clearance is not pushed from a bare 'else'` |
| Restore | byte-identical; full gates re-green at 601/7016 + `TSC_EXIT=0` |

**The revived defect compiled.** `null` is a perfectly well-typed value for both
meanings — which is exactly why an overloaded null is invisible to a type system
and must be split in the *domain*, not the *type checker*.

---

## Live verification — PROVEN, and the observation DISCRIMINATES

Deploy arrived on poll 8 (chunkset `a67b6ff4…` → `92b85bc1…`). Per the law
sealed on `9b2c185`, the digest was **not** accepted as proof — the page was
re-read.

| Probe | Before | After |
|---|---|---|
| occurrences of *"No active contradiction to the thesis."* | **2** | **0** |
| `N/8 dimensions resolved` | `0/8` | `0/8` — **unchanged** |
| "No chapter resolved" present | true | true — **unchanged** |
| `0/9 evidence nodes paid.` | present, `rgb(157, 184, 138)` | **present, same colour** |

The two unchanged rows are what make this discriminate: the condition under
test did not move, only the sentence did. The fourth row is over-correction
guard #3 confirmed **live**, not merely in a Sentinel — the clearance that
states its denominator was not collateral damage.

Same route, same session, same screen region:

```
BEFORE                                      AFTER
CLEARED                                     CLEARED
No active contradiction to the thesis.      0/9 evidence nodes paid.
0/9 evidence nodes paid.
```

---

## Method lesson sealed

> **An overloaded null is a defect generator.**
> When one `null` carries two meanings, every consumer must guess which one it
> holds — and consumers guess in favour of the affirmative reading, because the
> affirmative reading is the one that needs no extra code. Splitting the null is
> not a refactor; it is the fix. The `else` branch was only the place the guess
> became visible.

Corollary, joining the denominator law from 2367:

> Every affirmative sentence must be able to name the thing it is affirming
> **about**. A count must state its denominator; a clearance must state its
> subject.
