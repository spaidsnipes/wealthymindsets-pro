# FORGE → SENTINEL — VP bisect narrowed; here is the discriminating repro protocol

**From:** Forge (Principal Architect) · **To:** Sentinel (COO) · **Time:** 2026-07-31 ~10:35 CDT
**Repo HEAD:** `21390e7`
**Full analysis:** `docs/operations/handoffs/forge/2026-07-31-forge-wm-vp-p0-01-bisect-addendum.md`
**Extends (does not replace):** `docs/operations/handoffs/forge/2026-07-31-forge-wm-vp-p0-01-root-cause.md`

---

## Answer to the Sentinel/Founder repro-mismatch

Founder's "doesn't even appear" was captured on **BTC 1D**. That directly matches my existing spec's **F-A** failure mode (VP hardcodes `/api/yahoo?sym=BTC` — Yahoo does not cleanly serve crypto → empty response → `levels.length === 0` → *"No reported volume for this session"*). It is a **pre-existing structural defect**, not a regression from any of the four bisect candidates.

Bisect-verdict summary (details in the addendum):

- `a223fc5` — HUD badge overlay. **Not a trigger.** Purely visual; can only occlude, not empty.
- `3cbf3a9` — WS tick-fold gate (P0-06). **Plausible trigger only** for F-C (empty-gate hides live tape). If pre-`3cbf3a9` a looser tick-fold rendered the live layer under bar-empty conditions, tightening the gate would expose F-C universally.
- `fd12f1e` — badge visibility CSS. **Not a trigger.** No data path.
- `0270590` — Delta bubble migration. **Not a trigger.** Comment-only line in MainChart per Noah's forensic. **Do not revert.**

Only `3cbf3a9` is even a plausible *trigger* — and the fix contract already absorbs it (once VP consumes the chart's canonical candles + `dataVersion`, the tick-fold path becomes irrelevant to VP).

---

## Your discriminating repro protocol (Founder's live tab state)

Reproduce on authenticated production `/charts`. Screenshot each. Publish verdict per test.

### Test A — F-A discriminator (provider divergence, Founder's likely repro)
1. Fresh tab. Symbol **BTC**, timeframe **1D**, ORDER FLOW OFF, Big Trades OFF, WM Session VP ON.
2. **Expected under F-A:** panel reads *"No reported volume for this session"* immediately.
3. If this reproduces → root cause is F-A, aligns with Founder screenshot, fix is Noah's contract as written.

### Test B — F-B discriminator (stale-session date)
1. Fresh tab. Symbol **TSLA**, timeframe **15m**, pre-market or first ~5 min of RTH open.
2. **Expected under F-B:** panel renders *yesterday's* RTH profile as today's. Verify POC/VAH/VAL against yesterday's TSLA close.

### Test C — F-C discriminator (tick-fold gate change, only bisect-plausible trigger)
1. Fresh tab. Symbol **TSLA**, timeframe **15m**, mid-session with tape flowing.
2. State: ORDER FLOW OFF, Big Trades **OFF**, WM Session VP ON. Note VP state.
3. Flip **Big Trades ON**. Note whether VP breaks or changes.
4. **Expected under F-C triggered by `3cbf3a9`:** VP was partially rendering from the live layer before; stops when Big Trades subscribes to the same fold path.

All three are independent bugs and any subset can be positive.

**Whichever positive, the fix is identical** (Noah's contract) — the value of proving *which* is confidence for your post-fix verification: re-run the same protocol after Noah ships and confirm none reproduce.

---

## What NOT to spend cycles on

- **Testing `a223fc5`, `fd12f1e`, or `0270590` as data-defect triggers.** They cannot cause VP to be empty. Skip them.
- **Reverting `0270590`.** Noah's static analysis is correct and my bisect confirms it. Reverting would not restore VP and would re-introduce a dual Delta control.
- **A per-commit test.** Do not add unit tests keyed to individual bisect commit SHAs — they rot the moment the commit is revised. The four tests in the root-cause handoff §4 cover all three failure modes at the invariant level.

## Coordination
- Noah is already implementing the root-cause contract.
- Contract to Noah unchanged.
- If Test A/B/C produces an unexpected fourth failure mode, escalate via Nehemiah (dep coordination) or Elias (scope conflict). Do not ping the Founder (DEC-011).
