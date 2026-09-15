# 2366 — Zero gaps is not zero gaps

**Commit:** `2092da4`
**Predecessor receipt:** `2365-two-answers-to-one-question.md` (`fa49aee` / `8917a69`)
**Defect #:** 11
**Found by:** LOOKING. Same screenshot that proved `fa49aee`.

---

## The screen

The DATA FIDELITY strip on `/command-deck` read:

```
LAST EVENT  28.8d     OBSERVED  …     GAPS  0     CONTRADICTIONS  0     UNKNOWNS  8
```

`GAPS 0` in the OK tone. On `/nectar/[symbol]`, the channel receipts read
`Gaps  None`, also in the OK tone.

Nothing on either screen was formatted wrong. Nothing in any single file was
wrong. The sentence was false anyway.

---

## Root cause — the full chain

Neither surface could ever have printed anything else.

1. **Every shipped adapter declares `sequenceState: "UNAVAILABLE"`.** Verified
   cold in all four: `alpacaRelay.ts:73`, `binanceUs.ts:69`,
   `webullTicksBrowser.ts:78`, `coinbase.ts:68`.
2. **`MarketEventGuard`** (`marketEvent.ts:171-201`) derives `numericSequence`
   only when `event.sequenceState !== "UNAVAILABLE"` — so it is always `null`.
3. `numericSequence == null` ⇒ the guard pushes **`SEQUENCE_UNAVAILABLE`**. The
   `SEQUENCE_GAP` branch is the `else` and is **unreachable in production**.
4. **`sessionNectar.ts:110`** forwarded only `SEQUENCE_GAP` to `observeChannel`
   and **dropped `SEQUENCE_UNAVAILABLE` on the floor.** This is the boundary
   where the distinction was destroyed.
5. `gapCount` is therefore **pinned at 0 by construction** — and both screens
   read that structural 0 as a measured 0.

**The guard already knew the difference.** It emits two distinct warnings
precisely because "we looked and found no gap" and "we had nothing to look at"
are different facts. The distinction was destroyed at ONE boundary, four layers
below the pixels that then asserted it.

Both surfaces were reporting **the absence of a DETECTOR as the absence of
GAPS.**

---

## The worse half — a rights predicate resting on it

`canClaimRetainedCoverage` used `gapCount === 0` as an **affirmative condition**
for claiming RETAINED coverage:

```ts
coverage.memoryState === "RETAINED" &&
coverage.persistenceRight === "ALLOWED" &&
coverage.observedFrom != null &&
coverage.observedThrough != null &&
coverage.gapCount === 0;          // ← always true in production
```

That was the weakest condition in the predicate: unreachable-by-construction and
therefore **always satisfied**. It looked like a safety check and carried no
weight at all.

> **A condition that cannot fail is not a requirement.**

It now demands `gaps.measured` — the gap evidence must have been *possible to
collect*, not merely numerically zero.

---

## The cure — one function, two readers

`describeGapCoverage` / `describeGapCoverageTotal` in `coverageMap.ts` are the
**single writer** for every gap claim WM makes. Both surfaces read it, so the
wording cannot rot on one screen while looking healthy on the other.

New detectability ladder:

| detectability | when | `value` | `measured` | tone |
|---|---|---|---|---|
| `SEQUENCED` | every event carried a sequence | `"0"` or `"n"` | **true** | ok / warn |
| `PARTIAL` | some events unsequenced | `"0 of some"` | false | dim |
| `UNDETECTABLE` | no event carried a sequence | `"n/a"` | false | dim |
| `UNOBSERVED` | nothing observed yet | `"—"` | false | dim |
| `UNKNOWN` | field absent (legacy restore) | `"—"` | false | dim |

The `UNDETECTABLE` detail sentence — the one production will actually render:

> *This provider stamps no sequence on its events, so a gap cannot be detected
> here. Zero gaps observed is not evidence of zero gaps.*

**The fallback narrates the INPUT, never the world.** It says what WM had to
look at, not what is out there.

`tone="dim"` is not decoration — it is the visual form of "this is not a
measurement." The `title` carries the reason so the trader can find out *why* a
cell is dim rather than guessing it is a rendering bug.

