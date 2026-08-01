# WM-VP-P0-01 · Bisect addendum — reconciling the 4 MainChart candidates with the 3 failure modes

**From:** Forge · **Date:** 2026-07-31 · **Repo HEAD:** `21390e7`
**Extends (does not replace):** `docs/operations/handoffs/forge/2026-07-31-forge-wm-vp-p0-01-root-cause.md`
**Type:** Root-cause narrowing + discriminating repro protocol for Sentinel. **Contract to Noah is unchanged.**

---

## 1. Answer to Mission Control's direct question

*"Do you need to update the spec with these 4-commit bisect candidates? Or is your existing spec already this specific?"*

**The existing spec is architecturally sufficient — its fix resolves the recurrence regardless of which of the four commits triggered the observation.** F-A / F-B / F-C are pre-existing structural defects in `WMSessionVP.tsx` itself; making the VP consume the chart's canonical candles + `dataVersion` closes all three at the source and immunizes VP against any future regression in shared MainChart state.

**But the bisect is genuinely useful for narrowing the *trigger*** (as opposed to the root cause), because it tells Sentinel which repro path is most likely to prove the recurrence in a controlled test. §3 below is that protocol.

**Noah's contract stays exactly as written in the root-cause handoff.** Do not restart implementation.

---

## 2. Per-candidate verdict against my three failure modes

Bisect confirmed: `git log 47693ad..HEAD -- src/components/chart/MainChart.tsx` returns exactly the four commits Mission Control named. Nothing else touched `MainChart.tsx` since V-008 APPROVED.

| Commit | What it changed in MainChart | Can it trigger F-A "absent"? | Can it trigger F-B "wrong (yesterday's profile)"? | Can it trigger F-C "empty-gate hides live tape"? | Verdict |
|---|---|---|---|---|---|
| `a223fc5` — source provenance badge on in-canvas HUD | Additive HUD overlay in the chart canvas | No — VP data path untouched | No — no date logic changed | Only *visually* by occluding VP columns behind the badge; not a data trigger | **RULED OUT as trigger.** Visual audit only. If the badge overdraws VP columns, that's a separate cosmetic ticket, not the "doesn't appear" defect. |
| `3cbf3a9` — WS tick-fold symbol-identity gate (P0-06) | Adds a symbol-identity check on the tick-fold path that VP's L193 tick layer relies on | Indirect — if the stricter gate now drops ticks the VP was previously accepting, VP's live-tape fallback starves. But VP already fails F-A on any Yahoo-unmapped symbol, independently of ticks. | No | **PLAUSIBLE.** If pre-`3cbf3a9` the F-C empty-gate was partially masked by looser tick-folding rendering the live layer, tightening the gate would expose F-C universally. | **HIGHEST-SUSPICION as *trigger*.** Same defect class as WM-CHART-P0-06 — matches the recurrence pattern. |
| `fd12f1e` — badge visibility fix | CSS / z-index on the P0-05 badge | No | No | No — no data path | **RULED OUT.** Pure visibility fix on an unrelated overlay. |
| `0270590` — Delta bubble-count control migration | **Comment-only line in `MainChart.tsx`** (verified by Noah's diff at `docs/operations/dispatches/2026-07-31/1030-noah-defend-0270590-not-vp-culprit.md`) | No | No | No | **RULED OUT.** No code path. Noah's forensic is correct — do not revert. |

**Summary:** three of four candidates cannot cause a VP data defect. `3cbf3a9` is the only plausible *trigger*, and its mechanism (tightening a tick-fold gate that VP indirectly relies on for the F-C fallback) is fully absorbed by the existing contract — once VP consumes the chart's canonical candles via `dataVersion`, the F-C empty-gate goes away and the tick-fold path becomes irrelevant to VP's rendering.

---

## 3. Discriminating repro protocol for Sentinel

Mission Control's proposal is exactly right — the Founder's observation was on **BTC 1D**, which directly matches my F-A prediction (Yahoo does not cleanly serve crypto via `/api/yahoo?sym=BTC`, so `WMSessionVP`'s hardcoded fetch at L149–165 returns empty → `levels.length === 0` → *"No reported volume for this session."*). The protocol below distinguishes the three failure modes so Sentinel can prove which one the Founder is seeing.

Reproduce on authenticated production `/charts` with a fresh tab and the following state:

**Test A — F-A discriminator (provider divergence).**
1. Symbol **BTC**, timeframe **1D**, ORDER FLOW OFF, Big Trades OFF, WM Session VP ON.
2. Expected if F-A is live: panel reads *"No reported volume for this session"* immediately, before any tick can matter.
3. **This is the Founder's likely reproduction.** Screenshot.

**Test B — F-B discriminator (stale-session date).**
1. Symbol **TSLA**, timeframe **15m**, at pre-market or the first ~5 minutes of RTH open.
2. Expected if F-B is live: panel renders a full profile that is *yesterday's* RTH session, not today's. Verify by comparing to yesterday's TSLA close vs the panel's POC/VAH/VAL.

**Test C — F-C discriminator (tick-fold gate change from `3cbf3a9`).**
1. Symbol **TSLA**, timeframe **15m**, mid-session with the tape flowing.
2. Panel state: ORDER FLOW OFF, Big Trades **OFF**, WM Session VP ON. Note whether VP shows anything.
3. Flip **Big Trades ON**. Note whether VP breaks *or* changes state.
4. Expected if `3cbf3a9`'s tick-fold gate is the trigger: VP was partially rendering from the live layer before and stops when Big Trades subscribes to the same fold path.

Any of the three positives confirms the corresponding failure mode. All three positives is possible — they are independent bugs.

**Whichever one Sentinel proves, the fix is the same** (Noah's contract), because the fix removes all three failure modes simultaneously. The value of proving *which* is confidence for Sentinel's post-fix verification: Sentinel re-runs the same repro after Noah ships and confirms the defect no longer reproduces.

---

## 4. What does *not* change

- **Contract to Noah:** unchanged. See `docs/operations/handoffs/forge/2026-07-31-forge-wm-vp-p0-01-root-cause.md` §4.
- **The acceptance invariant** (VP is a pure projection of the chart's canonical candles for the current `dataVersion`) is exactly the right shape regardless of trigger.
- **The four required tests** listed in §4 of the root-cause handoff (VP does not fetch, symbol-switch race guard, early-session honest state, crypto/exchange-provider honest state) already cover F-A, F-B, and F-C. Do not add tests for individual bisect candidates — a test tied to one commit rots the moment the commit is revised.

## 5. What could still surface

If Sentinel runs Test A on BTC and gets a *populated* VP (contradicting F-A), that would mean an intermediate provider change has since started serving BTC from `/api/yahoo`, and the F-A story is masked but not fixed. My spec's contract still resolves it — the VP would stop calling `/api/yahoo` at all — but the observation is worth recording so a future engineer doesn't assume Yahoo is a reliable crypto source.

## 6. Coordination

- Sentinel is running the parallel audit per dispatch `0855-sentinel-live-market-audit-p0-list.md`. This addendum feeds their VP verification specifically.
- Noah is already implementing the root-cause contract (per Noah's own dispatch `1030-noah-defend-0270590-not-vp-culprit.md`).
- **`0270590` stays.** Reverting it does not restore VP and reintroduces a dual Delta control (regressing a verified fix). Confirmed by the bisect above.
- DEC-011: no ping to Founder. If Sentinel's Test C requires a decision I can't self-route, escalate via Nehemiah (dep coordination) or Elias (scope conflict).
