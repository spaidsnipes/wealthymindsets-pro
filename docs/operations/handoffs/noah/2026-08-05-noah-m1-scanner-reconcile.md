# NOAH HANDOFF — M1: PR1 both RETURNs resolved (scanner-cache reconciliation)

**From:** Noah (Implementation) · **To:** Sentinel (re-verify per §5) · **Date:** 2026-08-05
**Branch:** `noah/scanner-cache-reconciled` (pushed to origin) · **Tip:** `04f0824` · **Base:** `origin/main@4add406`
**Contract:** `handoffs/forge/2026-08-01-forge-scanner-cache-reconciliation.md`
**Resolves:** `2026-08-01-sentinel-noah-pr1-seat.md` + `2026-08-01-sentinel-noah-pr1-scanner-a11y.md`
**Doctrine §7:** Resilience (honest, time-bounded failure recovery + fail-closed identity), Evidence (Sentinel-verifiable tests).

## Both Sentinel RETURN items — resolved
1. **Stale `.mjs` grep test** — the old `tests/yahoo-candle-nonmanifest-consumers.mjs` (grep for `failures.has(identity)`) came from `c09b174`, which is **not on `origin/main`**. Per Forge §3 I branched off `origin/main`, so that stale test is not carried; the capability it guarded is now covered by the 19-test `yahooCandleConsumer.test.ts`. No red test remains.
2. **Cross-branch conflict** — resolved by Forge's merit synthesis (below), on a single new branch off main. The two source branches are superseded (Sentinel closes them; I did not push over either).

## What shipped (4 commits, Forge's exact messages)
| SHA | Change |
|---|---|
| `f2574e1` | A's canonical `scannerRequestIdentity.ts` (+test) — kept whole. |
| `513bdce` | B's `yahooCandleConsumer.ts` (+test) — kept whole. |
| `0e72ee4` | `scanner/page.tsx` synthesis: base = A's page (a11y retry UI + canonical identity cache); grafted B's **15m TTL eviction**, extracted to new `src/lib/scannerFailureCache.ts`. Fetch via B's `YahooCandleConsumer`. |
| `04f0824` | Tests: A's a11y retry contract (manifest-freeze adapted) + new `scannerFailureCache.test.ts`. |

## The synthesis (Forge §1) — canonical key + honest recovery
`src/lib/scannerFailureCache.ts`: key = `scannerRsiIdentityKey(identity)` (fail-closed, versioned — never `sym:D`); value = `{ identity, reason, recordedAt }`; eviction = `RSI_FAILURE_TTL_MS = 900_000` (expire-then-allow-one-retry). Strictly better than either branch alone: A cached failures forever; B used a stringly key.

## Acceptance (Forge §4) — file-by-file
| File | State |
|---|---|
| `scannerRequestIdentity.ts` / `.test.ts` | == A's; **15/15** green |
| `yahooCandleConsumer.ts` / `.test.ts` | == B's; **19/19** green |
| `scanner/page.tsx` | synthesis: canonical key + `{reason,recordedAt}` + 15m TTL; fetch via `YahooCandleConsumer` |
| `scannerFailureCache.ts` (new) | the extracted TTL cache |
| `scannerFailureCache.test.ts` (new) | **4/4** — §5 (a) canonical key not `sym:D`, (b) within-TTL suppress, (c) expire-then-one-retry, (d) fail-closed on non-canonical id |
| `WMSessionVP.tsx` | **untouched — byte-identical to `origin/main@e06ade9`** (regression guard §5 ✅) |
| `tests/scanner-accessible-retry-contract.mjs` | **PASS** — all a11y behavior assertions from A unchanged; only the branch-purity manifest base+list updated to the reconciled set (documented in-file). |

## Verification (all local, this session)
- `tsc --noEmit` → **clean**.
- `vitest run` → **140/140** (11 files, incl. identity 15, consumer 19, failure-cache 4).
- `tests/scanner-accessible-retry-contract.mjs` → **PASS** (`manifest=4 symbols=30 scheduled=1 quote=1 profile=1 failed_rsi=0`).
- `next build` → **clean**; `/scanner` compiled (13.7 kB).
- Regression guard: `git diff --quiet origin/main -- WMSessionVP.tsx` → identical.

## ⚠️ Live verify is yours, Sentinel (Forge §5) — I cannot self-verify (`/charts`+`/scanner` auth-gated)
On an authenticated session: scanner with a genuinely unavailable symbol shows an **honest failure** (not blank), stops hammering, and **auto-recovers after 15 min** (or on explicit accessible retry); a Yahoo envelope rollback (legacy body, no header) recovers per B's 2-confirmation unlatch instead of going dark. Confirm `WMSessionVP.tsx` unchanged in the reconciled branch.

**Do not merge to `main` until Sentinel clears** (both RETURNs were "re-verify before push/merge"). Branch is on origin for review. On APPROVE, merge `noah/scanner-cache-reconciled` and close the two superseded PR1 branches.

**Next (M3):** WM-DATA-P0-01 quote-pipeline emergency.
