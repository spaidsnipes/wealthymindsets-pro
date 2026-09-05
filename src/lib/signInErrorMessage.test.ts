import { describe, it, expect } from "vitest";
import { classifySignInFailure } from "./signInErrorMessage";

describe("classifySignInFailure", () => {
  it("REGRESSION: a rejected API key must never be worded as a wrong password", () => {
    // The exact body /api/auth/login returns when Supabase rejects the key.
    // It contains "Invalid", which is what the old substring sniff keyed on.
    const f = classifySignInFailure({
      status: 503,
      edge: "AUTH KEY REJECTED",
      error: 'Supabase rejected the API key: "Invalid API key". Check NEXT_PUBLIC_SUPABASE_ANON_KEY / NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY in the host runtime secrets (Cloudflare) and redeploy.',
    });
    expect(f.kind).toBe("SERVER");
    expect(f.message).toContain("NEXT_PUBLIC_SUPABASE_ANON_KEY");
    expect(f.message.toLowerCase()).not.toContain("incorrect email or password");
  });

  it("passes every named edge through verbatim, whatever words it contains", () => {
    for (const edge of [
      "NOT CONFIGURED",
      "AUTH BACKEND UNREACHABLE",
      "AUTH BACKEND MISDIRECTED",
      "AUTH KEY REJECTED",
    ]) {
      const f = classifySignInFailure({ status: 503, edge, error: "an invalid password credentials sentence" });
      expect(f.kind).toBe("SERVER");
      expect(f.message).toBe("an invalid password credentials sentence");
    }
  });

  it("names the edge when the server sent one but no prose", () => {
    const f = classifySignInFailure({ status: 503, edge: "NOT CONFIGURED", error: "" });
    expect(f.message).toContain("NOT CONFIGURED");
  });

  it("still reads a genuine credentials rejection as a wrong email/password", () => {
    const f = classifySignInFailure({ status: 401, error: "Invalid login credentials" });
    expect(f.kind).toBe("BAD_CREDENTIALS");
    expect(f.message).toBe("Incorrect email or password. Please try again.");
  });

  it("routes an unconfirmed email to its own flow, not to the password message", () => {
    const f = classifySignInFailure({ status: 401, error: "Email not confirmed" });
    expect(f.kind).toBe("UNCONFIRMED_EMAIL");
    expect(f.message).toContain("confirm your account");
  });

  it("passes an unrecognised 401 through instead of guessing which field is wrong", () => {
    const f = classifySignInFailure({ status: 401, error: "User is banned" });
    expect(f.kind).toBe("SERVER");
    expect(f.message).toBe("User is banned");
  });

  it("does not call a 400 validation error a credentials problem", () => {
    const f = classifySignInFailure({ status: 400, error: "Email and password required" });
    expect(f.kind).toBe("SERVER");
    expect(f.message).toBe("Email and password required");
  });

  it("never returns an empty message, whatever the server omits", () => {
    for (const status of [400, 401, 429, 500, 503]) {
      const f = classifySignInFailure({ status });
      expect(f.message.length).toBeGreaterThan(0);
    }
  });
});
