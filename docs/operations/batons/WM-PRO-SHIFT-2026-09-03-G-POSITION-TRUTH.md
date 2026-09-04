# BATON — §14.1 / §14.4 Position Truth (lane G)

GOVERNING CANON: "WM Pro — Operating System BUILD ORDER — Natural Language —
BINDING — September 3, 2026". This lane closes two of the §14 invariants and
gives the reducer a real production caller so it does not become another
orphan (§25).

Commits sealed by this baton: `6a90d91`, `2e37869`.

## FOUNDER_VISIBLE_DELTA

**A failed position refresh no longer erases your position from the screen.**

Before, on the Alpaca panel: if the refresh failed, the failure branch was
evaluated FIRST and replaced the entire list. A trader carrying real risk saw
an error box where their position had been. If the list was still at its
initial empty value, the panel rendered the words **"No open positions"** — it
told a trader holding risk, confidently, that they held none.

After:

```
┌──────────────────────────────────────────────┐
│ Could not refresh positions.                 │  ← banner, role="alert"
│ This is not a confirmation that you hold      │
│ none. Last confirmed 9:41:07 PM.              │
├──────────────────────────────────────────────┤
│ SPY   4 @ 612.40      +$18.20                │  ← your position STAYS
│ LONG 4 — LAST KNOWN, not confirmed           │  ← amber, never green
└──────────────────────────────────────────────┘
```

The failure became a **banner above** the rows instead of a **replacement for**
them. §9: a failure may reduce capability; it may not remove the position from
the screen, and it may not increase certainty.

The row's confidence line is rendered from `truth.sentence` — the panel repeats
the reducer's answer rather than inventing its own wording. It is painted
`#D9A441` (amber), never `#00C076`, because green reads as safe and an
unverified position is precisely what is not safe (§15: no green safe badges).

## The law, made executable

`src/lib/positionTruth.ts` — a pure SELECTOR over position reports. Per §15 it
persists nothing and is **not** a second position store; the paper ledger and
future broker reconciliation remain the only owners of state.

**§14.1 — the UI never says FLAT while broker quantity > 0.**
FLAT is a FINDING, never a default. It requires that every expected source was
actually observed AND every one reported zero AND nothing is stale or disputed.
Anything else is `POSITION UNCONFIRMED`, whose sentence always carries the
clause *"This is not a confirmation that you are flat."*

**§14.4 — a stale client cannot overwrite newer reconciliation.**
Recency decides only WITHIN a rank. `RANK_CLIENT` (0) can never supersede
`RANK_RECONCILIATION` (1).

### The hole I found in my own reducer before testing it

The first draft was pure recency-wins. That version prints **FLAT** for this
input:

```ts
{ source: "broker-recon", qty: 5, observedAt: t },      // holding 5
{ source: "client-cache", qty: 0, observedAt: t + 1 },  // one second later
```

A trader holding 5 told they hold none — the exact state §14.1 forbids, from
the file whose job is to forbid it. Writing the test first would have
green-lit the lie. Rank was introduced so a client view cannot paint over the
broker's own book however fresh it is. That case is now locked as
*"a fresher CLIENT zero cannot paint over a broker position"*.

### Other defects the reducer refuses

- `qty: NaN` is treated as **unobserved**, never as zero. A report carrying a
  non-finite quantity is not evidence of anything, and counting it as 0 is how
  a parse failure becomes a false FLAT.
- A **stale** zero does not settle into FLAT (`confidence: "STALE"`).
- A stale **non-zero** position stays visible as `LONG 7 — LAST KNOWN, not
  confirmed`. Downgrading confidence is honest; hiding risk is not.
- Equal-recency disagreement is `DISPUTED` with `qty: null` — a dispute can
  never resolve to FLAT even when one side says zero.
- Staleness is measured from the **authority**, not the newest report of any
  rank, so a chatty client cannot make a cold broker book look fresh.
- Arrival order does not change the outcome.

## Tests

- `src/lib/positionTruth.test.ts` — 21 tests. Not component tests: the two
  invariants written as executable law.
- `src/lib/alpacaPositionTruthSurface.test.ts` — 6 Sentinels on the panel.
  Locks the regression directly:
  `expect(CODE).not.toContain('positionsLoad === "failed" ? (')` and
  `expect(CODE).toContain('{positionsLoad === "failed" && (')`.

**Sentinel technique note for the next seat:** comments are stripped before any
absence assertion —

```ts
const CODE = SOURCE.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
```

A Sentinel that forbids NAMING a defect punishes documenting it, and the
comments in this panel deliberately quote the failure they prevent.

`src/lib/brokerPanelFailureTruth.test.ts` was **updated, not weakened**. It
asserted the literal `"Could not load positions."`; the verb moved to
"refresh" when the failure stopped REPLACING the list and became a banner
above it. The disclosure is the invariant; the wording followed the safer
behaviour, and the test file says so.

## GATES (run UNPIPED — a pipe masks the exit code)

- `6a90d91`: 368 files / 3456 tests — VITEST_EXIT=0, TSC_EXIT=0
- `2e37869`: 369 files / 3462 tests — VITEST_EXIT=0, TSC_EXIT=0

One run in this lane was piped (`| tail -12`). Its exit code is not
trustworthy and it was re-run with `--reporter=dot` unpiped before commit.
Recording it because a masked gate that nobody notices is how a red suite
ships.

## Hydration note (do not "fix" this back)

The panel passes `now: positionsAsOf ?? 0` to the reducer, not `Date.now()`.
This panel loads on mount rather than polling, and a `Date.now()` read during
render is the documented root cause of WM's React #418 hydration mismatches.
The observation is its own clock.

`setPositionsAsOf(Date.now())` is on the **success path only** — a failed
refresh must not be able to advance the "last confirmed" stamp. There is a
test asserting exactly that.

## PROOF LEVEL — honest

- **implemented**: yes, on a named owner (`positionTruth.ts`), with a real
  production caller (`AlpacaTradingPanel.tsx`).
- **tested**: yes, 27 tests across the reducer and the surface.
- **observed**: **NO.** `AlpacaTradingPanel` is not loaded on `/paper`, so
  tonight's live probe of that route says nothing about this panel either way.
  Do not read the bundle-marker FALSE results as negative evidence.
- **proven**: **NO**, and it cannot be from this seat — see blockers.

## BLOCKERS (unchanged, carried forward)

- Every `BrokerAdapter.submitOrder()` returns status `rejected` with
  `brokerOrderId: null`. Steps 5–10 of the TEN-STEP PROOF cannot reach PROVEN
  without a real broker adapter plus credentials.
- `SESSION HALTED` vocabulary is absent and no provider halt signal exists.
- Paper state is localStorage, so §12 cross-device same-identity handoff has
  no server store.
- `/api/market-memory/coverage` returns 503 pending `SUPABASE_SERVICE_ROLE_KEY`.

## EXACT_NEXT_ATOM (§17)

§14 invariants still without an owner:

- **§14.5** — a journal close cannot change execution.
- **§14.6** — Nectar being down cannot block a flatten.
- **§14.7** — missing Greeks cannot dirty a verified last price.
- **§14.10** — a counterfactual cannot enter live statistics.

§14.6 is the highest-harm of the four: it is the one where a degraded
analytics dependency can trap a trader in a position. Take that next.

## COLLISION LOCK observed

`src/components/chart/ChartsDashboard.tsx`, `src/components/chart/ChartToolbar.tsx`,
`src/app/globals.css` and `docs/operations/batons/WM-PRO-EVENING-2026-09-03.md`
belong to another thread and were not touched. Commits in this lane named their
files explicitly rather than staging the tree.
