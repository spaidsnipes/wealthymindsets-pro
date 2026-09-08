/**
 * THE READ ARROW — Sentinels.
 *
 * One rule dominates, and it is the mirror of the write arrow's: NOT_RECORDED
 * may only be said when the authority said it. A lost connection is not a
 * finding, and "I could not look" may never become "there is nothing there".
 */

import { describe, it, expect, vi } from "vitest";
import { projectDecision } from "./projectDecision";
import type { DecisionId } from "./decisionIdentity";

const DECISION = "wmd_abc123" as DecisionId;

function res(body: unknown, ok = true, status = 200): Response {
  return { ok, status, json: async () => body } as unknown as Response;
}

const FULL_POSITION = {
  decisionId: "wmd_abc123",
  reconVersion: 3,
  intent: "GET ME IN NOW",
  intentDeviceId: "ipad-1",
  quantityFilled: 100,
  quantityProtected: 100,
  executionState: "FILLED",
  protectionState: "PROTECTED",
};

describe("projectDecision", () => {
  it("projects a record the authority actually projected", async () => {
    const f = vi.fn(async () => res({ status: "PROJECTED", position: FULL_POSITION }));
    const r = await projectDecision(DECISION, f as unknown as typeof fetch);
    expect(r.status).toBe("PROJECTED");
    expect(r.position?.quantityFilled).toBe(100);
    expect(r.position?.reconVersion).toBe(3);
  });

  it("asks about the one decision, by id, on the shared route", async () => {
    const f = vi.fn(async () => res({ status: "NOT_RECORDED" }));
    await projectDecision(DECISION, f as unknown as typeof fetch);
    const url = String((f.mock.calls[0] as unknown as [string])[0]);
    expect(url).toContain("/api/decision-position");
    expect(url).toContain("decisionId=wmd_abc123");
  });

  it("reports NOT_RECORDED only because the authority said so", async () => {
    const f = vi.fn(async () => res({ status: "NOT_RECORDED" }));
    const r = await projectDecision(DECISION, f as unknown as typeof fetch);
    expect(r.status).toBe("NOT_RECORDED");
    expect(r.position).toBeNull();
    expect(r.note).toMatch(/not the same as a position of size zero|holds nothing/i);
  });

  it.each([
    ["the network throws", () => { throw new Error("offline"); }],
    ["the route returns its own 503 UNVERIFIED", () =>
      res({ status: "UNVERIFIED", position: null, note: "n" }, false, 503)],
    ["the body is not an object", () => res("nope")],
    ["the body is an array", () => res([])],
    ["there is no status at all", () => res({ position: FULL_POSITION })],
    ["the status is one WM does not know", () => res({ status: "SOMETHING_NEW" })],
    ["a 200 carries no readable JSON", () => res(null)],
  ])("reports UNVERIFIED when %s — a silence is not a finding", async (_l, make) => {
    const f = vi.fn(async () => make() as Response);
    const r = await projectDecision(DECISION, f as unknown as typeof fetch);
    expect(r.status).toBe("UNVERIFIED");
    expect(r.position).toBeNull();
  });

  it("NEVER turns an unreachable authority into NOT_RECORDED (H1)", async () => {
    // The whole module exists for this line. If a dropped connection could
    // report NOT_RECORDED, a trader would be told his real position is
    // missing and would act on the difference.
    const f = vi.fn(async () => { throw new Error("offline"); });
    const r = await projectDecision(DECISION, f as unknown as typeof fetch);
    expect(r.status).not.toBe("NOT_RECORDED");
    expect(r.note).toMatch(/does not mean the position is flat/i);
  });

  it("does not accept NOT_RECORDED over a response the route called not-ok", async () => {
    const f = vi.fn(async () => res({ status: "NOT_RECORDED" }, false, 500));
    const r = await projectDecision(DECISION, f as unknown as typeof fetch);
    expect(r.status).toBe("UNVERIFIED");
  });

  it("refuses a projection that answers about a DIFFERENT decision", async () => {
    const f = vi.fn(async () => res({
      status: "PROJECTED",
      position: { ...FULL_POSITION, decisionId: "wmd_somebody_else" },
    }));
    const r = await projectDecision(DECISION, f as unknown as typeof fetch);
    expect(r.status).toBe("UNVERIFIED");
    expect(r.position).toBeNull();
  });

  it("refuses a projection whose recon version cannot be read", async () => {
    // A row WM cannot version cannot be safely amended later; it does not
    // invent a version to fill the hole.
    const f = vi.fn(async () => res({
      status: "PROJECTED", position: { ...FULL_POSITION, reconVersion: "3" },
    }));
    const r = await projectDecision(DECISION, f as unknown as typeof fetch);
    expect(r.status).toBe("UNVERIFIED");
  });

  it("refuses a PROJECTED with no readable position rather than reporting zeroes", async () => {
    const f = vi.fn(async () => res({ status: "PROJECTED", position: null }));
    const r = await projectDecision(DECISION, f as unknown as typeof fetch);
    expect(r.status).toBe("UNVERIFIED");
  });

  it("keeps absent broker truth ABSENT — never 0, never empty string (§11/H1)", async () => {
    const f = vi.fn(async () => res({
      status: "PROJECTED",
      position: { decisionId: "wmd_abc123", reconVersion: 0 },
    }));
    const r = await projectDecision(DECISION, f as unknown as typeof fetch);
    expect(r.status).toBe("PROJECTED");
    expect(r.position?.quantityFilled).toBeNull();
    expect(r.position?.quantityProtected).toBeNull();
    expect(r.position?.executionState).toBeNull();
    expect(r.position?.protectionState).toBeNull();
    expect(r.position?.intent).toBeNull();
  });

  it("says SIGNED_OUT on 401 — a shared book is per-trader", async () => {
    const f = vi.fn(async () => res({}, false, 401));
    const r = await projectDecision(DECISION, f as unknown as typeof fetch);
    expect(r.status).toBe("SIGNED_OUT");
  });

  it("does not ask the capability probe for a position", async () => {
    // With no decisionId the same route answers a DIFFERENT question (is the
    // authority there at all). Reading that as a position is a category error.
    const f = vi.fn();
    const r = await projectDecision("  ", f as unknown as typeof fetch);
    expect(r.status).toBe("UNVERIFIED");
    expect(f).not.toHaveBeenCalled();
  });

  it("never says 'error' or 'failed' — a designed boundary is not a fault (§8)", async () => {
    const f = vi.fn(async () => { throw new Error("offline"); });
    const r = await projectDecision(DECISION, f as unknown as typeof fetch);
    expect(r.note).not.toMatch(/error|failed|invalid/i);
  });
});
