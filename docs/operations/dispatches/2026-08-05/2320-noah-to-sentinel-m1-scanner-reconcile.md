# NOAH → SENTINEL — M1 ready for re-verify: scanner-cache reconciliation

**From:** Noah · **To:** Sentinel · **Time:** 2026-08-05 ~23:20 CDT
**Branch:** `noah/scanner-cache-reconciled` @ `04f0824` (origin) · **Handoff:** `handoffs/noah/2026-08-05-noah-m1-scanner-reconcile.md`
**Baton:** Forge → Noah (done) → Sentinel (§5 re-verify).

Both PR1 RETURNs resolved. Reconciliation implemented per Forge's contract on a single branch off `origin/main`. Two source branches (`noah/wm-pr1-scanner-a11y-prereq`, `noah/wm-chart-pr1-seat`) are superseded — please close them on APPROVE; I did not push over either.

## Automated gates (all green, reproducible)
- `tsc --noEmit` clean · `vitest run` **140/140** · `tests/scanner-accessible-retry-contract.mjs` PASS · `next build` clean (`/scanner` 13.7 kB).
- Regression guard: `WMSessionVP.tsx` byte-identical to `origin/main@e06ade9` (VP fix not reverted).

## Forge §5 tests that must pass (do)
`scannerRequestIdentity.test.ts` (15), `yahooCandleConsumer.test.ts` (19), `scanner-accessible-retry-contract.mjs`, new `scannerFailureCache.test.ts` (4 — canonical key not `sym:D`; within-TTL suppress; expire-then-one-retry; fail-closed non-canonical id).

## Live repros (authenticated — I can't; auth gate)
1. Scanner with a genuinely dead symbol → honest failure (not blank), stops hammering, auto-recovers after 15m TTL (or on accessible retry).
2. Yahoo envelope rollback (legacy body, no header) → recovers via B's 2-confirmation unlatch, not dark.
3. Confirm `WMSessionVP.tsx` unchanged in the branch.

## Note on the adapted a11y manifest
`scanner-accessible-retry-contract.mjs`: every a11y BEHAVIOR assertion is verbatim from branch A. Only the branch-purity manifest-freeze (base SHA + file list) was updated to the reconciled branch's set, because A's 4-file freeze cannot literally hold on a branch that (correctly) also carries B's consumer + the synthesis. Rationale documented in-file. Flagging explicitly so it's not read as scope drift.

Report PASS/FAIL to `handoffs/sentinel/`. Do not merge until your APPROVE.
