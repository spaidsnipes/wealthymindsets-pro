/**
 * FL-06 object ④ Effort vs Result — render proof, and the adoption proof beside it.
 *
 * TWO DIFFERENT FAILURES ARE GUARDED HERE, and they fail in different files.
 *
 *   1. THE GLASS DROPS THE QUALIFIER. `selectEffortVsResult` decides what was
 *      compared against what, and what the reading cannot know. A component
 *      that renders only the two verdict words prints "Effort: High / Result:
 *      Weak" — which is precisely the plate's four words WITHOUT the three
 *      facts that make them a reading instead of an assertion. The compiler's
 *      own suite cannot catch that; it never renders anything.
 *
 *   2. THE GLASS IS NEVER MOUNTED. A correct compiler feeding an orphaned
 *      component is the hardest version of this defect to notice: every unit
 *      test is green and the trader sees nothing. An import satisfies a grep;
 *      only a JSX tag puts the panel on the candles.
 *
 * NOT A SCANNER. This file reads ONE named file and asserts about its
 * contents. It does not walk a directory, and it does not assert that some
 * collected list is empty — a check that passes when it collected nothing.
 *
 * There is no `@testing-library/react` in this repo, so the rendering tests
 * render to static markup and assert against the HTML.
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";

import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import ChartEffortVsResult, { sharedAbsence } from "@/components/chart/ChartEffortVsResult";
import {
  selectEffortVsResult,
  MIN_BARS_FOR_COHORT,
  type EffortResultBar,
} from "@/lib/marketData/viewModels/selectEffortVsResult";

/** Twenty bars of volume 100 that each move 10 points. Median volume 100,
 *  median displacement 10 — round numbers so a failure names itself. */
const plainCohort = (): EffortResultBar[] =>
  Array.from({ length: MIN_BARS_FOR_COHORT }, () => ({ volume: 100, open: 100, close: 110 }));

/** Heavy volume, almost no displacement — the plate's own case. */
const HIGH_EFFORT_WEAK_RESULT = { volume: 400, open: 100, close: 101 };

const vmFor = (bar: EffortResultBar | null, priorBars: EffortResultBar[]) =>
  selectEffortVsResult({ bar, priorBars });

/**
 * THE VISIBLE TEXT ONLY — TAGS AND THEREFORE ATTRIBUTES STRIPPED.
 *
 * WHY THIS HELPER EXISTS, AND IT IS NOT TIDINESS. The first version of this
 * file asserted `expect(html).toContain(vm.lookbackNote)` against RAW markup.
 * A revive-attempt then deleted the cohort sentence from the panel body — and
 * the test stayed green, because the panel's `aria-label` still interpolates
 * `vm.lookbackNote`. The assertion had been passing on an ATTRIBUTE the whole
 * time and would have gone on passing over an empty panel forever.
 *
 * That is the exact defect this product keeps repairing at a different layer:
 * a disclosure that lives in `title`/`aria`/`data-` is one a sighted mouse
 * user never reads, and "it is in the accessible name" is not "it is on the
 * glass." A test that cannot tell those apart cannot guard either.
 *
 * So every assertion about what the TRADER READS goes through `visible()`.
 * Assertions about layout and the probe attributes use `markup()` on purpose.
 */
const visible = (html: string) => html.replace(/<[^>]*>/g, " ");

const markup = (
  bar: EffortResultBar | null,
  priorBars: EffortResultBar[],
  over: Partial<React.ComponentProps<typeof ChartEffortVsResult>> = {},
) =>
  renderToStaticMarkup(
    <ChartEffortVsResult
      vm={vmFor(bar, priorBars)}
      followingLiveBar={false}
      open
      onOpenChange={() => {}}
      {...over}
    />,
  );

