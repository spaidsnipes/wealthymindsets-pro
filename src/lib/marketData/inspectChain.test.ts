/**
 * "PASSPORT REMEMBERS. RECEIPT FREEZES. NEITHER REPRINTS THE BAR."
 *
 * Three sentences, three different failure modes, tested as three.
 */

import { describe, expect, it } from "vitest";

import {
  buildInspectChain,
  checkNoReprint,
  checkPassportRemembers,
  checkReceiptFrozen,
  freezeReceipt,
  REPRINTED_BAR_FIELDS,
  type DecisionReceipt,
} from "./inspectChain";

const chain = () => {
  const r = buildInspectChain({ barId: "B-9921", objectId: "OBJ-77", decisionId: "D-1842" });
  if (!r.ok) throw new Error(r.reason);
  return r.chain;
};

const receipt = (over: Partial<DecisionReceipt> = {}): DecisionReceipt => ({
  decisionId: "D-1842",
  barId: "B-9921",
  objectId: "OBJ-77",
  frozenAt: 1_700_000_000_000,
  gateSnapshot: "WAIT · evidence debt unpaid",
  stance: "WAIT",
  ...over,
});

describe("the chain — zero depth, shared ids", () => {
  it("RESOLVES ALL THREE FROM ONE SELECTION", () => {
    // DEPTH: ZERO is a specification. Each hop through a separate panel is a
    // place where the surface can silently substitute a different instrument,
    // a different session, or yesterday.
    const c = chain();
    expect(c).toEqual({ barId: "B-9921", objectId: "OBJ-77", decisionId: "D-1842" });
  });

  it("lets the chain END early — a bar with no object is ordinary", () => {
    const r = buildInspectChain({ barId: "B-9921" });
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.chain).toEqual({ barId: "B-9921", objectId: null, decisionId: null });
  });

  it("REFUSES A DECISION THAT SKIPS THE OBJECT — a stance about nothing", () => {
    // The house would otherwise be able to show a receipt it cannot explain.
    const r = buildInspectChain({ barId: "B-9921", decisionId: "D-1842" });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toMatch(/may not skip a link/);
  });

  it("refuses an inspect with no bar — the chain starts at the source", () => {
    expect(buildInspectChain({ barId: "   ", objectId: "OBJ-77" }).ok).toBe(false);
  });

  it("treats a blank id as absent rather than as an id", () => {
    const r = buildInspectChain({ barId: "B-1", objectId: "  ", decisionId: null });
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.chain.objectId).toBeNull();
  });
});

describe("neither reprints the bar", () => {
  it("REFUSES A RECEIPT CARRYING ITS OWN CLOSE — the tempting one", () => {
    // Freezing "the bar I decided on" by copying its numbers feels like exactly
    // the right instinct for a record. It is the cut: when the provider later
    // revises that bar, the chart moves and the receipt does not, and the two
    // now disagree about the instant a human committed capital.
    const r = checkNoReprint({ decisionId: "D-1842", barId: "B-9921", close: 178.53 });
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.offending).toEqual(["close"]);
      expect(r.reason).toMatch(/second past that cannot be corrected/);
    }
  });

  it("catches the disguised spellings, not just the obvious five", () => {
    // `priceAtDecision` is the same copy wearing a name that sounds like
    // provenance. It is the one most likely to survive review.
    for (const field of ["priceAtDecision", "closeAtDecision", "lastPrice", "barClose", "ohlcv"]) {
      expect(checkNoReprint({ barId: "B-1", [field]: 1 }).ok, field).toBe(false);
    }
  });

  it("names every offending field, not merely the first", () => {
    const r = checkNoReprint({ barId: "B-1", open: 1, high: 2, volume: 3 });
    expect(r.ok).toBe(false);
    if (!r.ok) expect([...r.offending].sort()).toEqual(["high", "open", "volume"]);
  });

  it("ADMITS A PAYLOAD THAT POINTS INSTEAD OF COPYING", () => {
    expect(checkNoReprint({ ...receipt() }).ok).toBe(true);
  });

  it("the forbidden list holds no id field — pointing is the whole cure", () => {
    for (const f of REPRINTED_BAR_FIELDS) {
      expect(f, f).not.toMatch(/^(barId|objectId|decisionId)$/);
    }
  });
});

