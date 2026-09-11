import { describe, it, expect } from "vitest";
import {
  isNonCanonicalPlatformHost,
  PLATFORM_HOST_SUFFIXES,
  CANONICAL_HOST,
} from "@/lib/canonicalUrl";

/**
 * CANONICAL-HOST GUARD — the cookie-isolation invariant.
 *
 * `src/middleware.ts` had ZERO tests. That is how it came to guard a hostname
 * that no longer routes to this app while leaving the live one open: there was
 * nothing to notice. On 2026-09-11
 * `https://wealthymindsets-pro.dhill5711.workers.dev/login` answered 200 with
 * no redirect, and the `.vercel.app` host the middleware did test answered 402
 * — it could not reach this Worker at all.
 *
 * These tests drive the PREDICATE rather than retyping the suffix list. A test
 * that restated `.workers.dev` inline would pin the next migration's bug green
 * exactly the way the old inline `.vercel.app` did.
 */

const CANON = "wealthymindsetspro.com";

describe("canonical-host guard — no Passport on a platform hostname", () => {
  it("REGRESSION: the live workers.dev origin is redirected (observed serving /login 200 un-redirected)", () => {
    expect(isNonCanonicalPlatformHost("wealthymindsets-pro.dhill5711.workers.dev", CANON)).toBe(
      true,
    );
  });

  it("the canonical host is never redirected — that would be an infinite loop", () => {
    expect(isNonCanonicalPlatformHost(CANON, CANON)).toBe(false);
  });

  it("a platform host that IS the canonical host is left alone (host-of-record may be a platform address)", () => {
    const wd = "wealthymindsets-pro.dhill5711.workers.dev";
    expect(isNonCanonicalPlatformHost(wd, wd)).toBe(false);
  });

  it("Cloudflare Pages preview hosts are redirected — a preview is not a Passport environment", () => {
    expect(isNonCanonicalPlatformHost("feature-branch.wm-pro.pages.dev", CANON)).toBe(true);
  });

  it("local development is NOT redirected — redirecting it would make the app unrunnable", () => {
    expect(isNonCanonicalPlatformHost("localhost:3000", CANON)).toBe(false);
    expect(isNonCanonicalPlatformHost("127.0.0.1:3000", CANON)).toBe(false);
  });

  it("a missing Host header is not treated as a platform host", () => {
    expect(isNonCanonicalPlatformHost(null, CANON)).toBe(false);
    expect(isNonCanonicalPlatformHost(undefined, CANON)).toBe(false);
    expect(isNonCanonicalPlatformHost("", CANON)).toBe(false);
  });

  it("matching is case-insensitive — Host is not case-normalised by the client", () => {
    expect(isNonCanonicalPlatformHost("WM-PRO.DHILL5711.WORKERS.DEV", CANON)).toBe(true);
    expect(isNonCanonicalPlatformHost(CANON.toUpperCase(), CANON)).toBe(false);
  });

  it("a lookalike that merely CONTAINS a platform suffix is not matched (suffix, not substring)", () => {
    // An attacker-controlled domain must not be mistaken for our platform.
    expect(isNonCanonicalPlatformHost("workers.dev.evil.example", CANON)).toBe(false);
    expect(isNonCanonicalPlatformHost("notpages.dev.attacker.test", CANON)).toBe(false);
  });

  it("the retired host is absent from the table — it cannot route here, so a branch for it is unreachable", () => {
    expect(PLATFORM_HOST_SUFFIXES).not.toContain(".vercel.app");
    expect(isNonCanonicalPlatformHost("wealthymindsets-pro.vercel.app", CANON)).toBe(false);
  });

  it("every suffix in the table is a dotted suffix — a bare word would match too much", () => {
    for (const s of PLATFORM_HOST_SUFFIXES) {
      expect(s.startsWith("."), `${s} must start with a dot`).toBe(true);
    }
  });

  it("the module's own CANONICAL_HOST is not self-redirecting under the default argument", () => {
    expect(isNonCanonicalPlatformHost(CANONICAL_HOST)).toBe(false);
  });
});
