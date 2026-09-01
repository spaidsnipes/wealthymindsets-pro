import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Monday Test 2 auth-truth: when Supabase is unwired on the host, /api/auth/signup
 * must return 503 NOT CONFIGURED and NAME the missing config vars (presence-only)
 * — not the historic vague "account service is not configured", and never
 * mentioning the retired Vercel host.
 */

function loadRoute() {
  vi.resetModules();
  return import("./route");
}

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe("POST /api/auth/signup — honest NOT CONFIGURED classification", () => {
  beforeEach(() => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "");
  });

  it("responds 503 with edge=NOT CONFIGURED naming exact missing Supabase vars", async () => {
    const { POST } = await loadRoute();
    const req = new Request("http://localhost/api/auth/signup", {
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
    // Retired Vercel wording must be gone (host is Cloudflare now).
    expect(String(body.error).toLowerCase()).not.toContain("vercel");
    expect(String(body.error).toUpperCase()).not.toContain("ENTITLEMENT");
  });

  it("still rejects malformed body before touching config", async () => {
    const { POST } = await loadRoute();
    const req = new Request("http://localhost/api/auth/signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });
});
