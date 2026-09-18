/**
 * THE LIFECYCLE'S LAWS.
 *
 * The canon gives two lists — what must not mint, and what must not close —
 * and they are NOT each other's complement. So they are tested as two lists,
 * exhaustively, rather than as one rule with examples.
 */

import { describe, expect, it } from "vitest";

import {
  admitReconPacket,
  birthCauseOf,
  classifyLifecycleEvent,
  closesDecision,
  mintsDecision,
  promoteShadow,
  type DecisionLifecycleEvent,
  type ReconPacket,
} from "./decisionLifecycle";
import { mintDecisionId, type DecisionIdentity } from "./decisionIdentity";

const identity = (nonce: string): DecisionIdentity => {
  const r = mintDecisionId({ cause: "EXPLICIT_INTENT", deviceId: "ipad-1", nowMs: 1, nonce });
  if (!r.ok) throw new Error(r.reason);
  return r.identity;
};

/** The canon's non-birth list, verbatim in spirit. */
const MUST_NOT_MINT: readonly DecisionLifecycleEvent[] = [
  "SYMBOL_CHANGED",
  "TIMEFRAME_CHANGED",
  "OVERLAY_OPENED",
  "SEMANTIC_ZOOM",
  "HEAT_CELL_LANDED",
  "SPAIDBOT_QUESTION",
  "ACADEMY_PEEK",
  "VAULT_RESTORED",
  "TOOL_TOGGLED",
  "SHOW_OPPOSING",
  "BROKER_SESSION_DROPPED",
  "DEVICE_HANDOFF",
  "RECEIPT_OPENED",
];

/** The canon's separate non-closure list. Overlapping, not identical. */
const MUST_NOT_CLOSE: readonly DecisionLifecycleEvent[] = [
  "TIMEFRAME_CHANGED",
  "TOOL_TOGGLED",
  "SHOW_OPPOSING",
  "BROKER_SESSION_DROPPED",
  "DEVICE_HANDOFF",
  "VAULT_RESTORED",
  "RECEIPT_OPENED",
];

describe("birth — a stance, never a state", () => {
  it("THE FOUR BIRTHS, AND ONLY THE FOUR", () => {
    const births: DecisionLifecycleEvent[] = [
      "PERMISSION_GRANTED",
      "EXPLICIT_INTENT",
      "RECORDED_WAIT",
      "MANUAL_MODE_ENTERED",
    ];
    for (const e of births) expect(mintsDecision(e), e).toBe(true);
  });

  it("A RECORDED WAIT IS A DECISION — the addition that matters", () => {
    // Before 2026-09-18 the only decisions with identity were the ones that
    // reached for capital, which taught the record that declining to trade is
    // not a decision. It is frequently the best one.
    expect(mintsDecision("RECORDED_WAIT")).toBe(true);
    expect(birthCauseOf("RECORDED_WAIT")).toBe("RECORDED_WAIT");
  });

  it("NOTHING ON THE CAMERA LIST MINTS — the whole non-birth list, exhaustively", () => {
    // Not three examples a reviewer happened to think of. The danger was never
    // that someone deliberately mints on a zoom; it is that minting is one
    // line and a camera event is the convenient place for it.
    for (const e of MUST_NOT_MINT) {
      expect(mintsDecision(e), e).toBe(false);
      expect(birthCauseOf(e), e).toBeNull();
    }
  });

  it("A CAMERA EVENT HAS NO BIRTH CAUSE — it does not get the most plausible one", () => {
    // Returning a default cause here would be an invented fact with a
    // timestamp attached, which is the shape of every H1 defect.
    expect(birthCauseOf("SEMANTIC_ZOOM")).toBeNull();
    expect(birthCauseOf("FLATTENED_WITH_RECEIPT")).toBeNull();
  });
});

