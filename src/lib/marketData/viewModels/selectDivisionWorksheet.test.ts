import { describe, expect, it } from "vitest";

import {
  selectDivisionWorksheet,
  DIVISION_WORKSHEET_VERSION,
  type DivisionWorksheetInput,
  type WorksheetRung,
} from "./selectDivisionWorksheet";
import type { AbsorptionAnatomyViewVM } from "./selectAbsorptionAnatomyView";
import type { AggressionResponseVM } from "./selectAggressionResponse";
import type { ContinuationHealthVM } from "./selectContinuationHealth";
import type { RegimeVM, RegimeVerdict } from "./selectRegime";

/**
 * Asset 01's seven rungs. The thing under test is NOT "does it print seven
 * rows" — it is that every row either carries a real owner's real answer or
 * says, by name, who would have had to answer it. A worksheet that quietly
 * dropped a step it could not work would read as though the step was never
 * asked for.
 */

function anatomyOf(over: Partial<AbsorptionAnatomyViewVM> = {}): AbsorptionAnatomyViewVM {
  return {
    version: 1,
    basis: "SIGNED_DELTA",
    measured: true,
    windowBars: 30,
    bars: [],
    zones: [],
    focusZone: null,
    aggression: {
      buyInitiated: 1_200_000,
      sellInitiated: 900_000,
      buyShare: 0.571,
      sellShare: 0.429,
      netDelta: 300_000,
      deltaSeries: [],
      totalVolume: 2_100_000,
    },
    checklist: [],
    conviction: { strength: "STRONG", ratio: 7.4, unbounded: false, ladderFill: 0.8 },
    reason: "effort is provider-stated aggressor delta — no absorption zone in the last 30 bars",
    zoneQualificationPossible: true,
    effortSpreadNote: null,
    ...over,
  } as AbsorptionAnatomyViewVM;
}

/** The unsigned-tape shape: the venue never said who initiated. */
const UNSIGNED_RAIL = {
  buyInitiated: null,
  sellInitiated: null,
  buyShare: null,
  sellShare: null,
  netDelta: null,
  deltaSeries: [],
  totalVolume: 2_100_000,
} as const;

function responseOf(over: Partial<AggressionResponseVM> = {}): AggressionResponseVM {
  return {
    basis: "SIGNED_DELTA",
    measured: true,
    aggressionAxis: "NET_AGGRESSION",
    aggressionAxisNote: "the y-axis carries signed net aggression",
    points: [],
    netAggression: 300_000,
    meanResponse: 0.42,
    efficiency: 0.63,
    efficiencyScaleNote: "window-relative: it compares bars within this window only",
    zones: [],
    windowBars: 30,
    zoneQualificationPossible: true,
    effortSpreadNote: null,
    effortConcentration: 0.2,
    ...over,
  } as AggressionResponseVM;
}

function regimeOf(verdict: RegimeVerdict, over: Partial<RegimeVM> = {}): RegimeVM {
  return {
    verdict,
    resolution: "RESOLVED",
    confidence: 0.6,
    narrative: `Regime narrative for ${verdict}`,
    evidence: [],
    contradictions: [],
    capturedAt: 1_700_000_000_000,
    ...over,
  } as RegimeVM;
}

function continuationOf(over: Partial<ContinuationHealthVM> = {}): ContinuationHealthVM {
  return {
    version: 1,
    health: "COHERENT",
    measured: true,
    readings: [],
    unread: [],
    reason: "both owners describe a market that is going somewhere",
    levels: [],
    confirmationLagNote: null,
    ...over,
  } as ContinuationHealthVM;
}

/** Every owner present and answering — the fully-worked worksheet. */
const FULL: DivisionWorksheetInput = {
  barCount: 120,
  tickCount: 4_310,
  anatomy: anatomyOf(),
  response: responseOf(),
  regime: regimeOf("TREND"),
  continuation: continuationOf(),
};

const by = (vm: { rungs: readonly WorksheetRung[] }, label: string): WorksheetRung => {
  const r = vm.rungs.find((x) => x.label === label);
  if (!r) throw new Error(`no rung labelled ${label}`);
  return r;
};

