# BATON — §14.6 / §14.7 exit truth, and the door that is not there (lane H)

GOVERNING CANON: "WM Pro — Operating System BUILD ORDER — Natural Language —
BINDING — September 3, 2026".

Lane G closed §14.1 / §14.4 and named §14.5 / §14.6 / §14.7 / §14.10 as the
next atom. This lane closes all four, promotes them into the ranked invariant
file, and then reports the defect it hit while trying to SEE the §14.6 fix.

Commits sealed by this baton: `9a89d06`, `81681ba`, `a8f5a6e`, `1bbdc62`.

---

## FOUNDER_VISIBLE_DELTA — 1 of 2

**A broken account load can no longer trap you in a position.**

`src/lib/exitPermission.ts` — a pure selector. §15: it stores nothing and is
not a second position store.

The rule is asymmetric on purpose, because the two directions carry opposite
risk:

| You are trying to | Account/Nectar/Positions degraded | Result |
|---|---|---|
| **flatten a long** | yes | **ALLOWED** |
| **cover a short** | yes | **ALLOWED** |
| **open a new buy** | yes, `accountObserved: false` | **DENIED** |
| **sell 10 when 4 are confirmed** | yes | **ALLOWED for 4** |

That last row is the one worth reading twice. The old shape of this problem is
a blanket block: "can't verify your account → can't trade." That is safe for
the platform and dangerous for the trader, because the thing it blocks includes
the exit. The selector instead reduces the order to the part that is provably
risk-reducing — `riskReducingQty: 4`, reason *"close up to 4"* — and lets that
through. You can always get smaller. You cannot get bigger on unverified
capital.

§14.6 as written: *"Nectar being down cannot block a flatten."* A degraded
**analytics** dependency has no business standing between a trader and the
door.

## FOUNDER_VISIBLE_DELTA — 2 of 2

**A missing Greek no longer makes a verified price look dirty.**

Before, the price chip's tooltip could read:

```
Weakest capability: depth · BLOCKED BY ENTITLEMENT
```

next to a quote certified one second earlier. Technically true, entirely the
wrong impression. Depth is a real capability — but **no price rests on it**,
and a chip that labels a PRICE must not answer "what's weakest here?" with
something the price does not depend on.

After, the same input reads:

```
Not affecting this price: depth · BLOCKED BY ENTITLEMENT
```

and the weakness line — now `Weakest price capability:` — only ever speaks
about `bars / quotes / ticks`.

§14.7 forbids **conflating**, not **disclosing**. Nothing is hidden. The
blocked entitlement is still on the record, on a line where it speaks only for
itself. And the scope is not a mute button: a `STALE_PIPELINE` on ticks is the
price's own problem and is still reported as the weakness.

`PRICE_BEARING_CAPABILITIES` and `NON_PRICE_CAPABILITIES` partition the canon
seven, and a test asserts the partition — so no capability can be quietly
dropped out of the model by being absent from both.

### A test that was locking in the defect

`CanonicalFidelityBadge.test.ts` contained:

```ts
expect(t).toContain("Weakest capability: depth · BLOCKED BY ENTITLEMENT");
```

for a LIVE bars+quotes report with a blocked depth entitlement. That is exactly
the conflation §14.7 names, asserted as correct behaviour. It was **rewritten,
not deleted**, and the replacement carries a comment saying what it used to
assert and why that was wrong. A deleted test leaves no trace that the codebase
once believed the wrong thing.

---

## §14 joins the file that outranks component tests

Canon heads §14: **"TESTS THAT MATTER MORE THAN COMPONENT TESTS."**

Before `a8f5a6e`, §14.5 / §14.6 / §14.7 / §14.10 were enforced only by the
tests shipping next to their own module. That is a real gap: a refactor can
satisfy every module-local test and still break the law, because nothing was
asserting the law at the level the canon ranks it. `buildOrderInvariants.test.ts`
went 8 → 15 tests.

**§14.5** (*a journal close cannot change execution*) had to be **structural**.
You cannot prove the absence of a future write at runtime, so the test scans an
explicit list of journal-touching modules and asserts none of them reaches the
execution ledger:

```ts
expect(src).not.toMatch(/setItem\(\s*["'`]wm_paper_state/);
expect(src).not.toContain("savePaperState");
expect(src).not.toContain("applyFill(");
expect(src).not.toContain("placeChartMarketOrder");
```

A path-list scan rots silently when a file is renamed or stops being a journal
module — the assertions keep passing over a file that is no longer relevant.
So each listed file is separately asserted to still BE one:

```ts
expect(src, `${rel} no longer references the journal store`)
  .toMatch(/wm_journal_entries|JOURNAL_STORAGE_KEY/);
```

**§14.10** (*a counterfactual cannot enter live statistics*): an unrealized
entry does not move `expectancyR` or `cumulativeR`; an empty measured sample
returns `undefined`, **not `0`** — because zero is a claim and no-sample is
not; and `PACE_TRUTH_LABEL === "THEORETICAL"` while `selectSessionEdge()` does
not carry a `theoreticalBalance` key at all, so the projection can never be
mistaken for a measured balance.

---

## BLOCKER (new, named, and NOT mine to fix)

**Two chart panels are mounted and cannot be opened. One of them is the SELL
ticket.**

Found while tracing a route that mounts `AlpacaTradingPanel` so the §14.6 exit
fix above could be OBSERVED. There is no route.

```
b08f818  2026-09-01  "unify broker wires and truthful Webull readiness"
         re-pointed the toolbar's onPnL prop:
             setTradeOpen(true)   →   setBrokerOpen(true)
