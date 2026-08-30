/**
 * supabaseAdmin — truth-lock.
 *
 * SHIFT-K K-Bkt 3 extraction. Enforces the SECURITY invariants:
 *
 *   - Zero side effects on module load (does NOT read env at import time)
 *   - SERVICE_ROLE_KEY only touched inside getSupabaseAdmin()
 *   - Returns null when env is missing — NEVER throws, never fabricates
 *   - Cached across calls once initialized
 *
 * A regression here would either crash the Cloudflare/OpenNext build
 * with "supabaseUrl is required" (the very bug K-Bkt 3 closed) or leak
 * the SERVICE_ROLE_KEY to the browser bundle.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

const origUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const origKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

async function freshImport() {
  vi.resetModules();
  return await import("./supabaseAdmin");
}

describe("supabaseAdmin — configuration guards", () => {
  beforeEach(() => {
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
  });
  afterEach(() => {
    if (origUrl !== undefined) process.env.NEXT_PUBLIC_SUPABASE_URL = origUrl;
    else delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    if (origKey !== undefined) process.env.SUPABASE_SERVICE_ROLE_KEY = origKey;
    else delete process.env.SUPABASE_SERVICE_ROLE_KEY;
  });

  it("returns null when BOTH env vars missing (never throws)", async () => {
    const { getSupabaseAdmin } = await freshImport();
    expect(() => getSupabaseAdmin()).not.toThrow();
    expect(getSupabaseAdmin()).toBeNull();
  });

  it("returns null when only URL is missing", async () => {
    process.env.SUPABASE_SERVICE_ROLE_KEY = "some-key";
    const { getSupabaseAdmin } = await freshImport();
    expect(getSupabaseAdmin()).toBeNull();
  });

  it("returns null when only KEY is missing", async () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
    const { getSupabaseAdmin } = await freshImport();
    expect(getSupabaseAdmin()).toBeNull();
  });

  it("returns null when env vars are empty strings (falsy check)", async () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = "";
    process.env.SUPABASE_SERVICE_ROLE_KEY = "";
    const { getSupabaseAdmin } = await freshImport();
    expect(getSupabaseAdmin()).toBeNull();
  });

  it("returns a client instance when BOTH env vars present", async () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
    process.env.SUPABASE_SERVICE_ROLE_KEY = "test-service-role-key";
    const { getSupabaseAdmin } = await freshImport();
    const client = getSupabaseAdmin();
    expect(client).not.toBeNull();
    // Supabase client shape: has from() and auth
    expect(typeof (client as unknown as { from: unknown }).from).toBe("function");
  });

  it("caches the client — subsequent calls return the SAME instance", async () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
    process.env.SUPABASE_SERVICE_ROLE_KEY = "test-service-role-key";
    const { getSupabaseAdmin } = await freshImport();
    const c1 = getSupabaseAdmin();
    const c2 = getSupabaseAdmin();
    expect(c1).toBe(c2); // same reference (cache hit)
  });

  it("does NOT read env at module load — import is side-effect-free", async () => {
    // With no env set, importing must not throw.
    // (An import-time read would crash createClient with "supabaseUrl is required".)
    await expect(freshImport()).resolves.toBeDefined();
  });
});
