# MANAGE Invalidation Question — RightOfWay Totality Closed in the Router

- **Date / time:** 2026-08-27 (~22:16 local)
- **Branch / worktree:** `shift/deck-emphasis-explain` @ `/Users/dspaidnoosleep/wm-shift-emphasis`
- **Starting SHA:** `1f873e2` (mobile mode-band ledger)
- **Ending SHA:** `e23e080` on `origin/main`
- **Commit created:**
  - `e23e080` — `feat(experience): ask the protect-or-exit question when an open thesis is invalidated`

## Subsystem(s) touched
- `src/lib/experience/questionRouter.ts` — the WM Question Router (compiles the ONE dominant question from job-mode × canonical One Story signals).
- `src/lib/experience/questionRouter.test.ts` — regression tests.

## Observed failure (before)
In **MANAGE** (an open position, capital LIVE) the router asked only:
"Is my open thesis starting to break down?" (on a contradiction) or the calm
fallback "Is the position still doing what I expected?". When `selectOneStory`
compiled a hard **NO TRADE** verdict — the thesis the position rests on now
REJECTED — the router still returned the calm fallback, dangerously
understating an invalidation. A **CAUTION** (degraded) verdict collapsed the
same way.

## Root cause
The same `RightOfWay`-totality gap the WAIT/EXECUTE atoms already closed
(`e374845` / `a91c8da` / `04a2007`), surviving in the last mode that still
collapsed the compiled verdict. The MANAGE branch never inspected `s.decision`,
so NO TRADE and CAUTION fell through to a fallback written for the UNKNOWN/quiet
case.

## Exact change made (pure selector; invents no market claim)
MANAGE now reads the compiled verdict with **capital-live precedence**:
1. `NO TRADE` → "The thesis is invalidated — do I protect or exit now?"
   (checked FIRST; outranks a soft contradiction, because "starting to break
   down" understates a thesis the engine has thrown out — deliberately different
   from WAIT, which risks no capital and examines a contradiction first).
2. contradiction → "Is my open thesis starting to break down?" (kept).
3. `CAUTION` → "Conditions have degraded — do I reduce size or tighten my stop?".
4. else → "Is the position still doing what I expected?" (kept).

## Tests / build proof
- `tsc --noEmit --skipLibCheck`: **0 errors**.
- `vitest run` questionRouter suite: **20 → 23** (added NO TRADE escalation,
  invalidation-outranks-contradiction precedence invariant, CAUTION
  reduce/tighten branch; both prior MANAGE tests still green).
- Full `vitest run`: **174/174 files, 1478/1478 green**.

## Deployment state
- **PUSHED** @ `e23e080`. **NOT DEPLOYED** — Cloudflare prod under Error 1027
  (Founder-only). Pure logic change; redeploy required once prod recovers.

## Supabase / DB state
- Untouched.

## Founder-visible result
- While managing an open position, if the engine's compiled verdict flips to a
  hard rejection the deck's dominant question now escalates to protect/exit
  instead of staying calm — the safety-critical exit moment is finally spoken.

## Remaining limitations
- Not observed on real prod (1027). Unit-proven only until redeploy.

## Anything now duplicate or unnecessary
- None. Extended the single canonical router branch; no parallel logic.

## Compounding dividend
- Closes `RightOfWay`-verdict totality across **every** ExperienceMode in the
  router (previously WAIT + EXECUTE + inferJobMode; now MANAGE too). The reusable
  lesson: any surface that phrases a question/label off a compiled verdict must
  be TOTAL over `RightOfWay` — a fallback written for UNKNOWN must never absorb a
  hard NO TRADE / CAUTION. A future audit can grep for `s.decision ===` coverage
  per mode.

## Next real dependency
- Founder: resolve Error 1027 so this + the prior experience atoms can be
  OBSERVED/VERIFIED on real prod (task #15).
