import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/auth", async (importOriginal) => {
  const real = await importOriginal<typeof import("@/lib/auth")>();
  return { ...real, useSupabase: vi.fn(() => true), supabaseGetUserById: vi.fn() };
});

import { signJWT, supabaseGetUserById } from "@/lib/auth";
import { GET } from "./route";

const account = vi.mocked(supabaseGetUserById);
const DAY = 24 * 60 * 60;

function meWith(token: string) {
  return GET(new Request("https://wealthymindsetspro.com/api/auth/me", { headers: { cookie: `wm_auth=${token}` } }));
}
function tokenIssuedDaysAgo(days: number) {
  vi.useFakeTimers();
  vi.setSystemTime(Date.now() - days * DAY * 1000);
  const t = signJWT({ sub: "u1", email: "t@example.com", displayName: "T", profileComplete: true });
  vi.useRealTimers();
  return t;
}

describe("GET /api/auth/me", () => {
  beforeEach(() => vi.clearAllMocks());

  it("renews a verified session older than a week, so a daily phone user is not signed out on day 31", async () => {
    account.mockResolvedValue({ id: "u1", user_metadata: {} });
    const res = await meWith(tokenIssuedDaysAgo(10));
    expect(res.status).toBe(200);
    expect(res.headers.get("set-cookie")).toContain("wm_auth=");
  });

  it("never renews on the fail-open path (account unreadable)", async () => {
    account.mockResolvedValue(null);
    const res = await meWith(tokenIssuedDaysAgo(10));
    expect(res.status).toBe(200);
    expect(res.headers.get("set-cookie")).toBeNull();
  });

  it("a revoked session is refused, not renewed", async () => {
    account.mockResolvedValue({ id: "u1", user_metadata: { sessionEpoch: Math.floor(Date.now() / 1000) - DAY } });
    const res = await meWith(tokenIssuedDaysAgo(10));
    expect(res.status).toBe(401);
  });

  it("supplies the account avatar the cookie no longer carries", async () => {
    account.mockResolvedValue({ id: "u1", user_metadata: { avatar: "data:image/jpeg;base64,AAAA" } });
    const body = await (await meWith(tokenIssuedDaysAgo(0))).json();
    expect(body.user.avatar).toBe("data:image/jpeg;base64,AAAA");
  });
});

/**
 * NO COOKIE IS A GUEST (2026-10-10). A browser that sends no session gets
 * 200 { user: null } — a guest's expected answer, not a logged 401. A session
 * that was sent and fails is still refused.
 */
describe("GET /api/auth/me — who is asking", () => {
  beforeEach(() => vi.clearAllMocks());
  const bare = (cookie?: string) => GET(new Request("https://wealthymindsetspro.com/api/auth/me", cookie ? { headers: { cookie } } : {}));

  it("no cookie at all: 200, user null, no cookie set, no account read", async () => {
    for (const res of [await bare(), await bare("other=1; theme=dark")]) {
      expect(res.status).toBe(200);
      expect(await res.json()).toEqual({ user: null });
      expect(res.headers.get("set-cookie")).toBeNull();
    }
    expect(account).not.toHaveBeenCalled();
  });

  it("a session cookie that fails verification is still 401", async () => {
    const res = await bare("wm_auth=not-a-real-token");
    expect(res.status).toBe(401);
    expect((await res.json()).user).toBeNull();
  });

  it("an expired session is still 401", async () => {
    account.mockResolvedValue({ id: "u1", user_metadata: {} });
    const res = await meWith(tokenIssuedDaysAgo(400));
    expect(res.status).toBe(401);
  });

  it("a revoked session is still 401", async () => {
    account.mockResolvedValue({ id: "u1", user_metadata: { sessionEpoch: Math.floor(Date.now() / 1000) - DAY } });
    expect((await meWith(tokenIssuedDaysAgo(10))).status).toBe(401);
  });

  it("the client treats 200 user:null as signed out and stamps the legacy owner first", async () => {
    const { readFileSync } = await import("node:fs");
    const ctx = readFileSync(`${process.cwd()}/src/contexts/AuthContext.tsx`, "utf8");
    const ok = ctx.slice(ctx.indexOf("if (res.ok) {"), ctx.indexOf("} else if (res.status === 401"));
    expect(ok).toContain("if (data?.user == null) stampLegacyOwner(readCachedUser()?.id);");
    expect(ok.indexOf("stampLegacyOwner")).toBeLessThan(ok.indexOf("writeCachedUser(u)"));
    expect(ok).toContain("claimOwner(u, true);");
  });
});
