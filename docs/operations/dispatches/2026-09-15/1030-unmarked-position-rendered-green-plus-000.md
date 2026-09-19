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

# An unmarked position rendered a green +0.00

**Commit** `4577376` · **Surface** `/paper` positions blotter · **Date** 2026-09-15

---

## The measured defect

`/paper` marked every open position with one expression:

```ts
marketPx:  prices[pos.symbol] ?? pos.avgPx,
unrealPnl: ((prices[pos.symbol] ?? pos.avgPx) - pos.avgPx) * pos.qty * mult,
```

Two separate overclaims sit inside it.

### Head 1 — when there is no price, mark at entry

`?? pos.avgPx` means an unquoted position is marked at its own entry price. The
subtraction then yields **exactly 0**. And `PositionRow` did:

```ts
const up = pos.unrealPnl >= 0;
```

`0 >= 0` is true. So a position the page knew **nothing** about rendered a
**green `+0.00`** and a **green `+0.00%`** — at the money line, in the colour
reserved for "you are not losing".

That is H1 — absence rendered as zero — in the most expensive possible place.

### Head 2 — `prices` is not the price Paper may act on

`useLivePrices` writes `snap[sym] = readiness.price` whenever the price is
non-null, and `readiness.price` **stays non-null across the STALE transition on
purpose** so the tape can keep rendering a last-known number.

`actionablePaperQuotePrice`, whose own docblock says it *"returns the only price
Paper execution/derivation code may act on"*, was never consulted by the money
line. A quote past the freshness budget silently marked the book and moved the
equity curve.

**The tell:** the option branch *fifteen lines below, in the same function*
already called `actionablePaperQuotePrice` and refused to synthesize a mark
without one. One function, two standards of proof for the same question.

---

## The cure — a label, not a model

A mark is now `number | null`, and **null is not the entry price**.
`src/lib/paperPositionMark.ts` owns the rule:

| basis | meaning | renders |
|---|---|---|
| `actionable` | quote inside the freshness budget | the number, no caveat |
| `stale` | a real observation, past the budget | the number **plus its age** |
| `unmarked` | no observation at all | `—`, muted |

- **`stale` still marks.** A trader holding risk is better served by a labelled
  old number than by a blank. But it is never *silently* equal to an actionable
  mark — the basis travels with the number, and `ageMs` lets the row say
  "Marked on a quote 45s old."
- **`unmarked` is `null` everywhere** — `markPx`, `unrealPnl`, `pct`. Never
  `0`, because `0` asserts a measured breakeven that was never measured.
- **Muted, not red.** "No result yet" is not a loss. Colouring it red is the
  same overclaim as printing the number.
- **A partial sum is disclosed, not widened.** If some positions are marked and
  others are not, the header carries *"1 position has no quote and is excluded
  from this number"* rather than presenting a partial figure as whole-book.
- **An empty/fully-unmarked book reports `null`, not `0`.** A book of unknown
  value is not a book worth nothing.

Nothing here invents a price. No interpolation, no decay toward entry, no
last-good-plus-drift. The cure for "we do not know" is to say so.

---

## Two rules worth copying

1. **A caveat that is always present stops being read.** `describePositionMark`
   returns `string | null` and returns `null` for the fresh case deliberately. A
   badge on every row is wallpaper.
2. **When one function contains two standards of proof for the same question,
   the weaker one is the bug.** The options branch was already right. Finding
   the disagreement was faster than reasoning about the math.

---

## REVIVE (§22) — both heads, Edit-only, restored byte-identical

| defect reintroduced | Sentinel that failed, by name |
|---|---|
| owner: no quote marks at entry | `THE DEFECT: no quote does NOT mark at entry and does NOT render 0` |
| " | `a mark at exactly the entry price is a REAL zero, distinct from unmarked` |
| " | `a fully unmarked book reports null, NOT zero` |
| page: re-typed `prices[pos.symbol] ?? pos.avgPx` | `THE DEFECT: no mark falls back to the entry price` |

Both restored and re-run green.

## Gates

- `vitest run` — **583 files / 6738 tests, exit 0**
- `tsc --noEmit` — **exit 0**

## What the live host can and cannot prove

The Founder's production book has **0 open positions**, so `/paper` shows the
empty state and no position row can be photographed there. What production
*can* prove is that the module is deployed — bundle probe for a literal unique
to `paperPositionMark.ts`. A filled-book pixel requires an isolated localhost
dev instance; no order was placed into the live book to manufacture one.

## Gate status

- Paper execution state-machine realism — **advanced, not closed.** Fill price
  truth and fill staleness are already owned. The remaining unowned surface is
  **size/liquidity**: a market order of any quantity still fills instantly at a
  single price, with no depth data to know better.