describe("the callout puts its verdict on the glass", () => {
  it("prints the plate's two words when the reading can be taken", () => {
    const html = markup(HIGH_EFFORT_WEAK_RESULT, plainCohort());
    expect(visible(html)).toContain("HIGH");
    expect(visible(html)).toContain("WEAK");
    // The probe attribute is checked on the RAW markup on purpose — it is for
    // an outside prober, not for the trader, and it is not a disclosure.
    expect(html).toContain('data-evr-shape="HIGH_EFFORT_WEAK_RESULT"');
  });

  it("names WHAT IT COMPARED AGAINST, not merely the verdict", () => {
    /*
      THE LOAD-BEARING ASSERTION OF THIS FILE.

      "High" is not a property of a bar. It is a comparison. A panel that
      prints "High" and swallows `lookbackNote` has shown the trader a verdict
      about a cohort it never showed them — which is the exact shape of the
      thing this whole compiler was written to avoid. The plate itself omits
      the cohort; the product may not.
    */
    const vm = vmFor(HIGH_EFFORT_WEAK_RESULT, plainCohort());
    expect(vm.lookbackNote.length, "the compiler emitted no cohort sentence").toBeGreaterThan(0);
    expect(
      visible(markup(HIGH_EFFORT_WEAK_RESULT, plainCohort())),
      "the panel printed a comparison without naming what it compared " +
        "against — on the GLASS. An aria-label does not count; see `visible`.",
    ).toContain(vm.lookbackNote);
  });

  it("carries the limit sentence EVEN WHEN THE READING SUCCEEDED", () => {
    /*
      The tempting version of this panel hides `limitNote` behind the UNREAD
      branch — a caveat for failures only. That inverts it. A trader is most
      likely to over-read "Effort: High / Result: Weak" precisely when both
      sides were read, because that is when the panel looks most authoritative.
    */
    const vm = vmFor(HIGH_EFFORT_WEAK_RESULT, plainCohort());
    expect(vm.state).toBe("READ");
    expect(visible(markup(HIGH_EFFORT_WEAK_RESULT, plainCohort()))).toContain(vm.limitNote);
  });

  it("never says absorption, or any other mechanism the glass did not measure", () => {
    /*
      THE STEM IS `absor`, NOT `absorb`, AND THAT IS NOT A TYPO-FIX. The
      compiler's own suite learned this the expensive way: `/absorb/i` does
      NOT match "absorption" — the sixth letter is `p`, not `b` — so a guard
      written that way is green and meaningless forever. `absor` catches
      absorb / absorbed / absorbing / absorption alike.

      Guarded again HERE, at the glass, because the compiler refusing the word
      does not stop a component from adding a "what this usually means"
      flourish of its own.
    */
    const prose = visible(markup(HIGH_EFFORT_WEAK_RESULT, plainCohort()));
    // The limitNote legitimately uses the word to say what it CANNOT conclude.
    const withoutLimit = prose.split(vmFor(HIGH_EFFORT_WEAK_RESULT, plainCohort()).limitNote).join(" ");
    expect(withoutLimit).not.toMatch(/absor/i);
    expect(withoutLimit).not.toMatch(/exhaust|trapped|smart money|institution/i);
  });

  it("prints the REASON for a refusal, not merely the word UNREAD", () => {
    // One prior bar is far below the cohort floor: a refusal that tells the
    // trader NOT to wait, because waiting will not fix it.
    const short: EffortResultBar[] = [{ volume: 100, open: 100, close: 110 }];
    const html = visible(markup(HIGH_EFFORT_WEAK_RESULT, short));
    expect(html).toContain("UNREAD");
    const absence = vmFor(HIGH_EFFORT_WEAK_RESULT, short).rows[0].absence!;
    expect(absence.length, "the compiler emitted no reason to render").toBeGreaterThan(0);
    expect(html, "the refusal's REASON never reached the glass").toContain(absence);
  });

  it("shows each verdict's own arithmetic so the trader can audit it", () => {
    const vm = vmFor(HIGH_EFFORT_WEAK_RESULT, plainCohort());
    const html = visible(markup(HIGH_EFFORT_WEAK_RESULT, plainCohort()));
    for (const row of vm.rows) {
      expect(row.basis, `${row.id} was READ with no basis`).not.toBeNull();
      expect(html, `${row.id}'s basis never reached the glass`).toContain(row.basis!);
    }
  });

  it("grades no verdict in hue — Build Order §9", () => {
    /*
      A ratio is a continuous number and a colour ramp is the obvious way to
      draw it, which is exactly why this is guarded. A trader who learns the
      shade instead of the word has learned a thing the product never promised
      to keep stable.
    */
    const src = readFileSync(
      join(process.cwd(), "src/components/chart/ChartEffortVsResult.tsx"),
      "utf8",
    );
    expect(src, "a colour is being derived from the ratio").not.toMatch(/effortRatio|resultRatio/);
    expect(src, "a colour is being derived from the verdict word").not.toMatch(
      /shape\s*===\s*"|effort\s*===\s*"HIGH"/,
    );
    /*
      THE TAGS MUST COME OFF FIRST, and the first draft of this assertion did
      not take them off. It ran against raw markup and failed on
      `max-h-[calc(100%-6rem)]` — a layout class, not a number shown to anyone.
      A guard that trips on its own stylesheet is a guard that gets deleted.
      What is banned is a PERCENTAGE ON THE GLASS: the ratio behind the verdict
      is auditable through `basis`, in the units actually traded.
    */
    const visible = markup(HIGH_EFFORT_WEAK_RESULT, plainCohort()).replace(/<[^>]*>/g, " ");
    expect(visible, "a percentage reached the glass").not.toMatch(/\d+\s*%/);
  });

  it("states the live-bar fallback instead of silently changing subject", () => {
    const live = markup(HIGH_EFFORT_WEAK_RESULT, plainCohort(), { followingLiveBar: true });
    expect(live).toMatch(/still forming/i);
    expect(live).toContain("LIVE BAR");
    expect(markup(HIGH_EFFORT_WEAK_RESULT, plainCohort())).toContain("SELECTED BAR");
  });

  it("leaves a findable chip when closed rather than vanishing", () => {
    const html = markup(HIGH_EFFORT_WEAK_RESULT, plainCohort(), { open: false });
    expect(html).toContain("chart-effort-result-reopen");
    expect(html).not.toContain('data-testid="chart-effort-result"');
  });

  it("caps its own height so a long refusal cannot be clipped off the pane", () => {
    // A fully-refused reading is TALLER than a read one — two reasons plus a
    // cohort sentence plus a limit sentence. Truncated mid-sentence, the
    // trader cannot tell whether the product ran out of room or out of honesty.
    const html = markup(HIGH_EFFORT_WEAK_RESULT, []);
    expect(html).toMatch(/max-h-\[calc\(100%-6rem\)\]/);
    expect(html).toMatch(/overflow-y-auto/);
  });

  it("does not sit on the Inspect Ticket's edge", () => {
    // Both panels float over the same candles. Same edge = one permanently
    // behind the other on a short pane.
    const ticket = readFileSync(
      join(process.cwd(), "src/components/chart/ChartInspectTicket.tsx"),
      "utf8",
    );
    expect(ticket).toMatch(/right-\[76px\]/);
    expect(markup(HIGH_EFFORT_WEAK_RESULT, plainCohort())).not.toMatch(/right-\[76px\]/);
    expect(markup(HIGH_EFFORT_WEAK_RESULT, plainCohort())).toMatch(/left-3/);
  });

  it("renders every state the compiler can reach without throwing", () => {
    const cases: Array<[EffortResultBar | null, EffortResultBar[]]> = [
      [null, []],
      [HIGH_EFFORT_WEAK_RESULT, []],
      [HIGH_EFFORT_WEAK_RESULT, plainCohort()],
      [{ volume: 10, open: 100, close: 140 }, plainCohort()],
      [{ volume: 100, open: 100, close: 110 }, plainCohort()],
      [{ volume: 0, open: 100, close: 110 }, Array.from({ length: 20 }, () => ({ volume: 0, open: 100, close: 110 }))],
      [{ volume: 100, open: null, close: 110 }, plainCohort()],
    ];
    let checked = 0;
    for (const [bar, prior] of cases) {
      const html = markup(bar, prior);
      // Whatever the state, the panel is never blank and never wordless.
      expect(html.replace(/<[^>]*>/g, "").trim().length).toBeGreaterThan(40);
      expect(html).toContain(vmFor(bar, prior).limitNote);
      checked += 1;
    }
    expect(checked, "the sweep rendered nothing").toBe(cases.length);
  });
});

