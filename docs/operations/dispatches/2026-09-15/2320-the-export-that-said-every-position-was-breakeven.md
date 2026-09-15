# The export that said every position was breakeven

**Commit** `8c4d66a` · **Found by** sweeping for the nest fixed in `44d4a00`
**Owner module** `src/lib/paperPositionsExport.ts` (new)

---

## How it was found

`44d4a00` fixed a surface that read the persisted paper book directly and
presented a fill price as a market mark. The obvious follow-up question is not
"is that fixed" but **"who else reads the saved book directly?"**

```
grep -rn "marketPx" src/ --include="*.ts" --include="*.tsx"
```

One hit outside the owner and outside `/paper`: `src/app/profile/page.tsx:327`.
It was worse than the drawer.

## The defect

`/profile` assembled its paper-position CSV inline, in the page:

```ts
["Symbol","Side","Qty","AvgPx","MarketPx","UnrealizedPnL"],
...positions.map(p => [p.symbol, …, p.avgPx, p.marketPx, p.unrealPnl])
```

Both of the last two columns were untrue, and each for a reason already written
down in this codebase.

**1. `MarketPx` held the fill price.** `paperTrade.applyFill`'s five persisted
writers all say `marketPx: fillPx`. Heading that column "MarketPx" asserts a
current market value that was never observed — the third surface of the
`?? pos.avgPx` overclaim `paperPositionMark` exists to kill.

**2. `UnrealizedPnL` was always exactly zero.** `unrealPnl` has **one** writer in
the entire codebase:

```ts
// paperTrade.ts:626
{ symbol: ord.symbol, qty: signedQty, avgPx: fillPx, unrealPnl: 0, marketPx: fillPx }
```

Nothing ever updates it. So **every export this product has ever produced
reported every position as precisely breakeven**, regardless of what the market
did. That is H1 at its purest — absence rendered as zero — and zero in a P&L
column asserts a *measured* breakeven.

This is the same failure `paperPositionMark`'s opening docblock was written
about: *"an UNMARKED position renders a GREEN `+0.00` … The page told the trader
their position was flat. It did not know anything about their position."*

## Why a file is worse than a screen

A wrong screen is corrected by a reload. A wrong file **leaves the product**. It
gets filed, mailed, imported into a spreadsheet, opened months later by someone
who cannot ask the app what it meant — and by then the zero looks like a
measurement, because it is sitting in a column that promised one.

So an export is the last place an unjustified number belongs, and the one place
the justification has to travel **with the data**.

## The cure

New pure owner `paperPositionsToCsv`:

- **Only justifiable columns.** `Symbol, Side, Qty, AvgPx, FillPx`. `FillPx` is
  the honest name for the same bytes previously shipped as `MarketPx` — renamed
  not to hide something, but to stop claiming something.
- **No market value, no unrealized P&L.** `unrealPnl` is not even in the input
  type, so a future edit cannot reach for it by accident.
- **Blank, never `0`,** when a fill price is missing.
- **The caveat ships inside the file** — after the data, as `#` comment lines —
  so whoever opens the spreadsheet learns why the P&L column is gone. The toast
  says it too, but the toast does not survive the download.
- **Returns `null` on an empty book**, so the caller refuses rather than handing
  over a header-only file with a success message. That is a false success, and
  it was already half-fixed: task **#87** ("Profile CSV export → canonical
  `paperTrade` owner; no false success") shipped the refusal and never shipped
  the canonical owner. This finishes it.

**LABEL-NOT-MODEL:** nothing is computed, estimated or interpolated. No
approximate value, no last-good price, no zero.

## Sentinels — 12

Two bind the claim to its justification, so the refusal cannot outlive its
reason:

- `THE DEFECT: applyFill still writes the FILL PRICE into marketPx`
- `THE DEFECT: unrealPnl is still written ONCE, as 0, and never updated`

The day either becomes a real measurement, these fail and someone re-examines
the withholding instead of inheriting it.

### The recurring lesson, third occurrence

> A Sentinel that fails on its own honest prose is testing the wrong surface.

The wiring Sentinel greps `/profile` for `"MarketPx"` to prove the inline
construction is gone — and failed, because the *fix's own explanatory comment*
names the columns it removed. A fix that explains itself must name what it
deleted. Cure, as established twice before: **scan the source with comments
stripped.**

## REVIVE §22 — three revives, Edit tool only

| Revive | Sentinel that caught it |
|---|---|
| `FillPx` → `MarketPx` | `emits exactly the columns the saved book can justify` + `NO MARKET VALUE` |
| blank cell → `0` | `H1: a position with no fill price gets a BLANK cell, never a 0` |
| page re-forks the CSV inline | `THE SURFACE USES IT: /profile exports through this owner, not inline` |

Each failed **by name**. All restored byte-identical; suite green afterwards.

## Gates

```
Test Files  591 passed (591)
      Tests  6919 passed (6919)
VITEST_EXIT=0
TSC_EXIT=0
```

## Live status

Pushed `2f7e4f2..8c4d66a`. Production verification pending — upgraded only on
direct observation, never from deploy identity alone.
