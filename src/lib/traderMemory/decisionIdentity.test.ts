/**
 * DECISION IDENTITY — Sentinels.
 *
 * These lock TEAM BUILD PROMPT §4. The rule under guard is not "ids are
 * unique" — it is "the id survives everything that happens to the order."
 */

import { describe, it, expect } from "vitest";
import {
  mintDecisionId,
  decisionIdAfter,
  checkChildId,
  SURVIVED_EVENTS,
  DECISION_CHILD_KINDS,
  DECISION_IDENTITY_LAW_VERSION,
  type DecisionIdentity,
} from "./decisionIdentity";

function mint(over: Partial<Parameters<typeof mintDecisionId>[0]> = {}): DecisionIdentity {
  const r = mintDecisionId({
    cause: "EXPLICIT_INTENT",
    deviceId: "ipad-1",
    nowMs: 1_800_000_000_000,
    nonce: "3f9c1e",
    ...over,
  });
  if (!r.ok) throw new Error(`mint failed: ${r.reason}`);
  return r.identity;
}

describe("decisionIdentity — §4 birth", () => {
  it("mints from an explicit act and records which act it was", () => {
    const id = mint({ cause: "PERMISSION_GRANTED" });
    expect(id.bornFrom).toBe("PERMISSION_GRANTED");
    expect(id.bornAt).toBe(1_800_000_000_000);
    expect(id.bornOnDeviceId).toBe("ipad-1");
    expect(id.lawVersion).toBe(DECISION_IDENTITY_LAW_VERSION);
    expect(id.decisionId).toMatch(/^wmd_/);
  });

  it("reads no ambient clock — the same inputs mint the same identity twice", () => {
    // Identity that varies between the server that mints and the client that
    // reads is not identity. Nothing here may touch Date.now().
    expect(mint()).toEqual(mint());
  });

  it("REFUSES a broker-shaped seed — a decision may not be named after an order", () => {
    // The aliasing trap. An order id changes at every reject and retry; if the
    // decision id came from one, the retry would be a different decision.
    for (const seed of ["ord-991", "ORDER_44", "brk-1", "broker_7", "fill-2", "exec_9"]) {
      const r = mintDecisionId({
        cause: "EXPLICIT_INTENT", deviceId: "ipad-1", nowMs: 1, nonce: seed,
      });
      expect(r.ok, `seed ${seed} should be refused`).toBe(false);
      if (!r.ok) expect(r.reason).toMatch(/may not be named after an order/i);
    }
  });

  it("still mints from an ordinary opaque seed (the refusal is not a blanket no)", () => {
    // ANTI-VACUITY: a mint that refused everything would pass the test above
    // while shipping nothing.
    for (const seed of ["3f9c1e", "a1b2c3d4-e5f6", "orbit-9", "record-1"]) {
      expect(mintDecisionId({
        cause: "EXPLICIT_INTENT", deviceId: "ipad-1", nowMs: 1, nonce: seed,
      }).ok, `seed ${seed} should be accepted`).toBe(true);
    }
  });

  it("refuses a birth with no witness, no uniqueness, or no finite instant", () => {
    const base = { cause: "EXPLICIT_INTENT" as const, deviceId: "ipad-1", nowMs: 1, nonce: "x1" };
    expect(mintDecisionId({ ...base, deviceId: "   " }).ok).toBe(false);
    expect(mintDecisionId({ ...base, nonce: "  " }).ok).toBe(false);
    expect(mintDecisionId({ ...base, nowMs: Number.NaN }).ok).toBe(false);
    expect(mintDecisionId({ ...base, nowMs: Number.POSITIVE_INFINITY }).ok).toBe(false);
  });

  it("returns a reason instead of throwing, so a refusal cannot be caught and ignored", () => {
    const r = mintDecisionId({ cause: "EXPLICIT_INTENT", deviceId: "", nowMs: 1, nonce: "x" });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason.length).toBeGreaterThan(10);
  });
});

describe("decisionIdentity — §4 survival", () => {
  it("survives EVERY event §4 lists, exhaustively", () => {
    // Exhaustive over the exported list, not over three a reviewer thought of.
    // Adding an event to SURVIVED_EVENTS automatically extends this Sentinel.
    const id = mint();
    expect(SURVIVED_EVENTS.length).toBe(7);
    for (const event of SURVIVED_EVENTS) {
      expect(decisionIdAfter(id, event), `id changed at ${event}`).toBe(id.decisionId);
    }
  });

  it("names reject, retry, partial, protect, replace, exit and receipt by name", () => {
    // Guards the LIST, not just the behaviour over it — quietly dropping
    // RETRY_ATTEMPT would otherwise leave the exhaustive test above green.
    expect([...SURVIVED_EVENTS]).toEqual([
      "REJECT", "RETRY_ATTEMPT", "PARTIAL", "PROTECT", "REPLACE", "EXIT", "RECEIPT",
    ]);
  });
});

describe("decisionIdentity — §4 children", () => {
  it("allows exactly the six child kinds and no seventh", () => {
    expect([...DECISION_CHILD_KINDS]).toEqual([
      "executionAttemptIds", "brokerOrderIds", "fillIds",
      "protectionOrderIds", "receiptId", "originShadowDecisionId",
    ]);
  });

  it("refuses a child that IS the decision id, for every kind", () => {
    // Sharing the id would make the decision inherit the child's mortality.
    const id = mint();
    for (const kind of DECISION_CHILD_KINDS) {
      const v = checkChildId(id, kind, id.decisionId);
      expect(v.ok, `${kind} accepted the parent id`).toBe(false);
      if (!v.ok) expect(v.reason).toMatch(/may not be the decision id itself/i);
    }
  });

  it("refuses an empty child id rather than recording an absent child as present", () => {
    const id = mint();
    expect(checkChildId(id, "brokerOrderIds", "   ").ok).toBe(false);
  });

  it("accepts ordinary broker ids as CHILDREN — they are only forbidden as the parent", () => {
    // ANTI-VACUITY, and the actual point of the module: order ids are welcome
    // here. They are refused only where identity is minted.
    const id = mint();
    expect(checkChildId(id, "brokerOrderIds", "ord-991").ok).toBe(true);
    expect(checkChildId(id, "fillIds", "fill-2").ok).toBe(true);
    expect(checkChildId(id, "receiptId", "rcpt-1").ok).toBe(true);
  });
});
