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

# The short that needed no shares

**Atom:** `ec272b6` — /paper discloses that its shorts were opened with no shares located
**Gate:** Founding Execution Contract §13 — paper execution state machine realism
**Status:** committed, pushed, **LIVE OBSERVED** on wealthymindsetspro.com/paper

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

## LIVE OBSERVED — production, not localhost

Two probe positions were injected into an isolated copy of the Founder's paper
book (backed up first: `backup_bytes=7501 positions=0 orders=0 trades=0`), the
page reloaded against production, and the POSITIONS tab screenshotted.

**The first injection was REFUSED by production, and that is a finding.** The
probe book carried a position with an unreadable `marketPx`, and
`paperBookIntegrity` rejected it by name:

```
BOOK RECOVERY REQUIRED
1 stored record could not be read and was REJECTED — 1 position.
Your saved book was written in a form this build does not recognise. WM will
not guess at the missing values, so those records are not shown and are not
counted in any total on this page.
```

No total was rendered, no position was invented, and the ORIGINAL bytes were
preserved with automatic writes blocked. That is the H1 rule holding one layer
BELOW the disclosure this atom added — the book refused to read a record it
could not read, rather than reading it as zero. The probe was re-formed and
re-injected; nothing about the refusal was worked around.

What production then rendered, verbatim:

```
1 SHORT POSITION WAS OPENED WITH NO SHARES LOCATED

No locate was required. A real short cannot be entered until your broker finds
shares to borrow — some names cost a daily fee to hold short, and some cannot
be borrowed at all, in which case the order is simply refused. Every name is
infinitely shortable here, and always free.

No collateral was posted. You are short $3,586 and /paper asked for nothing
against it — the sale CREDITED your cash, which can then fund a buy. A real
short does the opposite: it consumes margin rather than creating buying power,
and Regulation T requires collateral of 150% of the short's value.

No buy-in is possible. A real short can be RECALLED: the lender wants the
shares back and the position is closed at the market, without your consent and
usually at the worst moment. A short here closes when you decide, and never
before.

TSLA  SHORT 10  $400.00  $358.63  +413.70  +10.34%
  This is a SHORT worth $3,586. /paper located no shares to borrow and posted
  no collateral for it. A real broker must find the shares first, charges you
  to keep them, and can recall them at any time.
MSFT  LONG 3    $500.00  $500.84    +2.52   +0.17%   (no short note)
```

Four things the rendered SHAPE proves rather than asserts:

1. **The notional is MEASURED, not echoed.** The probe was injected with
   `marketPx: 395`; production printed **$3,586**, which is `10 × 358.63` — the
   live mark the page itself resolved. The disclosure read the book the page
   actually had, not the number the prober supplied.
2. **The per-row note is reserved.** The MSFT LONG row carries no short note —
   the anti-wallpaper rule holding in production, not only in a test.
3. **All three sentences render.** Locate, collateral and buy-in, from the same
   deployed code, with Reg T named as the published rule it is and no borrow
   fee or recall probability minted anywhere.
4. **Nothing was refused.** The short remains open and flattenable; the EXIT
   RAMP above it still offers `Flatten TSLA`. No policy was added.

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
