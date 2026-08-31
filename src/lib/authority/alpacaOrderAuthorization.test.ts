import { describe, it, expect } from "vitest";
import {
  alpacaGateDenialBody,
  authorizeAlpacaOrder,
  canonicalizeAlpacaStatus,
  type AlpacaOrderAuthorizationRequest,
} from "./alpacaOrderAuthorization";

const NOW = "2026-08-31T00:00:00.000Z";
const OWNER = "user-owner-1";

function order(partial: Partial<AlpacaOrderAuthorizationRequest>): AlpacaOrderAuthorizationRequest {
  return { symbol: "TSLA", side: "buy", qty: 1, ...partial };
}

describe("canonicalizeAlpacaStatus", () => {
  it("maps live/fill states to accepted", () => {
    for (const s of ["accepted", "new", "filled", "partially_filled"]) {
      expect(canonicalizeAlpacaStatus(s)).toBe("accepted");
    }
  });
  it("maps pending states to pending", () => {
    expect(canonicalizeAlpacaStatus("pending_new")).toBe("pending");
    expect(canonicalizeAlpacaStatus("held")).toBe("pending");
  });
  it("maps rejected/canceled/expired to rejected", () => {
    for (const s of ["rejected", "canceled", "expired"]) {
      expect(canonicalizeAlpacaStatus(s)).toBe("rejected");
    }
  });
  it("maps anything unknown/absent to unknown (never fabricates success)", () => {
    expect(canonicalizeAlpacaStatus("weird")).toBe("unknown");
    expect(canonicalizeAlpacaStatus(null)).toBe("unknown");
    expect(canonicalizeAlpacaStatus(undefined)).toBe("unknown");
  });
});

describe("authorizeAlpacaOrder — human owner path is unaffected", () => {
  it("authorizes a default (human) paper order — existing behavior preserved", () => {
    const { decision, receipt } = authorizeAlpacaOrder({ request: order({}), ownerUserId: OWNER, nowIso: NOW });
    expect(decision.authorized).toBe(true);
    expect(decision.reasonCode).toBe("AUTHORIZED");
    // Preflight (no broker ack): authorization is NOT execution.
    expect(receipt.result).toBe("AUTHORIZED_NOT_EXECUTED");
    expect(receipt.brokerOrderId).toBeNull();
  });

  it("records the owner as a source ref, never a secret", () => {
    const { receipt } = authorizeAlpacaOrder({ request: order({}), ownerUserId: OWNER, nowIso: NOW });
    expect(receipt.sourceRefs).toContain(`owner:${OWNER}`);
    expect(JSON.stringify(receipt)).not.toMatch(/secret|token|apiKey|api_key/i);
  });

  it("post-submit with an accepted ack => EXECUTED carrying the broker order id", () => {
    const { receipt } = authorizeAlpacaOrder({
      request: order({}),
      ownerUserId: OWNER,
      nowIso: NOW,
      brokerAck: { brokerOrderId: "ALP-100", status: canonicalizeAlpacaStatus("filled") },
    });
    expect(receipt.result).toBe("EXECUTED");
    expect(receipt.brokerOrderId).toBe("ALP-100");
  });
});

describe("authorizeAlpacaOrder — NO MODEL OUTPUT ALONE CREATES AUTHORITY", () => {
  it("DENIES an automated source with no human approval (before any broker call)", () => {
    const { decision, receipt } = authorizeAlpacaOrder({
      request: order({ source: "model" }),
      ownerUserId: OWNER,
      nowIso: NOW,
    });
    expect(decision.authorized).toBe(false);
    expect(decision.reasonCode).toBe("DENIED_MODEL_CANNOT_SELF_AUTHORIZE");
    expect(receipt.result).toBe("DENIED");
  });

  it("ALLOWS an automated source once a human approves and evidence permits", () => {
    const { decision } = authorizeAlpacaOrder({
      request: order({ source: "strategy", rightOfWay: "ACTION", humanApproval: { approved: true, approvedBy: "dave" } }),
      ownerUserId: OWNER,
      nowIso: NOW,
    });
    expect(decision.authorized).toBe(true);
  });

  it("DENIES an invalid intent (qty <= 0) before any broker call", () => {
    const { decision } = authorizeAlpacaOrder({
      request: order({ qty: 0 }),
      ownerUserId: OWNER,
      nowIso: NOW,
    });
    expect(decision.authorized).toBe(false);
    expect(decision.reasonCode).toBe("DENIED_INVALID_INTENT");
  });
});

describe("alpacaGateDenialBody — one identical 403 contract across both routes", () => {
  const denied = authorizeAlpacaOrder({
    request: order({ source: "model" }),
    ownerUserId: OWNER,
    nowIso: NOW,
  });

  it("carries the machine reason code, human reason, and the DENIED receipt", () => {
    const body = alpacaGateDenialBody(denied);
    expect(body.code).toBe("DENIED_MODEL_CANNOT_SELF_AUTHORIZE");
    expect(body.error).toBe(denied.decision.reason);
    expect(body.receipt.result).toBe("DENIED");
  });

  it("never leaks a secret in the denial body", () => {
    const body = alpacaGateDenialBody(denied);
    expect(JSON.stringify(body)).not.toMatch(/secret|token|apiKey|api_key/i);
  });

  it("is a pure projection of the preflight (no invented fields)", () => {
    const body = alpacaGateDenialBody(denied);
    expect(Object.keys(body).sort()).toEqual(["code", "error", "receipt"]);
  });
});
