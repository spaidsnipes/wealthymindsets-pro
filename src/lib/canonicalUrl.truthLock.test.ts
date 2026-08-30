/**
 * canonicalUrl — truth-lock supplement.
 *
 * Existing canonicalUrl.test.ts locks 3 invariants (no Vercel, no trailing slash,
 * DreamBoard fallback) + a source-scan for auth files. This supplement adds:
 *
 *  - Resolution ORDER (NEXT_PUBLIC_SITE_URL > NEXT_PUBLIC_APP_URL > default)
 *  - getCanonicalUrl re-evaluates at call time (runtime env override)
 *  - Trailing-slash stripping for BOTH the canonical + Dreamboard URLs
 *  - WORKERS_DEV_FALLBACK is distinct from the default (never confused)
 *  - DEFAULT_CANONICAL_URL is the current live custom domain
 *
 * Silent drift here silently sends every password-reset email to the wrong
 * host — a P0 auth-recovery incident (§2026-08-23 auth-recovery).
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

const originalSite = process.env.NEXT_PUBLIC_SITE_URL;
const originalApp = process.env.NEXT_PUBLIC_APP_URL;
const originalDreamboard = process.env.NEXT_PUBLIC_DREAMBOARD_URL;

async function freshImport() {
  // Reset the module registry so eval-time constants (DREAMBOARD_URL,
  // CANONICAL_URL, CANONICAL_HOST) re-resolve with the current process.env.
  vi.resetModules();
  return await import("./canonicalUrl");
}

describe("canonicalUrl — resolution order + trailing-slash guard (supplement)", () => {
  beforeEach(() => {
    delete process.env.NEXT_PUBLIC_SITE_URL;
    delete process.env.NEXT_PUBLIC_APP_URL;
    delete process.env.NEXT_PUBLIC_DREAMBOARD_URL;
  });
  afterEach(() => {
    if (originalSite !== undefined) process.env.NEXT_PUBLIC_SITE_URL = originalSite;
    else delete process.env.NEXT_PUBLIC_SITE_URL;
    if (originalApp !== undefined) process.env.NEXT_PUBLIC_APP_URL = originalApp;
    else delete process.env.NEXT_PUBLIC_APP_URL;
    if (originalDreamboard !== undefined) process.env.NEXT_PUBLIC_DREAMBOARD_URL = originalDreamboard;
    else delete process.env.NEXT_PUBLIC_DREAMBOARD_URL;
  });

  it("defaults to the current live custom domain when no env is set", async () => {
    const { getCanonicalUrl, DEFAULT_CANONICAL_URL } = await freshImport();
    expect(DEFAULT_CANONICAL_URL).toBe("https://wealthymindsetspro.com");
    expect(getCanonicalUrl()).toBe("https://wealthymindsetspro.com");
  });

  it("prefers NEXT_PUBLIC_SITE_URL over NEXT_PUBLIC_APP_URL and default", async () => {
    process.env.NEXT_PUBLIC_SITE_URL = "https://site-explicit.example";
    process.env.NEXT_PUBLIC_APP_URL = "https://legacy-app.example";
    const { getCanonicalUrl } = await freshImport();
    expect(getCanonicalUrl()).toBe("https://site-explicit.example");
  });

  it("falls back to NEXT_PUBLIC_APP_URL when SITE_URL is absent", async () => {
    process.env.NEXT_PUBLIC_APP_URL = "https://legacy-app.example";
    const { getCanonicalUrl } = await freshImport();
    expect(getCanonicalUrl()).toBe("https://legacy-app.example");
  });

  it("strips trailing slashes on canonical URL (callers append paths)", async () => {
    process.env.NEXT_PUBLIC_SITE_URL = "https://site.example///";
    const { getCanonicalUrl } = await freshImport();
    expect(getCanonicalUrl()).toBe("https://site.example");
  });

  it("strips trailing slashes on Dreamboard URL when env supplied", async () => {
    process.env.NEXT_PUBLIC_DREAMBOARD_URL = "https://dreamboard.example//";
    const mod = await freshImport();
    expect(mod.DREAMBOARD_URL).toBe("https://dreamboard.example");
  });

  it("Dreamboard falls back to CANONICAL_URL when env unset (never a dead Vercel link)", async () => {
    const mod = await freshImport();
    expect(mod.DREAMBOARD_URL).toBe(mod.CANONICAL_URL);
  });

  it("WORKERS_DEV_FALLBACK is distinct from the default (never used as host of record)", async () => {
    const { WORKERS_DEV_FALLBACK, DEFAULT_CANONICAL_URL } = await freshImport();
    expect(WORKERS_DEV_FALLBACK).toMatch(/\.workers\.dev$/);
    expect(WORKERS_DEV_FALLBACK).not.toBe(DEFAULT_CANONICAL_URL);
  });

  it("getCanonicalUrl re-evaluates at call time (runtime env override honored)", async () => {
    const mod = await freshImport();
    // Change env AFTER module eval — the function form re-resolves each call.
    process.env.NEXT_PUBLIC_SITE_URL = "https://runtime-override.example";
    expect(mod.getCanonicalUrl()).toBe("https://runtime-override.example");
  });
});
