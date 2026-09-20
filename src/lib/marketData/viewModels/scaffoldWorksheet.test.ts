import { describe, expect, it } from "vitest";

import {
  DEFAULT_SCAFFOLD_LEVEL,
  INTERMEDIATE_PROMISE_REFUSAL,
  SCAFFOLD_LEVELS,
  scaffoldWorksheet,
  type ScaffoldLevel,
} from "./scaffoldWorksheet";
import {
  selectDivisionWorksheet,
  type DivisionWorksheetVM,
} from "./selectDivisionWorksheet";

/** A worksheet with nothing loaded — every rung UNREAD. */
const emptyWorksheet = (): DivisionWorksheetVM => selectDivisionWorksheet({});

/**
 * A worksheet with the two rungs this room can always work: the raw series and
 * (via a minimal response) the efficiency. Built through the real compiler so
 * the levels are exercised against the shape the app actually produces.
 */
const partlyWorked = (): DivisionWorksheetVM =>
  selectDivisionWorksheet({
    barCount: 390,
    tickCount: 0,
    response: {
      measured: true,
      meanResponse: 1.25,
      efficiency: 0.62,
      aggressionAxisNote: "axis shows effort, not net aggression",
      efficiencyScaleNote: "displacement per unit of effort, this window only",
    } as never,
  });

const atEveryLevel = (vm: DivisionWorksheetVM) =>
  SCAFFOLD_LEVELS.map((level) => scaffoldWorksheet(vm, level));

describe("Asset 12 · compression removes words, never facts", () => {
  it("reports the same read and unread counts at every level", () => {
    // This is the whole module. A "pro" view that quietly drops the blank rungs
    // does not hand the reader discretion — it hands them a shorter page with a
    // hidden evidence debt, and teaches them the missing steps were never asked
    // for. The mockup's own middle panel promises "LESS STEPS"; this is the
    // assertion that refuses it.
    const vm = partlyWorked();
    for (const s of atEveryLevel(vm)) {
      expect(s.readCount, `readCount changed at ${s.level}`).toBe(vm.readCount);
      expect(s.unreadCount, `unreadCount changed at ${s.level}`).toBe(vm.unreadCount);
      expect(s.totalSteps, `totalSteps changed at ${s.level}`).toBe(vm.rungs.length);
    }
  });

  it("accounts for every step, whether it drew it or not", () => {
    // shown + withheld must reconstruct the division exactly. A step that is in
    // neither set is a step that vanished without anyone counting it.
    const vm = partlyWorked();
    for (const s of atEveryLevel(vm)) {
      const accounted = [...s.shown.map((x) => x.rung.step), ...s.withheldSteps].sort(
        (a, b) => a - b,
      );
      expect(accounted, `${s.level} lost a step`).toEqual(vm.rungs.map((r) => r.step));
    }
  });

  it("never changes the answer a rung carries, only how much is said about it", () => {
    const vm = partlyWorked();
    const foundation = scaffoldWorksheet(vm, "FOUNDATION");
    const advanced = scaffoldWorksheet(vm, "ADVANCED");

    for (const shown of advanced.shown) {
      const original = foundation.shown.find((x) => x.rung.step === shown.rung.step);
      expect(original, "a rung appeared that the full view does not have").toBeDefined();
      // Identity, not equality: the compressed level must be handing back the
      // SAME object, so there is no code path by which it could differ.
      expect(shown.rung).toBe(original!.rung);
    }
  });

  it("states what it stopped printing, at every level including the fullest", () => {
    // A level with an empty disclosure trains the reader to ignore the line on
    // the levels where it carries the whole caveat.
    for (const s of atEveryLevel(partlyWorked())) {
      expect(s.disclosure.length, `${s.level} said nothing`).toBeGreaterThan(20);
    }
  });
});

describe("Asset 12 · the three levels are actually different", () => {
  it("draws every step at FOUNDATION and INTERMEDIATE, a subset only at ADVANCED", () => {
    const vm = partlyWorked();
    expect(scaffoldWorksheet(vm, "FOUNDATION").shown).toHaveLength(vm.rungs.length);
    expect(scaffoldWorksheet(vm, "FOUNDATION").withheldSteps).toEqual([]);
    expect(scaffoldWorksheet(vm, "INTERMEDIATE").shown).toHaveLength(vm.rungs.length);
    expect(scaffoldWorksheet(vm, "INTERMEDIATE").withheldSteps).toEqual([]);
    expect(scaffoldWorksheet(vm, "ADVANCED").shown.length).toBeLessThan(vm.rungs.length);
  });

  it("spends strictly fewer voices as the scaffolding comes away", () => {
    const count = (level: ScaffoldLevel) => {
      const s = scaffoldWorksheet(partlyWorked(), level);
      const v = s.shown[0]?.voices;
      return v ? Object.values(v).filter(Boolean).length : 0;
    };
    expect(count("FOUNDATION")).toBeGreaterThan(count("INTERMEDIATE"));
    expect(count("INTERMEDIATE")).toBeGreaterThan(count("ADVANCED"));
  });

  it("keeps the REASON a rung is blank even when it drops the teaching voices", () => {
    // `question` and `dividend` explain what a step IS — a returning reader
    // knows. `absence` is why the step is empty, and a blank rung with no
    // reason is indistinguishable from a zero. That asymmetry is the decision.
    const v = scaffoldWorksheet(partlyWorked(), "INTERMEDIATE").shown[0].voices;
    expect(v.question).toBe(false);
    expect(v.dividend).toBe(false);
    expect(v.owner).toBe(false);
    expect(v.absence, "a blank rung with no reason reads as a zero").toBe(true);
    expect(v.basis).toBe(true);
  });
});

