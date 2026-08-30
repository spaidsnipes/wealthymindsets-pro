# Nectar detail Canvas evidence independence — local candidate receipt

## Scope and identity

Sole WM Pro super-task. One page-local, collision-safe atom following Academy
commit `d004050c2b1107a2f27e01eea6da99d9d6ffe763`; cached `origin/main` remains
`8d7f8be2d615f77f4758c950a2e7aba210cc7d1b`. No fetch, push, deployment,
provider, database, auth, brokerage, MainChart, useWebSocket, PR24, or PR25 edit.

Observed work window for this checkpoint: approximately 2026-08-30T07:10:00Z
through 2026-08-30T07:16:48Z. This is about seven minutes, not three hours.

PR24 cached head `baa297a` and PR25 cached head `8d49e4f` do not list the two
paths below. Their integration owner remains unresolved and their collision
surfaces remain held.

## Defect and corrected behavior

Last-team commit `e00cdfe` added the third Market Canvas consumer to
`/nectar/[symbol]`, but nested the entire Canvas and coverage-receipt render
inside `matched.length > 0`. `matched` belongs to the session trade collector;
canonical Canvas state and channel coverage have independent owners. A valid
quote/bar Canvas could therefore be hidden solely because this tab had no trade
slot, leaving an incomplete Founder-visible integration.

The correction closes each truth boundary independently:

- no session trade slot still renders the truthful unobserved-trades state;
- canonical snapshot/blocker/clearance evidence renders the shared Canvas;
- channel coverage renders whenever channel evidence exists;
- Coverage Receipts is section 3 when Canvas is absent and section 4 when
  Canvas is present, so the visible sequence no longer skips a hidden section.

No new store, selector, persistence layer, request, provider, identity, or
terminology owner was added.

## Exact uncommitted candidate

| Path | SHA-256 |
| --- | --- |
| `src/app/nectar/[symbol]/page.tsx` | `4f63eef8a213a4e7edd16a6bc7a6d1544efb745865535af3afbc17dd791fa8f6` |
| `src/lib/marketData/viewModels/composeMarketCanvasVM.enforcement.test.ts` | `9fbe178608b07f9c75150231bd2efd062201d4b76c996aaf2d903349fa5dfe44` |

## Verification bound to this candidate

- Focused Canvas/Nectar/public-vocabulary suite: 3 files, 14 tests, PASS.
- Full Vitest regression: 250 files, 2,432 tests, PASS in 4.20s.
- TypeScript `--noEmit --incremental false`: exit 0.
- `git diff --check`: exit 0.
- Direct ESLint: 0 errors; one pre-existing mount-gate warning at line 66,
  outside this delta.

Signed-in local runtime proved the exact formerly hidden state on NQ1!:

- page: `WM has not observed any real trades for this symbol in the current tab`;
- independent canonical Canvas: `NO TRADE · 1 blockers · 1 cleared`;
- blocker: `Trustworthy market data required`;
- clearance: `No active contradiction to the thesis`.

Both truths rendered together after the correction. Client console warning/error
query returned none. No browser storage was inspected and no trade, note, symbol
selection, order, or brokerage action occurred.

| Surface | Viewport | Result |
| --- | ---: | --- |
| Computer | 1280×900 | Canvas region x214–1134; page width 1280/1280; PASS |
| iPad portrait | 768×1024 | Canvas region x30.7–733.3; page width 768/768; PASS |
| iPad landscape | 1024×768 | Canvas region x112–980; page width 1024/1024; PASS |
| iPhone | 390×844 | Canvas region x16–370; page width 390/390; PASS |

These are local responsive receipts, not physical-device or production proof.

## Runtime limitations and preservation

The local dev server was stopped after verification. Its diagnostics exposed
existing risks outside this atom: repeated quote polling, BTC/ETH Alpaca 500s
with Yahoo fallback traffic, a local JWT fallback warning, middleware convention
deprecation, and cross-origin dev warnings from an initial 127.0.0.1 attempt.
This receipt does not close PR25 request-budget/provider work or production auth.

No current production build or Cloudflare artifact was produced. No 200, test,
screenshot, or local render is claimed as release proof. Capacity at receipt was
5,744,744 KiB. Five preserved untracked baton/dispatch/handoff paths remain
unedited. `next-env.d.ts` was restored after the dev server generated a temporary
path change and is clean.

Rollback: reverse only the two governed path diffs after overlap review. Do not
reset or clean the checkout.

## NOW / NEXT / AFTER

- NOW: Canvas/collector independence is locally implemented and verified.
- NEXT: internal Sentinel-style exact-diff review, then commit this two-file atom
  plus this receipt if approved. No push.
- AFTER: reconcile the next collision-safe Founder workflow gap; PR24/25 and the
  held chart truth defect remain separately owned and unauthorized.

R00 RETURN / WM NO-GO. MISSION STATUS = ACTIVE / CONTINUATION REQUIRED.
