import { describe, expect, it } from "vitest";

import {
  selectDivisionWorksheet,
  type DivisionWorksheetVM,
  type WorksheetRung,
} from "./selectDivisionWorksheet";
import {
  MIN_READ_RUNGS_FOR_EMPHASIS,
  WITHHELD_INSTRUCTION_OWNER,
  selectTeachingEmphasis,
} from "./selectTeachingEmphasis";

/**
 * A worksheet VM built by hand so the number of READ rungs can be controlled.
 *
 * The real compiler is exercised too (see the last block), but most of what
 * this module does is a function of HOW MANY rungs spoke, and driving that
 * through live market inputs would make the tests depend on the absorption
 * selector's thresholds rather than on the behaviour under test.
 */
const rung = (step: number, label: string, value: string | null): WorksheetRung => ({
  step,
  label,
  question: `q${step}`,
  dividend: `d${step}`,
  carriedFrom: step === 1 ? null : step - 1,
  measures: "QUANTITY",
  state: value === null ? "UNREAD" : "READ",
  value,
  basis: value === null ? null : `basis ${step}`,
  owner: "testOwner",
  absence: value === null ? `no ${label}` : null,
});

const vmWith = (values: Array<string | null>): DivisionWorksheetVM => {
  const rungs = values.map((v, i) => rung(i + 1, `STEP ${i + 1}`, v));
  return {
    version: 1,
    rungs,
    readCount: rungs.filter((r) => r.state === "READ").length,
    unreadCount: rungs.filter((r) => r.state === "UNREAD").length,
    reason: "test",
    rightOfWayNote: "test note",
  } as DivisionWorksheetVM;
};

describe("selectTeachingEmphasis", () => {
  it("composes a paragraph once enough steps carry a value", () => {
    const e = selectTeachingEmphasis(vmWith(["390 bars", "12 prints", null]));
    expect(e.paragraph).not.toBeNull();
    expect(e.absence).toBeNull();
    expect(e.spokeFor).toEqual(["STEP 1", "STEP 2"]);
    expect(e.silentOn).toEqual(["STEP 3"]);
  });

  it("QUOTES each value verbatim rather than restating it", () => {
    // This is the whole anti-drift claim: there is ONE string, so the sentence
    // and the rung above it cannot disagree.
    const e = selectTeachingEmphasis(vmWith(["390 bars, 0 prints", "NOT READ HERE"]));
    expect(e.paragraph).toContain("390 bars, 0 prints");
    expect(e.paragraph).toContain("NOT READ HERE");
  });

  it("refuses a paragraph below the floor and says why", () => {
    const e = selectTeachingEmphasis(vmWith(["390 bars", null, null]));
    expect(e.paragraph).toBeNull();
    expect(e.absence).toContain(String(MIN_READ_RUNGS_FOR_EMPHASIS));
    expect(e.absence).toContain("already printed above");
  });

  it("refuses a paragraph when nothing was read at all", () => {
    const e = selectTeachingEmphasis(vmWith([null, null, null]));
    expect(e.paragraph).toBeNull();
    expect(e.spokeFor).toEqual([]);
    expect(e.silentOn).toHaveLength(3);
  });

  it("treats a blank or whitespace value as not having spoken", () => {
    // A rung marked READ with an empty string is a bug upstream, not a reading.
    const e = selectTeachingEmphasis(vmWith(["   ", "", "12 prints"]));
    expect(e.paragraph).toBeNull();
    expect(e.spokeFor).toEqual(["STEP 3"]);
  });

  it("NAMES the unread steps instead of dropping them", () => {
    const e = selectTeachingEmphasis(vmWith(["a", "b", null, null]));
    expect(e.paragraph).toContain("does NOT have");
    expect(e.paragraph).toContain("step 3");
    expect(e.paragraph).toContain("step 4");
  });

  it("says so plainly when nothing was left out", () => {
    const e = selectTeachingEmphasis(vmWith(["a", "b", "c"]));
    expect(e.paragraph).toContain("Every step was worked");
    expect(e.silentOn).toEqual([]);
  });

  /**
   * The mockup ends its TEACHING EMPHASIS block with an instruction about the
   * reader's capital. That is right of way, and right of way has an owner this
   * room does not have. It must be named on EVERY input — including the ones
   * where a full paragraph was composed, because that is exactly when a reader
   * is most likely to accept an instruction appended to it.
   */
  it("withholds the mockup's capital instruction on every input, and names its owner", () => {
    for (const values of [[], [null], ["a"], ["a", "b"], ["a", "b", "c", null]]) {
      const e = selectTeachingEmphasis(vmWith(values as Array<string | null>));
      expect(e.withheldInstruction).toContain(WITHHELD_INSTRUCTION_OWNER);
      expect(e.withheldInstruction).toContain("right-of-way");
      // The refusal quotes the sentence it declines; the paragraph never issues it.
      expect(e.paragraph ?? "").not.toContain("committing capital");
    }
  });

  it("never joins the steps with a word that claims causation", () => {
    const e = selectTeachingEmphasis(vmWith(["a", "b", "c"]));
    expect(e.paragraph).not.toMatch(/\b(therefore|because|so the market|which means|implies|suggests)\b/i);
  });

  it("grades nothing — no adjective supplies a verdict the owners did not", () => {
    const e = selectTeachingEmphasis(vmWith(["a", "b", "c"]));
    expect(e.paragraph).not.toMatch(
      /\b(strong|weak|good|poor|healthy|bullish|bearish|excellent|likely)\b/i,
    );
  });

  it("carries none of the mockup's fabricated figures", () => {
    const e = selectTeachingEmphasis(vmWith(["a", "b", "c"]));
    const text = `${e.paragraph ?? ""} ${e.absence ?? ""}`;
    for (const n of ["421", "532", "111", "18,552.25", "424.00"]) {
      expect(text).not.toContain(n);
    }
  });

  it("absence and paragraph are mutually exclusive on every input", () => {
    for (const values of [[], [null], ["a"], ["a", "b"], ["a", null, "c"]]) {
      const e = selectTeachingEmphasis(vmWith(values as Array<string | null>));
      expect(e.paragraph === null).toBe(e.absence !== null);
    }
  });

  it("every rung is accounted for — spokeFor plus silentOn is the whole worksheet", () => {
    const vm = vmWith(["a", null, "c", null, "e"]);
    const e = selectTeachingEmphasis(vm);
    expect(e.spokeFor.length + e.silentOn.length).toBe(vm.rungs.length);
  });

  it("runs over the REAL worksheet compiler without throwing on an empty room", () => {
    const vm = selectDivisionWorksheet({ barCount: null, tickCount: null });
    const e = selectTeachingEmphasis(vm);
    expect(e.spokeFor.length + e.silentOn.length).toBe(vm.rungs.length);
    expect(typeof e.withheldInstruction).toBe("string");
  });

  it("runs over the REAL worksheet compiler with bars loaded", () => {
    const vm = selectDivisionWorksheet({ barCount: 390, tickCount: 0 });
    const e = selectTeachingEmphasis(vm);
    // Whatever it decides, the two outputs must stay consistent with each other.
    expect(e.paragraph === null).toBe(e.absence !== null);
    expect(e.spokeFor.length).toBe(vm.rungs.filter((r) => r.state === "READ" && r.value).length);
  });
});