---

## `undefined` means UNKNOWN, never zero

`unsequencedEventCount` is **deliberately OPTIONAL** on the schema.

A coverage summary restored from an older persisted schema genuinely does not
know what it looked at. Defaulting it to `0` would re-assert the exact claim the
field exists to stop making — H1 all over again, one layer down. `undefined`
reads as `UNKNOWN`, and `UNKNOWN` is not `measured`.

The one place `?? 0` is used is inside `observeChannel`, and it is annotated as
to why it is safe *there and only there*: we are about to add an observation we
witnessed ourselves.

---

## Aggregation

> **You cannot add a real zero to an unknown and get a real zero.**

`describeGapCoverageTotal` returns `measured: false` if **any** channel is
unmeasurable. The deck's GAPS tile is a total across channels; one undetectable
provider makes the whole total a non-claim.

---

## Over-corrections GUARDED, not merely avoided

Five Sentinels exist solely to fail if the cure overshoots:

1. **a real, measured gap is still reported as a number** — and still draws the
   eye (`warn: true`).
2. **a sequenced channel may still say zero, and say it plainly** — curing this
   by making every gap claim permanently unreadable would discard a real
   measurement the moment a provider starts supplying sequences.
3. **`gapCount` is NOT deleted from the coverage schema** — and the guard keeps
   BOTH warnings. Removing `SEQUENCE_GAP` detection because it is *currently*
   unreachable would destroy the capability rather than disclose its absence.
4. **`unsequencedEventCount` stays OPTIONAL** — making it required would force
   every restored summary to invent a value, which is the fabrication, not the
   cure.
5. **surfaces that only ESCALATE on gaps keep their silence** — the `/nectar`
   list cards, the header Vault pill and the chart chip render a gap badge only
   when `gapCount > 0`. They make no claim when it is zero, so they were never
   lying and are out of scope. Rewriting them to shout "undetectable" everywhere
   would be design theater.

---

## REVIVE §22 (Orkin)

All four defect halves reintroduced **via the Edit tool only**, in compilable
form, then restored byte-identical.

| revived half | file |
|---|---|
| drop `SEQUENCE_UNAVAILABLE` at the boundary | `sessionNectar.ts` |
| raw `reduce` on `gapCount` | `command-deck/page.tsx` |
| the `"None"` literal | `nectar/[symbol]/page.tsx` |
| rights predicate without `gaps.measured` | `coverageMap.ts` |

`TSC_EXIT=0` **on the revived form** — the defect was compilable, which is the
point: a type system would not have caught it.

Five Sentinels failed **BY NAME**:

```
× THE DEFECT: sessionNectar forwards SEQUENCE_UNAVAILABLE, not only SEQUENCE_GAP
× THE DEFECT: /command-deck routes GAPS through the claim compiler, not a raw sum
× THE DEFECT: /nectar/[symbol] no longer prints the word None for an unmeasured gap count
× a rights claim cannot rest on an unreachable condition
× the cure ships in ONE function — both surfaces read the same writer
```

`Tests  5 failed | 8 passed (13)` — the eight that passed are the
over-correction guards and the pure-unit claims, which *should* survive a
revive of the wiring. Restored: `599 files / 6995 tests VITEST_EXIT=0`,
`TSC_EXIT=0`.

---

## Method lessons sealed

- **H1 shape 1 hides in DEFAULT BRANCHES.** Nobody reads a fallback looking for
  a claim. Nine of the eleven defects this block were found by searching source;
  #10 and #11 could not have been — *nothing is wrong in any single file.*
- **A condition that cannot fail is not a requirement.** When auditing a
  predicate, ask of every clause: can this clause ever be false in production?
  If not, it is decoration wearing the costume of a safety check.
- **You cannot add a real zero to an unknown and get a real zero.**
- **The fallback narrates the INPUT, never the world.**
- **The cure ships in ONE component** — non-forkable wording cannot rot on one
  screen while looking healthy on the other.

---

## Live verification

Pending — deploy poll armed on chunkset identity of `/command-deck`. Status will
be recorded in the baton's "Live status — honest" table. **Not PROVEN until
observed.**
