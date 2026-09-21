/**
 * selectEffortVsResult — FL-06 plate object ④.
 *
 * THE DEFECTS THIS FILE EXISTS TO CATCH, in the order they would actually ship:
 *
 *   1. THE SILENT INFINITY. On a futures symbol whose bars carry zero volume,
 *      `subject / median` is `Infinity`, which is `>= 1.5`, which grades every
 *      bar HIGH. Nothing throws. This was not hypothetical — the live NQ1!
 *      chart on the serving host reads `V 0` and is the reason the guard
 *      exists.
 *   2. THE SELF-INFLATED BASELINE. If the subject bar is included in its own
 *      cohort, a genuinely enormous bar drags up the median it is judged
 *      against and grades itself toward ordinary.
 *   3. RANGE MISTAKEN FOR RESULT. A bar that travels far and closes where it
 *      opened has achieved nothing. Scoring by range calls that STRONG and
 *      inverts the panel's meaning.
 *   4. THE DIAGNOSIS THAT WAS NOT EARNED. High effort + weak result is the
 *      absorption pattern. Volume and displacement cannot separate absorption
 *      from an empty auction or a halted bar. The word must not appear.
 *   5. A COMPARISON THAT NEVER SAYS WHAT IT COMPARED AGAINST.
 *
 * NOT A SCANNER. Every test constructs its own inputs and asserts about a
 * returned value. Nothing here walks a directory, and nothing asserts that a
 * collected list is empty — a check that passes when it collected nothing.
 */

import { describe, expect, it } from "vitest";

import {
  selectEffortVsResult,
  EFFORT_VS_RESULT_VERSION,
  MIN_BARS_FOR_COHORT,
  HIGH_RATIO,
  LOW_RATIO,
  type EffortResultBar,
} from "./selectEffortVsResult";

/** A cohort of `n` identical, unremarkable bars: volume 100, move 10. */
const plainCohort = (n = MIN_BARS_FOR_COHORT): EffortResultBar[] =>
  Array.from({ length: n }, () => ({ volume: 100, open: 100, close: 110 }));

describe("it refuses to grade a bar it has nothing to compare against", () => {
  it("refuses with no bar at all, and still says what it cannot do", () => {
    const vm = selectEffortVsResult({});
    expect(vm.state).toBe("UNREAD");
    expect(vm.shape).toBe("UNREAD");
    expect(vm.effort).toBeNull();
    expect(vm.result).toBeNull();
    expect(vm.headline.length).toBeGreaterThan(0);
    expect(vm.limitNote.length).toBeGreaterThan(0);
  });

  it("refuses one bar short of the cohort floor, and reads at the floor", () => {
    const subject = { volume: 100, open: 100, close: 110 };

    const short = selectEffortVsResult({
      bar: subject,
      priorBars: plainCohort(MIN_BARS_FOR_COHORT - 1),
    });
    expect(short.state).toBe("UNREAD");
    expect(short.cohortSize).toBe(MIN_BARS_FOR_COHORT - 1);

    const exact = selectEffortVsResult({
      bar: subject,
      priorBars: plainCohort(MIN_BARS_FOR_COHORT),
    });
    expect(exact.state).toBe("READ");
    expect(exact.cohortSize).toBe(MIN_BARS_FOR_COHORT);
  });

  it("tells a short cohort NOT to wait, because waiting will not fix it", () => {
    /*
      A trader scrolled to the start of a series waits forever. A trader who
      just opened the chart does not. A spinner means "wait" in both cases and
      is therefore wrong in one of them, so the sentence has to distinguish.
    */
    const vm = selectEffortVsResult({ bar: { volume: 100, open: 100, close: 110 }, priorBars: plainCohort(3) });
    const absence = vm.rows.find(r => r.id === "EFFORT")!.absence!;
    expect(absence).toMatch(/will not\s+resolve on its own/i);
    expect(absence).toContain(String(MIN_BARS_FOR_COHORT));
  });
});

