# WM-SCANNER-RECONCILE-01 — Scanner failure-cache branch reconciliation (Forge)

**From:** Forge (Principal Architect) · **Date:** 2026-08-01 · **Repo HEAD:** `23e059f` (origin/main incl. `e06ade9`)
**Type:** Merge-reconciliation contract. Forge does not ship (DEC-008/DEC-012 — Noah implements).
**Branches:** `noah/wm-pr1-scanner-a11y-prereq` (`7ff2511`, "A") · `noah/wm-chart-pr1-seat` (`2f03f96`, "B"). Both descend from `c09b174`.

---

## 0. Premise correction (read first — the dispatch framing is inaccurate, evidence below)

The baton described "two designs for the scanner failure-cache; pick one, discard the loser." **That is not what these branches are.** Verified against the trees:

- **The failure-cache genuinely forks** in `src/app/scanner/page.tsx` — *that* part of the framing is right.
- **But each branch also carries a unique, non-competing module** that the other branch does **not** contain:
  - A only: `src/lib/scannerRequestIdentity.ts` (canonical scanner-request identity). `git cat-file` confirms it **does not exist** in B.
  - B only: `src/lib/yahooCandleConsumer.ts` (Yahoo candle **envelope + rollback-safety** consumer — a data-transport concern, **not** a failure-cache; it has no TTL cache in it). Confirmed **absent** in A.

**Discarding either branch wholesale would delete real, tested capability** (A's canonical identity, or B's rollback-safety that the code comments say previously "took the chart dark"). Standing prohibition: *never fabricate/■ delete honest capability.* So the correct output is **one merit pick on the cache fork + keep both unique modules**, not "winner/loser branch." No Founder scope decision is required (nothing regresses) → **no DEC-014 filed.**

## 1. The one genuine fork: failure-cache — decided on merit

| | A — structured-key | B — identity-timestamp TTL |
|---|---|---|
| Key | `RsiFailure { identity: ScannerRsiIdentity; reason }`, `Map<string, RsiFailure>` | `Map<string, number>` (identity→ts), identity is `` `${sym}:D` `` |
| Identity quality | **Strong** — whitelist, fixed tf/bars/indicator/version, fail-closed parse, reason retained | **Weak** — stringly-typed `sym:D`, no validation/version |
| Failure recovery | **None** — non-retryable failure cached **forever** until explicit retry (`scanner/page.tsx:173-174`) | **Correct** — `RSI_FAILURE_TTL_MS = 900_000` (15 min), expires + "allow exactly one more attempt" |

Each side objectively holds what the other lacks. A's forever-cache is exactly the bug B's own comment warns against ("leave the symbol blank for the entire life of the tab"). B's `sym:D` key is exactly the un-canonical identity A fixes.

**Decision — SYNTHESIS, not either/or (justified by the gaps above, not by splitting the difference):**
> **Cache key = A's canonical `ScannerRsiIdentity` (via `scannerRequestIdentityKey`), value = `{ reason: string; recordedAt: number }`, eviction = B's TTL (`RSI_FAILURE_TTL_MS = 900_000`, expire-then-allow-one-retry).**

This is strictly better than either branch alone: canonical fail-closed identity **and** honest time-bounded recovery, with A's diagnostic `reason` retained.

## 2. What to keep from each branch

| Item | Source | Action |
|---|---|---|
| `src/lib/scannerRequestIdentity.ts` (+ its test) | A | **Keep whole.** It is the canonical key for §1. |
| `src/lib/yahooCandleConsumer.ts` (+ its test) | B | **Keep whole.** Separate transport/rollback layer; the reconciled scanner uses it as its fetch path (`consumer.request(...)`). |
| Failure-cache in `scanner/page.tsx` | A ⊕ B | **Rewrite to the §1 synthesis** (A's identity key + B's TTL eviction + reason). |
| Scanner fetch path | B | **Keep B's** `YahooCandleConsumer`-based `fetchRSI`; swap its `sym:D` key for A's `scannerRequestIdentityKey(identity)`. |
| a11y retry contract `tests/scanner-accessible-retry-contract.mjs` | A | **Keep.** Accessibility retry behavior must survive. |
| `WMSessionVP.tsx` hunks | A **and** B | **Discard both.** Superseded — `origin/main@e06ade9` already rewrote it to the canonical-candle projection (verified: 0 internal fetches). Take main's file as-is. |

