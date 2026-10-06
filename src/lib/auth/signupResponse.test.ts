import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

import { interpretSignupResponse } from "./signupResponse";

describe("interpretSignupResponse — GoTrue's real shapes", () => {
  it("REGRESSION: confirmation ON answers with the user AS the body — that is verification, not a 502", () => {
    const out = interpretSignupResponse(200, { id: "u1", email: "new@example.com", identities: [{ id: "i1" }], confirmation_sent_at: "x" });
    expect(out.kind).toBe("VERIFICATION_REQUIRED");
  });
  it("autoconfirm answers with a session", () => {
    const out = interpretSignupResponse(200, { access_token: "at", user: { id: "u1", email: "new@example.com" } });
    expect(out).toMatchObject({ kind: "SESSION", accessToken: "at" });
  });
  it("an existing address comes back obfuscated (no identities) and is said plainly", () => {
    expect(interpretSignupResponse(200, { id: "fake", email: "old@example.com", identities: [] }).kind).toBe("ALREADY_REGISTERED");
    expect(interpretSignupResponse(422, { code: 422, error_code: "user_already_exists", msg: "User already registered" }).kind).toBe("ALREADY_REGISTERED");
  });
  it("REGRESSION: the built-in mailer's hourly cap is a 429 with a sentence, not a 502", () => {
    const out = interpretSignupResponse(429, { code: 429, error_code: "over_email_send_rate_limit", msg: "email rate limit exceeded" });
    expect(out).toMatchObject({ kind: "REJECTED", httpStatus: 429 });
    if (out.kind === "REJECTED") expect(out.message).toMatch(/emails/);
  });
  it("older and newer error shapes both carry their words", () => {
    expect(interpretSignupResponse(422, { error_code: "weak_password", msg: "Password should contain at least one number" }))
      .toMatchObject({ kind: "REJECTED", httpStatus: 422, message: "Password should contain at least one number" });
    expect(interpretSignupResponse(400, { error: "invalid_request", error_description: "Signups not allowed for this instance" }))
      .toMatchObject({ kind: "REJECTED", message: "Signups not allowed for this instance" });
    expect(interpretSignupResponse(400, { error: { message: "Something" } })).toMatchObject({ kind: "REJECTED", message: "Something" });
  });
  it("a body with neither a user nor an error is malformed", () => {
    expect(interpretSignupResponse(200, {}).kind).toBe("MALFORMED");
    expect(interpretSignupResponse(200, null).kind).toBe("MALFORMED");
  });
});

describe("emailed links name the canonical page", () => {
  it("REGRESSION: the recovery request sends redirect_to as a QUERY parameter (GoTrue ignores it in a JSON body)", () => {
    const src = readFileSync(path.resolve(__dirname, "../auth.ts"), "utf8");
    expect(src).toContain("/auth/v1/recover?redirect_to=${encodeURIComponent(redirectTo)}");
    expect(src).toContain("/auth/v1/signup${qs}");
  });
});
