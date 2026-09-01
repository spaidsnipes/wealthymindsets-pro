import { describe, it, expect } from "vitest";
import { supabaseConfigStatus, notConfiguredBody } from "./supabaseConfigStatus";

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