```

`setTradeOpen(true)` is now called **nowhere**. The panel is still imported,
still mounted at `ChartsDashboard.tsx:1806`, still fully wired to its data —
and unreachable. `PnLStatsPanel` (`pnlOpen`) is orphaned identically.

The later rename `onPnL` → `onConnectBrokers` is **honest** — the button says
connect brokers and it connects brokers. There is no label overreach here. The
defect is only the orphan.

This is the most expensive kind of dead code because it does not look dead: the
file compiles, the import is used, the tests pass, and the panel simply never
renders again.

**Why it outranks a tidiness issue:** §14.6 says a degraded dependency may
never block the exit. `AlpacaTradingPanel` **is** the exit. An exit with no
door is the strongest possible version of a blocked exit — and no amount of
work inside that panel, including this lane's own §14.6 fix, can be observed by
a trader who cannot open it.

**Why I did not fix it:** `ChartsDashboard.tsx` and `ChartToolbar.tsx` are held
by another thread this session (confirmed dirty in the working tree at seal
time). Reaching into a file another writer holds to add a button would be a
worse defect than the one being fixed. **The repair is one line in each case
and belongs to whoever holds the lock.** Either resolution is acceptable:

1. give the toolbar a Trade control that calls `setTradeOpen(true)`, **or**
2. delete the mount and the panel, if the live order path is intentionally
   closed while the broker adapters are uncertified.

Leaving it mounted-and-unreachable is not.

### The Sentinel left behind

`src/lib/chartPanelDoorway.test.ts` reads the dashboard, derives the orphan set
mechanically, and pins it. It **fails in both directions**:

- a NEW orphan appears → the set grew, someone is about to ship dead UI;
- a KNOWN orphan is wired or deleted → the set shrank, update the ledger.

So resolving this correctly still trips the test once, on purpose, and forces
the ledger entry to be removed by hand.

**The detector is proven before it is trusted.** A string scanner that silently
matches nothing reports "no orphans" forever and reads exactly like a clean
bill of health. Four synthetic sources run first: closed-only → orphan; opener
present → none; unmounted flag → none; child-owned door (by callback and by
reference) → none.

**The detector was wrong once, and the test says so.** The first draft of
`hasOpener()` only recognised a literal `setX(true)` and reported `gridView` —
whose door is `onGridViewChange={(v) => { setGridView(v); … }}` — as dead UI.
The rule is now **inverted**: a call is an opener *unless* it is provably not
one, i.e. unless its argument is literally `false`. Guessing the other way flags
every child-owned control as dead UI and makes the ledger worthless.

---

## GATES (run UNPIPED — a pipe masks the exit code)

| commit | files | tests | vitest | tsc |
|---|---|---|---|---|
| `9a89d06` §14.6 exit permission | 370 | 3481 | **0** | **0** |
| `81681ba` §14.7 price scoping | 371 | 3497 | **0** | **0** |
| `a8f5a6e` §14 ranked invariants | 371 | 3504 | **0** | **0** |
| `1bbdc62` doorway Sentinel | 372 | 3512 | **0** | **0** |

Every gate in this lane was unpiped from the start.

## Two errors made in this lane, recorded

1. **Wrong argument order** on `theoreticalBalanceAtSession`. I assumed
   `(start, target, horizon, session)`; the real signature at
   `proofLanePace.ts:93` is `(horizonMonths, sessionIndex, start = 100,
   target = 1_000_000)`. Caught by reading the source, not by the test — the
   test would have passed on a meaningless bound. An upper-bound assertion was
   added once the bound meant something.
2. **The `gridView` false positive** described above.

## PROOF LEVEL — honest

- **implemented**: yes — `exitPermission.ts`, `perCapabilityFidelity.ts`,
  `CanonicalFidelityBadge.tsx`, each with a real production caller.
- **tested**: yes — 3512 tests green, unpiped, `tsc --noEmit` clean.
- **observed**: **NO.** Nothing in this lane has been seen in a browser.
- **proven**: **NO.** For §14.7 this is pending a live probe. For §14.6 it is
  worse than pending: the panel carrying the fix **cannot currently be opened
  at all**, so it is not observable by anyone until the orphan above is
  resolved. Do not read "no live evidence" as negative evidence — read it as
  no evidence.

## BLOCKERS (carried forward, unchanged)

- Every `BrokerAdapter.submitOrder()` returns status `rejected` with
  `brokerOrderId: null`. Steps 5–10 of the TEN-STEP PROOF cannot reach PROVEN
  without a real adapter plus credentials.
- `SESSION HALTED` vocabulary absent; no provider halt signal exists.
- Paper state is localStorage → §12 cross-device same-identity handoff has no
  server store.
- `/api/market-memory/coverage` returns 503 pending `SUPABASE_SERVICE_ROLE_KEY`.

## EXACT_NEXT_ATOM (§17)

1. **For the thread holding `ChartsDashboard.tsx` / `ChartToolbar.tsx`:**
   resolve `tradeOpen` and `pnlOpen`. One line each. Then delete the entry from
   `KNOWN_ORPHANS` in `chartPanelDoorway.test.ts`.
2. **For this seat:** the remaining unowned §14 invariants, and a live probe of
   the §14.7 tooltip on a surface that IS reachable — the fidelity chip renders
   outside the orphaned panels, so unlike §14.6 it can actually be observed.

## COLLISION LOCK observed

`src/components/chart/ChartsDashboard.tsx`, `src/components/chart/ChartToolbar.tsx`,
`src/app/globals.css`, `src/app/paper/page.tsx` and
`docs/operations/batons/WM-PRO-EVENING-2026-09-03.md` belong to another thread
and were not touched. Untracked work belonging to that thread (`scratchpad/`,
`chartPhoneControlReachability.test.ts`, `paperOptionCloseReplay.test.ts`) was
left in place. Every commit in this lane named its files explicitly rather than
staging the tree.