## 3. Merge order (minimizes rework)

`e06ade9` (WM-VP-P0-01) is **already in `origin/main`**. Therefore do **not** re-apply it and do **not** rebase the WMSessionVP work — branch off current main so the correct WMSessionVP is already present.

1. `git checkout -b noah/scanner-cache-reconciled origin/main` (carries `e06ade9`).
2. Land A's `scannerRequestIdentity.ts` + `scannerRequestIdentity.test.ts` unchanged.
3. Land B's `yahooCandleConsumer.ts` + `yahooCandleConsumer.test.ts` unchanged.
4. Rewrite `scanner/page.tsx` to the §1 synthesis (single conflict-free reimplementation, not a 3-way merge of the two forks).
5. Land A's `tests/scanner-accessible-retry-contract.mjs`.
6. Add the new synthesis test (§5).
7. **Never touch `WMSessionVP.tsx`** — main's version stands.

## 4. Acceptance for Noah (file-by-file)

| File | Expected end state |
|---|---|
| `src/lib/scannerRequestIdentity.ts` | == A's `7ff2511` version |
| `src/lib/scannerRequestIdentity.test.ts` | == A's; green |
| `src/lib/yahooCandleConsumer.ts` | == B's `2f03f96` version |
| `src/lib/yahooCandleConsumer.test.ts` | == B's; green |
| `src/app/scanner/page.tsx` | §1 synthesis: failure cache keyed by `scannerRequestIdentityKey(identity)`, value `{reason, recordedAt}`, TTL 900_000 expire-then-one-retry; fetch via `YahooCandleConsumer` |
| `src/components/chart/WMSessionVP.tsx` | untouched (main/`e06ade9`) |
| `tests/scanner-accessible-retry-contract.mjs` | == A's; green |
| `src/lib/scannerFailureCache.test.ts` (new) | §5 |

Gates: `tsc` clean · full vitest green (incl. both salvaged suites + new one) · `tests/*.mjs` contracts pass · 69-page `next build` clean · scanner renders in-app with a dead symbol showing honest failure + recovering after TTL.

**Exact commit messages (one per step):**
- `feat(scanner): canonical ScannerRsiIdentity module (from wm-pr1-scanner-a11y-prereq) — per forge scanner-cache-reconciliation`
- `feat(scanner): Yahoo candle envelope + rollback-safety consumer (from wm-chart-pr1-seat) — per forge scanner-cache-reconciliation`
- `refactor(scanner): failure-cache = canonical identity key + 15m TTL eviction (synthesis) — per forge scanner-cache-reconciliation`
- `test(scanner): keep a11y retry contract + identity/envelope suites + add synthesis TTL test — per forge scanner-cache-reconciliation`

Branch decision: **new `noah/scanner-cache-reconciled` off `origin/main`.** The two source branches are then superseded — Sentinel closes them after merge; do not push over either.

## 5. Sentinel re-verify contract (before merge)

- **Tests that MUST pass:** `scannerRequestIdentity.test.ts` (identity parse/fail-closed), `yahooCandleConsumer.test.ts` (envelope classify + rollback unlatch after 2 confirmations), `scanner-accessible-retry-contract.mjs` (a11y), new `scannerFailureCache.test.ts`.
- **New synthesis test must assert:** (a) failure stored under `scannerRequestIdentityKey(identity)`, not `sym:D`; (b) within 900_000 ms `isFailureCached` → true (no refetch); (c) after TTL, one retry allowed then re-cached on repeat failure; (d) an invalid/non-canonical identity is rejected fail-closed, never cached as a bogus key.
- **Repros to run live:** scanner with a genuinely unavailable symbol → shows honest failure (not blank), stops hammering, and auto-recovers after 15 min (or on explicit retry); a Yahoo envelope rollback (legacy body, no header) recovers per B's 2-confirmation unlatch instead of going dark.
- **Regression guard:** confirm `WMSessionVP.tsx` is byte-identical to `origin/main@e06ade9` in the reconciled branch (the WM-VP-P0-01 projection must not be reverted by this merge).

---

**BATON → Noah:** implement per §3–§4, cite this handoff filename (`2026-08-01-forge-scanner-cache-reconciliation.md`) in every commit. Keep both unique modules; do not discard a branch wholesale; do not touch `WMSessionVP.tsx`. On green, baton to Sentinel for §5.
