# Ledger — CAUTION Degraded-Grant Question in WAIT + EXECUTE (2026-08-25, -e)

**Session:** Five-Hour Megazord Finish Shift — parallel-builder block (follows the
`-d` entry). Fourth "truthful RightOfWay handling" atom; closes the last unhandled
compiled verdict in the question router.
**Canon:** "The default interface answers one dominant question at a time" — and
that question must never misrepresent the engine's verdict.

## Starting SHA

`928a6e1` (the `-d` ledger commit / prior worktree HEAD == origin/main).

## Ending SHA

`04a2007` (CAUTION question handling). Pushed to `origin/main`.

## Commit created

**`04a2007` — Ask the honest degraded-conditions question on a CAUTION verdict.**
- `routeQuestion` handled `ACTION` and `NO TRADE` explicitly but silently collapsed
  the compiled `CAUTION` verdict into a mismatched question:
  - EXECUTE: a CAUTION (degraded grant) fell through to the clean-go question
    "Is right-of-way still granted at this exact price?" — presenting a degraded
    verdict as a clean green.
  - WAIT: a CAUTION hit the quiet earned-entry fallback "Has the market earned my
    entry yet?" — implying permission was still pending when the engine had already
    granted a (degraded) right-of-way.
- Added CAUTION branches in both modes:
  - WAIT → "Conditions are degraded — take a reduced entry, or wait for cleaner?"
    (a live contradiction still outranks it — most urgent cognitive question first).
  - EXECUTE → "Right-of-way is degraded — is my size cut to match the caution?"
    so a degraded grant is never phrased like the clean ACTION grant.
- Pure selector; decision-value branches are mutually exclusive so branch ordering
  is safe. +3 tests. Experience suite 76 → 79 green.

CAUTION was the one remaining `RightOfWay` member (ACTION / WAIT / NO TRADE /
CAUTION / UNKNOWN) the router did not answer truthfully. With this, every compiled
verdict is answered honestly by BOTH `inferJobMode` (`e374845`, NO TRADE →
OBSERVE; CAUTION already mapped to WAIT) and the dominant question router
(`a91c8da` NO TRADE, `04a2007` CAUTION). The `RightOfWay`-totality closure that
began with `e374845`/`a91c8da` is now complete across the experience layer.

## Subsystems touched

`src/lib/experience/questionRouter.ts` (+ test). No other files.

## Proof

- `tsc --noEmit --skipLibCheck` — clean for the changed files (the only remaining
  tsc error is the parallel builder's transient `journal/page.tsx:1074` TS2448,
  already fixed in that builder's unpushed WIP — not mine, not touched).
- `vitest run src/lib/experience` — **79/79 green** (7 files).
- `vitest run src/lib/experience/questionRouter.test.ts` — **20/20 green**.
- **NOT DEPLOYED** — deferred to a settled, type-clean `main` (see `-c`/`-d`).

## Deployment / DB state

Landed on `origin/main` (`04a2007`), not deployed. Prod still `792ad6ca`. No
migrations, no secrets — pure selector.

## Founder-visible result

(Pending deploy.) A trader whose setup the engine grants only under CAUTION —
degraded conditions, a soft rule engaged, or unpaid warn nodes — will be asked the
honest question (reduce size / take a smaller entry / wait for cleaner) instead of
being shown the same clean-go question a full ACTION grant receives.

## Remaining limitations

Not live-verified (deploy deferred on the parallel-builder gate). Mobile 390px
still environmentally blocked.

## Anything now duplicate

Nothing. The CAUTION branches fill the last hole in an existing total switch — no
new selector, no new state.

## Next real dependency

Clean `main` → one `next build` + `deploy:cf` + `/login` 200 + desktop live check
of all FOUR pending atoms (`5b12ced`, `e374845`, `a91c8da`, `04a2007`) together;
then merge + prune the `shift/deck-emphasis-explain` worktree.
