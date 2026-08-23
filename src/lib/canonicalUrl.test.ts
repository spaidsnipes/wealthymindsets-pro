import { describe, it, expect } from "vitest";
import { CANONICAL_URL, CANONICAL_HOST, DEFAULT_CANONICAL_URL, DREAMBOARD_URL } from "./canonicalUrl";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

/**
 * Auth-recovery lock: the canonical URL must never resolve to a Vercel host, and
 * the auth/email files must route through this single module (no re-hardcoded
 * host). Guards the "cut the Vercel cord" work from silently regressing.
 */
describe("canonicalUrl — single host-of-record, zero Vercel", () => {
  it("resolves to a non-Vercel absolute origin with no trailing slash", () => {
    expect(CANONICAL_URL).toMatch(/^https:\/\//);
    expect(CANONICAL_URL).not.toMatch(/\/$/);
    expect(CANONICAL_URL).not.toMatch(/vercel\.app/);
    expect(DEFAULT_CANONICAL_URL).not.toMatch(/vercel\.app/);
  });
  it("host matches the origin", () => {
    expect(CANONICAL_HOST).toBe(new URL(CANONICAL_URL).host);
    expect(CANONICAL_HOST).not.toMatch(/vercel\.app/);
  });
  it("DreamBoard URL carries no Vercel default", () => {
    expect(DREAMBOARD_URL).not.toMatch(/vercel\.app/);
  });
});

describe("auth files route through the canonical module (no re-hardcoded host)", () => {
  const files = [
    "../middleware.ts",
    "../app/api/auth/forgot-password/route.ts",
    "../app/api/auth/signup/route.ts",
    "../app/api/auth/resend-confirmation/route.ts",
    "../lib/email.ts",
  ];
  it("none hardcode a vercel.app URL and all import canonicalUrl", () => {
    for (const rel of files) {
      const src = readFileSync(resolve(__dirname, rel), "utf8");
      // no hardcoded vercel.app string literal (middleware may still DETECT the
      // ".vercel.app" suffix to redirect stale hosts — that's not a URL literal).
      expect(src, `${rel} must not hardcode a vercel.app URL`).not.toMatch(/["'`]https?:\/\/[^"'`]*vercel\.app/);
      expect(src, `${rel} must import from canonicalUrl`).toContain("@/lib/canonicalUrl");
    }
  });
});