describe("death — not because the trader looked away", () => {
  it("closes on exactly two events", () => {
    expect(closesDecision("FLATTENED_WITH_RECEIPT")).toBe(true);
    expect(closesDecision("NEW_THESIS_DECLARED")).toBe(true);
  });

  it("NOTHING ON THE NON-CLOSURE LIST CLOSES — the second list, which is not the first", () => {
    for (const e of MUST_NOT_CLOSE) expect(closesDecision(e), e).toBe(false);
  });

  it("A DROPPED BROKER SESSION IS A JOINT, NOT A DEATH", () => {
    // The canon's own phrasing, and the one most likely to be got wrong by a
    // reconnect handler that "cleans up" on disconnect.
    expect(closesDecision("BROKER_SESSION_DROPPED")).toBe(false);
    expect(mintsDecision("BROKER_SESSION_DROPPED")).toBe(false);
    expect(classifyLifecycleEvent("BROKER_SESSION_DROPPED")).toBe("CAMERA");
  });

  it("SHOW OPPOSING DOES NOT KILL THE THESIS IT ARGUES WITH", () => {
    // Looking harder at your own idea is the behaviour the house most wants.
    // Closing the decision there would charge the trader for it.
    expect(closesDecision("SHOW_OPPOSING")).toBe(false);
  });

  it("a birth is not a closure and a closure is not a birth", () => {
    const all: DecisionLifecycleEvent[] = [
      "PERMISSION_GRANTED", "EXPLICIT_INTENT", "RECORDED_WAIT", "MANUAL_MODE_ENTERED",
      ...MUST_NOT_MINT, "FLATTENED_WITH_RECEIPT", "NEW_THESIS_DECLARED",
    ];
    for (const e of all) {
      expect(mintsDecision(e) && closesDecision(e), e).toBe(false);
    }
  });
});

describe("recon — newest packet does not win", () => {
  const p = (reconVersion: number, receivedAt: number, decisionId = "d1"): ReconPacket => ({
    decisionId, reconVersion, receivedAt,
  });

  it("ADMITS A HIGHER VERSION", () => {
    expect(admitReconPacket(p(1, 100), p(2, 200)).admitted).toBe(true);
  });

  it("REFUSES A LATER PACKET CARRYING AN OLDER VERSION — the actual bug", () => {
    // Out-of-order arrival across a reconnect. A stale packet must not walk a
    // decision backwards from FILLED to ACK merely because it landed last.
    const late = admitReconPacket(p(5, 100), p(3, 999));
    expect(late.admitted).toBe(false);
    if (!late.admitted) expect(late.reason).toMatch(/does not supersede/);
  });

  it("REFUSES AN EQUAL VERSION — the same transition arriving twice is not two", () => {
    // The double-count family, at the recon door.
    expect(admitReconPacket(p(4, 1), p(4, 2)).admitted).toBe(false);
  });

  it("receivedAt is NOT the tiebreaker, and this proves it directly", () => {
    // Same versions, wildly different arrival times, still refused. If arrival
    // order were consulted anywhere, this is the assertion that would catch it.
    expect(admitReconPacket(p(7, 0), p(7, 10_000_000)).admitted).toBe(false);
    expect(admitReconPacket(p(7, 10_000_000), p(8, 0)).admitted).toBe(true);
  });

  it("REFUSES A PACKET ABOUT A DIFFERENT DECISION, however new it claims to be", () => {
    // Two unrelated clocks. Without this, a high-version packet from another
    // decision becomes this one's newest truth.
    const cross = admitReconPacket(p(1, 1, "d1"), p(99, 2, "d2"));
    expect(cross.admitted).toBe(false);
    if (!cross.admitted) expect(cross.reason).toMatch(/different DECISION_ID/);
  });

  it("admits the first packet, because there is nothing to supersede", () => {
    expect(admitReconPacket(null, p(1, 1)).admitted).toBe(true);
  });

  it("refuses an unorderable version rather than guessing where it goes", () => {
    for (const bad of [NaN, Infinity, -Infinity]) {
      expect(admitReconPacket(p(1, 1), p(bad, 2)).admitted, String(bad)).toBe(false);
    }
  });
});

describe("shadow cannot become live", () => {
  it("KEEPS THE LINEAGE AS A POINTER, NOT AS THE IDENTITY", () => {
    const live = identity("live-1");
    const r = promoteShadow("shadow-abc", live);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.promotion.originShadowDecisionId).toBe("shadow-abc");
      expect(r.promotion.liveIdentity.decisionId).not.toBe("shadow-abc");
    }
  });

  it("REFUSES IDENTITY THEFT — the live decision may not carry the shadow's id", () => {
    // The promotion that looks harmless: a shadow decision that "worked" gets
    // its id reused, and now a live trade's entire pre-capital history was
    // recorded under different rules.
    const live = identity("live-2");
    const r = promoteShadow(live.decisionId, live);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toMatch(/Shadow cannot become live/);
  });

  it("refuses an empty shadow id — an absent lineage is not a lineage", () => {
    expect(promoteShadow("   ", identity("live-3")).ok).toBe(false);
  });
});
