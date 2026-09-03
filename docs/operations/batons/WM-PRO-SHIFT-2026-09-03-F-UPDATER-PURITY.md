# WM PRO SHIFT F — setState purity + ledger integrity
Date: 2026-09-03
Thread: ATHOS single-thread (Claude Code), 15-min loop (cron 5221e2b9)

## SHIPPED
| SHA | Fix |
|---|---|
| 4b342e7 | closeOption mutated state from inside a setState updater |
| 5dc6e9b | WM points ledger could double-credit; spendWMS always reported failure |

## THE CLASS
React requires setState updaters to be PURE and may invoke them more than once —
StrictMode does so deliberately, and concurrent rendering can discard and replay
a render. Any side effect inside an updater is therefore at risk of running
twice. On a ledger that means money or points applied twice.

Found in /paper, then swept every .tsx in src/ for the same shape. **11 call
sites matched.** Triaged rather than mass-edited:

- **5 were `localStorage.setItem` inside an updater** (journal songs, radio
  liked, lounge bookmarked, scanner starred/alerted, ChartsDashboard alerts).
  Impure, but the updaters are pure functions of their input and the write is
  the same value both times — **idempotent, low harm. Deliberately left alone**
  rather than manufacturing churn on a trading app.
- **2 were on the WM points ledger** — fixed.
- The rest (WatchlistPanel setActiveList, ChartsDashboard setReplayPlaying) are
  idempotent flag sets.

## 4b342e7 — closeOption
Called setCash, setTrades and earnWMS from inside the setOptionPositions
updater. A replay credits option proceeds twice, duplicates the blotter row and
re-awards points. Restructured so the updater is a single pure filter and every
side effect runs outside it; the position is read from a new optionPositionsRef.

The existing paperOptionActionability Sentinel asserted `return prev` — how the
old code bailed from inside the updater. Its intent (close must bail on the
canonical readiness owner) is preserved and now **stronger**: the guard returns
BEFORE any state mutation. Assertion updated to that shape.

## 5dc6e9b — the points ledger
**earnWMS** nested FOUR setState updaters inside one another with the
localStorage write innermost. A replay credits balance and totalEarned twice and
duplicates the earnings entry — the user is paid repeatedly for one action.
**This one is live**: /paper and /journal both call it.

**spendWMS** was a different failure:

    let success = false;
    setWmsBalance(b => { if (b >= amount) { success = true; return b - amount; } return b; });
    return success;

React does not run updaters at call time, so the flag was read BEFORE it was
ever assigned — spendWMS reported failure even when it debited the balance.
**Accurate severity: it has NO callers.** A latent trap, not an observed loss.
The first caller would have seen points deducted and the purchase reported
failed.

Both now compute from refs and apply flat pure updates, persisting once. Refs
are seeded synchronously when persisted state loads — otherwise an earn firing
before the mirroring effects run would compute from a zero balance and wipe the
ledger. Both now reject non-finite and non-positive amounts; neither did.

## SWEEPS THAT FOUND NOTHING (recorded so they are not repeated)
- **spendWMS class** (`let flag` → set inside updater → synchronous `return`):
  swept all of src/, **0 other instances**. That bug was unique.
- **computeJournalPnl / computeJournalRealizedR**: pure, canon-anchored, guards
  non-positive inputs, never fabricates R from bare P&L. No defect.
- **/proof-lane**: `actualBalance` is an explicitly-labelled "Manual scenario
  balance" input with an aria-described boundary, kept separate from the
  MEASURED section which is null unless journalEdge is RESOLVED and discloses
  rTagged/total coverage. Honest by design. No defect.

## PROOF
/paper live after deploy: cash $100,000 intact, 0 UNKNOWN, 0 "WAIT FOR VERIFIED
QUOTE", Place Buy Order armed → **no regression** from the ledger refactor.

## STATE
347 files / **3219 tests passing** (unpiped). TypeScript clean.
No collision: another thread shipped 3 commits (command-deck chrome, market-data
fallback containment); my work intact.

## STILL OPEN
- Decision Memory `sealDecisionMemory()` never executes (module imported for
  types by 5 files; the FUNCTION has no caller). Architectural — surfaced for
  Founder intent, NOT rush-wired.
- executionConnectivity orphaned — not a live defect; /readiness discloses
  honestly that READY means "credentials present".
- Gate 4 responsive device proof — BLOCKED (programmatic resize inert).
- /journal detail canvas — BLOCKED (0 journal entries).
- Founder unblock: `/api/market-memory/coverage` 503 names
  `SUPABASE_SERVICE_ROLE_KEY`.

## TIMING TRUTH
No duration claimed. 2 implementation commits, 1 systematic class sweep
(11 hits triaged, 2 fixed, 9 deliberately not), 3 audits that correctly produced
NO change, 1 live regression check, 0 Founder questions.
