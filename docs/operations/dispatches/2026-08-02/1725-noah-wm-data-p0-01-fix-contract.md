# NOAH — Implement the WM-DATA-P0-01 emergency fix contract, top priority

**From:** Atlas (coordinator) · **Time:** 2026-08-02 17:25 CDT · **Repo HEAD:** `adf13ac`

## Situation

Your session has been quiet since 23:50 CDT last night. Since then: Forge shipped a full
root-cause audit for the Founder-visible `WM-DATA-P0-01` emergency (ticker rail frozen at
`+0.00%`, SPY showing two contradictory provenance badges, tastytrade connected but invisible).
This is EMERGENCY priority — it supersedes your other queued items (VP crypto-volume fix,
OF-P0-06) until it's closed.

## Your ticket: WM-DATA-P0-01

Read the full audit first: `handoffs/forge/2026-08-02-forge-wm-data-p0-01-quote-pipeline-audit.md`
(fix contract is §6). Queue entry: `ACTIVE_TASK_QUEUE.md` → `WM-DATA-P0-01`.

**Files:** `src/hooks/useWebSocket.ts`, `src/components/chart/BottomIndexBar.tsx`,
`src/components/chart/MainChart.tsx`, new `src/lib/marketSession.ts`, new `src/lib/quoteProvenance.ts`.

1. **`isMarketOpen(assetClass, ts)`** in new `src/lib/marketSession.ts` — DST-correct
   America/New_York + CME calendar (equities RTH/extended, futures 24/5 with Fri 16:00→Sun
   17:00 CT closure, crypto always-open). Replace `BottomIndexBar.tsx` `getSessionLabel()` and
   any other ad-hoc weekend check.
2. **Honest day-change** — `useWebSocket.ts:114-118` currently lets `prev` fall through to
   `price` when `prevClose`/`pc`/`open` are absent, silently producing `+0.00%`. Never do that.
   Carry the last real session close, label it (`at close` / `prev session`), or render
   `unavailable` if genuinely unknown.
3. **Single provenance resolver** — new `src/lib/quoteProvenance.ts` resolves ONE
   `{ provider, live, reason }` per symbol/instant from both candle-liveness (`MainChart.tsx`
   `b.live`) and feed-liveness (`useWebSocket` `source`/`tapeSource`). Both the chart pill and
   header pill must read this one resolver — no independent liveness computation anywhere.
4. **Crypto:** confirm Coinbase/Binance WS actually streams; if BTC/ETH show `+0.00%` that's a
   real break, fix it (crypto is 24/7, never "closed").
5. **Futures:** no WS path exists yet — poll REST during futures hours, label `DELAYED` honestly.
   The WS upgrade itself is a separate ticket (`WM-BROKER-QUOTE-P0-01`, now filed in the queue) —
   don't scope-creep into it here.

**Tests:** `marketSession.test.ts` covering equity/futures/crypto open-state across
Fri-close/Sun-open/DST boundaries; day-change never renders `0.00` when `prevClose` absent;
provenance resolver yields one label under mixed candle/tape providers.

**Acceptance:** on a weekend, equities/futures show last-session change labeled `at close` (not
`+0.00%`); crypto streams live or honestly reports the break; SPY shows one consistent
provenance badge; futures labeled honestly; tsc + tests + build green.

## Never-do list

- Don't fake liveness for anything actually closed (rule §5) — Sunday equities/futures being
  closed is correct; the bug is the `+0.00%` fallthrough and the badge contradiction, not the
  closure itself.
- Don't wire tastytrade quotes as part of this ticket — that's `WM-BROKER-QUOTE-P0-01`,
  separately queued, Forge-contract-first.
- Don't wait for the Founder or for anyone to tell you to start — DEC-011. This dispatch is your
  claim signal.
- One primary ticket at a time — park VP-crypto/OF-P0-06 until this ships.

## To start

```bash
cd /Users/dspaidnoosleep/wealthymindsets-pro
git pull --ff-only origin main
```

Then read the Forge handoff in full, implement per §6, ship with a handoff to
`docs/operations/handoffs/noah/`, and flag Sentinel for live re-verify per the audit's §6
acceptance criteria (a)-(e).
