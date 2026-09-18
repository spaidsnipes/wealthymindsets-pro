import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  selectOneNextThing,
  isVerdictEcho,
  inSentence,
  type OneNextThingInput,
} from "./selectOneNextThing";
import { computeEvidenceDebt } from "./decisionPermissionCompiler";
import type { EvidenceDebt, RightOfWayReading } from "./decisionPermissionCompiler";

/**
 * A FIXTURE THAT MODELS THE WRONG WORLD TESTS THE WRONG PRODUCT.
 *
 * These fixtures used to hand `["Regime", "Direction", "Location"]` in as the
 * unpaid sample and assert the headline read "Resolve regime". That assertion
 * was GREEN for the entire life of the defect, because the fixture and the
 * producer agreed with each other about a world the product does not live in:
 * regime is a pure composition and no trader can resolve it. The test was not
 * catching the bug, it was PRESERVING it.
 *
 * So `payable` is now an explicit second list, and the callers below say which
 * of their unpaid nodes something can actually pay — the same split the real
 * `computeEvidenceDebt` performs off `DecisionChainNode.payableBy`.
 */
function debt(
  missing: number,
  labels: readonly string[],
  payableLabels: readonly string[] = labels,
  missingPayable: number = missing,
): EvidenceDebt {
  return {
    payable: missing + 2,
    watch: 0,
    resolved: 2,
    missing,
    warn: 0,
    missingLabels: labels,
    warnLabels: [],
    missingPayableLabels: payableLabels,
    missingPayable,
  };
}

/** The live TSLA shape: regime heads the unpaid list and cannot be paid. */
const REGIME_FIRST = ["Regime", "Direction", "Location"] as const;
const REGIME_FIRST_PAYABLE = ["Direction", "Location"] as const;

const WAIT: RightOfWayReading = {
  value: "WAIT",
  detail: "evidence debt: need regime + direction +7",
  tone: "warn",
};
const ACTION: RightOfWayReading = {
  value: "ACTION",
  detail: "required evidence paid · steward allows",
  tone: "resolved",
};
const NO_TRADE: RightOfWayReading = { value: "NO TRADE", detail: "hard rule engaged", tone: "warn" };
const CAUTION: RightOfWayReading = { value: "CAUTION", detail: "2 watch nodes", tone: "pending" };
const UNKNOWN: RightOfWayReading = { value: "UNKNOWN", detail: "not evaluated", tone: "unknown" };

function input(p: Partial<OneNextThingInput>): OneNextThingInput {
  return { rightOfWay: null, debt: null, hasExpression: false, ...p };
}

const ALL_READINGS: readonly RightOfWayReading[] = [WAIT, ACTION, NO_TRADE, CAUTION, UNKNOWN];