describe("the callout is rendered by the charts room, not merely imported", () => {
  const DASHBOARD = readFileSync(
    join(process.cwd(), "src/components/chart/ChartsDashboard.tsx"),
    "utf8",
  );

  it("appears as a JSX tag", () => {
    expect(
      DASHBOARD,
      "ChartsDashboard imports the Effort vs Result callout but never renders " +
        "it. An import satisfies a grep; only a tag puts the panel on the candles.",
    ).toMatch(/<ChartEffortVsResult[\s>]/);
  });

  it("feeds the compiler from the room's own bars", () => {
    expect(DASHBOARD).toMatch(/selectEffortVsResult\(/);
  });

  it("EXCLUDES the subject bar from the cohort that judges it", () => {
    /*
      The single most dangerous wiring mistake available here, and the type
      system cannot see it: passing `chartBars` as `priorBars` puts the subject
      inside its own baseline, so a genuinely enormous bar inflates the median
      it is measured against and grades itself back toward ordinary. The
      compiler's contract says priorBars are the bars BEFORE the subject; the
      call site has to honour it with a slice.
    */
    /*
      THE GUARD NAMES THE MECHANISM, NOT A VARIABLE.

      The first version of this assertion was:

          .toMatch(/priorBars:\s*[A-Za-z]*\.?slice\(|effortPriorBars/)

      and a revive-attempt walked straight through it. Replacing the slice with
      a bare `chartBars.map(...)` — putting the subject bar back inside the
      cohort that judges it — left the variable still CALLED `effortPriorBars`,
      so the second alternative matched and the test stayed green.

      A name is not a behaviour. What has to exist is the EXCLUSION: find the
      subject's index, and cut the cohort off at it.
    */
    expect(
      DASHBOARD,
      "the cohort must be cut off AT the subject's index, so the subject is " +
        "never inside the median that judges it",
    ).toMatch(/findIndex\(\s*b\s*=>\s*b\.time === inspectBar\.time\s*\)/);
    expect(
      DASHBOARD,
      "the cohort is not sliced — the subject bar is inflating its own baseline",
    ).toMatch(/chartBars\.slice\(0,\s*end\)/);
  });

  it("reads the SAME bar the Inspect Ticket reads", () => {
    // Two panels over one candle disagreeing about which candle is selected is
    // the failure the ticket's own header warns about. One selection path.
    expect(DASHBOARD).toMatch(/effortVsResultVM/);
    expect(DASHBOARD).toMatch(/inspectBar/);
  });

  it("says ONE reason ONCE, and still says it", () => {
    /*
      FOUND ON THE SERVING CHART. A bar that has not finished counting refuses
      both rows for the same reason, and the panel printed that six-line
      sentence twice, verbatim, in a 236px column.

      The danger in fixing this is obvious and is what most of these assertions
      are for: "print it once" and "drop it" produce nearly the same diff, and
      dropping a refusal's reason is the worst defect this panel can have. So
      the count is pinned at exactly one — not "at most one".
    */
    const forming = selectEffortVsResult({
      bar: { volume: 2, open: 100, close: 100.5 },
      priorBars: plainCohort(),
      subjectIsForming: true,
    });
    const unread = forming.rows.filter(r => r.state !== "READ");
    expect(unread.length, "this fixture must refuse both rows or it proves nothing")
      .toBeGreaterThanOrEqual(2);

    const reason = sharedAbsence(forming.rows);
    expect(reason, "the two rows refuse for the same reason in this fixture").not.toBeNull();

    const text = visible(
      renderToStaticMarkup(
        <ChartEffortVsResult
          vm={forming}
          followingLiveBar={false}
          open
          onOpenChange={() => {}}
        />,
      ),
    );
    const occurrences = text.split(reason as string).length - 1;
    expect(
      occurrences,
      "the shared refusal reason must appear EXACTLY once — twice is the " +
        "repetition being fixed, zero is a silently dropped refusal",
    ).toBe(1);

    // And both words must still be present, so "once" did not become "on one row".
    expect(text, "both rows must still read UNREAD").toMatch(/UNREAD[\s\S]*UNREAD/);
  });

  it("leaves a row's own reason alone when the rows disagree about why", () => {
    /*
      The dedupe must be keyed on the SENTENCES BEING EQUAL, not on "there is
      more than one refusal". Two rows refusing for different reasons that got
      collapsed to one would be a fabricated explanation for the other row.
    */
    expect(
      sharedAbsence([
        { id: "a", label: "A", value: "", state: "UNREAD", absence: "reason one" },
        { id: "b", label: "B", value: "", state: "UNREAD", absence: "reason two" },
      ] as never),
      "two different reasons must never be merged into one",
    ).toBeNull();

    expect(
      sharedAbsence([
        { id: "a", label: "A", value: "", state: "UNREAD", absence: "only reason" },
        { id: "b", label: "B", value: "ok", state: "READ", basis: "b" },
      ] as never),
      "a lone refusal is not a repetition; it keeps its sentence on its row",
    ).toBeNull();
  });

  it("TELLS the compiler when the bar has not finished counting", () => {
    /*
      The compiler may not read a clock, so this fact can only arrive from the
      call site. If it stops arriving, the panel silently returns to grading
      unfinished bars LOW for being unfinished — the defect found on the serving
      chart, which no arithmetic test caught because the arithmetic was right.

      Asserted as a MECHANISM, not a name. A previous guard in this file matched
      on a variable name and stayed green while the behaviour behind it was
      deleted: a name is not a behaviour.
    */
    expect(
      DASHBOARD,
      "the compiler is no longer told whether the subject bar is finished",
    ).toMatch(/subjectIsForming:/);

    expect(
      DASHBOARD,
      "'unfinished' must mean the LAST bar held — a bar is proven finished by " +
        "the existence of a later bar, so grading earlier bars stays unaffected",
    ).toMatch(
      /const newest = chartBars\[chartBars\.length\s*-\s*1\];\s*return newest\.time === inspectBar\.time;/,
    );

    /*
      THE SECOND VERSION OF THIS GUARD.

      The first asked the wall clock — newest bar AND span elapsed — and the
      serving chart disproved it inside a minute: the header read "2 BARS
      BEHIND" while the panel graded that bar on a count of 2. A stalled feed
      leaves a bar unfinished no matter how long ago its span ran out, so any
      re-entry of a clock here re-enters the defect.
    */
    const FORMING = DASHBOARD.slice(
      DASHBOARD.indexOf("const effortSubjectIsForming"),
      DASHBOARD.indexOf("const effortVsResultVM"),
    );
    expect(
      FORMING.length,
      "the forming decision must still be a single named memo in this file",
    ).toBeGreaterThan(0);
    expect(
      FORMING,
      "elapsed time does not finish a bar — a later bar does. A clock here " +
        "calls a stalled feed's partial bar 'closed' and grades the partial.",
    ).not.toMatch(/Date\.now\(\)/);
  });
});
