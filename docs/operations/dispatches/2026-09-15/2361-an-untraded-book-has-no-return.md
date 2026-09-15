# An untraded book has no return

**Commit:** `2c624f9` · **Surface:** `/paper` → Leaderboard row · **Law:** H1 · LABEL-NOT-MODEL · canon §9

---

## How it was found

**Inside the receipt for the previous fix.**

`e714b04` removed the crown from a field of one. I went to production to
observe it, took the screenshot that proves it, and the row in that screenshot
read:

```
#   TRADER    RETURN   P&L   TRADES   WIN%
1   You ⭐    +0.0%    +$0     0       —
```

`+0.0%` — `text-wm-green`, computed `rgb(0, 212, 170)`.
`+$0` — `text-wm-green`, computed `rgb(0, 212, 170)`.
`—` — `text-wm-text-muted`, computed `rgb(139, 149, 165)`.

Same row. Zero trades. Two cells claiming a gain and one cell, three columns
over, telling the truth.

The previous dispatch closed by naming a grep target and that is how `e714b04`
was found. This one was found by a different instrument: **going to look at the
thing you just fixed, and reading what is beside it.** Both are cheap. Neither
happens by itself.

---

## The defect

```tsx
entry.pct >= 0 ? "text-wm-green" : "text-wm-red"
entry.pnl >= 0 ? "text-wm-green" : "text-wm-red"
```

`0 >= 0` is true, so a book that has never placed a trade takes the WIN tint
for money it did not make. Chromatic H1: colour is a claim, and green asserts
a gain.

But it is more than a tint. **A return is a ratio over a book that was put to
work.** With `entry.trades === 0` there is no numerator and no denominator.
There is no return — not a return of zero. Rendering `+0.0%` in grey would
still be the claim that a return of zero was *measured*. Both the value and
the colour had to go.

---

## The lesson had already been learned three cells to the right

The WIN% column, in the same row, under a comment that predates this fix:

```
An unknown win rate gets the MUTED colour, not the red one.
Colouring "no closed trades yet" as failure is the same overclaim as
printing 0%.
```

Same row. Same record. Same `trades === 0`. The neighbouring column had the
entire diagnosis written above it and the defect survived anyway.

**A comment guards the cell it sits on and nothing else.** That is the
argument for Sentinels over comments, and the code made it without being
asked. It is also the third time in this block a defect has been found beside
a neighbour that already got it right — the WR chip beside the P&L chip on
`/journal`, the Win% column beside the rank badge on `/paper`, and now the
Win% column beside its own row's RETURN cell. When one element on a surface
handles absence correctly, that is not reassurance. It is a map.

---

## The cure

```tsx
<div className={clsx("text-xs font-black font-mono",
  entry.trades === 0 ? "text-wm-text-muted"
    : entry.pct >= 0 ? "text-wm-green" : "text-wm-red")}>
  {entry.trades === 0 ? "—" : `${entry.pct >= 0 ? "+" : ""}${entry.pct.toFixed(1)}%`}
</div>
```

and the same for P&L. Exactly the treatment WIN% already used — the fix was to
make the row agree with the part of itself that was right.

**The guard reads the row's own trade counter.** `entry.trades === 0`, the
same structure the cell is describing. Not a hardcoded `false`, not a second
hand-rolled notion of emptiness that will drift away from the thing it
describes. Same shape as `board.length > 1` one screen up and
`recordedTotal.counted === 0` on `/journal`. The moment a real trade lands the
number and the colour re-light on their own and nobody has to remember to come
back here.

No selector was touched. That is now true of every defect in this block.

---

## Sentinels (+6, new file)

`src/lib/design/anUntradedBookHasNoReturn.enforcement.test.ts`

| Sentinel | What it prevents |
|---|---|
| `THE DEFECT: the RETURN cell does not take the win tint at zero trades` | the bare `entry.pct >= 0 ? "text-wm-green"` returning |
| `THE DEFECT: the P&L cell does not take the win tint at zero trades` | the same on the P&L cell |
| `a book with no trades prints no percentage and no dollar figure` | a half-cure that greys the tint but keeps printing `+0.0%` |
| `the discrimination reads the row's own trade counter` | a second, independent notion of "empty" that will drift |
| `OVER-CORRECTION: a trader who HAS traded still sees a real tint` | a "cure" that mutes every row and deletes the honest half |
| `OVER-CORRECTION: the WIN% column keeps the treatment it already had right` | a "unifying" sweep that rewrites the reference implementation |

The last two exist because **a wrong fix in either direction would pass the
first four.** This is the second consecutive atom where the over-corrections
needed their own guards, which is starting to look less like a precaution and
more like the standard shape of a Sentinel set.

---

## Gates

```
Test Files  594 passed (594)
Tests       6950 passed (6950)
VITEST_EXIT=0
TSC_EXIT=0
```

**REVIVE §22 proven.** The bare `entry.pct >= 0 ? "text-wm-green"` form was
restored via the Edit tool and two Sentinels failed by name:

```
× THE DEFECT: the RETURN cell does not take the win tint at zero trades
× a book with no trades prints no percentage and no dollar figure
AssertionError: expected '"use client";…' to match /entry\.trades === 0 \? "text-wm-text-…/
```

then the file was restored byte-identical.

---

## Live status

**PENDING** — pushed, awaiting observation. Not PROVEN until seen.

This one *is* observable on the Founder's book, unlike the callout half of
`e714b04`: the row renders at zero trades, which is precisely the condition
under test. The expected reading is `—` in `RETURN` and `—` in `P&L`, both in
`text-wm-text-muted`, with `TRADES 0` and `WIN% —` unchanged beside them.

---

## The pattern to carry

**Read the receipt.** The screenshot you take to prove a fix is also a fresh,
unfiltered look at a surface you have stopped assuming things about. Two of
the last three defects in this block were found in the act of verifying the
previous one.

And the neighbour rule, now stated properly: **when one cell on a surface
handles absence correctly and its neighbour does not, the correct one is
evidence that somebody already thought about this here — and stopped at the
cell they were working on.** Look at the whole row.
