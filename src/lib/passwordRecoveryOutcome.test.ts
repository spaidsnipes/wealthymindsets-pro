import { describe, it, expect } from "vitest";
import { classifyPasswordRecovery } from "./passwordRecoveryOutcome";
import { SupabaseAuthShapeError } from "./supabaseConfigStatus";

const sent = (o: ReturnType<typeof classifyPasswordRecovery>) =>
  o.httpStatus === 200 && "ok" in o.body;

describe("classifyPasswordRecovery", () => {
  it("SECURITY: a registered and an unregistered address get byte-identical answers", () => {
    // GoTrue answers 2xx for both, and nothing here may widen that back out.
    const registered = classifyPasswordRecovery({ kind: "ANSWERED", status: 200 });
    const unknown = classifyPasswordRecovery({ kind: "ANSWERED", status: 204 });
    expect(JSON.stringify(registered)).toBe(JSON.stringify(unknown));
    expect(sent(registered)).toBe(true);
  });

  it("SECURITY: 429 must answer exactly like 200 — it is otherwise an account oracle", () => {
    // The send-frequency limit is keyed on the last email sent TO THIS ADDRESS,
    // so a distinguishable 429 lets an anonymous caller test who is registered
    // with two requests.
    const limited = classifyPasswordRecovery({ kind: "ANSWERED", status: 429 });
    const ok = classifyPasswordRecovery({ kind: "ANSWERED", status: 200 });
    expect(JSON.stringify(limited)).toBe(JSON.stringify(ok));
  });

  it("REGRESSION: a rejected request must never be reported as a sent email", () => {
    // The defect this replaces: the route caught everything and returned
    // {ok:true}, so a locked-out user waited on an email that was never sent.
    for (const status of [400, 401, 403, 404, 422, 500, 502, 503]) {
      const o = classifyPasswordRecovery({ kind: "ANSWERED", status });
      expect(sent(o)).toBe(false);
      expect(o.httpStatus).toBe(503);
      expect("error" in o.body && o.body.error).toContain("no email was sent");
    }
  });

  it("REGRESSION: a throw must never be reported as a sent email", () => {
    for (const error of [new TypeError("fetch failed"), new Error("boom"), "not an error"]) {
      expect(sent(classifyPasswordRecovery({ kind: "THREW", error }))).toBe(false);
    }
  });

  it("names a misdirected backend verbatim, because that message is safe by construction", () => {
    const o = classifyPasswordRecovery({
      kind: "THREW",
      error: new SupabaseAuthShapeError("NEXT_PUBLIC_SUPABASE_URL on this host is not a Supabase project URL."),
    });
    expect(o.httpStatus).toBe(503);
    expect("edge" in o.body && o.body.edge).toBe("AUTH BACKEND MISDIRECTED");
    expect("error" in o.body && o.body.error).toContain("not a Supabase project URL");
  });

  it("contributes only the NAME of any other error, never its message", () => {
    const o = classifyPasswordRecovery({
      kind: "THREW",
      error: new TypeError("Invalid URL: sb_publishable_LEAKED_VALUE"),
    });
    expect("error" in o.body && o.body.error).toContain("TypeError");
    expect("error" in o.body && o.body.error).not.toContain("sb_publishable_LEAKED_VALUE");
  });

  it("uses 'Error' when something that is not an Error is thrown", () => {
    const o = classifyPasswordRecovery({ kind: "THREW", error: { weird: true } });
    expect("error" in o.body && o.body.error).toContain("(Error)");
  });

  it("every failure disclaims that it is about the address, so no reader infers deletion", () => {
    const failures = [
      classifyPasswordRecovery({ kind: "ANSWERED", status: 500 }),
      classifyPasswordRecovery({ kind: "THREW", error: new TypeError("x") }),
      classifyPasswordRecovery({ kind: "THREW", error: new SupabaseAuthShapeError("m") }),
    ];
    for (const o of failures) {
      expect("error" in o.body && o.body.error).toContain("not a statement about the address");
    }
  });

  it("carries a named edge on every failure so a caller can branch without reading prose", () => {
    const edges = [
      classifyPasswordRecovery({ kind: "ANSWERED", status: 500 }),
      classifyPasswordRecovery({ kind: "THREW", error: new TypeError("x") }),
      classifyPasswordRecovery({ kind: "THREW", error: new SupabaseAuthShapeError("m") }),
    ].map((o) => ("edge" in o.body ? o.body.edge : null));
    expect(edges).toEqual(["RECOVERY NOT SENT", "AUTH BACKEND UNREACHABLE", "AUTH BACKEND MISDIRECTED"]);
  });

  it("never returns an empty message on a failure", () => {
    for (const status of [301, 400, 418, 500, 599]) {
      const o = classifyPasswordRecovery({ kind: "ANSWERED", status });
      expect("error" in o.body && o.body.error.length).toBeGreaterThan(0);
    }
  });
});
