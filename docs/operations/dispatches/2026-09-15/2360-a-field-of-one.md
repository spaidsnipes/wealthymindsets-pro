# A field of one is not a first place

**Commit:** `e714b04` · **Surface:** `/paper` → Leaderboard tab · **Law:** H1 · LABEL-NOT-MODEL · canon §9

---

## How it was found

The previous dispatch ended with a grep target:

```
>= 0 ? "bg-wm-green
```

That sweep turned up twelve sites. Eleven are legitimate — a trade that
scratched at its entry price really is a flat result, and colouring it green is
a true statement about money. The twelfth was on `/paper`, and pulling that
thread found something bigger than a tint.

**The dispatch's own closing note is what found the next defect.** Writing down
the pattern is not ceremony; it is the search index for the next sweep.

---

## The defect

The Leaderboard builds its board like this:

```ts
const myEntry = { name: "You ⭐", pct: myPct, … , isMe: true };
const board = [myEntry].sort(…).slice(0, 12);
const myRank = board.findIndex(e => e.isMe) + 1;
```

There is **exactly one entry**, because WM Pro observes nobody else's paper
book. There are no competitors and there never were. So `myRank` was always
`1`, and a trader who placed a single paper trade was handed:

```
👑   #1    Your Current Rank
           🎉 You're in the prize zone!
```

A crown. A podium placement. A prize-zone congratulation. For winning a contest
against nobody — rendered directly beside two **"Visit Partner"** CTAs for an
external, explicitly unverified prize challenge.

The page already carried the disclosure `This leaderboard reflects only your
browser-local paper results.` It was true, and it did not help. A sentence of
fine print does not survive contact with a gold crown.

---

## Why this is the green zero again

The number was never wrong. Being 1st of 1 is arithmetically true, in exactly
the way the sum of no trades is genuinely `$0.00`.

In both cases **a real computation was dressed in the visual grammar of an
achievement it cannot support**: green tint for money not made, a crown for a
field that does not exist. Both were found on a surface where a neighbouring
element had already got it right — the WR chip beside the P&L chip, and here the
Win% column, which already renders `—` for an unknown rate with this comment
sitting above it:

```
An unknown win rate gets the MUTED colour, not the red one.
Colouring "no closed trades yet" as failure is the same overclaim as
printing 0%.
```

That comment was written for a different reason and describes this defect
precisely. The lesson had been learned one column to the right.

**Rank is a statement about a FIELD.** With no field there is no rank to report.

---

## The cure

```
—    NO FIELD TO RANK AGAINST
     This board holds only your own paper result.
```

Neutral medallion, neutral surface, no crown on the row.

Three things the cure deliberately does **not** do:

1. **It does not invent competitors.** Faking a field to make the rank true
   would be the model lying to rescue the label. LABEL-NOT-MODEL.
2. **It does not delete the honest half.** `myPct` — the trader's own real
   return on their own real paper book — renders untouched beside the withheld
   standing. A Sentinel asserts this, because a cure that removed it would pass
   every other check.
3. **It does not hardcode `false`.** The condition is:

```ts
const hasField = board.length > 1;
```

read off the **board itself**. Same lesson as the empty-book total: the guard
must read the structure it describes, so it cannot drift away from it. If WM
ever observes a real field, the ranking lights up on its own and nobody has to
remember to come back here.

---

## Sentinels (+6, new file)

`src/lib/design/aFieldOfOneIsNotAFirstPlace.enforcement.test.ts`

| Sentinel | What it prevents |
|---|---|
| `THE DEFECT: the rank claim is gated on a field actually existing` | the bare `#{myRank}` badge returning |
| `the prize-zone congratulation cannot fire without a field` | the `🎉` message re-gating on `myRank` alone |
| `no podium icon is awarded for a field of one` | the ungated `RANK_BADGES.find` crown lookup |
| `the withheld state says what is missing, and is not tinted as a win` | a silent blank, or the withheld state taking the green |
| `the trader's own REAL return is still reported` | a "cure" that deletes the honest measurement |
| `the board is not faked into having competitors` | a "cure" that invents opponents so the rank becomes true |

The last two exist because **a wrong fix in either direction would pass the
first four.** A Sentinel set that only forbids the defect leaves both
over-corrections wide open.

---

## Gates

```
Test Files  593 passed (593)
Tests       6944 passed (6944)
VITEST_EXIT=0
TSC_EXIT=0
```

**REVIVE §22 proven.** The ungated podium lookup was restored via the Edit tool
and the Sentinel failed by name:

```
× no podium icon is awarded for a field of one
AssertionError: expected '"use client";…' to match /hasField \? RANK_BADGES\.find/
```

then the file was restored byte-identical.

---

## Live status

**PENDING** — awaiting observation on production. Not PROVEN until seen.

---

## The pattern to carry

Ask of every ranking, streak, badge, percentile and podium on the product:
**what is the population, and did we observe it?**

A rank needs a field. A percentile needs a distribution. A streak needs a
continuous record. Each of those is a claim about a set of things WM did not
necessarily see, and each will compute a confident-looking number from a set of
one — or of none — without complaining.

Next sweep targets: anything reading `.findIndex(… isMe)`, `top N`, `percentile`,
`streak`, or `rank` on a surface whose population is the trader alone.
