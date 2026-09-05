/**
 * The defect these lock out (observed live on 2026-09-05):
 *
 * NEXT_PUBLIC_SUPABASE_URL on the production host held a Supabase publishable
 * KEY rather than a project URL, so every auth fetch resolved to an unrelated
 * origin that answered HTML. `supabaseVerifyEmail` swallowed the unparseable
 * body with `.catch(() => ({}))`, the route read the resulting empty object as
 * "no session", and answered 401 "That email code has expired or is not valid.
 * Request a fresh one and try again."
 *
 * The code was correct. The service was down. A user following that instruction
 * requests fresh codes forever and never learns why.
 *
 * A backend that never answered has judged nothing, so the 401 must be reserved
 * for a verdict that genuinely came back from Supabase.
 */

import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/auth", () => ({
  useSupabase: vi.fn(),
  supabaseGetUser: vi.fn(),
  supabaseVerifyEmail: vi.fn(),
  setAuthCookie: vi.fn(),
  signJWT: vi.fn(() => "signed.jwt.value"),
}));

import { supabaseGetUser, supabaseVerifyEmail, useSupabase } from "@/lib/auth";
import { SupabaseAuthShapeError } from "@/lib/supabaseConfigStatus";
import { POST } from "./route";

const mockedUseSupabase = vi.mocked(useSupabase);
const mockedVerify = vi.mocked(supabaseVerifyEmail);
const mockedGetUser = vi.mocked(supabaseGetUser);

function request(body: unknown) {
  return new Request("https://wealthymindsetspro.com/api/auth/confirm", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

const CODE = { email: "trader@example.com", token: "123456" };

describe("POST /api/auth/confirm", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedUseSupabase.mockReturnValue(true);
  });

  it("REGRESSION: a misdirected backend is never reported as an expired code", async () => {
    mockedVerify.mockRejectedValue(
      new SupabaseAuthShapeError("NEXT_PUBLIC_SUPABASE_URL on this host is not a Supabase project URL."),
    );

    const response = await POST(request(CODE));
    const body = await response.json();

    expect(response.status).toBe(503);
    expect(body.edge).toBe("AUTH BACKEND MISDIRECTED");
    expect(body.error).toContain("not a Supabase project URL");
    expect(body.error).not.toMatch(/expired|not valid|request a fresh one/i);
  });

  it("REGRESSION: an unreachable backend is never reported as an expired code", async () => {
    mockedVerify.mockRejectedValue(new TypeError("fetch failed"));

    const response = await POST(request(CODE));
    const body = await response.json();

    expect(response.status).toBe(503);
    expect(body.edge).toBe("AUTH BACKEND UNREACHABLE");
    expect(body.error).toContain("TypeError");
    expect(body.error).not.toMatch(/expired|not valid|request a fresh one/i);
  });

  it("SECURITY: a thrown error's message never reaches the caller", async () => {
    mockedVerify.mockRejectedValue(new TypeError("Invalid URL: sb_publishable_LEAKED_VALUE"));

    const body = await (await POST(request(CODE))).json();

    expect(body.error).not.toContain("sb_publishable_LEAKED_VALUE");
  });

  it("a throw while exchanging an access token is also a service fault, not a bad session", async () => {
    mockedGetUser.mockRejectedValue(new SupabaseAuthShapeError("origin answered text/html"));

    const response = await POST(request({ accessToken: "abc" }));
    const body = await response.json();

    expect(response.status).toBe(503);
    expect(body.edge).toBe("AUTH BACKEND MISDIRECTED");
  });

  it("still rejects a genuinely bad code with 401 — Supabase answered, and its verdict stands", async () => {
    mockedVerify.mockResolvedValue({ ok: false, data: { error: { message: "Token has expired" } } });

    const response = await POST(request(CODE));
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body.error).toBe("Token has expired");
    expect(body.edge).toBeUndefined();
  });

  it("still confirms a valid code", async () => {
    mockedVerify.mockResolvedValue({
      ok: true,
      data: { access_token: "at", user: { id: "u1", email: "trader@example.com" } },
    });

    const response = await POST(request(CODE));

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ok: true });
  });

  it("still asks for a code before touching the backend", async () => {
    const response = await POST(request({ email: "trader@example.com" }));

    expect(response.status).toBe(400);
    expect(mockedVerify).not.toHaveBeenCalled();
  });
});
