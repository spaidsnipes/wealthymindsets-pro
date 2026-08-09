import { NextResponse } from "next/server";

/**
 * WM-SEC-P0-07 — lightweight per-user + per-route rate limiter.
 *
 * Serverless caveat: this is IN-MEMORY per lambda instance. Vercel spawns
 * multiple parallel warm lambdas under load, so a truly distributed abuse can
 * still burn 2-4× the limit while it spreads across instances. For strict
 * cross-instance ceilings, wire Upstash Redis / Vercel KV — filed as a
 * follow-up. This limiter still catches naive scripts + honest UI mistakes,
 * which is the majority of the attack surface today.
 *
 * Uses a sliding-window counter: keep timestamps within `windowMs`, count.
 * Rejects when count ≥ `max`.
 *
 * Usage inside a route handler (after requireAuth):
 *   const rl = checkRateLimit(`spaidbot:${auth.user.sub}`, { max: 10, windowMs: 60_000 });
 *   if (!rl.ok) return rl.response;
 */
export interface RateLimitOptions {
  max:      number;
  windowMs: number;
}
export type RateLimitResult =
  | { ok: true;  remaining: number; resetInMs: number }
  | { ok: false; response: Response };

const buckets = new Map<string, number[]>();

// Housekeeping: prune stale keys occasionally so the Map doesn't grow
// unbounded across a lambda's lifetime. Runs at most once per 30s.
let lastPruneMs = 0;
function pruneStale(nowMs: number, windowMs: number) {
  if (nowMs - lastPruneMs < 30_000) return;
  lastPruneMs = nowMs;
  for (const [k, times] of buckets) {
    const kept = times.filter(t => nowMs - t < windowMs);
    if (kept.length === 0) buckets.delete(k);
    else buckets.set(k, kept);
  }
}

export function checkRateLimit(key: string, opts: RateLimitOptions): RateLimitResult {
  const now = Date.now();
  pruneStale(now, opts.windowMs);
  const times = (buckets.get(key) ?? []).filter(t => now - t < opts.windowMs);
  if (times.length >= opts.max) {
    const oldest = times[0];
    const resetInMs = Math.max(0, opts.windowMs - (now - oldest));
    const retryAfterSec = Math.ceil(resetInMs / 1000);
    return {
      ok: false,
      response: NextResponse.json(
        { error: "Rate limit exceeded", retryAfterSec },
        { status: 429, headers: { "Retry-After": String(retryAfterSec) } },
      ),
    };
  }
  times.push(now);
  buckets.set(key, times);
  return { ok: true, remaining: opts.max - times.length, resetInMs: opts.windowMs };
}
