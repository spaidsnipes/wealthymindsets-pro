# The cancel that could never lose

**Atom:** `348d7d6` — /paper discloses that its cancels never race a fill
**Gate:** Founding Execution Contract §13 — paper execution state machine realism
**Status:** committed, pushed, **LIVE OBSERVED** on wealthymindsetspro.com/paper

Twin of `165b039` ([the order that could never expire](./1740-the-order-that-could-never-expire.md)).
Same gate, adjacent truth: an order here never expires, **and** a cancel here
never loses.

---

## The measured gap

Every order on /paper is born `pending` — **including market orders**:

```ts
const order: Order = { id: uid(), symbol: sym, side, type, qty,
                       status: "pending", ts: Date.now(), ... };
```

and `cancelOrder` resolves the transition locally, before any quote is read:

```ts
setOrders(prev => prev.map(o =>
  o.id === id && canCancelOrder(o.status) ? { ...o, status: "cancelled" } : o));
```

Nothing can arrive in between. A /paper cancel cannot lose — not to a fast
market, not to a gap, not to anything.

Two claims about real execution are silently contradicted by that:

1. **A cancel is a REQUEST, not a fact.** It travels to the venue and races the
   order it is trying to pull. If the order is marketable when the request
   lands, you are filled anyway — and that is precisely the moment you most
   wanted out.

2. **A MARKET order is not cancellable at all.** It is gone the instant it is
   sent, with nothing resting at the venue to take back. /paper holds it as
   pending until the next tick and offers a red ✕ on it.

## LABEL, NOT MODEL

The cure is **not** to start refusing the trader's cancels, and it is certainly
not to roll dice on whether a cancel "wins". A simulated race with an invented
probability is a fabricated number wearing the costume of realism.

`selectCancelCertainty` reads `status` and `type` — two fields every order has
carried since the book was first written. **Nothing is stored. No cancel is
refused. No status is ever written, and `Math.random` appears nowhere** (a
Sentinel asserts all three).

## The H1 rule, again

An order whose `type` is unreadable is **not** counted as a market order.
Absence is not evidence. It still counts toward the book-level total, which
needs only `status`.

| input | cancelledCount | cancelledMarketCount |
|---|---|---|
| `{status:"cancelled", type:"market"}` | 1 | 1 |
| `{status:"cancelled", type:"limit"}` | 1 | 0 |
| `{status:"cancelled", type:undefined}` | 1 | **0** |
| `{status:"pending", type:"market"}` | 0 | 0 |

## Not wallpaper

Nothing is said before the first cancel. The per-row note is reserved for the
genuinely surprising case — a cancelled **market** order — because a note under
every row is a note nobody reads.

## The Sentinel that guards the DEFECT, not only the cure

```ts
it("THE DEFECT: the page still creates market orders as pending and cancellable", () => {
  expect(code).toMatch(/side,\s*type,\s*qty,\s*status\s*:\s*"pending"/);
});
```

If /paper ever stops holding market orders as pending, the disclosure becomes a
lie — and this is where that gets caught. **A claim and its justification must
fail together.**

## REVIVE (§22, Edit-only)

Deleted `<CancelledOrderNote />` from the orders tab while leaving the import
and the component declaration intact — the **third** run of the shape that once
passed GREEN for `ExecutionRealismNote`.

```
× the per-order note is actually RENDERED, not merely declared
× both are rendered in the ORDERS tab, beside the book they describe
  Tests  2 failed | 19 passed (21)
```

**FAILED BY NAME.** Restored byte-identical; full suite green afterwards.

## Gates

- `vitest run` — **587 files / 6830 tests PASS**, `VITEST_EXIT=0`
- `tsc --noEmit` — `TSC_EXIT=0`

## LIVE OBSERVED — production, not localhost

Three probe orders were injected into an isolated copy of the browser book
(`status:"cancelled"`, types `market` / `limit` / `stop`), the page reloaded, and
the ORDERS tab opened. Production rendered, verbatim:

```
3 ORDERS WERE CANCELLED WITH CERTAINTY

A cancel here is decided locally, before any quote is consulted, so it can never
lose a race to a fill. At a real venue a cancel is a REQUEST: if your order is
marketable when the request lands, you are filled anyway — and that is exactly
the moment you most wanted out.

1 of them was a MARKET order. /paper holds a market order as pending until the
next quote tick, so it can be taken back. At a real broker a market order is
gone the moment you send it — there is nothing left to cancel.

TSLA  BUY   Market  1       —          —   cancelled
  This was a MARKET order, and you took it back. At a real broker you could not
  have: a market order is gone the moment it is sent, with nothing resting at
  the venue to cancel.

AAPL  SELL  Limit   1  $99,999.00      —   cancelled
  (no note)

MSFT  BUY   Stop    1       —          —   cancelled
  (no note)
```

Three things are proven by that shape, not merely asserted:

1. **The counts disagree on purpose** — `cancelledCount` 3, `cancelledMarketCount` 1.
2. **The per-row note is reserved.** Only the MARKET row carries one. The limit
   and stop rows are silent — the anti-wallpaper rule, holding in production.
3. **Nothing was refused.** All three orders still read `cancelled`.

**Browser-restore receipt:** the Founder's own book was backed up before the
probe and restored afterwards —
`restored_identical=true bytes=7501 orders=0 trades=0 backup_key_removed=true`.
No real order was ever placed; no financial action was taken.

## What this atom does and does not claim

It **does** claim: /paper decides a cancel locally before consulting any quote,
so a cancel here cannot lose a race; and a market order, which a real broker
cannot cancel at all, is cancellable here.

It does **not** claim that any particular real cancel would have lost its race.
That depends on latency and on the book at that instant, and this module
deliberately refuses to estimate either. The strongest thing asserted is a
statement about **/paper's own control flow**, which is visible in the page and
needs no probability to be true.
