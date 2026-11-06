/**
 * FRIENDS' EMAIL LOGIN (shift 1106; Codex 01a19aea "friends' email login…
 * undiagnosed"). Diagnosed from code only — no real accounts:
 *
 *   A friend signs up → Supabase must MAIL a confirmation. On the built-in
 *   sender it either refuses the address (email_address_not_authorized:
 *   delivers only to org members — the Founder can, his friends cannot) or
 *   hits the project's hourly cap (over_email_send_rate_limit). The friend
 *   then signs in → "Email not confirmed" → presses resend → this route used
 *   to THROW AWAY Supabase's answer and say { ok: true } — "sent" — forever.
 *
 * Reproduced first against 63f04643: the refusal cases returned 200 {ok:true}.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/auth", () => ({ useSupabase: vi.fn(), supabaseResendSignup: vi.fn() }));
vi.mock("@/lib/canonicalUrl", () => ({ CANONICAL_URL: "https://wealthymindsetspro.com" }));

import { supabaseResendSignup, useSupabase } from "@/lib/auth";
import { POST } from "./route";
import { interpretSignupResponse } from "@/lib/auth/signupResponse";

const resend = vi.mocked(supabaseResendSignup);
const req = (email: string) => new Request("https://wealthymindsetspro.com/api/auth/resend-confirmation", {
  method: "POST", headers: { "Content-Type": "application/json", "cf-connecting-ip": `10.0.0.${Math.floor(Math.random() * 250)}` }, body: JSON.stringify({ email }),
});

describe("resend-confirmation says when the MAIL SENDER refused", () => {
  beforeEach(() => { vi.clearAllMocks(); vi.mocked(useSupabase).mockReturnValue(true); });

  it("built-in SMTP refuses a non-member address → 503 named, never 'sent'", async () => {
    resend.mockResolvedValue({ ok: false, status: 400, data: { code: 400, error_code: "email_address_not_authorized", msg: "Email address \"friend@example.com\" cannot be used as it is not authorized" } } as never);
    const r = await POST(req("friend@example.com"));
    expect(r.status).toBe(503);
    const body = await r.json();
    expect(body.ok).toBeUndefined();
    expect(body.edge).toMatch(/SENDER RESTRICTED/);
    expect(body.error).not.toMatch(/friend@example\.com/); // the address never echoes back
  });

  it("the project's hourly email cap → 429 named", async () => {
    resend.mockResolvedValue({ ok: false, status: 429, data: { code: 429, error_code: "over_email_send_rate_limit", msg: "email rate limit exceeded" } } as never);
    const r = await POST(req("friend2@example.com"));
    expect(r.status).toBe(429);
    expect((await r.json()).edge).toMatch(/RATE LIMITED/);
  });

  it("account existence stays private: an unknown address and a sent mail both read ok", async () => {
    resend.mockResolvedValue({ ok: true, status: 200, data: {} } as never);
    expect((await POST(req("nobody@example.com"))).status).toBe(200);
    resend.mockRejectedValue(new Error("transport"));
    expect((await POST(req("nobody2@example.com"))).status).toBe(200);
  });
});

describe("sign-up names the restricted sender instead of GoTrue's raw sentence", () => {
  it("email_address_not_authorized → REJECTED 503 with the plain words", () => {
    const out = interpretSignupResponse(400, { code: 400, error_code: "email_address_not_authorized", msg: "Email address \"friend@example.com\" cannot be used as it is not authorized" });
    expect(out.kind).toBe("REJECTED");
    if (out.kind !== "REJECTED") return;
    expect(out.httpStatus).toBe(503);
    expect(out.message).toMatch(/limited to the team/);
    expect(out.message).not.toMatch(/friend@example\.com/);
  });
  it("the email rate limit keeps its existing words", () => {
    const out = interpretSignupResponse(429, { error_code: "over_email_send_rate_limit", msg: "email rate limit exceeded" });
    expect(out).toMatchObject({ kind: "REJECTED", httpStatus: 429 });
  });
});
