<!-- BEGIN:ath-historical-lineage -->
> # ⛔ HISTORICAL LINEAGE — NOT CURRENT AUTHORITY
>
> **MEMORY MAY TEACH. ONLY CURRENT AUTHORITY MAY COMMAND.**
>
> This is a **hand-off record** — a transfer of state between two workers. Its filename names its own day. It was true
> on that day and is preserved as evidence of what was observed and decided
> then. Do not take a current action, diagnosis, release decision or task claim
> from it.
>
> **The current front door is in Drive, not in this repository.** A worker who
> arrived here from a search result or a shared link has not passed through
> `README.md` and has not met its demotion notice — this block is that notice,
> delivered at the door of the document itself.
>
> **Current production is `https://wealthymindsetspro.com`** (Cloudflare Workers /
> OpenNext). Any `*.vercel.app` reference below is a `GHOST_HOST` signal: the
> Vercel host was retired 2026-08-24 and cannot serve this app.
>
> Demoted 2026-09-19 by `src/lib/ops/datedDocsAreDemoted.sentinel.test.ts`, which
> until that day scanned only the top level of `docs/operations` and could not
> see this directory at all. See `docs/operations/CANON-SHIFT-GATE-STATUS.md`.
<!-- END:ath-historical-lineage -->

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
