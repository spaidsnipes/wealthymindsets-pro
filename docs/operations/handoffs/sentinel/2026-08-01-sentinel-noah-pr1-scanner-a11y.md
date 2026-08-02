# SENTINEL VERDICT — `noah/wm-pr1-scanner-a11y-prereq` (`7ff2511`)

**Date:** 2026-08-01 · **Reviewer:** Sentinel (Opus) · **Reviewed in:** isolated worktree off `7ff2511`, node_modules shared, main worktree untouched. · **Base:** `b1603d0` (merge-base with `main` confirmed). · **Branch = `c09b174` + `7ff2511`.**

## Verdict: **RETURN (minor — one stale test).** Do NOT push origin / fast-merge yet. See also the cross-branch BLOCKER below.

### Tests run (actual, this reviewer)
| Check | Result |
|---|---|
| `tsc --noEmit` | **PASS** — exit 0, 0 errors |
| `vitest run` (branch specs: `scannerRequestIdentity.test.ts`, `yahooCandleConsumer.test.ts`) | **PASS — 26/26** |
| `tests/scanner-accessible-retry-contract.mjs` | **PASS** — `SCANNER_ACCESSIBLE_RETRY_CONTRACT_PASS manifest=4 symbols=30 scheduled=1 quote=1 profile=1 failed_rsi=0` |
| `tests/yahoo-candle-nonmanifest-consumers.mjs` | **FAIL — exit 1** |
| `next build` | not run (not verified) |

### The failure (real, but small)
`tests/yahoo-candle-nonmanifest-consumers.mjs:16` greps the scanner **source** for `/failures\.has\(identity\)/`. Tip `7ff2511` refactored the RSI failure cache from `failures.has(identity)` / `failures.set(identity,true)` to a **keyed, structured** form: `key = scannerRsiIdentityKey(identity)`, `failures.get(key)` → `RsiFailure {identity, reason}` (`scanner/page.tsx:172-207`). The behavior the test guards ("consult the non-retryable RSI cache") is **preserved and improved** — but the grep assertion wasn't updated, so the branch ships with a red test in its own suite.

### What answers your V-008 RETURN
This is the real code (not the phantom gate): accessible RSI retry is now bound to a stable request identity (`scannerRequestIdentity.ts` + 26 passing specs + the a11y retry contract PASS). That part is sound.

### To clear to APPROVE
1. Update `tests/yahoo-candle-nonmanifest-consumers.mjs:16` to assert the keyed API (e.g. `failures.get(` + `scannerRsiIdentityKey`) instead of `failures.has(identity)`.
2. Resolve the cross-branch conflict (below) — this cannot fast-merge independently.
3. Recommend running `next build` before merge (I did not).

### Merge recommendation
**HOLD.** Fix the test, then merge only after the reconciliation decision. Note: branch also carries `c09b174`'s edits to `WMSessionVP.tsx` (+71) — the file with active in-progress WM-VP-P0-01 work in the main worktree — so a merge collides there too.
