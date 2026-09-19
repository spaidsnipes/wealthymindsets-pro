<!-- BEGIN:ath-historical-lineage -->
> # ⛔ HISTORICAL LINEAGE — NOT CURRENT AUTHORITY
>
> **MEMORY MAY TEACH. ONLY CURRENT AUTHORITY MAY COMMAND.**
>
> This is a **shift baton** — a hand-off written at the end of one shift. Its filename names its own day. It was true
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

# WM PRO — SHIFT BATON I · 2026-09-16

## THE TRANSITION THAT MOVES CASH HAD NO OWNER

Continues baton H (`WM-PRO-SHIFT-2026-09-16-H-A-GUARD-THAT-MEASURES-SOMETHING-ADJACENT`).

---

## WHAT LANDED

| commit | slice |
|---|---|
| `98444c3` | baton H sealed |
| `d03bf47` | the paper order state machine's third terminal transition got an owner |

Both pushed. `main` is clean and **0 ahead** of `origin/main`.

---

## FINDING — two of three terminal transitions were owned

Founding Contract §13 asks for "paper execution state machine / order ledger /
reconciliation realism". The machine has exactly three edges into a terminal
state. Counting them was the whole investigation:

```
pending -> cancelled   canCancelOrder()        guarded, tested
pending -> rejected    applyOrderRejections()  guarded, tested
pending -> FILLED      an inline .map() in page.tsx   NEITHER
```

The unowned one is the one that **moves cash.** It read, in full:

```ts
setOrders(prev => prev.map(o => fillPxById.has(o.id)
  ? { ...o, status:"filled", fillPx: fillPxById.get(o.id)! } : o));
```

`has(o.id)` is the entire test. Not the status.

### Why the filter upstream is not a guard

The `pend` filter does check `status === "pending"` — against the `orders`
value the effect closed over. The updater runs against `prev`, which is
whatever the book actually is at flush time.

This module already holds that principle twice, and both times it was argued
from principle rather than from a reachable path: `selectPaperQuoteReadiness`
exists so "UI-disabled controls" cannot "become the sole guard", and
`canCancelOrder` exists because the Cancel button rendering only for pending
orders was not enough.

This one has a **reachable path.** `/paper` subscribes to cross-tab writes and
applies them with `setOrders(saved.orders)` — a wholesale REPLACEMENT, not a
merge. Another tab's cancel lands in this tab's update queue alongside the fill
commit, and the two orderings give two different lies:

- **replacement first** → a CANCELLED order is relabelled `"filled"`.
- **fill first** → the ledger says cancelled while the cash and the position it
  opened stay on the books.

`applyOrderFills` closes the first. It **cannot** close the second and does not
pretend to — the cash already moved; that is a reconciliation question the
book-integrity surface owns. Stated in the function's own header rather than
left for the next reader to discover.

### Two revive-attempts, and they fired differently on purpose

Both were run, and in each case I checked **which** tests fired, not just that
the suite went red.

**1. Restore the inline map** (owner still present and still correct):

```
× the page delegates the fill transition instead of mapping it inline
EXIT=1 — 1 failed | 44 passed
```

Exactly one test, and the right one. The other seven exercise the pure owner,
which the revive did not touch — it removed only the CALL. That is the orphan
failure class, and a delegation Sentinel is the only instrument that can see it.

**2. Strip the terminal guard from the owner** (delegation intact):

```
× refuses to relabel an order another tab already cancelled
× refuses every terminal status, not just the one that was easy to picture
× both terminal transitions refuse a settled order identically
EXIT=1 — 3 failed | 42 passed
```

Three, and the delegation test correctly stayed green — the page was still
delegating. Two defects, two disjoint sets of guards, no overlap. Neither
revive could have been caught by the other's test.

### The symmetry test exists because of HOW this was missed

The defect was not a bad guard. It was a third transition written somewhere the
other two's shape was not visible. So the last assertion runs **both** owners
through the same terminal matrix, with a positive control proving each one does
act on `pending` — otherwise the matrix would be proving inertness rather than
refusal. A fourth transition now has a stated law to match.

