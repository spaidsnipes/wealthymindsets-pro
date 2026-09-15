# 2362 — An untraded book has no P&L

**Commit:** `6635859` · **Room:** `/paper`, account header + equity card
**Law:** H1 — *absence is not zero* · shape 3, **chromatic**
**Live status:** **PROVEN** — observed on production

---

## How it was found

Inside the live verification screenshot for `2c624f9`, two rooms above the row
that commit had just fixed.

That is now **three consecutive defects found in the receipt for the previous
one**. The screenshot is not a formality. It is the best instrument in the kit,
because it is the one moment you look at a surface you have stopped assuming
things about.

---

## The defect

The account strip read:

```
EQUITY $100,000 · CASH $100,000 · DAY P&L +$0.00 · REALIZED +$0.00
```

with both P&L cells in `text-wm-green`, and the equity card below it read
`+0.00 today (0.00%)` in the same tint — on a book holding **zero trades and
zero positions**.

`0 >= 0` is true, so the win tint was arithmetically earned and factually a
lie. Green asserts money was made. A book that was never put to work has no
result to report.

---

## What is NOT the defect

**EQUITY and CASH render untouched.** $100,000 of simulated cash really is
held; that is an observed fact about the book. Withholding it would be the
opposite error — hiding something WM genuinely observes. A Sentinel forbids
that over-correction explicitly.

---

## Why the guard is not `dayPnl === 0`

A real trading day **can** close at exactly zero — scratched at entry, or wins
and losses that cancel. That is a genuine flat result and it keeps both its
figure and its tint.

The question is never *"is the number zero"* but *"was anything ever traded"*:

```ts
const bookNeverTraded = trades.length === 0 && positions.length === 0;
```

Read off the book's own contents, so it cannot drift from the thing it
describes — and it re-lights on its own at the first fill.

---

## Order matters, and is pinned

`bookRecoveryRequired` is a **stronger** claim than "never traded". An
unreadable book must say `UNKNOWN`, never `—`. Recovery is tested first in both
cells and a Sentinel holds that order.

---

## This was not a careless surface

The same strip already forces `UNKNOWN` for `bookRecoveryRequired` and for
`hasUnmarkedOptions`. **Two honest degradations were already in place.** It had
simply never been asked what it should say *before the first trade* — which is
the one state every new trader sees first.

---

## Sentinels

`src/lib/design/anUntradedBookHasNoPnl.enforcement.test.ts` — **+7**

| # | Guards |
|---|---|
| 1 | Day P&L is withheld before the book has been traded |
| 2 | Realized is withheld before the book has been traded |
| 3 | the "today" line names what is missing rather than printing a zero |
| 4 | the guard reads the book's own contents, not the value of the number |
| 5 | **OVER-CORRECTION** — EQUITY and CASH are untouched observed facts |
| 6 | **OVER-CORRECTION** — a book that HAS traded still reports a real flat day |
| 7 | **OVER-CORRECTION** — the existing honest degradations still win |

Three of seven guard the wrong fixes. That is now the assumed shape of a
Sentinel set on this law, not an extra.

---

## Gates

```
Test Files  595 passed (595)
Tests       6957 passed (6957)
VITEST_EXIT=0
TSC_EXIT=0
```

**REVIVE §22 proven BY NAME.** The `Realized` cell was reverted via the Edit
tool; two Sentinels failed by name —

```
× THE DEFECT: Realized is withheld before the book has been traded
× OVER-CORRECTION: the existing honest degradations still win
```

— and the file was restored byte-identical.

---

## Live status — PROVEN

Observed on `https://wealthymindsetspro.com/paper` after the chunkset for the
route changed (poll 8 from baseline `d5629ea5…`).

| Cell | Value | Computed colour |
|---|---|---|
| Equity | `$100,000` | `rgb(232, 237, 243)` — untouched |
| Cash | `$100,000` | — untouched |
| **Day P&L** | **`—`** | **`rgb(139, 149, 165)`** (`text-wm-text-muted`) |
| **Realized** | **`—`** | **`rgb(139, 149, 165)`** |

The equity card reads `$100,000` / **"No trades placed — nothing to measure
yet"**. `+0.00 today` is gone from the page, and a scan for leaf nodes matching
`^[+-]?\$?0\.00$` returns **0**.

---

## The pattern to carry

**A shape does not retire when you name it.** This is the third room on this
page to breach chromatic H1, and the second to do so *after* the page had
already been visited and fixed in this block. The surface you just cured is not
thereby clean.
