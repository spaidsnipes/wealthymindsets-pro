import { describe, expect, it } from "vitest";
import { LoungeStoreError, readFeed, runOp, type LoungeActor } from "./loungeStore";

function fakeRest() {
  const calls: { path: string; body: Record<string, unknown> | null }[] = [];
  const rest = async <T,>(path: string, init: RequestInit = {}) => {
    const body = init.body ? JSON.parse(String(init.body)) : null;
    calls.push({ path, body });
    return [{ id: 1, ...body }] as unknown as T;
  };
  return { calls, rest };
}
const base: LoungeActor = { ownerId: "0b9f1c2e-3d4a-4b5c-8d6e-7f8091a2b3c4", handle: "anyone", name: "A", avatar: "" };

describe("one Lounge: Crown W is derived on the server", () => {
  it("a core-team account (verified email) posts with the crown and check", async () => {
    const { calls, rest } = fakeRest();
    await runOp(rest, { ...base, email: "DHILL5711@gmail.com" }, { op: "post", content: "hi" });
    expect(calls[0].body).toMatchObject({ user_ceo: true, user_verified: true });
  });
  it("anyone else — even naming a core handle or sending badge fields — gets none", async () => {
    const { calls, rest } = fakeRest();
    await runOp(rest, { ...base, handle: "@petey", email: "x@example.com" }, { op: "post", content: "hi", user_ceo: true, user_verified: true } as never);
    expect(calls[0].body).toMatchObject({ user_ceo: false, user_verified: false, user_handle: "@petey" });
  });
});

// A store with a few posts by different authors. `installed` = the safety SQL has been run.
function storeWith(installed: boolean, blocks: Array<{ blocked_handle: string; kind: string }> = []) {
  const calls: { path: string; method: string; body: Record<string, unknown> | null }[] = [];
  const posts = [{ id: 3, user_handle: "@troll" }, { id: 2, user_handle: "@friend" }, { id: 1, user_handle: "@loud" }];
  const rest = async <T,>(path: string, init: RequestInit = {}) => {
    const method = init.method ?? "GET";
    calls.push({ path, method, body: init.body ? JSON.parse(String(init.body)) : null });
    if (!installed && (path.includes("hidden_at") || path.startsWith("lounge_blocks") || path.startsWith("lounge_reports") || (method === "PATCH" && path.startsWith("lounge_posts"))))
      throw new LoungeStoreError("TABLE_MISSING", "not installed", "42703");
    if (path.startsWith("lounge_posts") && method === "GET") return posts as unknown as T;
    if (path.startsWith("lounge_blocks") && method === "GET") return blocks as unknown as T;
    if (path.startsWith("lounge_posts") && method === "PATCH") return [{ id: 2 }] as unknown as T;
    return [] as unknown as T;
  };
  return { calls, rest };
}
const viewer = "0b9f1c2e-3d4a-4b5c-8d6e-7f8091a2b3c4";

describe("one Lounge: safety (block, mute, report, moderator hide)", () => {
  it("a blocked or muted author's posts leave only the blocker's feed", async () => {
    const { rest } = storeWith(true, [{ blocked_handle: "@troll", kind: "block" }, { blocked_handle: "@loud", kind: "mute" }]);
    const feed = await readFeed(rest, viewer, "me");
    expect(feed.posts.map(p => p.id)).toEqual([2]);
    expect(feed.blocked).toEqual(["@troll"]);
    expect(feed.muted).toEqual(["@loud"]);
    const guest = await readFeed(rest, null, null);
    expect(guest.posts.map(p => p.id)).toEqual([3, 2, 1]);
  });
  it("every feed asks for posts a moderator has not hidden", async () => {
    const { calls, rest } = storeWith(true);
    const feed = await readFeed(rest, null, null);
    expect(calls[0].path).toContain("hidden_at=is.null");
    expect(feed.safety).toBe("ON");
  });
  it("before the safety SQL is run the feed still works and says so", async () => {
    const { rest } = storeWith(false);
    const feed = await readFeed(rest, viewer, "me");
    expect(feed.posts.length).toBe(3);
    expect(feed.safety).toBe("NOT_INSTALLED");
  });
  it("a report writes one row naming the reporter by account, not by request", async () => {
    const { calls, rest } = storeWith(true);
    const r = await runOp(rest, base, { op: "report", postId: 3, reason: " spam " });
    expect(r.status).toBe(200);
    const row = calls.find(c => c.path.startsWith("lounge_reports"));
    expect(row?.body).toEqual({ post_id: 3, reporter_owner_id: base.ownerId, reporter_handle: "anyone", reason: "spam" });
  });
  it("an empty or long report is refused", async () => {
    const { rest } = storeWith(true);
    expect((await runOp(rest, base, { op: "report", postId: 3, reason: "" })).status).toBe(400);
    expect((await runOp(rest, base, { op: "report", postId: 3, reason: "x".repeat(501) })).status).toBe(400);
  });
  it("block also unfollows; mute does not; nobody blocks themselves", async () => {
    const b = storeWith(true);
    await runOp(b.rest, base, { op: "block", handle: "@troll" });
    expect(b.calls.map(c => `${c.method} ${c.path.split("?")[0]}`)).toEqual(["POST lounge_blocks", "DELETE lounge_follows"]);
    expect(b.calls[0].body).toMatchObject({ owner_id: base.ownerId, blocked_handle: "@troll", kind: "block" });
    const m = storeWith(true);
    await runOp(m.rest, base, { op: "mute", handle: "@loud" });
    expect(m.calls.map(c => c.method)).toEqual(["POST"]);
    expect((await runOp(m.rest, base, { op: "block", handle: "anyone" })).status).toBe(400);
  });
  it("only a core-team moderator can hide, and hiding closes the post's open reports", async () => {
    const s = storeWith(true);
    expect((await runOp(s.rest, { ...base, email: "x@example.com" }, { op: "hide", postId: 2 })).status).toBe(403);
    expect(s.calls.length).toBe(0);
    const r = await runOp(s.rest, { ...base, email: "dhill5711@gmail.com" }, { op: "hide", postId: 2 });
    expect(r.status).toBe(200);
    expect(s.calls[0]).toMatchObject({ method: "PATCH", body: { hidden_by: "anyone" } });
    expect(s.calls[1]).toMatchObject({ method: "PATCH", body: { status: "HIDDEN" } });
  });
  it("safety ops before the SQL is run fail as NOT INSTALLED, never as success", async () => {
    const { rest } = storeWith(false);
    await expect(runOp(rest, base, { op: "report", postId: 3, reason: "spam" })).rejects.toMatchObject({ state: "TABLE_MISSING" });
    await expect(runOp(rest, base, { op: "block", handle: "@troll" })).rejects.toMatchObject({ state: "TABLE_MISSING" });
  });
  it("sanctions stay in the Lounge: no op touches access, billing or other rooms", async () => {
    const src = (await import("node:fs")).readFileSync(new URL("./loungeStore.ts", import.meta.url), "utf8");
    const tables = [...src.matchAll(/rest(?:<[^>]*>)?\(`?"?([a-z_]+)/g)].map(m => m[1]).filter(t => t !== "path");
    expect(new Set(tables)).toEqual(new Set(["lounge_posts", "lounge_blocks", "lounge_likes", "lounge_comments", "lounge_follows", "lounge_reports"]));
  });
});
