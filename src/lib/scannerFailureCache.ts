/**
 * SCANNER RSI FAILURE CACHE — WM-SCANNER-RECONCILE-01 synthesis
 * (per handoffs/forge/2026-08-01-forge-scanner-cache-reconciliation.md §1)
 *
 * The reconciled failure cache combines the two PR1 branches on merit:
 *  - key      = the canonical `scannerRsiIdentityKey(identity)` (from branch A) —
 *               fail-closed, versioned, whitelisted; never a stringly `sym:D`.
 *  - value    = `{ identity, reason, recordedAt }` (A's diagnostic identity+reason
 *               kept, plus a timestamp for eviction).
 *  - eviction = a 15-minute TTL (from branch B) — "non-retryable" describes THIS
 *               response, not the symbol forever. After the TTL one more attempt
 *               is allowed; a repeat failure re-caches. This is the honest
 *               recovery A lacked (A cached failures for the whole life of the tab).
 */

import type { ScannerRsiIdentity } from "./scannerRequestIdentity";

export const RSI_FAILURE_TTL_MS = 900_000; // 15 min — well above the 5-min success cache.

export type RsiFailure = Readonly<{
  identity: ScannerRsiIdentity;
  reason: string;
  recordedAt: number;
}>;

export type RsiFailureCache = Map<string, RsiFailure>;

/**
 * Look up a cached failure by its canonical key. Returns the failure only while
 * it is still within the TTL; once expired it is evicted and `null` is returned
 * so the caller performs exactly one more attempt (expire-then-allow-one-retry).
 */
export function lookupFailure(
  cache: RsiFailureCache,
  key: string,
  now: number = Date.now(),
): RsiFailure | null {
  const failure = cache.get(key);
  if (failure === undefined) return null;
  if (now - failure.recordedAt < RSI_FAILURE_TTL_MS) return failure;
  cache.delete(key); // expired — allow exactly one more attempt
  return null;
}

/** Record a non-retryable failure under its canonical key and return it. */
export function recordFailure(
  cache: RsiFailureCache,
  key: string,
  identity: ScannerRsiIdentity,
  reason: string,
  now: number = Date.now(),
): RsiFailure {
  const failure: RsiFailure = { identity, reason, recordedAt: now };
  cache.set(key, failure);
  return failure;
}
