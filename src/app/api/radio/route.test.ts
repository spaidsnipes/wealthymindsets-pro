import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/requireAuth", () => ({
  requireAuth: vi.fn(async () => ({ ok: true, user: { sub: "u1", email: "dave@example.com", handle: "dave" } })),
}));
vi.mock("@/lib/supabaseConfigStatus", () => ({ resolveSupabaseServiceKey: () => "svc" }));

const realFetch = globalThis.fetch;
const load = async () => { vi.resetModules(); return import("./route"); };
const post = (body: unknown) => new Request("http://x/api/radio", { method: "POST", body: JSON.stringify(body) });

describe("/api/radio — uploads go through rules the server holds", () => {
  beforeEach(() => vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://sb.example"));
  afterEach(() => { vi.unstubAllEnvs(); globalThis.fetch = realFetch; });

  it("signs only audio files, at a path the server chooses", async () => {
    let asked = "";
    globalThis.fetch = (async (u: string) => { asked = u; return new Response(JSON.stringify({ url: "/object/upload/sign/radio/p?token=t" }), { status: 200 }); }) as unknown as typeof fetch;
    const { POST } = await load();
    expect((await POST(post({ op: "sign", ext: "exe" }))).status).toBe(400);
    const res = await POST(post({ op: "sign", ext: "mp3" }));
    const j = await res.json();
    expect(res.status).toBe(200);
    expect(j.path).toMatch(/^\d{13}-[a-z0-9]{6,12}\.mp3$/);
    expect(asked).toContain(`/storage/v1/object/upload/sign/radio/${j.path}`);
    expect(j.uploadUrl).toBe("https://sb.example/storage/v1/object/upload/sign/radio/p?token=t");
  });

  it("records only a path of the minted shape, with the session as uploader", async () => {
    let sent: Record<string, unknown> | null = null;
    globalThis.fetch = (async (_u: string, init: RequestInit) => {
      if (init?.method === "HEAD") return new Response(null, { status: 200, headers: { "content-type": "audio/mpeg", "content-length": "4096" } });
      sent = JSON.parse(String(init.body)); return new Response(JSON.stringify([{ id: 1, ...sent }]), { status: 201 });
    }) as unknown as typeof fetch;
    const { POST } = await load();
    expect((await POST(post({ op: "file", path: "../../etc/passwd", title: "t", artist: "a" }))).status).toBe(400);
    const res = await POST(post({ op: "file", path: "1759530000000-abc123.mp3", title: "Song", artist: "Me", uploader: "someone-else" }));
    expect(res.status).toBe(200);
    expect(sent).toMatchObject({ owner_id: "u1", uploader: "dave", storage_path: "1759530000000-abc123.mp3", public_url: "https://sb.example/storage/v1/object/public/radio/1759530000000-abc123.mp3" });
  });

  it("never records a stored object that is not audio, or is too large (P0-C)", async () => {
    let recorded = false;
    const stub = (type: string, len: string) => (async (_u: string, init?: RequestInit) => {
      if (init?.method === "HEAD") return new Response(null, { status: 200, headers: { "content-type": type, "content-length": len } });
      recorded = true; return new Response("[]", { status: 201 });
    }) as unknown as typeof fetch;
    globalThis.fetch = stub("text/html", "900");
    let { POST } = await load();
    expect((await POST(post({ op: "file", path: "1759530000000-abc123.mp3", title: "t", artist: "a" }))).status).toBe(415);
    globalThis.fetch = stub("image/svg+xml", "900");
    ({ POST } = await load());
    expect((await POST(post({ op: "file", path: "1759530000000-abc123.mp3", title: "t", artist: "a" }))).status).toBe(415);
    globalThis.fetch = stub("audio/mpeg", String(60 * 1024 * 1024));
    ({ POST } = await load());
    expect((await POST(post({ op: "file", path: "1759530000000-abc123.mp3", title: "t", artist: "a" }))).status).toBe(413);
    expect(recorded).toBe(false);
  });
});
