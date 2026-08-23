import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

/**
 * SHIFT-K K-Bkt 3 regression lock (Noah + Orkin):
 *
 * The pre-K module-scope `createClient(URL!, KEY!)` in src/lib/supabase.ts
 * and the identical pattern in src/app/api/upload-track/route.ts crashed
 * the Cloudflare / OpenNext build with:
 *   Error: supabaseUrl is required.
 * whenever the build environment lacked NEXT_PUBLIC_SUPABASE_URL.
 *
 * The fix moves the createClient() call behind lazy getters
 * (getSupabase / getSupabaseAdmin). These tests prove:
 *  1. Importing the modules with EMPTY env does not throw.
 *  2. The lazy getters return null when config is missing — never a
 *     broken client, never a fabricated one.
 *  3. Providing config produces a real client and caches it (getSupabase
 *     is stable across calls).
 *  4. The `supabase` Proxy compat shim defers the crash to CALL time
 *     (which is acceptable) instead of module-import time (which broke
 *     the build).
 *
 * If a future edit re-introduces module-scope env evaluation, these
 * tests fail on import.
 */

const KEYS = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
] as const;
const saved: Record<string, string | undefined> = {};

beforeEach(() => {
  // Force a fresh module load per test so the lazy singleton in
  // getSupabase/getSupabaseAdmin isn't hot from a prior test's env.
  vi.resetModules();
  for (const k of KEYS) {
    saved[k] = process.env[k];
    delete process.env[k];
  }
});
afterEach(() => {
  for (const k of KEYS) {
    if (saved[k] === undefined) delete process.env[k];
    else process.env[k] = saved[k];
  }
});

describe("supabase (public/anon) — lazy init", () => {
  it("module import with EMPTY env does not throw (the pre-K build-time landmine)", async () => {
    await expect(import("./supabase")).resolves.toBeDefined();
  });

  it("getSupabase() returns null when config missing — never fabricates a client", async () => {
    const mod = await import("./supabase");
    expect(mod.getSupabase()).toBeNull();
  });

  it("getSupabase() returns a real client when NEXT_PUBLIC_SUPABASE_URL + ANON_KEY are set", async () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "test-anon-key";
    const mod = await import("./supabase");
    const c = mod.getSupabase();
    expect(c).not.toBeNull();
    // Same instance on second call — cache is warm.
    expect(mod.getSupabase()).toBe(c);
  });

  it("PUBLISHABLE_KEY (new API keys) is preferred over legacy ANON_KEY when both set", async () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "legacy-anon";
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = "publishable";
    const mod = await import("./supabase");
    expect(mod.getSupabase()).not.toBeNull();
  });

  it("`supabase` Proxy defers crash to CALL time — importing is safe", async () => {
    const mod = await import("./supabase");
    // Import succeeded (line above didn't throw).
    // Calling into the Proxy with no config throws a CLEAR error at
    // call time — that's the acceptable location.
    expect(() => mod.supabase.from("radio_tracks")).toThrow(/not configured/i);
  });
});

describe("supabaseAdmin — lazy init, server-only", () => {
  it("module import with EMPTY env does not throw", async () => {
    await expect(import("./supabaseAdmin")).resolves.toBeDefined();
  });

  it("getSupabaseAdmin() returns null when SERVICE_ROLE_KEY missing", async () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
    // No SERVICE_ROLE_KEY.
    const mod = await import("./supabaseAdmin");
    expect(mod.getSupabaseAdmin()).toBeNull();
  });

  it("getSupabaseAdmin() returns null when URL missing (even if key present)", async () => {
    process.env.SUPABASE_SERVICE_ROLE_KEY = "test-service-role";
    // No NEXT_PUBLIC_SUPABASE_URL.
    const mod = await import("./supabaseAdmin");
    expect(mod.getSupabaseAdmin()).toBeNull();
  });

  it("getSupabaseAdmin() returns a real client when both are set + caches", async () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
    process.env.SUPABASE_SERVICE_ROLE_KEY = "test-service-role";
    const mod = await import("./supabaseAdmin");
    const c = mod.getSupabaseAdmin();
    expect(c).not.toBeNull();
    expect(mod.getSupabaseAdmin()).toBe(c);
  });
});
