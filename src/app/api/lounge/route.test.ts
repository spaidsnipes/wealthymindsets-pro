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
    expect(sent).toMatchObject({ user_handle: "dave", user_ceo: false, user_tier: "BASIC", user_verified: false, content: "hello" });
  });

  it("refuses to delete a post that is not the trader's own", async () => {
    let url = "";
    globalThis.fetch = (async (u: string) => { url = u; return new Response("[]", { status: 200 }); }) as unknown as typeof fetch;
    const { POST } = await load();
    const res = await POST(post({ op: "delete", postId: 5 }));
    expect(res.status).toBe(403);
    expect(url).toContain("user_handle=eq.dave");
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
