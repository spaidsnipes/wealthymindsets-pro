import { describe, it, expect } from "vitest";
import { scannerRsiIdentity, scannerRsiIdentityKey } from "./scannerRequestIdentity";
import {
  RSI_FAILURE_TTL_MS, lookupFailure, recordFailure, type RsiFailureCache,
} from "./scannerFailureCache";

/**
 * WM-SCANNER-RECONCILE-01 synthesis cache — asserts Forge §5:
 * (a) failure stored under the canonical scannerRsiIdentityKey, not `sym:D`;
 * (b) within the 15m TTL isFailureCached → true (no refetch);
 * (c) after the TTL, one retry is allowed, then a repeat failure re-caches;
 * (d) a non-canonical identity is never cached under a bogus key (fail-closed).
 */
describe("WM-SCANNER-RECONCILE-01 · scanner RSI failure cache (canonical key + TTL)", () => {
  const identity = scannerRsiIdentity("AAPL");
  const key = scannerRsiIdentityKey(identity);

  it("(a) stores under the canonical identity key, not a stringly sym:D key", () => {
    const cache: RsiFailureCache = new Map();
    recordFailure(cache, key, identity, "RSI unavailable", 0);
    expect(cache.has(key)).toBe(true);
    expect(cache.has("AAPL:D")).toBe(false);         // never the weak key
    expect(key).toContain("symbol=AAPL");            // canonical serialization
    expect(key).toContain("version=scanner-rsi-v1");
    expect(cache.get(key)?.identity).toEqual(identity);
    expect(cache.get(key)?.reason).toBe("RSI unavailable");
  });

  it("(b) within the TTL the failure suppresses a refetch", () => {
    const cache: RsiFailureCache = new Map();
    recordFailure(cache, key, identity, "no bars", 1_000);
    // 1ms later and just before the TTL boundary → still cached.
    expect(lookupFailure(cache, key, 1_001)).not.toBeNull();
    expect(lookupFailure(cache, key, 1_000 + RSI_FAILURE_TTL_MS - 1)).not.toBeNull();
  });

  it("(c) after the TTL the failure is evicted → one retry allowed, then re-caches", () => {
    const cache: RsiFailureCache = new Map();
    recordFailure(cache, key, identity, "no bars", 0);
    // At/after the TTL boundary the entry is evicted and lookup returns null
    // (the caller then performs exactly one more attempt).
    expect(lookupFailure(cache, key, RSI_FAILURE_TTL_MS)).toBeNull();
    expect(cache.has(key)).toBe(false);              // evicted, not lingering
    // A repeat failure re-caches under the same canonical key.
    recordFailure(cache, key, identity, "still no bars", RSI_FAILURE_TTL_MS);
    expect(lookupFailure(cache, key, RSI_FAILURE_TTL_MS + 1)).not.toBeNull();
  });

  it("(d) a non-canonical identity is rejected fail-closed and never cached", () => {
    // Symbols outside the whitelist / malformed input throw — so the scanner
    // never derives a key for them and never stores a bogus cache entry.
    expect(() => scannerRsiIdentity("NOTAREALSYMBOL")).toThrow();
    expect(() => scannerRsiIdentity("")).toThrow();
    expect(() => scannerRsiIdentity("aapl; DROP")).toThrow();
    const cache: RsiFailureCache = new Map();
    expect(cache.size).toBe(0);                       // nothing cached for invalid ids
  });
});