---

## RECORDED HONESTLY — investigated and NOT defects

Live suspicions that measurement killed. Written down so the next reader does
not re-open them.

**Time-in-force is not a missing fourth transition.** `paperOrderTimeInForce.ts`
already resolved this deliberately as **label, not model** — it grades a resting
order's age from `ts` and says so, cancels nothing, stores nothing, and prints
no sentence at all on the day the order was placed. Its own header explains why
inventing an expiry policy would destroy working orders from a book the trader
already saved. There is no unowned edge here.

**The Exit Ramp's "N decision record(s) preserved" is a dead branch, not a
lie.** `command-deck/page.tsx:741` gates it on `decisionRecords.length > 0`.
Checked whether that array unions in Journal decisions — it does not:
`useDecisionMemoryRecords` reads `store.list(ownerId)` and nothing else, and
that store is provably empty. So the sentence never renders. Nothing false
reaches the screen.

**`hasUnreviewedClose` is structurally `false` and still not a screen lie.**
It is `.some()` over the same provably-empty array, so `inferJobMode` can never
reach REVIEW by way of decision state. But unlike `position` — which was
correctly upgraded to three-state `CapitalObservation` because a `false` from a
blind caller printed *"with no position"* at a trader — this signal only fires a
branch when TRUE. A `false` produces no claim at all; it falls through. Dead
capability, already named in `decisionMemoryReachability.test.ts`'s header and
already flipped red by that file's BLOCKER assertions the moment a writer
appears. Adding a second assertion would be a third copy of one question.

**Decision Memory was deliberately not wired.** Its reachability file says why
in its own words: "inventing a caller to turn this file green would manufacture
exactly the kind of unreachable ceremony it exists to detect." The instruction
to surface and not rush-wire is already satisfied by that file plus the
`DECISION_RECEIPT_UNWIRED_HEADLINE` disclosure, which names the CAUSE and is
forbidden from containing the word "yet".

---

## STATE AT SEAL

- `main` @ `d03bf47`, pushed, **0 ahead**.
- **665 test files / 7989 tests passing.** `tsc --noEmit` **EXIT=0**. Both run
  UNPIPED — a pipe masks the exit code.
- Test count arithmetic: 7981 → 7989 (+8 fill-transition guards).
- Untracked and deliberately left alone: `scratchpad/`, baton
  `WM-PRO-SHIFT-2026-09-13-X-ROOM-MEASURE-AND-AUTHORITY.md`.
  `public/founder-room-sample.html` shows modified — written by a test run.

### Live-verification status — read this before claiming anything about prod

**`d03bf47` is pushed but NOT LIVE.** `npm run deploy:cf` is Founder-blocked
(denied by the auto-mode classifier, not to be worked around), so
`wealthymindsetspro.com` reflects an **earlier deploy**.

This slice was not live-verified, and the reason is stated rather than blurred:
the fill transition fires inside a `useEffect` on a quote tick in a page with no
test-reachable DOM, and the reachable failure needs **two tabs racing a
cross-tab write**. No probe available here can stage that. The evidence is the
pure-function property set plus two disjoint revive-attempts, and that is the
honest ceiling for this change.

---

## OPEN / BLOCKED

- ~~**Delta Bubbles level ownership**~~ — **CLOSED** in baton H.
- ~~**paper execution state machine realism**~~ — **CLOSED.** All three terminal
  transitions now owned and guarded; symmetry asserted so a fourth has a law.
- **Live VP render geometry proof** — still open. Canvas has no DOM; needs a
  different instrument, not another unit test.
- **Decision Memory sealing** — zero production callers. Architectural, and
  correctly surfaced. Do not rush-wire.
- **executionConnectivity** — orphaned, not a live defect; `/readiness`
  discloses it honestly.
- **Gate 4 responsive device proof** — BLOCKED: programmatic window resize does
  not take effect, `outerWidth` stays pinned.
- **`/journal` detail canvas** — BLOCKED: 0 journal entries.
- **Deploy** — BLOCKED on the Founder. Nothing sealed here is on prod.