describe("selectDivisionWorksheet", () => {
  it("draws all seven of the mockup's rungs, in the mockup's order", () => {
    expect(selectDivisionWorksheet(FULL).rungs.map((r) => r.label)).toEqual([
      "RAW EVIDENCE",
      "PARTICIPATION",
      "RESPONSE",
      "EFFICIENCY",
      "CONTEXT",
      "INTERPRETATION",
      "MISSING EVIDENCE",
    ]);
  });

  it("numbers the steps 1..7 so the arrows can carry the division order", () => {
    expect(selectDivisionWorksheet(FULL).rungs.map((r) => r.step)).toEqual([1, 2, 3, 4, 5, 6, 7]);
  });

  it("STATES A DIVIDEND ON EVERY RUNG, read or not", () => {
    // The dividend is what makes this long division rather than a list of
    // conclusions. On a blank rung it is the more important half: it says what
    // WOULD have gone in.
    for (const r of selectDivisionWorksheet({}).rungs) {
      expect(r.dividend.length).toBeGreaterThan(0);
      expect(r.question.length).toBeGreaterThan(0);
      expect(r.owner.length).toBeGreaterThan(0);
    }
  });

  it("gives a READ rung a value AND a basis, and an UNREAD rung an absence — never both", () => {
    for (const input of [FULL, {}]) {
      for (const r of selectDivisionWorksheet(input).rungs) {
        if (r.state === "READ") {
          expect(r.value).not.toBeNull();
          expect(r.basis).not.toBeNull();
          expect(r.absence).toBeNull();
        } else {
          expect(r.value).toBeNull();
          expect(r.basis).toBeNull();
          expect(r.absence).not.toBeNull();
        }
      }
    }
  });

  describe("MISSING EVIDENCE — the rung that is permanently blank in this room", () => {
    it("is UNREAD no matter how complete the rest of the worksheet is", () => {
      const rung = by(selectDivisionWorksheet(FULL), "MISSING EVIDENCE");
      expect(rung.state).toBe("UNREAD");
      // Six of seven worked, and the seventh STILL blank. That pairing is the
      // assertion: completeness elsewhere must not be allowed to fill it in.
      expect(selectDivisionWorksheet(FULL).readCount).toBe(6);
    });

    it("names the owner that would have to be in the room, and where it lives", () => {
      const rung = by(selectDivisionWorksheet(FULL), "MISSING EVIDENCE");
      expect(rung.owner).toBe("decisionPermissionCompiler");
      expect(rung.absence).toContain("/command-deck");
    });
  });

  describe("RIGHT OF WAY — the mockup's footer, refused", () => {
    it("states no permission, on any input", () => {
      for (const input of [FULL, {}, { barCount: 120 }]) {
        const vm = selectDivisionWorksheet(input);
        // The mockup's own footer words must never appear as a VERDICT. They
        // appear in the note only as the thing being refused, which is why the
        // assertion is on the absence of a permission FIELD, not on the prose.
        expect(vm).not.toHaveProperty("rightOfWay");
        expect(vm).not.toHaveProperty("permission");
        expect(vm.rightOfWayNote).toContain("computeRightOfWay");
        expect(vm.rightOfWayNote).toContain("decisionPermissionCompiler");
      }
    });

    it("is the SAME note whatever the market is doing — the owner's absence is not a reading", () => {
      expect(selectDivisionWorksheet(FULL).rightOfWayNote).toBe(
        selectDivisionWorksheet({}).rightOfWayNote,
      );
    });
  });

  describe("EFFICIENCY — one relationship, one ratio", () => {
    it("carries selectAggressionResponse's ratio with its window-relative limit attached", () => {
      const rung = by(selectDivisionWorksheet(FULL), "EFFICIENCY");
      expect(rung.value).toBe("0.63×");
      expect(rung.basis).toBe("window-relative: it compares bars within this window only");
      expect(rung.owner).toBe("selectAggressionResponse");
    });

    it("NEVER PRINTS THE RECIPROCAL — selectAggressionResponse.ts:105-108 forbids it by name", () => {
      // `AbsorptionZone.efficiencyRatio` is effort-over-displacement and reads
      // > 5.0 as STRONG. `response.efficiency` is its reciprocal. Both owners
      // are in scope on this worksheet, so the prohibition is live HERE.
      // The fixture's 7.4 is chosen so a leak would be unmistakable beside 0.63.
      const rendered = JSON.stringify(selectDivisionWorksheet(FULL));
      expect(rendered).not.toContain("7.4");
      expect(by(selectDivisionWorksheet(FULL), "EFFICIENCY").value).not.toContain("7");
    });

    it("goes UNREAD rather than printing a zero when no effort was spent", () => {
      const rung = by(
        selectDivisionWorksheet({ ...FULL, response: responseOf({ efficiency: null }) }),
        "EFFICIENCY",
      );
      expect(rung.state).toBe("UNREAD");
      expect(rung.absence).toContain("dividing by nothing is not a zero");
    });
  });

  describe("PARTICIPATION — an unsigned tape is a fact about the venue", () => {
    it("splits the bars when the tape stated a side", () => {
      const rung = by(selectDivisionWorksheet(FULL), "PARTICIPATION");
      expect(rung.state).toBe("READ");
      expect(rung.value).toBe("1,200,000 bought / 900,000 sold");
      expect(rung.basis).toContain("buyers led");
      // The owner's own line, carried verbatim — it opens with the provenance.
      expect(rung.basis).toContain("effort is provider-stated aggressor delta");
    });

    it("goes UNREAD, naming the venue, when no side was ever stated", () => {
      const rung = by(
        selectDivisionWorksheet({
          ...FULL,
          anatomy: anatomyOf({ aggression: { ...UNSIGNED_RAIL } }),
        }),
        "PARTICIPATION",
      );
      expect(rung.state).toBe("UNREAD");
      expect(rung.absence).toContain("does not state which side initiated");
    });

    it("says NEITHER SIDE LED on a dead-even window rather than picking one", () => {
      const rung = by(
        selectDivisionWorksheet({
          ...FULL,
          anatomy: anatomyOf({
            aggression: { ...anatomyOf().aggression, buyInitiated: 500, sellInitiated: 500 },
          }),
        }),
        "PARTICIPATION",
      );
      expect(rung.basis).toContain("neither side led");
    });
  });

  describe("RAW EVIDENCE — the one rung with no dividend above it", () => {
    it("carries no carriedFrom, because nothing was divided to get here", () => {
      expect(by(selectDivisionWorksheet(FULL), "RAW EVIDENCE").carriedFrom).toBeNull();
    });

    it("GROUPS COUNTS RATHER THAN ROUNDING THEM — measuredNumber disclaims counts", () => {
      // `formatMagnitude(4310)` would print "4,310" today but its contract is
      // significant figures, not grouping, and it says in its own header that
      // counts are not its to own. 4,310 prints is 4,310 prints.
      const rung = by(selectDivisionWorksheet({ barCount: 120, tickCount: 4_310 }), "RAW EVIDENCE");
      expect(rung.value).toBe("120 bars, 4,310 prints");
    });

    it("treats ZERO PRINTS as a reading and a MISSING count as an absence", () => {
      expect(by(selectDivisionWorksheet({ barCount: 120, tickCount: 0 }), "RAW EVIDENCE").basis)
        .toContain("no per-trade prints");
      expect(by(selectDivisionWorksheet({ barCount: 120 }), "RAW EVIDENCE").value).toBe("120 bars");
      expect(by(selectDivisionWorksheet({}), "RAW EVIDENCE").state).toBe("UNREAD");
    });
  });

  describe("CONTEXT and INTERPRETATION — an owner's non-answer is not an answer", () => {
    it("goes UNREAD on an UNKNOWN regime and carries the regime's OWN reason", () => {
      const rung = by(
        selectDivisionWorksheet({
          ...FULL,
          regime: regimeOf("UNKNOWN", { reason: "Neither dimension has verified evidence." }),
        }),
        "CONTEXT",
      );
      expect(rung.state).toBe("UNREAD");
      expect(rung.absence).toBe("Neither dimension has verified evidence.");
    });

    it("goes UNREAD on an UNREADABLE continuation and carries ITS own reason", () => {
      const rung = by(
        selectDivisionWorksheet({
          ...FULL,
          continuation: continuationOf({ health: "UNREADABLE", reason: "Only 6 bars are loaded." }),
        }),
        "INTERPRETATION",
      );
      expect(rung.state).toBe("UNREAD");
      expect(rung.absence).toBe("Only 6 bars are loaded.");
    });

    it("states the verdict in the owner's OWN word when it reached one", () => {
      expect(by(selectDivisionWorksheet(FULL), "CONTEXT").value).toBe("TREND");
      expect(by(selectDivisionWorksheet(FULL), "INTERPRETATION").value).toBe("COHERENT");
    });
  });

  describe("the empty room", () => {
    it("does not throw, and does not fake a single step", () => {
      const vm = selectDivisionWorksheet();
      expect(vm.rungs).toHaveLength(7);
      expect(vm.readCount).toBe(0);
      expect(vm.unreadCount).toBe(7);
      expect(vm.rungs.every((r) => r.state === "UNREAD")).toBe(true);
    });

    it("says so in one line rather than rendering a blank page", () => {
      expect(selectDivisionWorksheet().reason).toContain("None of the 7 steps");
      expect(selectDivisionWorksheet(FULL).reason).toContain("6 of 7 steps");
    });
  });

  it("MINTS NO SCORE — the mockup's seven values were its own canvas dimensions", () => {
    // Asset 01 prints `421 × 532` against six of seven rungs and `421 × 423`
    // against the seventh. Those are the generator's pixel dimensions, not
    // readings. Nothing on this worksheet may carry a number no owner stated.
    const rendered = JSON.stringify(selectDivisionWorksheet(FULL));
    expect(rendered).not.toContain("421");
    expect(rendered).not.toContain("532");
    expect(selectDivisionWorksheet(FULL)).not.toHaveProperty("score");
  });

  it("is versioned and pure — the same owners compile the same worksheet twice", () => {
    expect(selectDivisionWorksheet(FULL).version).toBe(DIVISION_WORKSHEET_VERSION);
    expect(selectDivisionWorksheet(FULL)).toEqual(selectDivisionWorksheet(FULL));
  });
});
