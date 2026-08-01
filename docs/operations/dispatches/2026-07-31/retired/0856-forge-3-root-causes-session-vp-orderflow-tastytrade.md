# FORGE — 3 architecture root causes to lock TODAY (market open)

**From:** Atlas / Mission Control · **Time:** 2026-07-31 08:56 CDT · **Repo HEAD:** `62229ed`

## Situation

Founder is on live market at 08:52 CDT and calls out 3 defects that all trace back to data-truth / architecture contracts — your lane per DEC-008 and DEC-012. Sentinel is running the audit in parallel and will file the P0 tickets; you don't wait for them, you start on root causes now.

## Your 3 items

### 1. WM-VP-P0-01 — Session Volume Profile broke AGAIN

Second recurrence. First fix was WM-RESP-P0-02 era. Founder proof: TSLA 15m at 08:52 CDT — Session VP absent / wrong.
Recurrence pattern indicates the fix addressed a symptom, not the root cause. Options:
- Reset-on-symbol-switch race (likely — same class as WM-CHART-P0-06 you shipped for tick fold).
- Alpaca REST/tape shape drift.
- ChartContext dataVersion boundary miss for VP consumer.

Deliverable:
- Read `src/components/chart/WMSessionVP.tsx` + how it consumes ticks + how it resets on symbol change.
- Trace the two prior "fixes" in git log: `git log --oneline --all -- src/components/chart/WMSessionVP.tsx | head`
- Publish root-cause handoff at `docs/operations/handoffs/forge/2026-07-31-forge-wm-vp-p0-01-root-cause.md` with:
  - What the previous fixes actually addressed
  - Why they didn't hold
  - The invariant that must be maintained (byte-precise)
  - A contract Noah implements (files, tests, acceptance)
- **Do NOT ship** — dispatch Noah with the contract.

### 2. WM-OF-P0-05 — Order flow toolset not all working

Founder claim: Bid×Ask / Delta / Vol Profile / Imbalance / Agg-Passive / Big Trades — "they all need to function properly, right now there not fully working."
For EACH tool, audit:
- Does the toggle actually mount the correct consumer?
- Does the consumer subscribe to a live feed OR fall back to REST honestly?
- Does it show `unavailable` when feed is missing (Founder truth rule §5) or does it silently render empty?

Deliverable:
- Per-tool handoff `docs/operations/handoffs/forge/2026-07-31-forge-wm-of-<tool>.md`
- Each is either GREEN (working, close ticket) or NEEDS-NOAH (bounded implementation ticket + dispatch).

### 3. WM-BROKER-P0-01 — Tastytrade shows no futures + expand real-broker list

Two parts:
- **Part A (tastytrade futures):** audit `src/lib/tastytrade.ts` (verify with grep first — never edit dead code). Is the API scope requesting futures entitlement? Is the account list filter dropping futures symbols? Founder should see futures in Connect Broker / Trade.
- **Part B (more real brokers):** Founder wants to expand: "we want to add some more real brokers people will be able to actually connect with and use."
  Publish a broker candidate matrix in `docs/operations/handoffs/forge/2026-07-31-forge-broker-expansion-matrix.md`:
  | Broker | US retail | OAuth available | Paper + Live | Fee structure | Legal/T&C blockers | Integration effort |
  Recommended shortlist: Alpaca (already in), IBKR, Tradier, Schwab, Robinhood (unofficial API — flag legal), Webull.
  You do NOT commit to any broker without Founder signoff — the matrix is a decision aid, not a plan.

## Never do

- Ship code. You architect. Noah implements after your contract.
- Add a broker without Founder scope approval.
- Silently substitute delayed data as real-time. Every unavailable feed must render `unavailable` (Founder rule §5).
- Wait for the Founder. DEC-011.

## Do this now

```
cd /Users/dspaidnoosleep/wealthymindsets-pro && git pull --ff-only origin main
# audit Session VP root cause + order flow tools + tastytrade futures
# publish 3 root-cause handoffs, one broker matrix
# dispatch Noah with contracts for each ticket that needs implementation
git add docs/operations/handoffs/forge/2026-07-31-*.md docs/operations/dispatches/2026-07-31/ docs/operations/ACTIVE_TASK_QUEUE.md docs/operations/EMPLOYEE_STATUS.md
git commit -q -m "arch(forge): 3 root cause handoffs — Session VP recurrence, order flow toolset, tastytrade futures + broker matrix"
git push origin main
```