describe("× A NEXT THAT REPEATS NOW IS NOT A NEXT", () => {
  it("× THE ECHOED VERDICT: no reading may produce a headline that is a verdict word", () => {
    // This is the defect verbatim. The rail printed oneStory.decision.value
    // under the NEXT label, so NEXT said "WAIT" while the chip above it also
    // said "WAIT". Every branch must now name an ACT, not a STATE.
    for (const rightOfWay of ALL_READINGS) {
      for (const hasExpression of [true, false]) {
        for (const d of [
          null,
          debt(9, ["Regime", "Direction"], ["Direction"], 8),
          debt(0, []),
          // Every unpaid node a composition — the branch that must refuse to
          // name a task. It is still not allowed to echo a verdict.
          debt(3, ["Regime", "Auction"], [], 0),
        ]) {
          const next = selectOneNextThing(input({ rightOfWay, debt: d, hasExpression }));
          expect(isVerdictEcho(next.headline), `${rightOfWay.value} → "${next.headline}"`).toBe(false);
        }
      }
    }
  });

  it("× THE VERDICT DETECTOR IS REAL: it recognises every verdict spelling", () => {
    // A detector that returns false for everything would make the test above
    // vacuously green.
    for (const word of ["WAIT", "ACTION", "NO TRADE", "CAUTION", "UNKNOWN"]) {
      expect(isVerdictEcho(word)).toBe(true);
      expect(isVerdictEcho(word.toLowerCase())).toBe(true);
      expect(isVerdictEcho(` ${word} `)).toBe(true);
    }
    expect(isVerdictEcho("Resolve regime")).toBe(false);
  });

  it("× THE BACKLOG: nine unpaid nodes yield ONE next thing, not nine", () => {
    const next = selectOneNextThing(input({
      rightOfWay: WAIT,
      debt: debt(9, [...REGIME_FIRST], [...REGIME_FIRST_PAYABLE], 8),
    }));
    expect(next.kind).toBe("PAY_EVIDENCE");
    expect(next.headline).toBe("Resolve direction");
    // The other sampled labels must NOT be promoted into the headline.
    expect(next.headline).not.toContain("location");
  });

  it("× THE CAPPED REMAINDER: the count comes from `missing`, never the sample array", () => {
    // missingLabels is capped at 3. Deriving "+N" from its length is the
    // exact live defect that once rendered "9 nodes unpaid: regime + ... +1".
    const next = selectOneNextThing(input({
      rightOfWay: WAIT,
      debt: debt(9, [...REGIME_FIRST], [...REGIME_FIRST_PAYABLE], 8),
    }));
    expect(next.detail).toContain("9 unpaid evidence nodes");
    expect(next.detail).toContain("+8");
    expect(next.detail).not.toContain("+2");
  });

  it("× THE SINGULAR PLURAL: one unpaid node reads as one, with no remainder", () => {
    const next = selectOneNextThing(input({ rightOfWay: WAIT, debt: debt(1, ["Direction"]) }));
    expect(next.detail).toContain("1 unpaid evidence node.");
    expect(next.detail).not.toContain("behind it");
  });

  it("× THE PROMOTED STEP: resolving one node is not sold as permission", () => {
    const next = selectOneNextThing(input({ rightOfWay: WAIT, debt: debt(4, ["Direction"]) }));
    expect(next.detail).toContain("does not authorise entry");
  });

  it("× THE UNNAMED DEBT: a counted but unlabelled debt admits it cannot be named", () => {
    const next = selectOneNextThing(input({ rightOfWay: WAIT, debt: debt(3, []) }));
    expect(next.kind).toBe("PAY_EVIDENCE");
    expect(next.detail).toContain("none is named");
  });

  it("× THE ORPHANED WAIT: WAIT without an evidence ledger does not invent a task", () => {
    const next = selectOneNextThing(input({ rightOfWay: WAIT, debt: null }));
    expect(next.kind).toBe("ESTABLISH_EVIDENCE");
    expect(next.detail).toContain("cannot name");
  });

  it("× THE FABRICATED NEXT: no reading at all yields an admission, not a task", () => {
    const next = selectOneNextThing(input({ rightOfWay: null }));
    expect(next.kind).toBe("ESTABLISH_EVIDENCE");
    expect(next.detail).toContain("nothing is known");
  });

  it("× THE UNKNOWN DRESSED AS A TASK: UNKNOWN refuses to guess", () => {
    const next = selectOneNextThing(input({ rightOfWay: UNKNOWN }));
    expect(next.kind).toBe("ESTABLISH_EVIDENCE");
    expect(next.detail).toContain("will not guess");
  });

  it("× THE RULE MISREAD AS MARKET: NO TRADE says only the rule can release it", () => {
    const next = selectOneNextThing(input({ rightOfWay: NO_TRADE }));
    expect(next.kind).toBe("AWAIT_RELEASE");
    expect(next.detail).toContain("No market evidence changes this job");
  });

  it("× THE CAUTION AS WAIT: CAUTION names a reading, not more waiting", () => {
    const next = selectOneNextThing(input({ rightOfWay: CAUTION }));
    expect(next.kind).toBe("REASSESS");
    expect(next.headline).toBe("Re-read the flagged evidence");
    expect(next.detail).toContain("not more waiting");
  });

  it("× THE ENTRY AFTER ENTRY: an attached expression turns the job into management", () => {
    const withExpr = selectOneNextThing(input({ rightOfWay: ACTION, hasExpression: true }));
    const without = selectOneNextThing(input({ rightOfWay: ACTION, hasExpression: false }));
    expect(withExpr.kind).toBe("MANAGE_EXPRESSION");
    expect(without.kind).toBe("CHOOSE_EXPRESSION");
    // The two must not collapse into one sentence.
    expect(withExpr.headline).not.toBe(without.headline);
  });

  it("× THE SIGNAL: no branch may emit a buy/sell instruction", () => {
    // Canon: the engine "never generates a buy/sell signal".
    const banned = /\b(buy|sell|long|short|enter now|go long|go short)\b/i;
    for (const rightOfWay of ALL_READINGS) {
      for (const hasExpression of [true, false]) {
        const next = selectOneNextThing(input({ rightOfWay, debt: debt(2, ["Direction"]), hasExpression }));
        expect(banned.test(next.headline), next.headline).toBe(false);
        expect(banned.test(next.detail), next.detail).toBe(false);
      }
    }
  });

  it("× THE UNPAYABLE TASK: a composition is never named as the next thing", () => {
    // THE DEFECT, VERBATIM. Production /charts?symbol=TSLA, 12:06Z:
    //   "Resolve regime — regime is the first of 7 unpaid evidence nodes."
    // Regime mints no evidence. No action by any trader resolves it.
    const next = selectOneNextThing(input({
      rightOfWay: WAIT,
      debt: debt(7, [...REGIME_FIRST], [...REGIME_FIRST_PAYABLE], 5),
    }));
    expect(next.headline.toLowerCase()).not.toContain("regime");
    expect(next.detail).toContain("directly-resolvable");
  });

  it("\u00d7 THE SILENCED REMAINDER: the unworkable nodes are disclosed, not hidden", () => {
    // Naming a payable node is only half the truth. The trader is owed the
    // fact that some of the debt cannot be worked on at all \u2014 otherwise
    // "7 unpaid nodes" reads as "7 things to do".
    const next = selectOneNextThing(input({
      rightOfWay: WAIT,
      debt: debt(7, [...REGIME_FIRST], [...REGIME_FIRST_PAYABLE], 5),
    }));
    expect(next.detail).toContain("2 of them cannot be worked on");
    // The true total survives the split \u2014 it is still a 7-node debt.
    expect(next.detail).toContain("7 unpaid evidence nodes");
  });

  it("\u00d7 THE INVENTED TASK: when every unpaid node is a composition, it says so", () => {
    // The branch that must refuse. Falling back to missingLabels[0] here is
    // precisely how the live sentence came to exist.
    const next = selectOneNextThing(input({
      rightOfWay: WAIT,
      debt: debt(3, ["Regime", "Auction", "Management"], [], 0),
    }));
    expect(next.kind).toBe("ESTABLISH_EVIDENCE");
    expect(next.headline).toBe("Nothing here can be worked on");
    expect(next.detail).toContain("composed from other readings");
    expect(next.detail).not.toContain("Resolving it");
  });

  it("\u00d7 THE OVER-CORRECTION: with nothing unpayable, no remainder clause appears", () => {
    // A sharper sentence must not become a longer one for everybody.
    const next = selectOneNextThing(input({
      rightOfWay: WAIT,
      debt: debt(2, ["Direction", "Location"], ["Direction", "Location"], 2),
    }));
    expect(next.headline).toBe("Resolve direction");
    expect(next.detail).not.toContain("cannot be worked on");
  });

  it("\u00d7 THE ASSUMED PAYER: an unclassified node is not silently payable", () => {
    // computeEvidenceDebt counts payability only when a node ASSERTS it.
    // Defaulting the other way would let any future unclassified node walk
    // straight back into the NEXT cell as an instruction.
    const computed = computeEvidenceDebt([
      { key: "regime", label: "Regime", verdict: "UNKNOWN", resolution: "UNKNOWN",
        narrative: "n", indicator: "UNKNOWN", payableBy: "COMPOSITION" },
      { key: "mystery", label: "Mystery", verdict: "UNKNOWN", resolution: "UNKNOWN",
        narrative: "n", indicator: "UNKNOWN" },
      { key: "direction", label: "Direction", verdict: "UNKNOWN", resolution: "UNKNOWN",
        narrative: "n", indicator: "UNKNOWN", payableBy: "EVIDENCE" },
    ]);
    expect(computed?.missing).toBe(3);
    expect(computed?.missingPayable).toBe(1);
    expect(computed?.missingPayableLabels).toEqual(["Direction"]);
    // \u2026and the sentence that results names the asserted one, not the mystery.
    const next = selectOneNextThing(input({ rightOfWay: WAIT, debt: computed }));
    expect(next.headline).toBe("Resolve direction");
  });

  it("× THE SILENT NEXT: every branch carries both a headline and real detail", () => {
    for (const rightOfWay of [...ALL_READINGS, null]) {
      const next = selectOneNextThing(input({ rightOfWay, debt: debt(2, ["Direction"]) }));
      expect(next.headline.length).toBeGreaterThan(3);
      expect(next.detail.length).toBeGreaterThan(30);
    }
  });
});

