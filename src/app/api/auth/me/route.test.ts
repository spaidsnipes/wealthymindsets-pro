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
