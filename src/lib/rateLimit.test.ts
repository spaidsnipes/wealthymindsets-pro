/**
 * checkRateLimit — truth-lock for the WM-SEC-P0-07 per-user/per-route
 * sliding-window rate limiter that gates authenticated routes.
 *
 * The primitive relies on module-level state (`buckets`) plus the
 * real system clock. We use vitest fake timers to drive the clock
 * deterministically and unique key prefixes per test to isolate
 * bucket state.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { checkRateLimit } from "./rateLimit";

let baseNow: number;

beforeEach(() => {
  vi.useFakeTimers();
  baseNow = 1_000_000;
  vi.setSystemTime(new Date(baseNow));
});

afterEach(() => {
  vi.useRealTimers();
});

// Each test uses a fresh key to isolate bucket state from siblings.
let keyCounter = 0;
function freshKey(): string {
  keyCounter += 1;
  return `test:rate:${Date.now()}:${keyCounter}`;
}

describe("checkRateLimit — canon §WM-SEC-P0-07 sliding-window rate limiter", () => {
  it("allows requests below the max within the window", () => {
    const k = freshKey();
    for (let i = 0; i < 3; i++) {
      const r = checkRateLimit(k, { max: 5, windowMs: 60_000 });
      expect(r.ok).toBe(true);
      if (r.ok) {
        expect(r.remaining).toBe(5 - (i + 1));
        expect(r.resetInMs).toBe(60_000);
      }
    }
  });

  it("rejects with 429 + Retry-After header when max is reached", async () => {
    const k = freshKey();
    for (let i = 0; i < 5; i++) {
      expect(checkRateLimit(k, { max: 5, windowMs: 60_000 }).ok).toBe(true);
    }
    const denied = checkRateLimit(k, { max: 5, windowMs: 60_000 });
    expect(denied.ok).toBe(false);
    if (!denied.ok) {
      expect(denied.response.status).toBe(429);
      expect(denied.response.headers.get("Retry-After")).toBeTruthy();
      const body = await denied.response.json();
      expect(body.error).toMatch(/rate limit/i);
      expect(typeof body.retryAfterSec).toBe("number");
      expect(body.retryAfterSec).toBeGreaterThan(0);
    }
  });

  it("computes remaining as max - current count", () => {
    const k = freshKey();
    const r1 = checkRateLimit(k, { max: 3, windowMs: 60_000 });
    expect(r1.ok).toBe(true);
    if (r1.ok) expect(r1.remaining).toBe(2);
    const r2 = checkRateLimit(k, { max: 3, windowMs: 60_000 });
    if (r2.ok) expect(r2.remaining).toBe(1);
    const r3 = checkRateLimit(k, { max: 3, windowMs: 60_000 });
    if (r3.ok) expect(r3.remaining).toBe(0);
  });

  it("slides the window: entries older than windowMs no longer count", () => {
    const k = freshKey();
    for (let i = 0; i < 3; i++) {
      const r = checkRateLimit(k, { max: 3, windowMs: 10_000 });
      expect(r.ok).toBe(true);
    }
    // Now denied
    expect(checkRateLimit(k, { max: 3, windowMs: 10_000 }).ok).toBe(false);
    // Advance past the window
    vi.setSystemTime(new Date(baseNow + 11_000));
    // Fresh window → allowed again
    expect(checkRateLimit(k, { max: 3, windowMs: 10_000 }).ok).toBe(true);
  });

  it("isolates buckets by key (per-user/per-route)", () => {
    const a = freshKey();
    const b = freshKey();
    // Exhaust bucket A
    for (let i = 0; i < 5; i++) {
      expect(checkRateLimit(a, { max: 5, windowMs: 60_000 }).ok).toBe(true);
    }
    expect(checkRateLimit(a, { max: 5, windowMs: 60_000 }).ok).toBe(false);
    // Bucket B is independent
    expect(checkRateLimit(b, { max: 5, windowMs: 60_000 }).ok).toBe(true);
  });

  it("resetInMs reflects the oldest in-window timestamp", () => {
    const k = freshKey();
    // Fill bucket at t=0
    for (let i = 0; i < 5; i++) {
      expect(checkRateLimit(k, { max: 5, windowMs: 10_000 }).ok).toBe(true);
    }
    // 3s later — the oldest entry is 3s old, so resetInMs should be
    // roughly 7000ms (windowMs - age).
    vi.setSystemTime(new Date(baseNow + 3_000));
    const denied = checkRateLimit(k, { max: 5, windowMs: 10_000 });
    expect(denied.ok).toBe(false);
    if (!denied.ok) {
      const retryAfterSec = Number(denied.response.headers.get("Retry-After"));
      expect(retryAfterSec).toBeGreaterThanOrEqual(6);
      expect(retryAfterSec).toBeLessThanOrEqual(8);
    }
  });
});