describe("× THE RAIL REVERTS", () => {
  const railPath = resolve(__dirname, "../../../components/experience/DecisionSpineBand.tsx");
  const rail = readFileSync(railPath, "utf8");

  it("× THE DEAD IMPORT: the rail actually composes the selector", () => {
    expect(rail).toContain("selectOneNextThing");
    // A single occurrence would be satisfied by an unused import.
    const hits = rail.split("selectOneNextThing").length - 1;
    expect(hits).toBeGreaterThan(1);
  });

  it("× THE RESURRECTED ECHO: NEXT no longer prints the raw verdict", () => {
    // The exact reverted form. `oneStory.decision.value` under the NEXT
    // label IS the defect; reviving it must fail here.
    expect(rail).not.toContain("oneStory.decision.value");
  });
});

/**
 * × PAYABLE BY KIND IS NOT PAYABLE ON THIS VENUE.
 *
 * MEASURED LIVE, production /charts?symbol=TSLA. The regime chip said, truly,
 * "no per-trade tape has arrived ... The candles cannot answer it." Inches
 * away this engine said "Resolve direction" — and direction is measured trade
 * by trade too. 28b6cde8 did not remove the impossible instruction, it moved
 * it one node down, where it is HARDER to see because direction genuinely is
 * measured directly.
 *
 * Every test is named for the specific way the fix can be undone.
 */
