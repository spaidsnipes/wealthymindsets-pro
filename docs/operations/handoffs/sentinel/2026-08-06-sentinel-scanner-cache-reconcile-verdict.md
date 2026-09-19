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

# SENTINEL VERDICT — scanner-cache reconciliation (`noah/scanner-cache-reconciled` @ `04f0824`)

**Date:** 2026-08-06 · **Reviewer:** Sentinel (Opus) · **Reviewed in:** isolated worktree @ `04f0824`, node_modules shared, main untouched. · **Baton:** Forge → Noah → Sentinel (§5 re-verify). · **Closes:** the two-branch conflict Sentinel raised on 2026-08-01 (`sentinel-noah-pr1-seat.md`).

## Verdict: **APPROVE for merge.** One post-merge live smoke gated (below) — not a blocker to merge.

### Automated gates (independently re-run by me)
| Gate | Noah claimed | Sentinel measured |
|---|---|---|
| `tsc --noEmit` | clean | **PASS — 0 errors** |
| `vitest run` | 140/140 | **PASS — 140/140 (11 files)** |
| `tests/scanner-accessible-retry-contract.mjs` | PASS | **PASS** — `manifest=4 symbols=30 scheduled=1 quote=1 profile=1 failed_rsi=0` |

### Reviewer scrutiny (the things most likely to hide a defect)
1. **Regression guard — VP fix preserved.** `WMSessionVP.tsx` is **byte-identical to `origin/main@e06ade9`** (`git diff --quiet` clean). The reconciliation correctly dropped the superseded `c09b174` VP/watchlist edits and rebased onto current `main`; it does **not** re-clobber the Session VP work. This was my top concern from the original two-branch review — resolved.
2. **The stale grep-test is gone, not hidden.** `tests/yahoo-candle-nonmanifest-consumers.mjs` — the brittle `failures.has(identity)` source-grep that failed **both** original PR1 branches — is **removed**, and replaced by real unit coverage in `scannerFailureCache.test.ts` (canonical-key, within-TTL suppress, expire-then-one-retry, fail-closed non-canonical id). Removal is justified; behavior is better covered, not lost.
3. **a11y manifest adaptation is legitimate (Noah flagged it; I verified).** The only change to `scanner-accessible-retry-contract.mjs` is the branch-purity **manifest freeze** (`base` SHA `c09b174`→`4add406` = origin/main at branch point, + file list). **Every behavioral assertion is unchanged from branch A.** This is not scope drift — the freeze *had* to move because the reconciled branch legitimately touches a different file set.
4. **The synthesis is real, not a coin-flip.** `scannerFailureCache.ts` takes **branch A's canonical key** (`scannerRsiIdentityKey`) + **branch B's 15-min TTL eviction** (`RSI_FAILURE_TTL_MS = 900_000`, expire-then-allow-one-retry). Both prior designs' intents are preserved — exactly Forge's contract. Single design, no leftover conflict.

### Honest limitation — live repros can't run pre-merge
Noah's 3 live repros (dead-symbol honest-failure + auto-recover, Yahoo legacy-envelope rollback unlatch, VP-unchanged) **cannot be live-forced by me now**: prod runs `main`, not this unmerged branch, and I can't inject a dead-symbol / legacy-envelope failure on authenticated prod. Those behaviors **are** unit-covered (`scannerFailureCache.test.ts` + `yahooCandleConsumer.test.ts` 19 specs). 
- **Gate:** after merge + deploy, a **live smoke** of `/scanner` (results render; a genuinely failing symbol shows honest failure not blank; no hammering) should be run before WM-CHART-P0-01B-PREREQ closes. I'll own that at next market open. Approving the merge on the automated+static evidence; flagging the smoke rather than claiming I ran it.

### Housekeeping
- On merge, the two superseded source branches (`noah/wm-pr1-scanner-a11y-prereq`, `noah/wm-chart-pr1-seat`) can be closed — recommend the branch owner deletes them; I won't delete remote branches unilaterally.

## Status
Reconciliation **APPROVED to merge** (`04f0824`). Post-merge `/scanner` live smoke = the only remaining Sentinel item on this thread.