describe("Asset 12 · ADVANCED is geometry, not a shorter list of verdicts", () => {
  it("keeps only rungs their own owner declared a QUANTITY", () => {
    const vm = partlyWorked();
    const advanced = scaffoldWorksheet(vm, "ADVANCED");
    expect(advanced.shown.length).toBeGreaterThan(0);
    for (const s of advanced.shown) {
      expect(s.rung.measures, `step ${s.rung.step} is not a quantity`).toBe("QUANTITY");
      expect(s.rung.state).toBe("READ");
    }
  });

  it("refuses to print a bare verdict to the most experienced reader", () => {
    // selectRegime and selectContinuationHealth answer in verdicts. Stripped of
    // their reasoning they become conclusions handed down — the exact thing the
    // worksheet exists to refuse. Showing them HERE would mean the reader who
    // earned the most independence sees the least evidence.
    const vm = partlyWorked();
    const advanced = scaffoldWorksheet(vm, "ADVANCED");
    const categorySteps = vm.rungs.filter((r) => r.measures === "CATEGORY").map((r) => r.step);
    expect(categorySteps.length).toBeGreaterThan(0);
    for (const step of categorySteps) {
      expect(advanced.shown.some((s) => s.rung.step === step)).toBe(false);
      expect(advanced.withheldSteps, "withheld but not named").toContain(step);
    }
  });

  it("names every withheld step by number rather than counting them", () => {
    const advanced = scaffoldWorksheet(partlyWorked(), "ADVANCED");
    for (const step of advanced.withheldSteps) {
      expect(advanced.disclosure).toContain(String(step));
    }
    expect(advanced.disclosure).toContain(String(advanced.unreadCount));
  });

  it("says so rather than going blank when nothing measured a quantity", () => {
    // The empty worksheet reads nothing, so ADVANCED has no rung to draw. A
    // surface that renders as an empty box here is a surface a trader reads as
    // broken — and the evidence debt is at its largest precisely then.
    const vm = emptyWorksheet();
    const advanced = scaffoldWorksheet(vm, "ADVANCED");
    expect(advanced.shown).toEqual([]);
    expect(advanced.withheldSteps).toEqual(vm.rungs.map((r) => r.step));
    expect(advanced.unreadCount).toBe(vm.rungs.length);
    expect(advanced.disclosure).toContain(String(vm.rungs.length));
    expect(advanced.disclosure.toLowerCase()).toContain("step back");
  });
});

describe("Asset 12 · what was taken from the mockup, and what was not", () => {
  it("does not print the mockup's unowned 62% or its defensive verdict", () => {
    // `EFFICIENCY RATIO 62%` over a red/green pressure diagram, verdict
    // `MODERATE DEFENSIVE SETUP`. No owner for the percentage, the diagram is a
    // verdict graded in hue, and the verdict belongs to a compiler that is not
    // in the chart room.
    const s = scaffoldWorksheet(partlyWorked(), "ADVANCED");
    const text = [s.title, s.promise, s.disclosure].join(" ");
    expect(text).not.toMatch(/\d+\s*%/);
    expect(text.toLowerCase()).not.toContain("defensive");
    expect(text.toLowerCase()).not.toContain("setup");
  });

  it("records the one mockup line it rewrote, in its own words", () => {
    expect(INTERMEDIATE_PROMISE_REFUSAL).toContain("LESS STEPS");
    expect(scaffoldWorksheet(partlyWorked(), "INTERMEDIATE").promise).not.toMatch(/less steps/i);
  });

  it("starts a reader who has never seen the worksheet at the fullest level", () => {
    expect(DEFAULT_SCAFFOLD_LEVEL).toBe("FOUNDATION");
    expect(SCAFFOLD_LEVELS[0]).toBe(DEFAULT_SCAFFOLD_LEVEL);
    expect(SCAFFOLD_LEVELS[SCAFFOLD_LEVELS.length - 1]).toBe("ADVANCED");
  });
});
