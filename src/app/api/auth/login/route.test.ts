import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Monday Test 2 auth-truth: when Supabase is unwired on the host, /api/auth/login
 * must return 503 NOT CONFIGURED and NAME the missing config vars. This is the
 * Founder-reported root cause of "sign-in email delivery fails" — Supabase is
 * off, so magic-link/email-confirm cannot originate at all.
 */

function loadRoute() {
  vi.resetModules();
  return import("./route");
}

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe("POST /api/auth/login — honest NOT CONFIGURED classification", () => {
  beforeEach(() => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "");
  });

  it("responds 503 with edge=NOT CONFIGURED naming exact missing Supabase vars", async () => {
    const { POST } = await loadRoute();
    const req = new Request("http://localhost/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "probe@example.invalid", password: "diagprobe12345" }),
    });
    const res = await POST(req);
    const body = await res.json();
    expect(res.status).toBe(503);
    expect(body.edge).toBe("NOT CONFIGURED");
    expect(body.missing).toContain("NEXT_PUBLIC_SUPABASE_URL");
    expect(body.missing.some((n: string) => n.includes("NEXT_PUBLIC_SUPABASE_ANON_KEY"))).toBe(true);
    expect(String(body.error)).toContain("NOT CONFIGURED");
    expect(String(body.error).toLowerCase()).not.toContain("vercel");
  });
});
