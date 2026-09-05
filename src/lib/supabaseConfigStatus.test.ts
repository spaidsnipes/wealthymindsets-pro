import { describe, it, expect } from "vitest";
import {
  supabaseConfigStatus,
  notConfiguredBody,
  normalizeSupabaseKey,
  normalizeSupabaseUrl,
  nonJsonAuthResponseMessage,
  SupabaseAuthShapeError,
} from "./supabaseConfigStatus";

describe("supabaseConfigStatus", () => {
  it("reports configured when URL + ANON key are present", () => {
    const s = supabaseConfigStatus({
      NEXT_PUBLIC_SUPABASE_URL: "https://abc.supabase.co",
      NEXT_PUBLIC_SUPABASE_ANON_KEY: "eyJhbG…",
    });
    expect(s.configured).toBe(true);
    expect(s.missing).toEqual([]);
  });

  it("accepts the PUBLISHABLE key as an alternative to ANON", () => {
    const s = supabaseConfigStatus({
      NEXT_PUBLIC_SUPABASE_URL: "https://abc.supabase.co",
      NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "eyJhbG…",
    });
    expect(s.configured).toBe(true);
  });

  it("names EXACT missing variables when nothing is set", () => {
    const s = supabaseConfigStatus({});
    expect(s.configured).toBe(false);
    expect(s.missing).toContain("NEXT_PUBLIC_SUPABASE_URL");
    expect(s.missing.some((n) => n.includes("NEXT_PUBLIC_SUPABASE_ANON_KEY"))).toBe(true);
  });

  it("treats empty string values as missing (never leaks a value)", () => {
    const s = supabaseConfigStatus({
      NEXT_PUBLIC_SUPABASE_URL: "   ",
      NEXT_PUBLIC_SUPABASE_ANON_KEY: "",
    });
    expect(s.configured).toBe(false);
    expect(s.missing.length).toBe(2);
  });

  it("names URL alone when only URL is missing", () => {
    const s = supabaseConfigStatus({
      NEXT_PUBLIC_SUPABASE_ANON_KEY: "eyJhbG…",
    });
    expect(s.missing).toEqual(["NEXT_PUBLIC_SUPABASE_URL"]);
  });
});

describe("normalizeSupabaseKey", () => {
  it("strips the trailing newline that `echo $KEY | wrangler secret put` leaves behind", () => {
    expect(normalizeSupabaseKey("eyJhbG.abc\n")).toBe("eyJhbG.abc");
  });

  it("strips leading/trailing whitespace from a pasted value", () => {
    expect(normalizeSupabaseKey("  eyJhbG.abc  ")).toBe("eyJhbG.abc");
    expect(normalizeSupabaseKey("\r\neyJhbG.abc\r\n")).toBe("eyJhbG.abc");
  });

  it("collapses a whitespace-only key to empty, so it can be judged NOT CONFIGURED", () => {
    // This is the defect the trim actually closes. "   " is a truthy string: a
    // bare presence check calls it configured and then sends an empty apikey.
    expect(normalizeSupabaseKey("   ")).toBe("");
    expect(normalizeSupabaseKey("\n")).toBe("");
  });

  it("does NOT claim to prevent a header throw — the platform already trims edges", () => {
    // Measured behaviour, kept as a test so the claim cannot silently invert:
    // edge whitespace is normalized away by the platform, so an untrimmed key
    // is not what makes fetch throw. An INTERNAL newline is, and trimming
    // cannot repair that one.
    expect(new Headers({ apikey: "eyJhbG.abc\n" }).get("apikey")).toBe("eyJhbG.abc");
    expect(() => new Headers({ apikey: "eyJhbG\nabc" })).toThrow();
  });

  it("leaves an already-clean key byte-identical", () => {
    expect(normalizeSupabaseKey("eyJhbG.abc")).toBe("eyJhbG.abc");
  });

  it("returns empty string for undefined rather than the string 'undefined'", () => {
    expect(normalizeSupabaseKey(undefined)).toBe("");
  });
});

