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

# SENTINEL VERDICT — `noah/wm-chart-pr1-seat` (`2f03f96`, on origin)

**Date:** 2026-08-01 · **Reviewer:** Sentinel (Opus) · **Reviewed in:** isolated worktree off `origin/noah/wm-chart-pr1-seat`, node_modules shared. · **Base:** `b1603d0`. · **Branch = `c09b174` + `2f03f96`.**

## Verdict: **RETURN (minor — one stale test).** Core toolchain claims verified. See cross-branch BLOCKER below.

### Author claims vs. what I measured
| Author claimed | This reviewer |
|---|---|
| `tsc 0 errors` | **CONFIRMED** — `tsc --noEmit` exit 0 |
| `vitest 75/75` | **CONFIRMED** — `vitest run` → 5 files, **75/75 passed** |
| `next build 69/69` | **INSUFFICIENT EVIDENCE** — I did not run `next build`; cannot confirm |
| `tests/yahoo-candle-nonmanifest-consumers.mjs` | **FAIL — exit 1** (same stale grep as the sibling branch) |

### The failure
Identical assertion to the sibling branch: `:16` greps for `/failures\.has\(identity\)/`. Branch 2 uses `failures.get(identity)` + timestamp value (TTL cache: `scanner/page.tsx:168-188`) — also not `.has(identity)`, so the grep-test fails here too. Behavior (non-retryable cache w/ 15-min TTL) is present; the test text is stale.

### Closes prior return items (claimed)
(a) scanner non-retryable cache TTL 15min, (b) yahooCandleConsumer transition-modes / latching / N-consecutive-legacy unlatch (+313 lines impl, +209 test, all green in vitest), (c) session VP direct allowlist. The vitest evidence supports (a) and (b). (c) not independently exercised here.

### Merge recommendation
**HOLD.** Fix the stale `.mjs` test; run `next build`; then merge only after reconciliation. Branch also carries `c09b174` → `WMSessionVP.tsx` (+71), colliding with the in-progress WM-VP-P0-01 work.

---

## ⛔ CROSS-BRANCH BLOCKER — the two PR1 branches CONFLICT (assembly-line stop)

The two branches are **divergent refactors of the same scope** and are **not independently mergeable**:
- Both descend from `c09b174` and both rewrite `src/app/scanner/page.tsx`'s RSI failure cache — **incompatibly**: branch 1 → keyed+structured (`failures.get(key)`, `RsiFailure{identity,reason}`); branch 2 → identity-keyed + timestamp (`failures.get(identity)`, TTL). 
- **Proof:** `git merge-tree` on the two branches emits real conflict markers (`<<<<<<< .our`) in `scanner/page.tsx`.
- **6 files overlap:** `scanner/page.tsx`, `WMSessionVP.tsx`, `WatchlistGrid.tsx`, `yahooCandleConsumer.ts`, `yahooCandleConsumer.test.ts`, `tests/yahoo-candle-nonmanifest-consumers.mjs`.

Merging either first makes the other conflict. This is an **architecture decision, not two independent APPROVEs**: pick one failure-cache design (structured-key vs identity-timestamp), rebase the survivor, retire/fold the other. **Route to Forge** (arch) or **Founder** to choose the seat design. Sentinel re-verifies the reconciled single branch — with the `.mjs` test fixed and `next build` run — before any origin push/merge.
