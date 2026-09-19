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

# The order that could never expire

**Atom:** `165b039` — /paper discloses that its working orders have no time-in-force
**Gate:** Founding Execution Contract §13 — paper execution state machine realism
**Status:** **LIVE OBSERVED** on https://wealthymindsetspro.com/paper

---

## The measured gap

Search this repo for `tif`, `timeInForce`, `GTC` or `expire` on the /paper path
and there is nothing. No field on `Order`. No control on the ticket. No branch
in the fill loop. A pending order is selected by exactly one predicate:

```ts
orders.filter(o => o.status === "pending" && !filledRef.current.has(o.id))
```

and it stays in that set indefinitely, because `loadPaperState` restores it
verbatim on every visit. A buy limit placed Friday afternoon is still working
the following Tuesday and will fill the moment a quote satisfies its level — on
a session the trader was not trading, at a price they last thought about days
ago.

At a real broker that order does not exist. Every venue requires a
time-in-force and the retail default is DAY. So /paper does not simulate GTC.
It simulates something **no venue offers**: an order that can never expire and
was never elected to be that way.

## LABEL, NOT MODEL

The cure is **not** to start cancelling the trader's orders at 16:00 — that
enforces a policy they were never offered and destroys a book they already own.
Nor is it a TIF dropdown backfilled onto every persisted order; a stored field
nobody set is a fabricated one.

`selectOrderRest` says out loud what is already true, using only `ts`, which
every order has carried since the book was first written. **Nothing is
cancelled. Nothing is stored. No status is ever written.**

## Why the grade has FOUR states, not two

The tempting sentence — "a real DAY order would already be dead" — is often
**false**. An order entered at 20:00 New York belongs to the NEXT session, so at
09:00 the following morning a real DAY order is still working. One date boundary
crossed, no session close passed over it.

Certainty arrives one date later: whatever session an order placed on New York
date D belonged to, it was D or D+1, so its close has certainly passed once the
date reads D+2. **That is a claim about the CALENDAR** — it needs no
market-status feed and no holiday table.

| basis | meaning | sentence |
|---|---|---|
| `same-session` | placed today | **none** — a caveat under every row is read by nobody |
| `overnight` | 1 date crossed | "still working… a DAY order does not outlive the session it was entered for" — does **not** claim it would be dead |
| `outlived-day-order` | ≥2 dates crossed | "no DAY order lives this long. If this fills, it fills on a session you were not trading." |
| `age-unknown` | `ts` unreadable | disclosed as unmeasurable, **not** defaulted to "placed today", and deliberately **not** folded into the book-level count |

## LIVE OBSERVED — production, Founder's Chrome

Three non-fillable probe orders were injected into an isolated copy of the book
(limits chosen so no quote can trigger them: buy @ $1.00, sell @ $99,999.00),
the page reloaded, and the Orders tab opened. **No real order was ever placed.**

```
2 WORKING ORDERS HAVE OUTLASTED THE DAY YOU PLACED THEM — /PAPER HAS NO TIME-IN-FORCE

TSLA  BUY   Limit  1  $1.00       pending
  Placed 2026-09-14 and still working. /paper has no time-in-force — nothing here will
  ever expire this order. A real broker makes you choose DAY or GTC, and a DAY order
  does not outlive the session it was entered for.

AAPL  SELL  Limit  1  $99,999.00  pending
  Placed 2026-09-11, 4 days ago, and still working. /paper has no time-in-force, so
  nothing will ever expire it — but no DAY order lives this long. If this fills, it
  fills on a session you were not trading.

MSFT  BUY   Limit  1  $1.00       pending
  (no sentence — placed today)
```

All four behaviours confirmed by direct observation:
the book-level count says **2**, not 3 — it counts only the rows that carry a
sentence; the 1-day row is graded cautiously; the 4-day row is the only one
permitted to say "no DAY order lives this long"; today's order is **silent**.

**Founder browser state:** backed up before the probe and restored byte-identically
after — `restored_identical=true bytes=7501 orders=0 backup_key_removed=true`.
His book is empty, exactly as it was.

## The hydration law, paid for once already

`Date.now()` in a render body was the fifth traced React #418 root cause on this
codebase (HeroTruth). `selectOrderRest` therefore **takes `nowMs` as a
parameter and never reads the clock**, and `useNowMs` starts `null` and is
filled by an effect. Both notes render nothing while it is null. A Sentinel
asserts this shape directly.

## REVIVE (§22, Edit-only)

Deleted `<RestingOrderNote />` from the orders tab while leaving the import and
the component declaration intact — the exact shape that once passed GREEN for
`ExecutionRealismNote`. **FAILED BY NAME** on *"the per-order note is actually
RENDERED, not merely declared"* and *"both are rendered in the ORDERS tab"*.
Restored byte-identical; full suite green afterwards.

The lesson, now carried twice: **consulting a selector is not rendering its
answer.** Sentinels assert the ELEMENT.

## Gates

- `vitest run` — **586 files / 6809 tests PASS**, `VITEST_EXIT=0`
- `tsc --noEmit` — `TSC_EXIT=0`

## What this atom does and does not claim

It **does** claim: /paper has no time-in-force, nothing here will ever expire an
order, and once two New York dates have passed no DAY order could still be
working.

It does **not** claim: that a real venue would have killed any particular order
(that depends on the session it was entered for and on the exchange calendar,
and this module deliberately refuses to assert either), nor that any order has
been or will be cancelled. **Nothing on this page cancels anything.**