describe("the zero-volume chart does not grade every bar HIGH", () => {
  it("refuses effort when the whole cohort reports zero volume", () => {
    /*
      THE LOAD-BEARING TEST OF THIS FILE. `1 / 0` is `Infinity`, `Infinity >=
      1.5` is true, and nothing throws. Without this guard the live NQ1! chart
      — which reads `V 0` on the serving host right now — would have printed
      "Effort: HIGH" on every candle it drew.
    */
    const dead = Array.from({ length: MIN_BARS_FOR_COHORT }, () => ({
      volume: 0,
      open: 100,
      close: 110,
    }));
    const vm = selectEffortVsResult({ bar: { volume: 0, open: 100, close: 125 }, priorBars: dead });

    expect(vm.effort, "a zero-volume cohort produced a grade").toBeNull();
    expect(vm.effortRatio).toBeNull();
    expect(vm.state).toBe("UNREAD");

    const absence = vm.rows.find(r => r.id === "EFFORT")!.absence!;
    expect(absence).toMatch(/zero volume/i);
  });

  it("never emits a non-finite ratio on any input it accepts", () => {
    const hostile: EffortResultBar[][] = [
      Array.from({ length: 25 }, () => ({ volume: 0, open: 5, close: 5 })),
      Array.from({ length: 25 }, () => ({ volume: 1e12, open: 1e9, close: 1e9 })),
      Array.from({ length: 25 }, (_, i) => ({ volume: i, open: 100, close: 100 + i })),
    ];
    let checked = 0;
    for (const cohort of hostile) {
      for (const subject of [
        { volume: 0, open: 0, close: 0 },
        { volume: 1e12, open: 1, close: 1e9 },
        { volume: 50, open: 100, close: 100 },
      ]) {
        const vm = selectEffortVsResult({ bar: subject, priorBars: cohort });
        for (const r of [vm.effortRatio, vm.resultRatio]) {
          if (r !== null) expect(Number.isFinite(r), `ratio ${r} is not finite`).toBe(true);
          checked += 1;
        }
      }
    }
    expect(checked, "the sweep examined nothing").toBeGreaterThan(15);
  });

  it("refuses result when every earlier bar opened and closed flat", () => {
    const flat = Array.from({ length: MIN_BARS_FOR_COHORT }, () => ({
      volume: 100,
      open: 50,
      close: 50,
    }));
    const vm = selectEffortVsResult({ bar: { volume: 100, open: 50, close: 80 }, priorBars: flat });
    expect(vm.result).toBeNull();
    expect(vm.rows.find(r => r.id === "RESULT")!.absence).toMatch(/same price/i);
  });
});

describe("result is net displacement, not range", () => {
  it("calls a bar that travelled far and closed flat a WEAK result", () => {
    /*
      DEFECT #3. `high - low` on this bar is enormous. `|close - open|` is zero.
      Scoring by range would print STRONG for a bar that achieved nothing,
      which is the exact opposite of what the panel exists to say.
    */
    const vm = selectEffortVsResult({
      bar: { volume: 400, open: 100, close: 100 },
      priorBars: plainCohort(),
    });
    expect(vm.result).toBe("WEAK");
    expect(vm.effort).toBe("HIGH");
    expect(vm.shape).toBe("HIGH_EFFORT_WEAK_RESULT");
  });

  it("reads direction-blind — a down bar and an up bar of equal size grade alike", () => {
    const up = selectEffortVsResult({ bar: { volume: 100, open: 100, close: 140 }, priorBars: plainCohort() });
    const down = selectEffortVsResult({ bar: { volume: 100, open: 140, close: 100 }, priorBars: plainCohort() });
    expect(up.result).toBe(down.result);
    expect(up.resultRatio).toBe(down.resultRatio);
  });
});

