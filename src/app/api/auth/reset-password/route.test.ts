import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/supabaseConfigStatus", () => ({ resolveSupabaseServiceKey: () => "" }));
const realFetch = globalThis.fetch;
const load = async () => { vi.resetModules(); return import("./route"); };
const req = (b: unknown) => new Request("http://x/api/auth/reset-password", { method: "POST", body: JSON.stringify(b) });

describe("/api/auth/reset-password", () => {
  beforeEach(() => { vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://sb.example"); vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "pub"); });
  afterEach(() => { vi.unstubAllEnvs(); globalThis.fetch = realFetch; });

  it("needs a token and an 8+ character password", async () => {
    const { POST } = await load();
    expect((await POST(req({ password: "longenough" }))).status).toBe(400);
    expect((await POST(req({ accessToken: "t", password: "short" }))).status).toBe(400);
  });

  it("sets the password for the account the recovery token names", async () => {
    let seen: { url: string; auth: string | null; body: string } | null = null;
    globalThis.fetch = (async (u: string, init: RequestInit) => {
      seen = { url: u, auth: new Headers(init.headers).get("authorization"), body: String(init.body) };
      return new Response("{}", { status: 200 });
    }) as unknown as typeof fetch;
    const { POST } = await load();
    const res = await POST(req({ accessToken: "recovery-jwt", password: "new-password-1" }));
    expect(res.status).toBe(200);
    expect(seen!.url).toBe("https://sb.example/auth/v1/user");
    expect(seen!.auth).toBe("Bearer recovery-jwt");
  });

  it("an expired link says so and never echoes the password", async () => {
    globalThis.fetch = (async () => new Response(JSON.stringify({ msg: "invalid JWT" }), { status: 401 })) as unknown as typeof fetch;
    const { POST } = await load();
    const res = await POST(req({ accessToken: "old", password: "secret-pass-9" }));
    const text = await res.text();
    expect(res.status).toBe(401);
    expect(text).toContain("expired");
    expect(text).not.toContain("secret-pass-9");
  });
});
