import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { canonicalHandle, supabaseHandleTaken } from "./auth";

/**
 * Handle takeover (2026-10-04, guest audit): the Lounge and Radio name authors
 * by handle, so a handle must belong to one account and keep its history.
 */
describe("supabaseHandleTaken", () => {
  beforeEach(() => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://sb.example.test");
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "service-key");
  });
  afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); });

  const mockStore = (users: Array<{ id: string; handle?: string }>, posts: string[] = [], tracks: string[] = []) =>
    vi.stubGlobal("fetch", vi.fn(async (url: string) => {
      if (url.includes("/auth/v1/admin/users")) {
        return new Response(JSON.stringify({ users: users.map(u => ({ id: u.id, user_metadata: { handle: u.handle } })) }), { status: 200 });
      }
      const rows = url.includes("lounge_posts") ? posts : url.includes("radio_tracks") ? tracks : [];
      const want = decodeURIComponent(url).match(/ilike\.([^,)]+)/)?.[1] ?? "";
      return new Response(JSON.stringify(rows.filter(h => canonicalHandle(h) === canonicalHandle(want)).map(h => ({ h }))), { status: 200 });
    }));

  it("another account's handle is taken, whatever its case or @", async () => {
    mockStore([{ id: "founder", handle: "@NoSleepSpaid" }]);
    expect(await supabaseHandleTaken("nosleepspaid", "guest")).toBe(true);
  });
  it("my own handle is not taken from me", async () => {
    mockStore([{ id: "me", handle: "@trader1" }]);
    expect(await supabaseHandleTaken("@trader1", "me")).toBe(false);
  });
  it("a handle that already authors Lounge posts cannot be captured", async () => {
    mockStore([], ["@oldname"]);
    expect(await supabaseHandleTaken("oldname", "guest")).toBe(true);
  });
  it("when the store cannot be asked, the answer is unknown (callers refuse)", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response("", { status: 500 })));
    expect(await supabaseHandleTaken("anyone", "guest")).toBeNull();
  });
});
