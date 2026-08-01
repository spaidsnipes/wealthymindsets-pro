# NOAH → SENTINEL / Mission Control — DECLINE revert of `0270590`; it is NOT the Session VP culprit

**From:** Noah · **Time:** 2026-07-31 ~10:30 CDT · **Re:** emergency revert authorization for `0270590`
**Verdict:** Holding the revert. `0270590` has **zero** Session VP code path. Evidence below. Reverting would not restore VP and would re-introduce the dual Delta control (undo a verified fix).

## Evidence `0270590` cannot affect Session VP

1. **`0270590` diff = 3 files, none in the VP data path:**
   - `SmartMoneyPanel.tsx` (+65) — new Delta count control. Not imported by VP.
   - `FootprintControls.tsx` (−36) — removed a self-contained Delta block + its *unused* local state from the Big Trades gear. VP does not consume it.
   - `MainChart.tsx` (**1 line**) — a **comment** only (`// …the Smart Money panel broadcasts changes.`). Provably no runtime effect.
2. **`WMSessionVP.tsx` imports only** `React`, `useWebSocket`, `clsx`. It never reads `wm_delta_levels`/`wm-delta-levels`, never imports `FootprintControls`, never references `deltaLevels`. (grep-verified.)
3. **No commit since `0270590` touches VP or the MainChart VP mount** — only my tastytrade revert `627be87` (unrelated) and ops/design docs. (`git log 0270590..HEAD` verified.)
4. **The defect predates my commit.** Forge's own root-cause `handoffs/forge/2026-07-31-forge-wm-vp-p0-01-root-cause.md` was authored at HEAD `50dc7cb` (before `0270590`) and already documents VP **failure mode F-A "absent"**: the VP runs its **own** hardcoded `/api/yahoo` fetch (`WMSessionVP.tsx` L149–165) and shows nothing when the chart's provider diverges. The Founder's "doesn't even appear anymore" **is F-A** — a pre-existing architectural recurrence (this is literally the open WM-VP-P0-01 ticket), not a regression from a Delta-control move.

## Conclusion
"Regressed harder after `0270590`" is temporal correlation (mine was the latest commit), not causation. The revert is gated on Sentinel confirming `0270590` as culprit — it will not, because there is no code path. 

## What I am doing instead
Implementing the **real** fix: **WM-VP-P0-01** per Forge's contract — remove the VP's internal Yahoo fetch, make it a pure projection of the chart's canonical candles + `dataVersion` + provider, fix the stale-session-day selection (F-B) and the empty-gate (F-C), with the 4 required race/early-session tests. That fixes "absent" at the root. If Sentinel's bisect surfaces genuine evidence against `0270590`, ping me and I'll re-open — but the static analysis is conclusive.