describe("the subject bar is not part of its own cohort", () => {
  it("divides by the median of priorBars ALONE — the subject is never in it", () => {
    /*
      DEFECT #2, proven directly rather than by inference.

      A first draft of this test tried to prove the point by appending the
      subject to its own cohort and asserting the ratio moved. It did not move,
      and the test was wrong rather than the code: twenty identical bars plus
      one outlier still have the same median. That is the median doing exactly
      the job it was chosen for, so the property is asserted head-on instead —
      the ratio must equal subject ÷ median(priorBars), computed here
      independently of the module.
    */
    const cohort = plainCohort(); // 20 bars, volume 100 each → median 100
    const huge = { volume: 1000, open: 100, close: 210 };

    const vm = selectEffortVsResult({ bar: huge, priorBars: cohort });
    expect(vm.effort).toBe("HIGH");
    expect(vm.effortRatio).toBe(1000 / 100);

    /*
      And on a cohort whose median IS movable, including the subject would
      change the answer — so this proves the module did not include it.
    */
    const ascending = Array.from({ length: 20 }, (_, i) => ({
      volume: i + 1, // 1..20 → median 10.5
      open: 100,
      close: 110,
    }));
    const onAscending = selectEffortVsResult({ bar: huge, priorBars: ascending });
    expect(onAscending.effortRatio).toBe(1000 / 10.5);
    // If the subject had joined the cohort the median would be 11, not 10.5.
    expect(onAscending.effortRatio).not.toBe(1000 / 11);
  });

  it("uses the median, so one outlier bar cannot relabel the chart", () => {
    const withSpike = [...plainCohort(), { volume: 100_000, open: 100, close: 110 }];
    const vm = selectEffortVsResult({ bar: { volume: 100, open: 100, close: 110 }, priorBars: withSpike });
    // A mean would be dragged to ~4,850 and call an ordinary bar LOW.
    expect(vm.effort).toBe("AVERAGE");
  });
});

describe("the grade boundaries are the published constants", () => {
  it("grades exactly at HIGH_RATIO and LOW_RATIO, not just past them", () => {
    const atHigh = selectEffortVsResult({
      bar: { volume: 100 * HIGH_RATIO, open: 100, close: 110 },
      priorBars: plainCohort(),
    });
    expect(atHigh.effort).toBe("HIGH");

    const atLow = selectEffortVsResult({
      bar: { volume: 100 * LOW_RATIO, open: 100, close: 110 },
      priorBars: plainCohort(),
    });
    expect(atLow.effort).toBe("LOW");

    const between = selectEffortVsResult({
      bar: { volume: 100, open: 100, close: 110 },
      priorBars: plainCohort(),
    });
    expect(between.effort).toBe("AVERAGE");
  });

  it("names LOW effort with a STRONG result as its own shape", () => {
    const vm = selectEffortVsResult({
      bar: { volume: 30, open: 100, close: 150 },
      priorBars: plainCohort(),
    });
    expect(vm.effort).toBe("LOW");
    expect(vm.result).toBe("STRONG");
    expect(vm.shape).toBe("LOW_EFFORT_STRONG_RESULT");
  });

  it("calls agreement PROPORTIONATE rather than implying significance", () => {
    const both = selectEffortVsResult({
      bar: { volume: 400, open: 100, close: 160 },
      priorBars: plainCohort(),
    });
    expect(both.effort).toBe("HIGH");
    expect(both.result).toBe("STRONG");
    expect(both.shape).toBe("PROPORTIONATE");
  });
});

