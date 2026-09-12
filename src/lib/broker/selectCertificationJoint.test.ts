/**
 * THE CERT BOARD MUST NAME THE FIRST BROKEN LINK, AND MUST NOT CALL AN
 * UNMEASURED STAGE A FAILURE.
 *
 * These are the two ways an ordered-chain board goes wrong:
 *
 *   1. It reports the WRONG link. Stages 6..12 are BLOCKED because stage 5
 *      failed; pointing the reader at stage 6 sends them to fix a symptom of
 *      someone else's break.
 *   2. It reports an UNMEASURED link as a failing one. Twelve PENDING stages
 *      rendered as "0/12" is a number that looks like a grade and is actually
 *      an absence of measurement. That is READINESS_THEATER — precise-looking
 *      state nobody produced.
 *
 * Every assertion below is about one of those two.
 */

import { describe, it, expect } from "vitest";
import {
  selectCertificationJoint,
  type CertificationBrokerPayload,
} from "./selectCertificationJoint";
import { CERT_STAGES } from "./certification";

function broker(over: Partial<CertificationBrokerPayload>): CertificationBrokerPayload {
  return {
    brokerId: "alpaca",
    certLevel: "NONE",
    summary: "NONE · 0/12 stages passed",
    passedStages: [],
    pendingStages: [...CERT_STAGES],
    failedStages: [],
    blockedStages: [],
    fullyCertified: false,
    ...over,
  };
}

describe("selectCertificationJoint names the first link that is not holding", () => {
  it("points at the first non-PASS stage in CANON order, not payload order", () => {
    // The payload deliberately lists the passed stages out of order. A selector
    // that trusted array order would name `auth` as the joint even though auth
    // passed — the reader would be sent to a stage that already works.
    const board = selectCertificationJoint({
      brokers: [
        broker({
          implemented: true,
          passedStages: ["capabilities", "auth", "account_discovery"],
        }),
      ],
    });
    expect(board.rows[0].joint).toBe("read_market_data");
    expect(board.rows[0].passedCount).toBe(3);
  });

  it("a FAILED joint is owned by engineering and says it was actually run", () => {
    const board = selectCertificationJoint({
      brokers: [
        broker({
          implemented: true,
          passedStages: ["auth", "account_discovery"],
          failedStages: ["capabilities"],
          blockedStages: CERT_STAGES.slice(3),
        }),
      ],
    });
    const row = board.rows[0];
    expect(row.joint).toBe("capabilities");
    expect(row.jointClass).toBe("FAILED");
    expect(row.owner).toBe("ENGINEERING");
    expect(row.detail).toContain("did not pass");
  });

  it("an UNPROBED joint is UNKNOWN, never worded or owned as a failure", () => {
    const board = selectCertificationJoint({
      brokers: [broker({ implemented: true })],
    });
    const row = board.rows[0];
    expect(row.jointClass).toBe("UNPROBED");
    expect(
      row.owner,
      "a stage nobody has run is harness work; calling it engineering work sends " +
        "the Founder to fix code that has never been observed to be wrong",
    ).toBe("HARNESS");
    expect(row.detail).toContain("UNKNOWN, not failing");
    expect(row.detail.toLowerCase()).not.toContain("failed");
    expect(row.neverMeasured).toBe(true);
  });

  it("a broker with NO adapter is engineering work, not harness work", () => {
    // This is the distinction the API-side atom restored. If the selector cannot
    // see `implemented`, both this case and the one above read UNPROBED and the
    // board tells the Founder to run a harness against code that does not exist.
    const board = selectCertificationJoint({
      brokers: [broker({ implemented: false })],
    });
    const row = board.rows[0];
    expect(row.jointClass).toBe("NOT_IMPLEMENTED");
    expect(row.owner).toBe("ENGINEERING");
    expect(row.detail).toContain("integration to write, not a harness to run");
  });

  it("prefers the FAILED stage over the BLOCKED cascade behind it", () => {
    // A consistent producer marks the broken stage FAILED and everything after
    // it BLOCKED. The joint must be the FAILED one — the reader is never handed
    // a stage whose state is somebody else's consequence.
    const board = selectCertificationJoint({
      brokers: [
        broker({
          implemented: true,
          passedStages: ["auth"],
          failedStages: ["account_discovery"],
          blockedStages: CERT_STAGES.slice(2),
        }),
      ],
    });
    expect(board.rows[0].joint).toBe("account_discovery");
    expect(board.rows[0].jointClass).toBe("FAILED");
  });

  it("a joint that is BLOCKED with no failure behind it is owned by NOBODY", () => {
    // Defensive branch: the producer reported BLOCKED without reporting the
    // failure that caused it. The board must NOT invent a cause, and must not
    // hand the reader an action — a BLOCKED stage has no direct remedy.
    const board = selectCertificationJoint({
      brokers: [
        broker({
          implemented: true,
          passedStages: ["auth"],
          failedStages: [],
          blockedStages: CERT_STAGES.slice(1),
        }),
      ],
    });
    const row = board.rows[0];
    expect(row.joint).toBe("account_discovery");
    expect(row.jointClass).toBe("BLOCKED");
    expect(row.owner).toBe("NOBODY");
    expect(row.detail).toContain("an earlier stage failed");
    expect(row.neverMeasured).toBe(false);
  });

  it("redirects a BLOCKED joint to the earlier stage that failed", () => {
    // Hand-built: auth PASSED, account_discovery is reported BLOCKED without
    // itself failing, and capabilities is the real break. A board that stopped
    // at the first non-PASS stage without asking WHY would blame
    // account_discovery.
    const board = selectCertificationJoint({
      brokers: [
        broker({
          implemented: true,
          passedStages: ["auth", "account_discovery", "capabilities", "read_market_data"],
          failedStages: ["read_account_state"],
          blockedStages: CERT_STAGES.slice(5),
        }),
      ],
    });
    expect(board.rows[0].joint).toBe("read_account_state");
    expect(board.rows[0].jointClass).toBe("FAILED");
    expect(board.rows[0].detail).toContain("Every later stage is unreachable");
  });

  it("a fully certified broker has no joint at all", () => {
    const board = selectCertificationJoint({
      brokers: [
        broker({
          implemented: true,
          certLevel: "WRITE_LIVE",
          fullyCertified: true,
          passedStages: [...CERT_STAGES],
          pendingStages: [],
        }),
      ],
    });
    expect(board.rows[0].joint).toBeNull();
    expect(board.rows[0].jointClass).toBe("FULLY_CERTIFIED");
    expect(board.rows[0].owner).toBe("NOBODY");
    expect(board.fullyCertifiedCount).toBe(1);
  });
});

