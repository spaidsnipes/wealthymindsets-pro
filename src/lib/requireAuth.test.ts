import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/auth", () => ({
  clearAuthCookie: vi.fn(),
  getAuthToken: vi.fn(),
  supabaseGetSessionEpoch: vi.fn(),
  useSupabase: vi.fn(),
  verifyJWT: vi.fn(),
}));

import {
  clearAuthCookie,
  getAuthToken,
  supabaseGetSessionEpoch,
  useSupabase,
  verifyJWT,
  type JWTPayload,
} from "@/lib/auth";
import { requireAuth } from "./requireAuth";

const mockedToken = vi.mocked(getAuthToken);
const mockedVerify = vi.mocked(verifyJWT);
const mockedUseSupabase = vi.mocked(useSupabase);
const mockedEpoch = vi.mocked(supabaseGetSessionEpoch);
const mockedClearCookie = vi.mocked(clearAuthCookie);

const validUser: JWTPayload = {
  sub: "user-1",
  email: "trader@example.com",
  profileComplete: true,
  iat: 100,
  exp: 1_000,
};

describe("requireAuth session revocation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedToken.mockReturnValue("signed-token");
    mockedVerify.mockReturnValue(validUser);
    mockedUseSupabase.mockReturnValue(true);
    mockedEpoch.mockResolvedValue(0);
  });

  it("accepts a valid session that predates no revocation", async () => {
    const result = await requireAuth(new Request("https://example.test/api/private"));

    expect(result).toEqual({ ok: true, user: validUser });
    expect(mockedEpoch).toHaveBeenCalledWith("user-1");
  });

  it("rejects and clears a session issued before the stored epoch", async () => {
    mockedEpoch.mockResolvedValue(101);

    const result = await requireAuth(new Request("https://example.test/api/private"));

    expect(result.ok).toBe(false);
    if (result.ok) throw new Error("expected revoked session");
    expect(result.response.status).toBe(401);
    expect(await result.response.json()).toEqual({ error: "Session revoked" });
    expect(mockedClearCookie).toHaveBeenCalledOnce();
  });

  it("fails closed when revocation state cannot be verified", async () => {
    mockedEpoch.mockResolvedValue(null);

    const result = await requireAuth(new Request("https://example.test/api/private"));

    expect(result.ok).toBe(false);
    if (result.ok) throw new Error("expected unavailable verification");
    expect(result.response.status).toBe(503);
    expect(await result.response.json()).toEqual({
      error: "Session verification is temporarily unavailable",
    });
  });

  it("does not query Supabase when the signed cookie is invalid", async () => {
    mockedVerify.mockReturnValue(null);

    const result = await requireAuth(new Request("https://example.test/api/private"));

    expect(result.ok).toBe(false);
    if (result.ok) throw new Error("expected unauthenticated result");
    expect(result.response.status).toBe(401);
    expect(mockedEpoch).not.toHaveBeenCalled();
  });

  it("preserves the local development path without a remote epoch lookup", async () => {
    mockedUseSupabase.mockReturnValue(false);

    const result = await requireAuth(new Request("https://example.test/api/private"));

    expect(result).toEqual({ ok: true, user: validUser });
    expect(mockedEpoch).not.toHaveBeenCalled();
  });
});