describe("it does not claim a diagnosis these two numbers cannot support", () => {
  it("never says absorption, or any other mechanism it did not measure", () => {
    /*
      DEFECT #4. High effort + weak result is the absorption pattern, and it is
      also an empty auction, and also a halted bar. `selectAbsorption.ts` owns
      that call and reads inputs that can support it. The most confident word
      on the chart must not come from the module least able to justify it.
    */
    const vm = selectEffortVsResult({
      bar: { volume: 400, open: 100, close: 100 },
      priorBars: plainCohort(),
    });
    const prose = [
      vm.headline,
      vm.limitNote,
      vm.lookbackNote,
      ...vm.rows.flatMap(r => [r.value ?? "", r.basis ?? "", r.absence ?? ""]),
    ].join(" ");

    /*
      THE STEM IS `absor`, NOT `absorb`, AND THAT IS NOT A TYPO-FIX.

      The first version of this guard was `/absorb/i`. It passed against a
      headline that literally read "absorption by a passive seller" — because
      "absorption" does not contain "absorb": the sixth letter is `p`, not `b`.
      A revive-attempt is what exposed it. The test had been green, and
      meaningless, and would have stayed both.

      `absor` catches absorb / absorbed / absorbing / absorption alike.
    */
    expect(vm.headline).not.toMatch(/absor/i);
    expect(prose).not.toMatch(/exhaust|trapped|smart money|institution/i);
  });

  it("states what it cannot know even when the reading succeeded", () => {
    const vm = selectEffortVsResult({
      bar: { volume: 400, open: 100, close: 100 },
      priorBars: plainCohort(),
    });
    expect(vm.state).toBe("READ");
    expect(vm.limitNote.length, "a READ verdict shipped with no stated limit").toBeGreaterThan(40);
    expect(vm.limitNote).toMatch(/cannot tell you/i);
  });

  it("always publishes what it compared against", () => {
    const read = selectEffortVsResult({ bar: { volume: 100, open: 100, close: 110 }, priorBars: plainCohort() });
    expect(read.lookbackNote).toContain(String(MIN_BARS_FOR_COHORT));
    expect(read.cohortSize).toBe(MIN_BARS_FOR_COHORT);

    const refused = selectEffortVsResult({});
    expect(refused.lookbackNote.length, "a refusal with no stated cohort").toBeGreaterThan(0);
  });
});

describe("the plate's illustrative figures never appear as output", () => {
  it("emits no percentage and none of the mockup's numbers", () => {
    const vm = selectEffortVsResult({
      bar: { volume: 623, open: 5297.75, close: 5429.75 },
      priorBars: plainCohort(),
    });
    const prose = [
      vm.headline,
      vm.limitNote,
      ...vm.rows.map(r => r.value ?? ""),
    ].join(" ");
    expect(prose).not.toMatch(/%/);
    expect(prose).not.toContain("98.7");
    expect(prose).not.toContain("2.1:1");
    // The verdict is a WORD (Build Order §9), never a score.
    for (const r of vm.rows) {
      if (r.value !== null) expect(r.value).toMatch(/^(HIGH|LOW|AVERAGE|STRONG|WEAK)$/);
    }
  });

  it("every row is well-formed: READ has value+basis, UNREAD has absence", () => {
    const cases = [
      selectEffortVsResult({}),
      selectEffortVsResult({ bar: { volume: 100, open: 100, close: 110 }, priorBars: plainCohort(2) }),
      selectEffortVsResult({ bar: { volume: 400, open: 100, close: 100 }, priorBars: plainCohort() }),
      selectEffortVsResult({ bar: { volume: null, open: 100, close: 110 }, priorBars: plainCohort() }),
      selectEffortVsResult({ bar: { volume: 100, open: null, close: 110 }, priorBars: plainCohort() }),
    ];
    let rowsChecked = 0;
    for (const vm of cases) {
      expect(vm.version).toBe(EFFORT_VS_RESULT_VERSION);
      for (const r of vm.rows) {
        if (r.state === "READ") {
          expect(r.value, `${r.id} READ with no value`).toBeTruthy();
          expect(r.basis, `${r.id} READ with no basis`).toBeTruthy();
          expect(r.absence).toBeNull();
        } else {
          expect(r.absence, `${r.id} UNREAD with no reason`).toBeTruthy();
          expect((r.absence as string).length).toBeGreaterThan(20);
          expect(r.value).toBeNull();
        }
        expect(r.owner).toBe("selectEffortVsResult");
        rowsChecked += 1;
      }
    }
    expect(rowsChecked, "the well-formedness sweep checked nothing").toBeGreaterThan(9);
  });

  it("refuses one side without pretending the pair was read", () => {
    const vm = selectEffortVsResult({
      bar: { volume: null, open: 100, close: 180 },
      priorBars: plainCohort(),
    });
    expect(vm.effort).toBeNull();
    expect(vm.result).toBe("STRONG");
    expect(vm.state, "half a comparison was published as a reading").toBe("UNREAD");
    expect(vm.shape).toBe("UNREAD");
  });

  it("is deterministic — same input, same output, no clock and no randomness", () => {
    const input = { bar: { volume: 400, open: 100, close: 100 }, priorBars: plainCohort() };
    expect(JSON.stringify(selectEffortVsResult(input))).toBe(
      JSON.stringify(selectEffortVsResult(input)),
    );
  });
});

