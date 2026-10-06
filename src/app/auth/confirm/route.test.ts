import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/auth", () => ({
  useSupabase: vi.fn(() => true),
  supabaseGetUser: vi.fn(),
  supabaseVerifyEmail: vi.fn(),
  setAuthCookie: vi.fn((cookies: { set: (n: string, v: string) => void }, jwt: string) => cookies.set("wm_auth", jwt)),
  signJWT: vi.fn(() => "signed.jwt.value"),
}));
vi.mock("@/lib/edgeRateLimit", () => ({
  edgeAllows: vi.fn(async () => true),
  clientIp: vi.fn(() => "203.0.113.9"),
  AUTH_LOGIN_LIMITER_BINDING: "AUTH_LOGIN_LIMITER",
}));

import { supabaseVerifyEmail } from "@/lib/auth";
import { GET } from "./route";

const verify = vi.mocked(supabaseVerifyEmail);
const get = (qs: string) => GET(new Request(`https://wealthymindsetspro.com/auth/confirm?${qs}`));

describe("GET /auth/confirm", () => {
  beforeEach(() => vi.clearAllMocks());

  it("REGRESSION: a type=signup link is verified, not bounced as invalid", async () => {
    verify.mockResolvedValue({ ok: true, data: { access_token: "at", user: { id: "u1", email: "t@example.com", user_metadata: {} } } });
    const res = await get("token_hash=th&type=signup");
    expect(verify).toHaveBeenCalledWith({ tokenHash: "th", type: "signup" });
    expect(res.status).toBe(303);
    expect(res.headers.get("location")).not.toContain("/login");
    expect(res.headers.get("set-cookie")).toContain("wm_auth=signed.jwt.value");
  });

  it("verifies directly — never by fetching its own host", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    verify.mockResolvedValue({ ok: true, data: { access_token: "at", user: { id: "u1", email: "t@example.com" } } });
    await get("token_hash=th&type=email");
    expect(fetchSpy).not.toHaveBeenCalled();
    fetchSpy.mockRestore();
  });

  it("a recovery link lands on the new-password page with the token in the fragment only", async () => {
    verify.mockResolvedValue({ ok: true, data: { access_token: "rec-token", user: { id: "u1", email: "t@example.com" } } });
    const location = (await get("token_hash=th&type=recovery")).headers.get("location") ?? "";
    expect(location).toMatch(/\/reset-password#access_token=rec-token&type=recovery$/);
  });

  it("an unreachable account service is not reported as an expired link", async () => {
    verify.mockRejectedValue(new TypeError("fetch failed"));
    expect((await get("token_hash=th&type=signup")).headers.get("location")).toContain("auth_error=service_unavailable");
  });

  it("a rejected token is reported as expired; a malformed link as invalid", async () => {
    verify.mockResolvedValue({ ok: false, data: { error: "otp_expired" } });
    expect((await get("token_hash=th&type=signup")).headers.get("location")).toContain("auth_error=expired_confirmation");
    expect((await get("type=signup")).headers.get("location")).toContain("auth_error=invalid_confirmation");
    expect((await get("token_hash=th&type=bogus")).headers.get("location")).toContain("auth_error=invalid_confirmation");
  });
});
