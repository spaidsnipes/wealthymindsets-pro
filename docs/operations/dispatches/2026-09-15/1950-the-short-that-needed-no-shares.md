# The short that needed no shares

**Atom:** `ec272b6` — /paper discloses that its shorts were opened with no shares located
**Gate:** Founding Execution Contract §13 — paper execution state machine realism
**Status:** committed, pushed, **awaiting live confirmation** (deploy poller running)

Fourth in the /paper execution-realism family, after
[the order that could never expire](./1740-the-order-that-could-never-expire.md) (`165b039`),
[the cancel that could never lose](./1820-the-cancel-that-could-never-lose.md) (`348d7d6`)
and [the stop that was a guarantee](./1905-the-stop-that-was-a-guarantee.md) (`2eafef5`).

The first three were about what happens to an **order**. This one is about
whether a **position** could have been entered at all, and whether it could
have been held — a question nothing on this page had ever asked.

---

## The measured gap

Two lines in `paperTrade`. `applyFill` writes a negative quantity with no gate
of any kind:

```ts
const signedQty = ord.side === "buy" ? ord.qty : -ord.qty;
const cashDelta = -signedQty * fillPx * mult;   // receive to sell
```

and the funding check declines to look at sells at all:

```ts
if (side !== "buy") return null;                // selectOrderRejection
```

Read those together and **three** things are true of every short on /paper,
none of which is true of a real one, and none of which was said anywhere:

1. **No locate was required.** A real short cannot be entered until the broker
   **locates** borrowable shares. Some names are hard-to-borrow and carry a
   daily fee; some cannot be borrowed at all and the order is simply refused.
   /paper never asks, so every name is infinitely shortable here and always
   free.

2. **No collateral was posted.** Because `selectOrderRejection` returns null for
   every sell, a short is never sized against the account — and the proceeds
   **CREDIT cash**, which can then fund a buy. A real short is the opposite: it
   **consumes** margin rather than creating buying power. Regulation T requires
   collateral of 150% of the short's value. That is a published rule, not an
   estimate — but it is named only to say what /paper skipped, never to compute
   a verdict.

3. **No buy-in is possible.** A real short can be **RECALLED**: the lender wants
   the shares back and the position is bought in at the market, without consent
   and usually at the worst moment. /paper's short closes when, and only when,
   the trader decides.

## Why this was not already covered

`paperExecutionRealism` owns `no-spread` and `unbounded-size` — both about the
**price** a fill got. `paperStopRealism` owns gap risk. This is not about price
at all. It is about whether the position could have been **ENTERED** and whether
it could have been **HELD**.

The pattern from the previous atom repeats: each existing module is correct
about what it owns, and the gap lives in the space between them.

## Derived, not invented

`qty` and `marketPx` are already on every persisted position, so the open short
notional is **measured**, and a short opened long before this file existed is
described by the same rule. Nothing is stored, nothing new is required — a
Sentinel grades an ancient row shape to prove it:

```ts
const ancient = [{ symbol: "AAPL", qty: -3, avgPx: 50, marketPx: 40 }];
expect(selectShortRealism(ancient).shortNotional).toBe(120);
```

## The H1 rule, a fourth time

| input | shortCount | valuedCount | shortNotional |
|---|---|---|---|
| `{qty:-10, marketPx:100}` | 1 | 1 | 1000 |
| `{qty:-10, marketPx:undefined}` | 1 | **0** | **null** |
| `{qty:-10, marketPx:0}` | 1 | **0** | **null** |
| `{qty:10}` / `{qty:0}` | 0 | 0 | null |

A position whose mark nobody recorded still **counts** as a short — that needs
only `qty` — but it is valued at **nothing**. Valuing it at zero would mint the
claim that the trader is short nothing. And the disclosure still says all three
of its sentences, because none of them needs a price to be true; it simply
prints no dollar figure it did not measure:

```ts
expect(r.sentences).toHaveLength(3);
expect(r.sentences[1]).not.toMatch(/\$/);
```

## The test that was over-broad, and the prose that was right

The LABEL Sentinel scanned the rendered JSON for words a fabricated model would
use, and it went red on `refused` — which appears in the sentence describing
what a **real broker** does to an unborrowable name. That is the disclosure
itself, not a policy this module enforces.

So the guard split in two. The fabricated-**number** guard stayed on the text;
the **no-refusal** guard moved onto the source, where a refusal would actually
have to be written:

```ts
expect(code).not.toMatch(/\brejectReason\b/);
expect(code).not.toMatch(/return\s+(true|false)\s*;/);
expect(code).not.toMatch(/\bthrow\b/);
```

A Sentinel that fails on its own honest prose is testing the wrong surface.

## Sentinels that guard the DEFECT, not only the cure

```ts
it("THE DEFECT: a sell still opens a negative position with no gate", () => {
  expect(TRADE).toMatch(/const signedQty = ord\.side === "buy" \? ord\.qty : -ord\.qty/);
});

it("THE DEFECT: a sell is still never checked for funding", () => {
  expect(TRADE).toMatch(/if \(side !== "buy"\) return null;/);
});
```

Two facts carry this disclosure. If either stops being true it becomes a lie,
and this is where that gets caught. **A claim and its justification must fail
together.**

## REVIVE (§22, Edit-only)

Deleted `<ShortPositionNote pos={pos} />` from the positions tab while leaving
the import and the component declaration intact — the **fifth** run of the shape
that once passed GREEN for `ExecutionRealismNote`.

```
× the per-position note is actually RENDERED, not merely declared
× both are rendered in the POSITIONS tab, beside the book they describe
  Tests  2 failed | 22 passed (24)
```

**FAILED BY NAME.** Restored byte-identical (`git diff --stat` = 25 insertions,
0 deletions); full suite green afterwards.

## Gates

- `vitest run` — **589 files / 6885 tests PASS**, `VITEST_EXIT=0`
- `tsc --noEmit` — `TSC_EXIT=0`

## What this atom does and does not claim

It **does** claim: /paper opened these shorts without locating shares, without
posting collateral, and with the sale crediting cash; and it names the open
short notional, derived from fields the position already carried.

It does **not** claim that any particular name would have been hard to borrow,
or that any particular short would have been recalled. It cannot: that depends
on a securities-lending market this app has no feed for, and the module
deliberately refuses to estimate it. No borrow fee is minted, no recall
probability is invented, and **no short is refused** — refusing the trader's
short would be a policy they never chose. `Math.random` appears nowhere; a
Sentinel asserts all of it.
