/**
 * Clarity State fences the one property that makes an "internal operating
 * state" tile trustworthy instead of flattering.
 *
 * ── The failure this suite exists to forbid ──────────────────────────────────
 *
 * Every dashboard that averages a set of gauges eventually meets an input it
 * cannot read. The instinct is to skip it and average what remains. That single
 * decision inverts the meaning of the number: the LESS the system knows, the
 * HIGHER it scores, because the unknown input was dropped from both sides of
 * the division instead of counting against the result.
 *
 * The Founder's OS Overview asks for four clarity components and two of them —
 * Physiological Coherence and Emotional Noise — have no sensor anywhere in this
 * product. So this is not a hypothetical shape. It is the shape this tile would
 * have had.
 *
 * The law, stated positively: AN INPUT NOBODY OWNS MAY NEVER RAISE CLARITY.
 * It may lower `confidence` and it must produce a disclosure. It may not touch
 * `level`.
 */

import { describe, it, expect } from "vitest";
import {
  selectClarityState,
  CLARITY_LEVELS,
  CLARITY_STATE_VERSION,
  UNOWNED_CLARITY_COMPONENTS,
  type ClarityLevel,
  type ClarityStateInput,
} from "./selectClarityState";
import type { EvidenceDebt, RightOfWayReading } from "../marketData/viewModels/decisionPermissionCompiler";
import type { SecondaryNoiseVM } from "./selectSecondaryNoise";

function debtOf(p: Partial<EvidenceDebt>): EvidenceDebt {
  return {
    payable: 0,
    watch: 0,
    resolved: 0,
    missing: 0,
    warn: 0,
    missingLabels: [],
    warnLabels: [],
    missingPayableLabels: [],
    missingPayable: 0,
    ...p,
  };
}

const PAID: EvidenceDebt = debtOf({ payable: 4, resolved: 4 });
const UNPAID: EvidenceDebt = debtOf({ payable: 4, resolved: 1, missing: 3, missingLabels: ["regime"] });
const FLAGGED: EvidenceDebt = debtOf({ payable: 4, resolved: 3, warn: 1, warnLabels: ["volume"] });

const ACTION: RightOfWayReading = { value: "ACTION", detail: "required evidence paid", tone: "resolved" };
const QUIET: SecondaryNoiseVM = {
  state: "QUIETED",
  value: "Quieted",
  detail: "secondary surfaces quieted",
  unresolved: false,
} as SecondaryNoiseVM;

function build(p: Partial<ClarityStateInput> = {}) {
  return selectClarityState({ debt: PAID, rightOfWay: ACTION, noise: QUIET, ...p });
}

describe("selectClarityState — an unowned input may never raise clarity", () => {
  it("names the components it cannot measure instead of dropping them", () => {
    // The whole point. If this list is ever emptied because the labels were
    // inconvenient, the tile goes back to implying WM Pro measures a heart rate.
    expect(UNOWNED_CLARITY_COMPONENTS.length).toBeGreaterThan(0);
    const labels = UNOWNED_CLARITY_COMPONENTS.map((c) => c.label);
    expect(labels).toContain("Physiological Coherence");
    expect(labels).toContain("Emotional Noise");
    for (const c of UNOWNED_CLARITY_COMPONENTS) {
      expect(c.reason.length, `${c.label} has no stated reason`).toBeGreaterThan(10);
    }
  });

  it("surfaces the disclosure on every reading, at every level", () => {
    // Not "when something goes wrong" — ALWAYS. The gap is a permanent property
    // of the product, not an error state.
    for (const debt of [PAID, UNPAID, FLAGGED, null]) {
      const vm = build({ debt });
      expect(vm.hasDisclosure, `level ${vm.level} hid the disclosure`).toBe(true);
      expect(vm.unownedComponents.length).toBeGreaterThan(0);
    }
  });

  it("counts unmeasurable components in the confidence DENOMINATOR", () => {
    // The arithmetic that makes the law real. Two measured components against
    // two unowned ones is 50% — not 100% "of what we could see".
    const vm = build();
    expect(vm.components).toHaveLength(2);
    expect(vm.confidence).toBe(50);
    expect(vm.confidence).toBeLessThan(100);
  });

  it("never reports full confidence while any component is unowned", () => {
    for (const debt of [PAID, UNPAID, FLAGGED, null]) {
      for (const noise of [QUIET, null]) {
        expect(build({ debt, noise }).confidence).toBeLessThan(100);
      }
    }
  });

  it("does not let a LOST input improve the level", () => {
    // Drop the noise input entirely. Fewer measured components must never make
    // the verdict better — this is the skip-and-average failure, executed
    // directly against the module.
    const withNoise = build({ noise: QUIET });
    const withoutNoise = build({ noise: null });
    const rank = (l: ClarityLevel) => CLARITY_LEVELS.indexOf(l);
    expect(rank(withoutNoise.level)).toBeLessThanOrEqual(rank(withNoise.level));
    // And the loss is visible where it belongs: in confidence.
    expect(withoutNoise.confidence).toBeLessThan(withNoise.confidence);
  });
});