/**
 * FOUND FROM USE, ON THE SERVING CHART — not from reading this file.
 *
 * The live NQ bar was 37 seconds old and the panel said:
 *
 *   Effort: LOW — this bar traded 0, the median of the 1051 bars before it
 *   is 793.
 *
 * Every number there was correct and the conclusion was false. The bar had
 * not traded 0 because effort was low; it had traded 0 because it had barely
 * begun. A partial count weighed against 1051 completed counts is not a
 * comparison, it is a category error wearing a verdict's clothes — and it is
 * the product's own truth law, word for word: PARTIAL != COMPLETE.
 *
 * The bug was not in the arithmetic, so no arithmetic test would have caught
 * it. These are the tests that would have.
 */
describe("a bar that has not closed yet is not graded", () => {
  const formingSubject = {
    bar: { volume: 0, open: 30_049.75, close: 30_049.75 },
    priorBars: plainCohort(40),
  };

  it("refuses rather than grading a forming bar LOW for being young", () => {
    const vm = selectEffortVsResult({ ...formingSubject, subjectIsForming: true });

    expect(vm.state).toBe("UNREAD");
    expect(
      vm.rows.every(r => r.state === "UNREAD"),
      "no row may carry a grade for a bar that has not finished happening",
    ).toBe(true);
    expect(
      JSON.stringify(vm),
      "LOW/WEAK on an unfinished bar is the exact defect this refusal exists " +
        "to prevent — it must not appear anywhere in the view model",
    ).not.toMatch(/"(LOW|WEAK|HIGH|STRONG|AVERAGE)"/);
  });

  it("says the wait RESOLVES ON ITS OWN, unlike the thin-cohort refusal", () => {
    const forming = selectEffortVsResult({ ...formingSubject, subjectIsForming: true });
    const thinCohort = selectEffortVsResult({
      bar: { volume: 100, open: 100, close: 110 },
      priorBars: plainCohort(3),
    });

    const formingWhy = forming.rows.map(r => r.absence).join(" ");
    const thinWhy = thinCohort.rows.map(r => r.absence).join(" ");

    expect(
      formingWhy,
      "'wait' and 'this will never resolve' are opposite instructions; a " +
        "trader who is told neither is being handed a spinner in prose",
    ).toMatch(/resolves on its own/i);
    expect(
      thinWhy,
      "the thin-cohort case must keep saying the opposite — it does NOT fix " +
        "itself, the trader has to load more history",
    ).toMatch(/will not\s+resolve on its own/i);
  });

  it("still names the cohort it WOULD have compared against", () => {
    const vm = selectEffortVsResult({ ...formingSubject, subjectIsForming: true });

    expect(
      vm.cohortSize,
      "the comparison is ready and only the subject is not; hiding that would " +
        "make a ready chart look broken",
    ).toBe(40);
    expect(vm.lookbackNote).toContain("40");
  });

  it("grades the SAME bar once it has closed", () => {
    // The refusal must be about the bar being unfinished and nothing else.
    const closed = selectEffortVsResult({
      bar: { volume: 300, open: 100, close: 140 },
      priorBars: plainCohort(40),
      subjectIsForming: false,
    });

    expect(
      closed.state,
      "a finished bar with a real cohort must still read — the forming guard " +
        "must not become a blanket refusal",
    ).toBe("READ");
  });

  it("treats an absent flag as 'not forming' so existing callers are unchanged", () => {
    const omitted = selectEffortVsResult({
      bar: { volume: 300, open: 100, close: 140 },
      priorBars: plainCohort(40),
    });

    expect(omitted.state).toBe("READ");
  });
});
