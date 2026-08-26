# Ledger — NO TRADE Stand-Down Question in WAIT (2026-08-25, -d)

**Session:** Five-Hour Megazord Finish Shift — parallel-builder block (follows the
`-c` entry). Third of three coherent "truthful NO TRADE handling" atoms.
**Canon:** "The default interface answers one dominant question at a time" — and
that question must never misrepresent the engine's verdict.

## Starting SHA

`587a05b` (the `-c` ledger commit).

## Ending SHA

`a91c8da` (WAIT NO TRADE question). Pushed to `origin/main`.

## Commit created

**`a91c8da` — Ask the stand-down question on a NO TRADE verdict while WAITing.**
- `routeQuestion` handled `NO TRADE` in EXECUTE but not in WAIT. A trader holding
  a thesis the engine had hard-rejected still received the quiet-state fallback
  "Has the market earned my entry yet?" — implying entry was pending when it had
  been rejected.
- Added a NO TRADE branch in WAIT, after ACTION and before the fallback →
  "The setup was rejected — is the thesis dead, or a cleaner level ahead?" A live
  contradiction still outranks it (most urgent cognitive question stays first);
  NO TRADE only governs the otherwise-quiet case.
- Pure selector; +2 tests. Experience suite 74 → 76 green.

This closes the same `RightOfWay`-completeness gap in the question router that
`e374845` closed in `inferJobMode`: every compiled verdict (ACTION / WAIT /
NO TRADE / CAUTION / UNKNOWN) is now answered truthfully by both the inferred job
and the dominant question.

## Subsystems touched

`src/lib/experience/questionRouter.ts` (+ test).

## Proof

- `tsc --noEmit --skipLibCheck` — clean for the changed files (the only remaining
  tsc errors are the parallel builder's transient `journal/page.tsx:1074`, already
  fixed in that builder's unpushed WIP — not mine, not touched).
- `vitest run src/lib/experience` — **76/76 green**.
- **NOT DEPLOYED** — deferred to a settled, type-clean `main` (see `-c` entry).

## Deployment / DB state

Landed on `origin/main` (`a91c8da`), not deployed. Prod still `792ad6ca`. No
migrations, no secrets — pure selector.

## Founder-visible result

(Pending deploy.) A waiting trader whose setup the engine rejects will be asked
the honest stand-down question instead of being told, in effect, that entry is
still coming.

## Remaining limitations

Not live-verified (deploy deferred on the parallel-builder gate). Mobile 390px
still environmentally blocked.

## Next real dependency

Clean `main` → one `next build` + `deploy:cf` + `/login` 200 + desktop live check
of all three atoms (`5b12ced`, `e374845`, `a91c8da`) together; then merge + prune
the `shift/deck-emphasis-explain` worktree.
