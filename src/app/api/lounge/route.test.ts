import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/requireAuth", () => ({
  requireAuth: vi.fn(async () => ({ ok: true, user: { sub: "u1", email: "dave@example.com", handle: "dave", displayName: "Dave" } })),
}));
vi.mock("@/lib/supabaseConfigStatus", () => ({ resolveSupabaseServiceKey: () => process.env.TEST_SERVICE_KEY ?? "" }));

const realFetch = globalThis.fetch;
const load = async () => { vi.resetModules(); return import("./route"); };
const post = (body: unknown) => new Request("http://x/api/lounge", { method: "POST", body: JSON.stringify(body) });

describe("/api/lounge — the server holds the rules", () => {
  beforeEach(() => { vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://sb.example"); vi.stubEnv("TEST_SERVICE_KEY", "svc"); });
  afterEach(() => { vi.unstubAllEnvs(); globalThis.fetch = realFetch; });

  it("writes a post as the signed-in trader and ignores claimed marks", async () => {
    let sent: Record<string, unknown> | null = null;
    globalThis.fetch = (async (_u: string, init: RequestInit) => { sent = JSON.parse(String(init.body)); return new Response(JSON.stringify([{ id: 7, ...sent }]), { status: 201 }); }) as unknown as typeof fetch;
    const { POST } = await load();
    const res = await POST(post({ op: "post", content: "hello", user_handle: "someone", user_ceo: true, user_tier: "ELITE" }));
    expect(res.status).toBe(200);
    expect(sent).toMatchObject({ owner_id: "u1", user_handle: "dave", user_ceo: false, user_tier: "BASIC", user_verified: false, content: "hello" });
  });

  it("refuses to delete a post that is not the trader's own", async () => {
    let url = "";
    globalThis.fetch = (async (u: string) => { url = u; return new Response("[]", { status: 200 }); }) as unknown as typeof fetch;
    const { POST } = await load();
    const res = await POST(post({ op: "delete", postId: 5 }));
    expect(res.status).toBe(403);
    expect(url).toContain("owner_id=eq.u1");
    expect(url).not.toContain("user_handle=eq.");
  });

  it("refuses the 11th post in a minute (anti-flood) but never limits likes", async () => {
    globalThis.fetch = (async (_u: string, init?: RequestInit) => new Response(JSON.stringify([{ id: 9, ...(init?.body ? JSON.parse(String(init.body)) : {}) }]), { status: 201 })) as unknown as typeof fetch;
    const { POST } = await load();
    const codes: number[] = [];
    for (let i = 0; i < 11; i++) codes.push((await POST(post({ op: "post", content: `n${i}` }))).status);
    expect(codes.slice(0, 10).every(c => c === 200)).toBe(true);
    expect(codes[10]).toBe(429);
    expect((await POST(post({ op: "like", postId: 9 }))).status).not.toBe(429);
  });

  it("names a missing store and missing tables instead of an empty feed", async () => {
    vi.stubEnv("TEST_SERVICE_KEY", "");
    let { GET } = await load();
    let res = await GET(new Request("http://x/api/lounge"));
    expect(res.status).toBe(503);
    expect((await res.json()).state).toBe("NOT_CONFIGURED");

    vi.stubEnv("TEST_SERVICE_KEY", "svc");
    globalThis.fetch = (async () => new Response(JSON.stringify({ code: "PGRST205" }), { status: 404 })) as unknown as typeof fetch;
    ({ GET } = await load());
    res = await GET(new Request("http://x/api/lounge"));
    expect((await res.json()).state).toBe("TABLE_MISSING");
  });
});


describe("authorship is the account's own handle, never its email prefix (security pass 2026-10-05)", () => {
  beforeEach(() => { vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://sb.example"); vi.stubEnv("TEST_SERVICE_KEY", "svc"); });
  afterEach(() => { vi.unstubAllEnvs(); globalThis.fetch = realFetch; });

  it("an account with no handle cannot delete (or post) as the email's local part", async () => {
    let touched = false;
    globalThis.fetch = (async () => { touched = true; return new Response("[]", { status: 200 }); }) as unknown as typeof fetch;
    const { POST } = await load();
    const { requireAuth } = await import("@/lib/requireAuth");
    (requireAuth as unknown as ReturnType<typeof vi.fn>).mockResolvedValueOnce({ ok: true, user: { sub: "attacker", email: "dave@attacker.tld" } });
    const res = await POST(post({ op: "delete", postId: 7 }));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/Set a handle/);
    expect(touched).toBe(false);
  });
});


describe("immutable Passport ownership", () => {
  beforeEach(() => { vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://sb.example"); vi.stubEnv("TEST_SERVICE_KEY", "svc"); });
  afterEach(() => { vi.unstubAllEnvs(); globalThis.fetch = realFetch; });
  it("an attacker with the victim's editable handle cannot delete the victim's row", async () => {
    const { POST } = await load();
    const { requireAuth } = await import("@/lib/requireAuth");
    vi.mocked(requireAuth).mockResolvedValueOnce({ ok: true, user: { sub: "attacker", email: "attacker@example.com", handle: "dave" } } as never);
    let asked = "";
    globalThis.fetch = (async (u: string) => {
      asked = u;
      const victimMatches = new URL(u).searchParams.get("owner_id") === "eq.victim";
      return new Response(JSON.stringify(victimMatches ? [{ id: 7 }] : []), { status: 200 });
    }) as unknown as typeof fetch;
    const res = await POST(post({ op: "delete", postId: 7, owner_id: "victim" }));
    expect(res.status).toBe(403);
    expect(asked).toContain("owner_id=eq.attacker");
    expect(asked).not.toContain("user_handle=eq.dave");
  });
  it("unlike and unfollow are scoped to immutable identity, even with a copied handle", async () => {
    const asked: string[] = [];
    globalThis.fetch = (async (u: string) => { asked.push(u); return new Response("[]"); }) as unknown as typeof fetch;
    const { POST } = await load();
    await POST(post({ op: "unlike", postId: 7 }));
    await POST(post({ op: "unfollow", handle: "other" }));
    expect(asked).toHaveLength(2);
    for (const u of asked) expect(u).toContain("owner_id=eq.u1");
  });
  it("reads only public post/comment fields; ownership is not returned to the browser", async () => {
    const asked: string[] = [];
    globalThis.fetch = (async (u: string) => { asked.push(u); return new Response("[]"); }) as unknown as typeof fetch;
    const { GET } = await load();
    await GET(new Request("http://x/api/lounge"));
    await GET(new Request("http://x/api/lounge?comments=7"));
    for (const u of asked.filter(u => /lounge_posts|lounge_comments/.test(u))) {
      const projection = new URL(u).searchParams.get("select");
      expect(projection).not.toBe("*");
      expect(projection).not.toContain("owner_id");
    }
  });
});
