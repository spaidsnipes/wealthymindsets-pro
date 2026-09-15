# The green zero

**Commit:** `5233fa6` · **Surface:** `/journal` (empty book) · **Law:** H1 (absence is not zero) · LABEL-NOT-MODEL · canon §9 (colour is a claim)

---

## The defect

Read off the live site with no entries. The `/journal` header strip rendered, on
one line:

```
[ WR UNKNOWN · no trades taken ]   [ +$0.00 ]   0W / 0L
```

with `+$0.00` in the **GREEN** tint.

The same strip, in the same breath, asserted two incompatible things: *nothing
happened*, and *a positive dollar result* — in the styling canon §9 reserves for
money actually made. A trader glancing at it reads a flat-but-fine session they
never had.

Note the shape: the chip that got it **right** was sitting immediately beside
the one that got it wrong. `WR UNKNOWN · no trades taken` had already learned
that absence is not zero. The P&L chip next to it had not.

---

## Why the selector was NOT touched

This is the part worth internalising, because the instinct is to go fix the
number.

The arithmetic was never wrong. The sum of no numbers is 0, and
`selectRecordedTotal` is *right* to call an empty book `COMPLETE` — there is
nothing unread about having recorded nothing. Its own docblock says so, and
`selectRecordedTotal.test.ts` already asserts it:

```ts
it("an EMPTY journal totals a genuine $0.00")  // → COMPLETE / 0 / note null
```

So the owner is untouched and **its tests are untouched**. Changing the model to
fix a label would have made the selector lie to every other caller in order to
make one chip read better.

The **LABEL** was wrong, and LABEL-NOT-MODEL says fix the label. A trader who
took no trades did not break even; there is simply nothing to total. The empty
case now gets its own neutral chip:

```
NO P&L TO TOTAL · no trades recorded
```

Same neutral surface, same dim text, same wording grammar as the WR chip beside
it. The two chips now agree.

---

## The discrimination reads the owner's counters, not a second emptiness test

The obvious guard was `tradeRecords.length === 0`. It is wrong, and a Sentinel
now forbids it.

```tsx
{recordedTotal.counted === 0 && recordedTotal.unreadable === 0 ? (
  <span className="…bg-wm-surface text-wm-text-dim border-wm-border">
    NO P&amp;L TO TOTAL · no trades recorded
  </span>
) : recordedTotal.total === null ? (
  …
```

`tradeRecords.length === 0` is a **second, independent notion of "empty"** that
can drift away from the sum it is supposed to describe. The chip must read the
same object it renders. `counted` and `unreadable` come from the very call whose
result is being labelled, so the label and the number cannot disagree.

Same family as the claim/justification binding: a claim and its justification
must fail together.

---

## Sentinels (+2)

| Sentinel | What it prevents |
|---|---|
| `H1: an empty book has nothing to total, and is not a green zero` | the empty case regaining a dollar figure; also asserts the chip carries neither the win tint nor the loss tint |
| `the empty case is decided by the owner's counters, not a second emptiness test` | a duplicate `tradeRecords.length === 0` guard that can drift from the sum |

The first one scopes itself to the chip's own `<span>` before asserting on
colour — the neighbouring P&L chip legitimately uses `wm-red` for a negative
total, which **is** money lost.

---

## Gates

```
Test Files  592 passed (592)
Tests       6938 passed (6938)
VITEST_EXIT=0
TSC_EXIT=0
```

**REVIVE §22 proven.** The green-zero branch was reintroduced via the Edit tool
and the Sentinel failed by name:

```
AssertionError: expected '"use client";…' to match
/recordedTotal\.counted === 0 && recor…/
```

then the file was restored byte-identical.

---

## Live status — OBSERVED on production

Read in the Founder's browser on `https://wealthymindsetspro.com/journal` with
the book empty (`0 entries`, `No entries found`). The header strip rendered:

```
WR UNKNOWN · no trades taken   NO P&L TO TOTAL · no trades recorded   0W / 0L
```

Checked in the same read:

| Check | Result |
|---|---|
| `NO P&L TO TOTAL` present | yes |
| spans matching `$0.00` anywhere on the page | **zero** |
| chip class | `bg-wm-surface text-wm-text-dim border-wm-border` — neutral, no `wm-green` |
| sibling WR chip | unchanged, still `WR UNKNOWN · no trades taken` |

The two chips now say the same thing in the same voice and the same colour.
This fix is **PROVEN**.

---

## The pattern to carry

Colour is a claim. Green is not decoration; on this product it is an assertion
that money was made. Every place a number is tinted by a `>= 0` test, ask what
that branch says when the number is zero *because nothing happened* — because
`0 >= 0` is true, and the styling will happily congratulate a trader for a day
they did not trade.

Grep target for the next sweep: `>= 0 ? "bg-wm-green` .