describe("normalizeSupabaseUrl", () => {
  it("repairs the one config defect that genuinely throws: a missing scheme", () => {
    expect(() => new URL("abc.supabase.co/auth/v1/token")).toThrow();
    expect(normalizeSupabaseUrl("abc.supabase.co")).toBe("https://abc.supabase.co");
    expect(() => new URL(`${normalizeSupabaseUrl("abc.supabase.co")}/auth/v1/token`)).not.toThrow();
  });

  it("strips a trailing slash so the path does not become //auth/v1/token", () => {
    expect(new URL("https://abc.supabase.co/" + "/auth/v1/token").pathname).toBe("//auth/v1/token");
    expect(normalizeSupabaseUrl("https://abc.supabase.co/")).toBe("https://abc.supabase.co");
    expect(normalizeSupabaseUrl("https://abc.supabase.co///")).toBe("https://abc.supabase.co");
  });

  it("trims whitespace and newlines", () => {
    expect(normalizeSupabaseUrl("  https://abc.supabase.co\n")).toBe("https://abc.supabase.co");
  });

  it("preserves an explicit http scheme rather than silently upgrading it", () => {
    expect(normalizeSupabaseUrl("http://localhost:54321")).toBe("http://localhost:54321");
  });

  it("returns empty string for absent or whitespace-only values", () => {
    expect(normalizeSupabaseUrl(undefined)).toBe("");
    expect(normalizeSupabaseUrl("   ")).toBe("");
  });

  it("yields a parseable token endpoint for every repaired shape", () => {
    for (const raw of ["abc.supabase.co", "https://abc.supabase.co/", "  https://abc.supabase.co\n"]) {
      const u = new URL(`${normalizeSupabaseUrl(raw)}/auth/v1/token`);
      expect(u.pathname).toBe("/auth/v1/token");
      expect(u.host).toBe("abc.supabase.co");
    }
  });
});

describe("nonJsonAuthResponseMessage", () => {
  it("names the origin, status and content-type that were actually observed", () => {
    const msg = nonJsonAuthResponseMessage({
      url: "https://wealthymindsetspro.com/auth/v1/token?grant_type=password",
      status: 404,
      contentType: "text/html; charset=utf-8",
    });
    expect(msg).toContain("https://wealthymindsetspro.com");
    expect(msg).toContain("404");
    expect(msg).toContain("text/html; charset=utf-8");
    expect(msg).toContain("NEXT_PUBLIC_SUPABASE_URL");
  });

  it("names ONLY the origin — a path can carry a token and must not be echoed", () => {
    const msg = nonJsonAuthResponseMessage({
      url: "https://example.test/auth/v1/verify?token=SECRET-TOKEN-VALUE",
      status: 200,
      contentType: "text/html",
    });
    expect(msg).toContain("https://example.test");
    expect(msg).not.toContain("SECRET-TOKEN-VALUE");
    expect(msg).not.toContain("/auth/v1/verify");
  });

  it("says 'no content-type' rather than printing null or an empty quote pair", () => {
    for (const ct of [undefined, null, "   "]) {
      const msg = nonJsonAuthResponseMessage({ url: "https://example.test", status: 502, contentType: ct });
      expect(msg).toContain("no content-type");
      expect(msg).not.toContain("null");
      expect(msg).not.toContain('""');
    }
  });

  it("degrades honestly when the URL itself will not parse", () => {
    const msg = nonJsonAuthResponseMessage({ url: "not a url", status: 500 });
    expect(msg).toContain("an unparseable URL");
  });

  it("SupabaseAuthShapeError carries a stable name so a route can branch on it", () => {
    const err = new SupabaseAuthShapeError("shape");
    expect(err).toBeInstanceOf(Error);
    expect(err.name).toBe("SupabaseAuthShapeError");
    expect(err.message).toBe("shape");
  });
});

describe("notConfiguredBody", () => {
  it("builds a Monday-Test-2-honest 503 body: NOT CONFIGURED, exact vars, no Vercel copy", () => {
    const body = notConfiguredBody(
      "Sign-in",
      supabaseConfigStatus({}),
    );
    expect(body.edge).toBe("NOT CONFIGURED");
    expect(body.error).toContain("Sign-in");
    expect(body.error).toContain("NOT CONFIGURED");
    expect(body.error).toContain("NEXT_PUBLIC_SUPABASE_URL");
    expect(body.error.toLowerCase()).not.toContain("vercel");
    expect(body.error.toUpperCase()).not.toContain("ENTITLEMENT");
    expect(body.missing.length).toBe(2);
  });

  it("uses singular 'variable' wording when exactly one is missing", () => {
    const body = notConfiguredBody(
      "Password recovery",
      supabaseConfigStatus({ NEXT_PUBLIC_SUPABASE_ANON_KEY: "eyJhbG…" }),
    );
    expect(body.error).toContain("variable:");
    expect(body.error).not.toContain("variables:");
  });
});