describe("× the impossible instruction, one node down", () => {
  /** direction + volatility blocked by the feed; 4 compositions behind them. */
  function tapeless(): EvidenceDebt {
    return {
      payable: 8,
      watch: 0,
      resolved: 1,
      missing: 7,
      warn: 0,
      missingLabels: ["Regime", "Direction", "Location"],
      warnLabels: [],
      missingPayableLabels: [],
      missingPayable: 0,
      venueBlockedLabels: ["Direction", "Location", "Aggression"],
      venueBlocked: 3,
    };
  }

  it("× THE RELOCATION: never instructs the trader to resolve a venue-blocked node", () => {
    const r = selectOneNextThing({ rightOfWay: WAIT, debt: tapeless(), hasExpression: false });
    expect(r.headline).not.toMatch(/resolve direction/i);
    expect(r.headline).not.toMatch(/resolve location/i);
    expect(r.headline).not.toMatch(/resolve aggression/i);
  });

  it("× THE WAIT WITH NO END: names the human action instead of a wait", () => {
    const r = selectOneNextThing({ rightOfWay: WAIT, debt: tapeless(), hasExpression: false });
    expect(r.headline).toBe("Connect a per-trade data source");
    expect(r.detail).toContain("Waiting will not resolve them");
  });

  it("× THE MISLABEL: a venue-blocked node is NOT called a composition", () => {
    const r = selectOneNextThing({ rightOfWay: WAIT, debt: tapeless(), hasExpression: false });
    // Direction IS measured directly. Calling it "composed from other readings"
    // would be a brand-new false statement replacing the one being removed.
    expect(r.detail).not.toMatch(/composed from other readings/i);
    expect(r.detail).toContain("measured directly");
  });

  it("× THE OVER-CORRECTION: it still does not authorise anything", () => {
    const r = selectOneNextThing({ rightOfWay: WAIT, debt: tapeless(), hasExpression: false });
    expect(r.kind).toBe("ESTABLISH_EVIDENCE");
    expect(r.headline).not.toMatch(/\b(buy|sell|long|short|enter)\b/i);
  });

  it("× THE VENDOR PITCH: it names no broker, price or product", () => {
    const r = selectOneNextThing({ rightOfWay: WAIT, debt: tapeless(), hasExpression: false });
    const said = `${r.headline} ${r.detail}`;
    // WM knows the lane is absent. It does not know which venue this trader
    // should buy, and guessing would be a fresh fabrication.
    expect(said).not.toMatch(/polygon|databento|alpaca|coinbase|\$\d|subscribe|upgrade/i);
  });

  it("× THE SHRUNK LEDGER: the true size of the debt is still reported", () => {
    const r = selectOneNextThing({ rightOfWay: WAIT, debt: tapeless(), hasExpression: false });
    // 3 blocked out of 7 unpaid. Neither number may be quietly dropped to make
    // the sentence read better.
    expect(r.detail).toContain("3 unpaid node");
  });

  it("× THE HIJACK: a payable node still outranks a venue block", () => {
    const d: EvidenceDebt = {
      ...tapeless(),
      missingPayableLabels: ["Risk"],
      missingPayable: 1,
    };
    const r = selectOneNextThing({ rightOfWay: WAIT, debt: d, hasExpression: false });
    // Something CAN be paid, so that is the next thing — but the blocked nodes
    // must still be disclosed, and still not as compositions.
    expect(r.headline).toBe("Resolve risk");
    expect(r.detail).toContain("cannot be resolved on this feed");
    expect(r.detail).toContain("3 of them");
  });

  it("× THE DOUBLE COUNT: blocked nodes are not also counted as compositions", () => {
    const d: EvidenceDebt = {
      ...tapeless(),
      missingPayableLabels: ["Risk"],
      missingPayable: 1,
    };
    const r = selectOneNextThing({ rightOfWay: WAIT, debt: d, hasExpression: false });
    // 7 unpaid = 1 payable + 3 blocked + 3 compositions. If the composition
    // clause said 6 it would be counting the blocked three twice.
    expect(r.detail).toContain("3 of them cannot be worked on at all");
  });

  it("× THE REGRESSION: a debt with no venue block reads exactly as before", () => {
    const r = selectOneNextThing({
      rightOfWay: WAIT,
      debt: debt(7, [...REGIME_FIRST], [...REGIME_FIRST_PAYABLE], 2),
      hasExpression: false,
    });
    expect(r.headline).toBe("Resolve direction");
    expect(r.detail).not.toContain("cannot be resolved on this feed");
    expect(r.detail).toContain("composed from other readings");
  });

  it("× THE SILENT FIELD: computeEvidenceDebt always emits both venue fields", () => {
    // The fields are optional on the TYPE so 16 pre-existing fixtures did not
    // have to change. The guarantee that production never sees `undefined`
    // lives HERE, because every production site routes through this function.
    const d = computeEvidenceDebt([
      { key: "d", label: "Direction", verdict: "UNRESOLVED", resolution: "UNKNOWN",
        narrative: "n", indicator: "UNKNOWN", payableBy: "EVIDENCE", venueBlocked: true },
      { key: "r", label: "Risk", verdict: "UNRESOLVED", resolution: "UNKNOWN",
        narrative: "n", indicator: "UNKNOWN", payableBy: "DECLARATION" },
    ]);
    expect(d?.venueBlocked).toBe(1);
    expect(d?.venueBlockedLabels).toEqual(["Direction"]);
    // And the blocked node must have LEFT the payable set, not joined it.
    expect(d?.missingPayable).toBe(1);
    expect(d?.missingPayableLabels).toEqual(["Risk"]);
  });

  it("× THE UNPROVEN BLOCK: an unflagged node is still payable", () => {
    const d = computeEvidenceDebt([
      { key: "d", label: "Direction", verdict: "UNRESOLVED", resolution: "UNKNOWN",
        narrative: "n", indicator: "UNKNOWN", payableBy: "EVIDENCE" },
    ]);
    // `undefined` means NOT ESTABLISHED. Assuming a venue block nobody proved
    // is the same fabrication pointing the other way.
    expect(d?.venueBlocked).toBe(0);
    expect(d?.missingPayable).toBe(1);
  });
});

