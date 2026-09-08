/**
 * THE WRITE ARROW — Sentinels.
 *
 * One rule dominates: RECORDED may only be said when the authority actually
 * said ACCEPT. Every other outcome is UNRECORDED, because a false RECORDED is
 * how a trader comes to believe his phone will show a position it will not.
 */

import { describe, it, expect, vi } from "vitest";
import { recordDecisionIntent } from "./recordDecisionIntent";
import type { DecisionId } from "./decisionIdentity";

const DECISION = "wmd_abc123" as DecisionId;

function input(over: Partial<Parameters<typeof recordDecisionIntent>[0]> = {}) {
  return { decisionId: DECISION, intent: "GET ME IN NOW", deviceId: "ipad-1", ...over };
}

function jsonResponse(body: unknown, ok = true, status = 200): Response {
  return {
    ok, status,
    json: async () => body,
  } as unknown as Response;
}

describe("recordDecisionIntent", () => {
  it("says RECORDED only when the authority said ACCEPT", async () => {
    const f = vi.fn(async () => jsonResponse({ verdict: "ACCEPT", nextReconVersion: 1 }));
    const r = await recordDecisionIntent(input(), f as unknown as typeof fetch);
    expect(r.status).toBe("RECORDED");
    expect(r.note).toMatch(/other devices can see it/i);
  });

  it("writes CLIENT_INTENT at base version 0 and cannot express broker truth", async () => {
    // §11 at the wire. The type forbids quantity; this proves the payload
    // agrees, so a future edit cannot smuggle one through as a loose object.
    const f = vi.fn(async () => jsonResponse({ verdict: "ACCEPT" }));
    await recordDecisionIntent(input(), f as unknown as typeof fetch);

    const [url, init] = f.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("/api/decision-position");
    expect(init.method).toBe("POST");
    const sent = JSON.parse(String(init.body)) as Record<string, unknown>;
    expect(sent.role).toBe("CLIENT_INTENT");
    expect(sent.decisionId).toBe(DECISION);
    expect(sent.baseReconVersion).toBe(0);
    expect(sent.intent).toBe("GET ME IN NOW");
    for (const forbidden of [
      "quantityFilled", "quantityProtected", "executionState",
      "protectionState", "brokerOrderIds",
    ]) {
      expect(sent, `client wrote ${forbidden}`).not.toHaveProperty(forbidden);
    }
  });

  it.each([
    ["the network throws", () => { throw new Error("offline"); }],
    ["the response is not ok", () => jsonResponse({ verdict: "ACCEPT" }, false, 503)],
    ["the body is unreadable", () => ({ ok: true, json: async () => { throw new Error("x"); } })],
    ["the verdict is REJECT_STALE", () => jsonResponse({ verdict: "REJECT_STALE" })],
    ["the verdict is REJECT_ROLE", () => jsonResponse({ verdict: "REJECT_ROLE" })],
    ["there is no verdict at all", () => jsonResponse({ ok: true })],
    ["the verdict is not a string", () => jsonResponse({ verdict: 1 })],
  ])("reports UNRECORDED when %s", async (_label, make) => {
    const f = vi.fn(async () => make() as Response);
    const r = await recordDecisionIntent(input(), f as unknown as typeof fetch);
    expect(r.status).toBe("UNRECORDED");
    // The trader is told the CONSEQUENCE, not a status code.
    expect(r.note).toMatch(/other devices will not see it|held on this device only/i);
  });

  it("never says 'error' or 'failed' — a designed boundary is not a fault (§8)", async () => {
    const f = vi.fn(async () => { throw new Error("offline"); });
    const r = await recordDecisionIntent(input(), f as unknown as typeof fetch);
    expect(r.note).not.toMatch(/error|failed|invalid/i);
  });

  it("does not claim a decision on behalf of a device that could not name itself", async () => {
    const f = vi.fn();
    const r = await recordDecisionIntent(input({ deviceId: "  " }), f as unknown as typeof fetch);
    expect(r.status).toBe("UNRECORDED");
    expect(f).not.toHaveBeenCalled(); // and it does not waste a request finding out
  });

  it("does not retry a REJECT_STALE into a second write", async () => {
    // A stale verdict on a FIRST write means two devices both think they
    // invented this decision. Re-reading and retrying would overwrite one of
    // them silently; reporting UNRECORDED surfaces it instead.
    const f = vi.fn(async () => jsonResponse({ verdict: "REJECT_STALE" }));
    await recordDecisionIntent(input(), f as unknown as typeof fetch);
    expect(f).toHaveBeenCalledTimes(1);
  });
});