describe("the board refuses to present an absence of measurement as a score", () => {
  it("says outright that nothing has been run when nothing has been run", () => {
    const board = selectCertificationJoint({
      brokers: [broker({ brokerId: "alpaca", implemented: true }), broker({ brokerId: "webull", implemented: true })],
    });
    expect(board.anythingMeasured).toBe(false);
    expect(board.summary).toContain("No certification stage has ever been run");
    expect(
      board.summary,
      "the header must state the absence of measurement, not a fully-certified " +
        "COUNT — '0 of 2 certified' reads as a failing grade for work nobody did",
    ).toContain("UNKNOWN, not failures");
  });

  it("switches to a real count once anything has actually been measured", () => {
    const board = selectCertificationJoint({
      brokers: [
        broker({ brokerId: "alpaca", implemented: true, passedStages: ["auth"] }),
        broker({ brokerId: "webull", implemented: true }),
      ],
    });
    expect(board.anythingMeasured).toBe(true);
    expect(board.summary).toBe("0 of 2 brokers fully certified.");
  });

  it("an empty or absent payload says nothing rather than implying health", () => {
    for (const payload of [null, undefined, {}, { brokers: [] }]) {
      const board = selectCertificationJoint(payload);
      expect(board.rows).toEqual([]);
      expect(board.summary).toBe("No brokers registered — nothing to certify.");
      expect(board.fullyCertifiedCount).toBe(0);
    }
  });

  it("a missing `implemented` is not read as an adapter that exists", () => {
    // Older payloads, or a producer that regresses, must not be able to assert
    // an adapter into existence by omission.
    const board = selectCertificationJoint({ brokers: [broker({})] });
    expect(board.rows[0].jointClass).toBe("UNPROBED");
    expect(board.rows[0].detail).toContain("UNKNOWN, not failing");
  });

  it("drops a stage name this build does not know rather than mis-ordering it", () => {
    const board = selectCertificationJoint({
      brokers: [broker({ implemented: true, passedStages: ["auth", "quantum_settlement"] })],
    });
    expect(board.rows[0].passedStages).toEqual(["auth"]);
    expect(board.rows[0].passedCount).toBe(1);
    expect(board.rows[0].joint).toBe("account_discovery");
  });
});
