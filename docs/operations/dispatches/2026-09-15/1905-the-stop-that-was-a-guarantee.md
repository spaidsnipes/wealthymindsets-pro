# The stop that was a guarantee

**Atom:** `2eafef5` — /paper discloses that its stops fill at the price that triggered them
**Gate:** Founding Execution Contract §13 — paper execution state machine realism
**Status:** committed, pushed, **awaiting live confirmation** (deploy poller running)

Third in the /paper execution-realism family, after
[the order that could never expire](./1740-the-order-that-could-never-expire.md) (`165b039`)
and [the cancel that could never lose](./1820-the-cancel-that-could-never-lose.md) (`348d7d6`).

Those two were about orders that never resolve. This one is about the order a
trader places to be **protected** by — and it is the most consequential of the
three, because a stop is the entire arithmetic of position sizing.

---

## The measured gap

`selectOrderFill` returns the **observed price** for every order type:

```ts
const triggered = buy ? px >= stop : px <= stop;
case "stop": fills = triggered; break;
...
return { fillPx: px, queueBasis: selectFillQueueBasis(order, px) };
```

So on /paper the price that **triggers** a stop is also the price it **fills**
at. "I am risking the distance to my stop" is therefore exactly true here.

At a real venue it is not. A triggered stop becomes a **MARKET order** and
fills at whatever comes next — across an earnings print, a halt reopen, a
Sunday future, that can be far past the level. A real stop is a **trigger, not
a floor**.

## The hole that let it through

Every other order type on /paper already carries a fill caveat. A plain stop
carried none, and the reason is subtle enough to be worth writing down:

```ts
if (order.type !== "limit" && order.type !== "stop-limit") return "unconditioned";
```

`selectFillQueueBasis` is **correct** to skip it — a stop has no limit level, so
the touch/through question genuinely does not apply. And
`paperExecutionRealism` does not close it either: `no-spread` names a constant
edge of one spread, `unbounded-size` names depth. **Neither names GAP RISK**,
which is unbounded and is the only risk a stop exists to be exposed to.

A gap between two modules that are each individually right is still a gap.

## A second mechanism, also disclosed

The trigger is evaluated inside a quote-tick effect. /paper learns a price only
when it **polls** one; it never reads a tape. Every stop here triggered against
a **sample**, not against the print that actually crossed the level.

## Derived, not invented

`stopPx` and `fillPx` are both already on the persisted order, so the distance
between them is **measured**, and a stop booked long before this file existed
grades by exactly the same rule. No new field, nothing stored.

What that number *means* is stated narrowly, and this is the whole discipline
of the atom:

> That distance is what /paper's polling gap **alone** cost you — a real venue
> adds queue and depth on top of it, so treat it as a **FLOOR** on the real
> number, never the real number.

## The formatter that refused to lie

Two decimals is what a stock trader reads. But a sub-cent slip on a cheap
instrument rounds to `0.00`, and "0.00 past its level" reads as a **perfect
fill** — the exact opposite of what was measured. So the width follows the
number, not a price threshold:

```ts
const short = n.toFixed(2);
if (n > 0 && Number(short) === 0) return n.toFixed(6).replace(/0+$/, "");
return short;
```

This was caught by the tests going red on a cosmetic-looking assertion. The
tests were right and the implementation was wrong.

## The H1 rule, a third time

| input | stopFilledCount | measuredCount |
|---|---|---|
| `{status:"filled", type:"stop", side:"sell", stopPx:100, fillPx:99.25}` | 1 | 1 |
| `{status:"filled", type:"stop", stopPx:undefined}` | 1 | **0** |
| `{status:"filled", type:"stop", side:undefined}` | 1 | **0** |
| `{status:"pending", type:"stop", ...}` | 0 | 0 |

An unreadable `stopPx`, `fillPx` or `side` measures **nothing** — not zero.
Reporting 0 would mint the claim that the stop filled perfectly. The order
still counts toward the total, because *that* needs only `status` and `type`.

Price improvement clamps to 0 rather than being reported as a negative worst
case: "your worst slip was −0.02" is a nonsense sentence.

## Sentinels that guard the DEFECT, not only the cure

Two, because this claim rests on two facts:

```ts
it("THE DEFECT: a stop still fills at the price that triggered it", () => {
  expect(TRADE).toMatch(/case\s+"stop":\s*fills\s*=\s*triggered/);
  expect(TRADE).toMatch(/return\s*\{\s*fillPx:\s*px\s*,/);
});

it("THE HOLE: a plain stop still gets no queue-basis caveat", () => {
  expect(QB).toMatch(/type\s*!==\s*"limit"\s*&&\s*\w+\.type\s*!==\s*"stop-limit"/);
});
```

If either stops being true the disclosure becomes a lie, and this is where that
gets caught. **A claim and its justification must fail together.**

## REVIVE (§22, Edit-only)

Deleted `<StopOrderNote />` from the orders tab while leaving the import and the
component declaration intact — the **fourth** run of the shape that once passed
GREEN for `ExecutionRealismNote`.

```
× the per-order note is actually RENDERED, not merely declared
× both are rendered in the ORDERS tab, beside the book they describe
  Tests  2 failed | 29 passed (31)
```

**FAILED BY NAME.** Restored byte-identical; full suite green afterwards.

## Gates

- `vitest run` — **588 files / 6861 tests PASS**, `VITEST_EXIT=0`
- `tsc --noEmit` — `TSC_EXIT=0`

## What this atom does and does not claim

It **does** claim: /paper books a stop at the price that triggered it, so the
distance to the stop was exactly the loss; and the trigger was evaluated
against a polled sample rather than a tape.

It does **not** claim how far any real stop would have gapped. That depends on
the book at that instant, and this module deliberately refuses to estimate it.
The measured distance is presented as a floor and never as a forecast. No stop
is refused, no status is written, and `Math.random` appears nowhere — a
Sentinel asserts all three.
