import { describe, it, expect } from "vitest";
import { classifyAuthBackendFault } from "./authBackendFault";
import { SupabaseAuthShapeError } from "./supabaseConfigStatus";

describe("classifyAuthBackendFault", () => {
  it("SECURITY: contributes only the CLASS of an ordinary error, never its message", () => {
    // The live failure this guards: `new TypeError("Invalid URL: sb_publishable_…")`
    // thrown by fetch when NEXT_PUBLIC_SUPABASE_URL holds a key. Repeating that
    // message hands the misconfigured value to an anonymous caller.
    const fault = classifyAuthBackendFault("Sign-up", new TypeError("Invalid URL: sb_publishable_LEAKED_VALUE"));
    expect(fault.body.error).toContain("TypeError");
    expect(fault.body.error).not.toContain("sb_publishable_LEAKED_VALUE");
  });

  it("SECURITY: a thrown string cannot smuggle itself into the message", () => {
    const fault = classifyAuthBackendFault("Sign-up", "sb_secret_LEAKED_VALUE");
    expect(fault.body.error).not.toContain("sb_secret_LEAKED_VALUE");
    expect(fault.body.error).toContain("(Error)");
  });

  it("repeats a SupabaseAuthShapeError verbatim, because that message is safe by construction", () => {
    const fault = classifyAuthBackendFault(
      "Account verification",
      new SupabaseAuthShapeError("NEXT_PUBLIC_SUPABASE_URL on this host is not a Supabase project URL."),
    );
    expect(fault.body.edge).toBe("AUTH BACKEND MISDIRECTED");
    expect(fault.body.error).toBe("Account verification failed: NEXT_PUBLIC_SUPABASE_URL on this host is not a Supabase project URL.");
  });

  it("names the action so the reader knows which attempt failed", () => {
    for (const action of ["Sign-up", "Account verification"]) {
      expect(classifyAuthBackendFault(action, new Error("x")).body.error.startsWith(action)).toBe(true);
      expect(classifyAuthBackendFault(action, new SupabaseAuthShapeError("m")).body.error.startsWith(action)).toBe(true);
    }
  });

  it("always answers 503 with a named edge, so a caller can branch without reading prose", () => {
    const faults = [
      classifyAuthBackendFault("Sign-up", new SupabaseAuthShapeError("m")),
      classifyAuthBackendFault("Sign-up", new TypeError("fetch failed")),
      classifyAuthBackendFault("Sign-up", { weird: true }),
    ];
    expect(faults.map((f) => f.httpStatus)).toEqual([503, 503, 503]);
    expect(faults.map((f) => f.body.edge)).toEqual([
      "AUTH BACKEND MISDIRECTED",
      "AUTH BACKEND UNREACHABLE",
      "AUTH BACKEND UNREACHABLE",
    ]);
  });

  it("never blames the person: no failure message suggests a wrong password or a bad code", () => {
    // The defect this exists to prevent. A backend that never answered cannot
    // have judged anyone's credential, so nothing here may word it as if it had.
    const messages = [
      classifyAuthBackendFault("Account verification", new SupabaseAuthShapeError("m")).body.error,
      classifyAuthBackendFault("Account verification", new TypeError("x")).body.error,
      classifyAuthBackendFault("Sign-in", new Error("x")).body.error,
    ];
    for (const message of messages) {
      expect(message).not.toMatch(/expired|not valid|invalid code|incorrect|wrong password|try again/i);
    }
  });
});
