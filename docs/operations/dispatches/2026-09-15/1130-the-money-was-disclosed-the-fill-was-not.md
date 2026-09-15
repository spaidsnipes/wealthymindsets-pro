# The money was disclosed. The fill never was.

**Commit** `aea1499` · **Surface** `/paper` orders blotter · **Date** 2026-09-15

---

## The measured defect

`/paper` discloses a great deal. Every word of it is about the **money**:

> "PAPER SIMULATION · BROWSER-LOCAL. Your existing $100,000 simulated account is
> preserved; this does not create a … funded account …"

> "⚠ Paper simulation only. … it never trades real money."

Every one of those sentences says the same thing: **the dollars are not real.**
Not one of them says **the FILL is not real.** Those are two different claims,
and only the first was ever made on screen.

The second claim *was* written down — twice, in this repo's own source:

| where | what it says |
|---|---|
| `selectOrderFill`'s docblock | the fill is deliberately *"no slippage, no spread, no queue position"* |
| `FillQueueBasisNote`'s docblock | silence *"is NOT a claim that the fill was realistic — a market order still books at the last observed price with no slippage"* |

Both correct. Both invisible to the person being taught position sizing.

That is **canon weakness #9, PAPER-FILL OVERCONFIDENCE**, in its purest form: a
simulator that is candid in its source and confident on its screen.

---

## The cure — two sentences, and not five

`src/lib/paperExecutionRealism.ts` owns only the assumptions that are
**universal to every fill `/paper` has ever booked** *and* that have no other
home:

1. **NO SPREAD WAS CROSSED.** The fill price is a trade print. A real buy lifts
   the offer; a real sell hits the bid. Every paper fill is therefore at least
   the spread *better* than the market would have given — in the trader's
   favour, systematically, every time.
2. **SIZE WAS FREE.** Any quantity fills in full at one price. The quote
   pipeline behind `/paper` (`PaperQuoteReadiness`) carries `price` and
   `observedAt` **and nothing else** — no bid, no ask, no depth. It is not that
   the model sizes badly; **there is no input from which size impact could be
   computed at all.**

### What was deliberately left out

- **Queue priority** already has an owner (`paperFillQueueBasis.ts`), rendered
  per order by `FillQueueBasisNote`, and only on the `at-the-touch` fills it is
  true of.
- **Quote age** already has one (`quoteObservedAt` / `fillPriceAgeMs` /
  `describeFillPriceAge`).

Hoisting either into a standing panel would state it about fills it is **not**
true of — which is the same overclaim this atom exists to close, pointed the
other way. Two Sentinels enforce the boundary: no assumption sentence may match
`/queue/i` or `/\bstale\b|\bold\b/i`.

### LABEL, NOT MODEL

Nothing here estimates a spread, a slippage, a fill probability or a depth
curve. **We cannot** — there is no bid and no ask to model from. Naming the
*direction* and the *certainty* of an advantage needs no number. Minting the
number would be the defect, not the cure. A Sentinel asserts no sentence
contains `\d+(%|bps|cents|ticks)` or the words
`estimat|approximat|roughly|likely|probab`.

### And not wallpaper

`describeExecutionRealism` returns `null` until the trader has actually taken a
fill. Before that there is no fill to caveat, and **a permanent banner is a
banner nobody reads.** The size sentence is *derived* from the trader's own
largest fill ("Your largest fill was 250, booked in full at a single price"),
read off orders already persisted — so a fill booked before this disclosure
existed is described by exactly the same rule as one booked today.

---

## The rule worth copying — found by REVIVE, not by design

**Consulting a selector is not rendering its answer.**

The first draft of the Sentinel asserted that `/paper`'s source contains the
strings `selectExecutionRealism` and `describeExecutionRealism`. A REVIVE that
deleted `<ExecutionRealismNote orders={orders} />` from the orders tab — leaving
the component declared and the imports intact — **passed GREEN**.

Of course it did. The names were still there, inside a component nobody
rendered. The owner was consulted by a function nobody called, so the trader saw
**exactly the silence this atom exists to end**, and the suite said it was fine.

A guard that asserts an owner is *named* proves nothing a dead import does not
also prove. The Sentinel now asserts the **rendered ELEMENT** and its position
after `tab==="orders"` — the thing the trader can actually read.

---

## REVIVE (§22) — Edit-only, restored byte-identical

| defect reintroduced | Sentinel that failed, by name |
|---|---|
| page: deleted `<ExecutionRealismNote orders={orders} />` | *(first draft: **PASSED — the hole**)* |
| page: same deletion, after strengthening | `REVIVE-FOUND: the note is actually RENDERED, not merely declared` |
| " | `and it is rendered in the ORDERS tab, beside the fills it describes` |
| owner: removed `if (filledCount === 0) return NONE;` | `orders that never filled are not fills` |

All restored byte-identical and re-run green.

---

## Gates

- `vitest run` — **584 files / 6757 tests, exit 0**
- `tsc --noEmit` — **exit 0**

---

## What the live host can and cannot prove

The Founder's production book shows **`Orders (0 pending)` and no fills**. So
`ExecutionRealismNote` **correctly renders nothing there** — that is the
wallpaper rule working, not a failure. There is no banner to photograph on
production, and none should be manufactured: no order was placed into the live
book to stage a demo fill.

What production *can* prove is deployment — a bundle probe for literals unique
to `paperExecutionRealism.ts` (`No spread was crossed`, `Size was free`). A
filled-book pixel requires an isolated localhost dev instance.

---

## Gate status

**Paper execution state-machine realism — the unowned surface is now narrow.**

| unknown | owner | rendered |
|---|---|---|
| fill price truth | `actionablePaperQuotePrice` | yes |
| fill staleness | `describeFillPriceAge` | yes, per fill |
| queue priority at a limit | `paperFillQueueBasis.ts` | yes, per fill |
| spread never crossed | **`paperExecutionRealism.ts`** | **yes, this atom** |
| size never moved price | **`paperExecutionRealism.ts`** | **yes, this atom** |
| partial fills / rejects | — | not modelled, not claimed |