describe("receipt freezes", () => {
  it("READS NO CLOCK — frozenAt is supplied by whoever witnessed the decision", () => {
    // If this function read a clock, a receipt re-freezing on a later read
    // would move its own timestamp, which is the drift the law forbids.
    const a = freezeReceipt({ chain: chain(), frozenAt: 111, gateSnapshot: "g", stance: "WAIT" });
    const b = freezeReceipt({ chain: chain(), frozenAt: 111, gateSnapshot: "g", stance: "WAIT" });
    expect(a.ok && b.ok).toBe(true);
    if (a.ok && b.ok) expect(a.receipt).toEqual(b.receipt);
  });

  it("CATCHES A RECEIPT RE-DERIVED FROM TODAY'S GATES", () => {
    // Not malice — a re-render. A surface that rebuilds its receipt on every
    // read produces a document that always agrees with the present, which reads
    // as a perfect audit trail and is the opposite of one.
    const r = checkReceiptFrozen(
      receipt({ gateSnapshot: "WAIT · evidence debt unpaid" }),
      receipt({ gateSnapshot: "GO · all gates clear" }),
    );
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toMatch(/mirror, not an audit trail/);
  });

  it("catches drift on every frozen field", () => {
    const drifts: Partial<DecisionReceipt>[] = [
      { barId: "B-0000" },
      { objectId: "OBJ-99" },
      { frozenAt: 1_700_000_999_999 },
      { gateSnapshot: "something else" },
      { stance: "GO" },
    ];
    for (const d of drifts) {
      const r = checkReceiptFrozen(receipt(), receipt(d));
      expect(r.ok, JSON.stringify(d)).toBe(false);
      if (!r.ok) expect(r.reason).toMatch(/drifted on/);
    }
  });

  it("compares by field, not by identity — drift arrives as a new object", () => {
    expect(checkReceiptFrozen(receipt(), receipt()).ok).toBe(true);
  });

  it("REFUSES A BLANK GATE SNAPSHOT — an audit trail of blanks is not one", () => {
    const r = freezeReceipt({ chain: chain(), frozenAt: 1, gateSnapshot: "  ", stance: "WAIT" });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toMatch(/without recording what/);
  });

  it("refuses to freeze an incomplete chain", () => {
    const partial = buildInspectChain({ barId: "B-1" });
    expect(partial.ok).toBe(true);
    if (partial.ok) {
      expect(freezeReceipt({
        chain: partial.chain, frozenAt: 1, gateSnapshot: "g", stance: "WAIT",
      }).ok).toBe(false);
    }
  });
});

describe("passport remembers — the opposite obligation", () => {
  it("LETS MEMORY GROW", () => {
    expect(checkPassportRemembers({ tests: 17, asOf: 100 }, { tests: 18, asOf: 200 }).ok).toBe(true);
    // Unchanged is fine: not every update adds a test.
    expect(checkPassportRemembers({ tests: 17, asOf: 100 }, { tests: 17, asOf: 200 }).ok).toBe(true);
  });

  it("REFUSES A PASSPORT THAT FORGETS A TEST — a fossil, not a record", () => {
    // A passport that froze would stop counting. The object's whole value is
    // that it accumulates.
    const r = checkPassportRemembers({ tests: 17, asOf: 100 }, { tests: 16, asOf: 200 });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toMatch(/fossil/);
  });

  it("REFUSES A STALE READ OVERWRITING A FRESH ONE", () => {
    // The same out-of-order bug admitReconPacket and admitBar each catch at
    // their own door, arriving here a third time.
    const r = checkPassportRemembers({ tests: 17, asOf: 500 }, { tests: 18, asOf: 100 });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toMatch(/older than what it would replace/);
  });

  it("refuses unorderable memory rather than guessing", () => {
    expect(checkPassportRemembers({ tests: 1, asOf: 1 }, { tests: 2, asOf: NaN }).ok).toBe(false);
  });

  it("THE TWO OBLIGATIONS ARE OPPOSITE, AND BOTH HOLD", () => {
    // The pair, stated as one assertion: the same change that is correct for a
    // passport is a violation for a receipt.
    expect(checkPassportRemembers({ tests: 17, asOf: 100 }, { tests: 18, asOf: 200 }).ok).toBe(true);
    expect(checkReceiptFrozen(receipt(), receipt({ stance: "GO" })).ok).toBe(false);
  });
});