describe("× a label is a name", () => {
  // MEASURED LIVE on production /charts?symbol=TSLA immediately after the
  // venue-blocking atom landed: "Resolve available r". The R is the R-multiple
  // the whole Proof Lane is denominated in, not a stray letter.
  const withPayable = (label: string): EvidenceDebt => ({
    missing: 3,
    warn: 0,
    total: 8,
    missingLabels: [label],
    missingPayable: 1,
    missingPayableLabels: [label],
    venueBlocked: 0,
    venueBlockedLabels: [],
  } as unknown as EvidenceDebt);

  it("× THE DESTROYED UNIT: 'Available R' does not become 'available r'", () => {
    const r = selectOneNextThing({
      rightOfWay: WAIT,
      debt: withPayable("Available R"),
      hasExpression: false,
    });
    expect(r.headline).toBe("Resolve available R");
    expect(r.headline).not.toContain("available r");
    expect(r.detail).toContain("available R is the first");
  });

  it("× THE FLATTENED ACRONYM: 'CLC' survives intact", () => {
    expect(inSentence("CLC")).toBe("CLC");
    expect(inSentence("Available R")).toBe("available R");
  });

  it("× THE OVER-CORRECTION: ordinary nouns are STILL lowered", () => {
    // Sentence case is what makes these read as prose. The defect was
    // lowercasing indiscriminately, not lowercasing at all.
    expect(inSentence("Direction")).toBe("direction");
    expect(inSentence("Aggression")).toBe("aggression");
    const r = selectOneNextThing({
      rightOfWay: WAIT,
      debt: withPayable("Direction"),
      hasExpression: false,
    });
    expect(r.headline).toBe("Resolve direction");
  });

  it("× THE SHOUTED LABEL: an all-caps label is not re-capitalised either", () => {
    // inSentence only ever LOWERS. It must never add capitals — inventing a
    // capital is the same overreach pointing the other way.
    expect(inSentence("ORDER FLOW")).toBe("ORDER FLOW");
    expect(inSentence("regime")).toBe("regime");
  });
});
