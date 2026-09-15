# /paper counted every opening as a loss

**Commit:** `632ade5` — *Stop counting openings as losses in /paper's win rate*
**Date:** 2026-09-15
**Lane:** §13 paper execution state-machine realism
**Grade:** defect MEASURED, cure SHIPPED, pixel PROVEN ON AN ISOLATED DEV INSTANCE (not the Founder's live book)

---

## What the team was shown, and what was true

Buy one contract. Sell it later at a profit. /paper told you your win rate was
**50%**.

You won every position you closed.

Three adds and one winning close rendered **25%**.

## The defect, exactly

```ts
trades.filter(t => (t.pnl ?? 0) > 0).length / trades.length
```

Re-typed at **three render sites** plus the Leaderboard. `trades` is the FILL
ledger and half of it is openings. An opening realises nothing, so it can never
enter the numerator — yet it sat in the denominator. The rate was biased
**downward by construction**, and the bias grew with every scale-in. The more
disciplined the trader, the worse the page lied about them.

## Why it could not be fixed where it was rendered

One layer down, `applyFill` ended with:

```ts
if (realized !== 0) trade.pnl = realized;
```

A close at exactly the average price realises exactly zero. That is **the
scratch** — a real outcome, and the one trading discipline is actually built
around. That line deleted the zero it had just computed. The resulting `Trade`
is byte-identical to the one an OPENING fill produces.

Absence was made to carry two incompatible meanings at once: *"nothing closed"*
and *"zero realised, then discarded"*. **H1 violated in the direction nobody
checks** — by writing absence over an observation.

So the ledger had to be able to SAY zero before any reader could count.

## The cure

```ts
if (closedQty > 0) trade.pnl = realized;
```

"Did this fill close size" — differs from the old condition on exactly the case
that matters. It stays **CONDITIONAL**: an opening still produces no `pnl` key
at all, because an explicit `0` would assert a breakeven close that never
happened. (Books are JSON-serialised and byte-compared; present-but-undefined is
a different fact from absent.)

`selectPaperWinRate` in `src/lib/paperTradeOutcome.ts` is now the single owner.
The three sites read one value and cannot drift.

## Two rules worth copying

**NULL IS NOT ZERO.** `pct` is `number | null`. A trader holding an open
position has no win rate; `0%` asserts they lost everything they touched.
Leaderboard's `myWin` was widened to `number | null` for this reason — it
previously passed a literal `0` and ranked the trader as a total loser. Unknown
renders `—` in muted, **not red**: colouring "no result yet" as failure is the
same overclaim as printing the number.

**The judgement call is named, not hidden.** A scratch sits in the denominator
and not the numerator, and `scratches` is reported separately so the decision is
visible rather than buried inside a percentage. `describePaperWinRate` renders
`50% (1W/0L/1S)` — and omits `/0S` entirely when there are none, because a
trailing zero on every screen is noise and that sentence exists to be read.

## REFUSED

A trade persisted **before** this change that closed flat still has no `pnl` and
grades `not-a-close`, same as an opening. There is no field from which its
scratch-ness could be recovered. Guessing is worse than a disclosed, bounded
fidelity loss on historical books. It is documented in the module, not papered
over with a default.

## REVIVE (§22) — both halves, via Edit, each restored byte-identical

| Defect reintroduced | Sentinels that failed BY NAME |
|---|---|
| `if (realized !== 0)` restored | *"THE FIX: a close at exactly the average price records pnl 0, not absence"*; *"END TO END: open, add, scratch-close — the win rate is not 0%"* |
| polluted denominator re-typed at a render site | *"THE DEFECT: no render site divides by the whole trade ledger"*; *"the blotter line comes from describePaperWinRate"* |

## Gates

- `vitest run` — **582 files / 6713 tests, exit 0**
- `tsc --noEmit` — **exit 0**

Both unpiped, and **re-run after the restores**.

## Live status — read the limit

**Pixel PROVEN on an isolated dev instance.** A synthetic two-trade book (one
opening with no `pnl`, one close with `pnl: 200`) seeded into `wm_paper_state`
on `localhost:3000`, then measured in the DOM:

```
{"quickStats":"Win Rate | 100% | ...",
 "allWinRateMentions":["Win Rate | 100%"],
 "totalTrades":"Total Trades | 2"}
```

**Total Trades 2, Win Rate 100%.** Before this commit, that exact book rendered
**50%**. Screenshot confirms `DAY P&L +$200.00`, `REALIZED +$200.00`,
`Blotter (2)`.

**Why not the live book:** proving this on production would have required
submitting orders into the Founder's account to manufacture a fill. That is a
real order and it was not placed. The live book is empty, so the live Win Rate
tile correctly shows `—` — which is itself the new behaviour (it used to be able
to show `0%` there).

**What is proven:** the arithmetic, the scratch, and the null. **What is not:**
this exact render on the production host with a real filled book. Do not upgrade
the second claim from the first.