describe("selectClarityState — the level follows the evidence owner", () => {
  it("is UNMEASURED when no ledger has been evaluated", () => {
    expect(build({ debt: null }).level).toBe("UNMEASURED");
    expect(build({ debt: debtOf({ payable: 0, watch: 3 }) }).level).toBe("UNMEASURED");
  });

  it("is UNMEASURED — not CLEAR — when the ledger holds only WATCH nodes", () => {
    // A chain of pure WATCH nodes has zero missing and zero warn. Read
    // carelessly that looks like a clean bill of health; it is an unevaluated
    // one. This is the same distinction `payable` was introduced to protect.
    const vm = build({ debt: debtOf({ payable: 0, watch: 5 }) });
    expect(vm.level).toBe("UNMEASURED");
    expect(vm.detail).toContain("no evidence ledger");
  });

  it("is CLOUDED while evidence is unpaid, whatever right of way says", () => {
    const vm = build({ debt: UNPAID, rightOfWay: ACTION });
    expect(vm.level).toBe("CLOUDED");
    expect(vm.detail).toContain("3 evidence nodes unpaid");
  });

  it("is CONTESTED when evidence is paid but a node is flagged", () => {
    expect(build({ debt: FLAGGED }).level).toBe("CONTESTED");
    expect(build({ debt: FLAGGED }).detail).toContain("1 node flagged");
  });

  it("is CLEAR only when the ledger is fully paid and nothing is withheld", () => {
    const vm = build({ debt: PAID, rightOfWay: ACTION });
    expect(vm.level).toBe("CLEAR");
    expect(vm.value).toBe("CLEAR");
  });

  it("lets Right of Way push DOWN and never pull UP", () => {
    // Right of Way is a second opinion from the same compiler. If it could
    // rescue a clouded read, the ledger would stop being the owner.
    const rescue: RightOfWayReading = { value: "ACTION", detail: "all good", tone: "resolved" };
    expect(build({ debt: UNPAID, rightOfWay: rescue }).level).toBe("CLOUDED");

    const block: RightOfWayReading = { value: "NO TRADE", detail: "hard rule engaged", tone: "warn" };
    expect(build({ debt: PAID, rightOfWay: block }).level).toBe("CLOUDED");

    const caution: RightOfWayReading = { value: "CAUTION", detail: "soft rule", tone: "pending" };
    expect(build({ debt: PAID, rightOfWay: caution }).level).toBe("CONTESTED");

    const unknown: RightOfWayReading = { value: "UNKNOWN", detail: "not evaluated", tone: "unknown" };
    expect(build({ debt: PAID, rightOfWay: unknown }).level).toBe("CONTESTED");
  });
});

describe("selectClarityState — components carry their owner", () => {
  it("prints the module that produced each number", () => {
    // A percentage with no attributable source is the thing LIVING-PIXEL LAW
    // forbids. Every rendered bar must be traceable to a file.
    for (const c of build().components) {
      expect(c.source.length, `${c.label} has no source`).toBeGreaterThan(0);
      expect(c.percent).toBeGreaterThanOrEqual(0);
      expect(c.percent).toBeLessThanOrEqual(100);
    }
  });

  it("uses `payable` as the evidence denominator, not the node count", () => {
    // 3 paid of 4 payable, with 6 WATCH nodes alongside. The honest reading is
    // 75%. Using nodes.length would have produced 30% and a number nothing on
    // screen could explain.
    const vm = build({ debt: debtOf({ payable: 4, resolved: 3, warn: 1, watch: 6 }) });
    const evidence = vm.components.find((c) => c.label === "Evidence Clarity");
    expect(evidence?.percent).toBe(75);
    expect(evidence?.reading).toBe("3 of 4 paid");
  });

  it("measures SCREEN quiet and says so in the label", () => {
    // The rename is the honesty. "Emotional Noise" claims a subject this
    // measurement does not have; "Screen Quiet" claims exactly what it has.
    const labels = build().components.map((c) => c.label);
    expect(labels).toContain("Screen Quiet");
    expect(labels).not.toContain("Emotional Noise");
    expect(labels).not.toContain("Mental Clarity");
  });

  it("points every bar the same way — higher is better", () => {
    // Screen noise is inverted at the source into QUIET precisely so a reader
    // never has to remember that one bar in the tile runs backwards.
    const active = { ...QUIET, state: "ACTIVE" as const };
    const quiet = build({ noise: QUIET }).components.find((c) => c.label === "Screen Quiet");
    const loud = build({ noise: active as SecondaryNoiseVM }).components.find(
      (c) => c.label === "Screen Quiet",
    );
    expect(quiet!.percent).toBeGreaterThan(loud!.percent);
  });

  it("omits the evidence bar rather than printing 0% for an unevaluated ledger", () => {
    // Absent and zero are different claims. 0% says "nothing is paid"; absent
    // says "nothing was asked". Printing the first for the second is the same
    // class of overreach as "No open positions" on a failed fetch.
    const vm = build({ debt: null });
    expect(vm.components.find((c) => c.label === "Evidence Clarity")).toBeUndefined();
  });
});

describe("selectClarityState — shape", () => {
  it("is versioned so a surface can refuse a shape it does not understand", () => {
    expect(build().version).toBe(CLARITY_STATE_VERSION);
  });

  it("is pure — same input, same output, no clock and no store", () => {
    const input: ClarityStateInput = { debt: FLAGGED, rightOfWay: ACTION, noise: QUIET };
    expect(selectClarityState(input)).toEqual(selectClarityState(input));
  });

  it("only ever returns a level from the declared vocabulary", () => {
    const rows: RightOfWayReading["value"][] = ["ACTION", "WAIT", "NO TRADE", "CAUTION", "UNKNOWN"];
    for (const debt of [PAID, UNPAID, FLAGGED, null]) {
      for (const v of rows) {
        const vm = build({ debt, rightOfWay: { value: v, detail: "", tone: "pending" } });
        expect(CLARITY_LEVELS).toContain(vm.level);
        expect(vm.detail.length, `${vm.level} shipped an empty detail`).toBeGreaterThan(0);
      }
    }
  });
});
