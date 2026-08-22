# CLAUDE SHIFT-I BATON — 2026-08-21 (Drive deep-dive → product/truth rebalance)

Branch `shift-i-delta-bubbles` off main `991e350`, pushed, merges CLEAN into
current origin/main. HEAD `2ebf9c4`.

## Drive deep-dive (ACTUAL — not a substitute this time)

Google Drive MCP was authorized this session. Read the real **Founding
Execution Contract & Living Implementation Ledger** (fileId
`1KBFVpIkT0dDF1uXowddm0XpOoRCVyWwCzXvylHp6efs`, 265K chars) end to end: §1–17
+ appended ledger entries through 2026-08-20. Key governing direction:

- **§17 Standing Command:** "Open the product. Look at what the Founder sees.
  DO NOT build a prettier dashboard — build the Trading OS. THE APPLICATION,
  NOT THE REPORT, MUST PROVE THE WORK."
- **§13 open gate #1:** "Desktop visible transformation — Founder should see WM
  Pro becoming a Trading OS, not just more backend/test work."
- **§15:** if the last work was only "more tests / cleaner types / another
  migration," REBALANCE toward product transformation.
- **§6:** ONE truth graph → many views; no duplicate stores/engines.
- **§11 acceptance targets** name specific surfaces incl. DELTA BUBBLES and
  DECISION MEMORY (both addressed this shift).

Shift-G/H were heavy backend (AI gateway, EnvRegistry, broker state, TradeLine).
Per §15 this shift REBALANCED to product/truth on named §11 gates.

NOTE: the Contract's own §12 ledger lists "latest commit 08796aa" — stale;
main is +132 (broker/AI work). GitHub remains authoritative per the Contract.
Did NOT modify the Drive contract doc (avoid corrupting the 265K living doc);
this in-repo baton is the ledger record per the established mirror pattern.

## Atoms

1. `7af6abb` **Delta bubbles: stable level ownership** (canon §11 DELTA BUBBLES:
   "stable level ownership … rather than random fluctuating count"). Root cause:
   bubbles bucketed the CURRENT window's min..max into 6 slices, so every
   boundary + bubble price MOVED each render; the user's level-count setting was
   ignored. Fix: new pure `src/lib/marketData/deltaLevels.ts` quantizes each
   trade onto a STABLE magnitude-appropriate price grid (a price always owns the
   same level; ticks accumulate, never reshuffle), bounded to the user cap by
   most-traded levels, never invents a level. Wired into SmartMoneyPanel with
   cap = the user's deltaLevelCap. **10 tests** incl. the stable-ownership proof.
   FOUNDER-VISIBLE: bubbles stop flickering and honor the level control.
   Pixel acceptance on the authed panel = EXTERNAL GATE (no test login).

2. `a0d9de9`/`2ebf9c4` **Decision Memory §11 invariant lock** — the seal/append/
   attach/amend helpers correctly enforce "sealed pre-outcome truth is never
   rewritten; corrections are append-only amendments" but had ZERO tests (Four-
   Gate DoD: shipped without the TEST gate). **12 tests** lock: deep-frozen
   seal + runtime-mutation throws; schema/owner mismatch throws; append/attach
   return new frozen records without mutating the original; attachOutcome
   refuses overwrite; management-after-outcome rejected; review needs outcome +
   refuses a second; the frozen snapshot is identical before/after outcome+
   review; amendDecision appends (owner-only, sealed outcome not rewritten). No
   production code changed — closes the verification gap.

3. `c7e0854` **Paper order-lifecycle guard** (canon §11: a settled order is
   truth, never silently rewritten). `/paper` mutated `order.status` inline at
   each site (pending→filled, pending→cancelled) with NO legality guard — an
   already-filled order could be re-filled, a cancelled order resurrected to
   filled, or an order filled after cancel, each silently corrupting paper P&L.
   Fix: new pure `src/lib/paperOrderLifecycle.ts` — single owner of legal
   transitions (only a resting pending order may FILL/CANCEL/REJECT; the rest
   are terminal); `transitionOrder()` returns a NEW order on a legal move and
   refuses illegal ones with an explainable reason, never mutating/corrupting.
   Wired into the fill + cancel sites in `paper/page.tsx` so the RUNNING paper
   trader can no longer double-fill or resurrect a settled order. **9 tests.**
   FOUNDER-VISIBLE: paper P&L can no longer be corrupted by an illegal status flip.
   NOTE: `paper/page.tsx` still keeps a LOCAL duplicate `OrderStatus`/`applyFill`
   (a separate §6 de-dup debt vs `src/lib/paperTrade.ts`) — logged, not touched
   this shift (large refactor, auth-gated visual surface).

## Assessed but correctly NOT changed (canon §5: don't fabricate a defect)

- SmartMoneyPanel close affordance + layout: already correct (44px Esc button,
  focus trap, backdrop-close, auto-fill grid — no ghost columns).
- MainChart "bubbles" are individual big-trade bubbles (radius=size), a
  different correct system — NOT the window-bucket bug; left alone.
- Scanner→Deck handoff passes `symbol`; its timeframe is a fixed RSI scan TF
  (forcing it on the deck would mislead) — left alone.

## Proof

0 prod tsc; full suite **806 / 107 files** (+31 this shift: 10 deltaLevels + 12
decisionMemory + 9 paperOrderLifecycle); clean production build every commit;
branch merges CLEAN into current origin/main; main + live-team files untouched.

## Next (product-first per §13/§15, unblocked, testable)

1. Paper-trading execution state machine / order ledger / reconciliation
   realism (§13) — pure/testable, connects to the shift-G TradeLine layer.
2. Order-flow annotation stale-clearing by identity (§11) — needs MainChart
   (large; scope carefully).
3. Merge the shift-G/H wiring branch + this product branch when the founder
   lifts NO-GO (both clean-merge into main independently).

## Still external-gated (unchanged)
Broker live-cert (creds/OAuth); auth-gated visual acceptance (no test login);
Supabase migration apply (operator); broker credential-model product decision.

**MISSION STATUS = ACTIVE / CONTINUATION REQUIRED.**
