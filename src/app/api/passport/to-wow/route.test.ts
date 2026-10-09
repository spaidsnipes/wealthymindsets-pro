/**
 * API audit P2-4 (approved 2026-10-09) — the WOW hand-off mints a sign-in link
 * only for a POST from this site. A GET mints nothing and opens WOW's plain
 * front door; a cross-site POST is refused; both WM buttons post a form.
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const WOW = "https://thewow.online";
let who: { sub: string; email: string } | null = { sub: "member-7", email: "m@wm.test" };

vi.mock("@/lib/requireAuth", () => ({
  requireAuth: async () => (who ? { ok: true, user: { ...who, iat: 0 } } : { ok: false, response: new Response("{}", { status: 401 }) }),
}));
vi.mock("@/lib/auth", () => ({ useSupabase: () => true }));
vi.mock("@/lib/supabaseConfigStatus", () => ({ resolveSupabaseServiceKey: () => "service-key-value" }));
vi.mock("@/lib/edgeRateLimit", () => ({ edgeAllows: async () => true, COMMUNITY_WRITE_LIMITER_BINDING: "COMMUNITY_WRITE_LIMITER" }));

let minted: string[] = [];
const read = (p: string) => readFileSync(path.join(process.cwd(), "src", p), "utf8");
const form = (to?: string) => { const f = new FormData(); if (to) f.set("to", to); return f; };

beforeEach(() => {
  who = { sub: "member-7", email: "m@wm.test" };
  minted = [];
  vi.resetModules();
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://abcd1234.supabase.co");
  vi.stubGlobal("fetch", vi.fn(async (url: string | URL, init?: RequestInit) => {
    minted.push(`${init?.method ?? "GET"} ${new URL(String(url)).pathname}`);
    return new Response(JSON.stringify({ properties: { hashed_token: "hash_abcdefghijklmnopqrstuvwxyz012345" } }), { status: 200 });
  }));
});
afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); });

describe("/api/passport/to-wow", () => {
  it("GET mints NOTHING — even for a signed-in member — and opens WOW's plain front door at the sanitised path", async () => {
    const { GET } = await import("./route");
    const res = await GET(new Request("https://wm.test/api/passport/to-wow?to=/passport"));
    expect(res.status).toBe(303);
    expect(res.headers.get("location")).toBe(`${WOW}/passport`);
    expect(res.headers.get("location")).not.toContain("token_hash");
    expect(res.headers.get("cache-control")).toBe("no-store");
    expect(minted).toEqual([]);
    // An unsafe destination falls back to the front door.
    const bad = await GET(new Request("https://wm.test/api/passport/to-wow?to=//evil.example"));
    expect(bad.headers.get("location")).toBe(`${WOW}/`);
  });

  it("a cross-site POST is refused 403 and mints nothing; so is a POST that names no origin", async () => {
    const { POST } = await import("./route");
    for (const headers of [{ origin: "https://evil.example" }, {} as Record<string, string>]) {
      const res = await POST(new Request("https://wm.test/api/passport/to-wow", { method: "POST", headers, body: form("/passport") }));
      expect(res.status).toBe(403);
      expect((await res.json() as { code: string }).code).toBe("CROSS_SITE_REFUSED");
    }
    expect(minted).toEqual([]);
  });

  it("a same-origin POST behaves as the door always did: one link minted for THAT member, the token hash in the fragment", async () => {
    const { POST } = await import("./route");
    const res = await POST(new Request("https://wm.test/api/passport/to-wow", { method: "POST", headers: { origin: "https://wm.test" }, body: form("/passport") }));
    expect(res.status).toBe(303);
    expect(minted).toEqual(["POST /auth/v1/admin/generate_link"]);
    const to = new URL(res.headers.get("location")!);
    expect(to.origin).toBe(WOW);
    expect(to.pathname).toBe("/passport/callback");
    expect(to.searchParams.get("to")).toBe("/passport");
    expect(new URLSearchParams(to.hash.slice(1)).get("token_hash")).toBe("hash_abcdefghijklmnopqrstuvwxyz012345");
    expect(res.headers.get("referrer-policy")).toBe("no-referrer");
  });

  it("a same-origin POST from a signed-out browser mints nothing and still opens the plain door", async () => {
    who = null;
    const { POST } = await import("./route");
    const res = await POST(new Request("https://wm.test/api/passport/to-wow", { method: "POST", headers: { origin: "https://wm.test" }, body: form() }));
    expect(res.status).toBe(303);
    expect(res.headers.get("location")).toBe(`${WOW}/`);
    expect(minted).toEqual([]);
  });

  it("both WM buttons post a form into a new tab — neither opens the route's URL any more", async () => {
    expect(read("app/profile/page.tsx")).toContain('onClick={() => { openWowWorld("/passport"); }}');
    expect(read("components/os/WMOperatingSystem.tsx")).toContain("onClick={() => { openWowWorld(); }}");
    for (const f of ["app/profile/page.tsx", "components/os/WMOperatingSystem.tsx"]) {
      const src = read(f);
      expect(src.length, f).toBeGreaterThan(1000);
      expect(src, f).not.toMatch(/window\.open\("\/api\/passport\/to-wow/);
    }
    // The helper builds exactly that form: POST, the route, a new tab, no opener; one field at most.
    const { openWowWorld, wowDoorFields, WOW_DOOR_ACTION } = await import("@/lib/passport/openWowWorld");
    expect(WOW_DOOR_ACTION).toBe("/api/passport/to-wow");
    expect(wowDoorFields("/passport")).toEqual({ to: "/passport" });
    expect(wowDoorFields()).toEqual({});
    expect(wowDoorFields("https://evil.example")).toEqual({});
    const made: Record<string, unknown>[] = [];
    let submitted = 0, removed = 0;
    const el = (tag: string) => {
      const node: Record<string, unknown> = { tag, style: {}, children: [] as unknown[], appendChild(c: unknown) { (this.children as unknown[]).push(c); }, submit() { submitted += 1; }, remove() { removed += 1; } };
      made.push(node);
      return node;
    };
    const doc = { body: { appendChild: () => {} }, createElement: el } as unknown as Document;
    expect(openWowWorld("/passport", doc)).toBe(true);
    const f = made.find(n => n.tag === "form")!;
    expect(f).toMatchObject({ method: "POST", action: "/api/passport/to-wow", target: "_blank", rel: "noopener" });
    expect((f.children as Record<string, unknown>[]).map(c => [c.name, c.value, c.type])).toEqual([["to", "/passport", "hidden"]]);
    expect([submitted, removed]).toEqual([1, 1]);
    expect(openWowWorld("/passport", undefined)).toBe(false);          // no document (server render): nothing happens
  });
});
