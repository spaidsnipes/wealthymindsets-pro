<!-- BEGIN:ath-historical-lineage -->
> # ⛔ HISTORICAL LINEAGE — NOT CURRENT AUTHORITY
>
> **MEMORY MAY TEACH. ONLY CURRENT AUTHORITY MAY COMMAND.**
>
> This is a **dispatch** — an instruction issued for one day's work. Its filename names its own day. It was true
> on that day and is preserved as evidence of what was observed and decided
> then. Do not take a current action, diagnosis, release decision or task claim
> from it.
>
> **The current front door is in Drive, not in this repository.** A worker who
> arrived here from a search result or a shared link has not passed through
> `README.md` and has not met its demotion notice — this block is that notice,
> delivered at the door of the document itself.
>
> **Current production is `https://wealthymindsetspro.com`** (Cloudflare Workers /
> OpenNext). Any `*.vercel.app` reference below is a `GHOST_HOST` signal: the
> Vercel host was retired 2026-08-24 and cannot serve this app.
>
> Demoted 2026-09-19 by `src/lib/ops/datedDocsAreDemoted.sentinel.test.ts`, which
> until that day scanned only the top level of `docs/operations` and could not
> see this directory at all. See `docs/operations/CANON-SHIFT-GATE-STATUS.md`.
<!-- END:ath-historical-lineage -->

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

## Live status — LIVE OBSERVED

Pushed `2f7e4f2..8c4d66a`.

**Deploy confirmed behaviourally.** Polled production for the literal string
`entry and fill prices only`; `FOUND in /_next/static/chunks/1ifrv3mcdi18e.js`.
That proves the bytes shipped. It does **not** prove the path runs, so it was
not treated as the proof.

**The proof.** On `https://wealthymindsetspro.com/profile`, Export CSV was
clicked and the toast read, on screen:

> `Exported 2 positions — entry and fill prices only, no P&L.`

The old toast read `Exported 1 position.` with no clause. The clause is
therefore direct evidence the new owner ran — not the old inline construction.
Screenshot taken; status upgraded on that observation and nothing else.

### How the proof was staged, honestly

The Founder's saved book holds **0 positions**, and `paperPositionsToCsv`
correctly refuses an empty book — so the success path cannot be observed without
positions. **No order was placed.** Two probe positions were injected directly
into `wm_paper_state`, and:

- the book was read out and hashed **first** (7501 bytes, hash `-86447417`);
- **the download was suppressed** — `HTMLAnchorElement.prototype.click` was
  patched to swallow anchors carrying a `download` attribute. The handler ran to
  completion and the toast rendered; no file was written to disk. The intercept
  recorded `clicks: 1`, `downloadName: wm-paper-positions.csv`;
- the book was restored and **read back**: 7501 bytes, hash `-86447417`,
  0 positions — **byte-identical**. The anchor patch was removed and verified
  removed.

A proof that leaves the Founder's book changed is not a proof, it is a defect.
