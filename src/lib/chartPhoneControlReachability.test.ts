import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const dashboard = readFileSync(resolve(process.cwd(), "src/components/chart/ChartsDashboard.tsx"), "utf8");
const toolbarRaw = readFileSync(resolve(process.cwd(), "src/components/chart/ChartToolbar.tsx"), "utf8");
const css = readFileSync(resolve(process.cwd(), "src/app/globals.css"), "utf8");
const chipRaw = readFileSync(resolve(process.cwd(), "src/components/chart/TimeframeGlassChip.tsx"), "utf8");
const mainChart = readFileSync(resolve(process.cwd(), "src/components/chart/MainChart.tsx"), "utf8");

/**
 * COMMENTS STRIPPED BEFORE A FILE IS JUDGED — a STRENGTHENING, not a loophole,
 * so the reason is recorded here rather than assumed by the next reader.
 *
 * Both files this guard interrogates deliberately carry prose about the very
 * strings the guard forbids. `TimeframeGlassChip.tsx` spends ~35 lines
 * explaining why `aria-pressed` was MEASURED on live /charts on 2026-09-19 and
 * then REPLACED; `ChartToolbar.tsx` carries a line naming the `timeframe` /
 * `setTimeframe` props it gave up on 2026-09-21 and why. Judged against raw
 * text, `not.toContain(...)` fails on the record of the repair rather than on a
 * regression, and the only way to go green would be to DELETE THE REASONING.
 * That is exactly backwards — the reasoning is the most valuable thing in
 * either file, because it is what stops the defect being re-added by whoever
 * touches this next. A guard that makes a codebase forget why it was fixed is
 * not a guard.
 *
 * Stripping cuts both ways and both directions are wanted. The POSITIVE
 * assertions get STRICTER: `toContain("CHART_TF_SHIPPED.map")` against raw text
 * is satisfied by a comment merely mentioning it — a guard passing on a
 * promise. Against code only, it passes on a call.
 *
 * The cost is that `""` satisfies every negative assertion vacuously, so each
 * derived string is length-anchored at the top of the case that uses it before
 * anything reads through it.
 *
 * `timeframeSpokenName.test.ts` already reads the chip through this same lens
 * (its `codeOf`), which is precisely why its own aria-pressed case was green
 * while this one was red against the identical file.
 */
function codeOnly(src: string): string {
  return src
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/(^|[^:])\/\/.*$/gm, "$1");
}
const chip = codeOnly(chipRaw);
const toolbarCode = codeOnly(toolbarRaw);
/** Raw toolbar, kept for assertions about class names that only ever appear in JSX. */
const toolbar = toolbarRaw;

describe("phone chart control reachability", () => {
  it("keeps decision disclosures in a dedicated visible action row", () => {
    expect(dashboard).toContain('className="wm-chart-orientation-strip"');
    expect(dashboard).toContain('className="wm-chart-orientation-actions"');
    expect(dashboard).toContain("wm-chart-why-trigger");
    expect(dashboard).not.toContain("wm-chart-passport-trigger");
    // ── REMAPPED 2026-09-19 · THE SECOND THRONE ──────────────────────────
    // This used to assert the Command Deck link was PRESENT in the action row
    // and merely hidden below the phone breakpoint. That pair of assertions
    // was the sentinel keeping a competing home advertised directly above
    // price on the desk, and it would have failed the cut it was meant to
    // survive. The Founder's order for this shift: "two URLs that both feel
    // like home" is a failed shot. So the gate now asserts the ABSENCE —
    // neither the markup nor the stylesheet may carry the chip back.
    //
    // This does NOT assert /command-deck is unreachable. The deck keeps its
    // door in every rail room and in the July 72px rail; what it does not
    // keep is a gold chip over a live chart.
    expect(dashboard).not.toContain("wm-chart-command-deck-link");
    expect(dashboard).not.toContain("Command Deck →");
    expect(css).toMatch(/\.wm-chart-orientation-action\s*\{[\s\S]*?min-height:\s*44px\s*!important/);
    expect(css).toMatch(/\.wm-chart-orientation-actions\s*\{[\s\S]*?width:\s*100%/);
    expect(css).toMatch(/\.wm-chart-orientation-actions\s*\{[\s\S]*?flex-wrap:\s*nowrap/);
    expect(css).not.toMatch(/\.wm-chart-command-deck-link\s*\{/);
  });

  // ── RE-AIMED 2026-09-21 · THE TIMEFRAMES MOVED TO THE GLASS ───────────────
  // This guard used to read: "gives all timeframes their own touch-sized
  // horizontal rail", and it asserted a full-width `overflow-x: auto` rail
  // inside the wrapped toolbar. It is re-aimed, not relaxed, and it is worth
  // being precise about why, because the old assertions were describing a
  // WORKAROUND rather than a requirement.
  //
  // The requirement was always: every timeframe reachable by a thumb, none of
  // them hidden behind the pinned tools cluster. On phone that was bought with
  // a dedicated scrolling rail. On DESKTOP it was never bought at all —
  // MEASURED by LOOKING at a 1440 screenshot on 2026-09-21, the toolbar
  // rendered `1m 2m` and then stopped, because `.wm-chart-toolbar` is
  // `overflow-x: auto` with `scrollbarWidth: "none"` and the pinned cluster
  // overlaps it. Seven of nine timeframes sat behind an invisible scroller.
  // The guard directly below this one ("prevents the pinned tools cluster from
  // covering late timeframes") was written for exactly that defect and only
  // ever enforced the phone half of it.
  //
  // Canon F24 and C-101 cure it structurally: one bordered chip at the bottom
  // centre of the candle pane, which cannot be clipped by a band it does not
  // live in. So the requirement is now asserted against the new owner, and the
  // ABSENCE of the old one is asserted too — otherwise both could exist and
  // this file would pass while two controls fought over one piece of state.
  it("owns every timeframe in one touch-sized chip on the glass, not a clipped rail", () => {
    // ANCHOR FIRST. Every `not.toContain` below is satisfied vacuously by an
    // empty string, and `chip` is a DERIVED string — a bad strip regex, a
    // renamed file, or a chip that became one big comment would all yield ""
    // and turn half this guard green by deleting its subject.
    expect(chip.length, "the chip file read as empty code").toBeGreaterThan(500);

    // The nine are derived from the canonical module, never retyped. A literal
    // list here is how the buttons drift from the bars actually fetched.
    expect(chip).toContain('from "@/lib/timeframes"');
    expect(chip).toContain("CHART_TF_SHIPPED.map");
    expect(chip).toContain('className="wm-chart-timeframe-chip"');
    expect(chip).toContain("wm-chart-timeframe px-2");
    expect(chip).toContain("wm-chart-timeframe-chip-trigger");

    // Touch targets survive the move — both the resting chip and the options.
    expect(css).toMatch(/\.wm-chart-timeframe\s*\{[\s\S]*?min-width:\s*44px/);
    expect(css).toMatch(/\.wm-chart-timeframe\s*\{[\s\S]*?min-height:\s*44px/);
    expect(css).toMatch(/\.wm-chart-timeframe-chip-trigger\s*\{[\s\S]*?min-width:\s*44px/);
    expect(css).toMatch(/\.wm-chart-timeframe-chip-trigger\s*\{[\s\S]*?min-height:\s*44px/);

    // STRICTLY STRONGER THAN WHAT IT REPLACED: the popover may not reintroduce
    // a scroll edge, which is the mechanism that hid options in the first
    // place. It wraps. Nothing can be scrolled out of reach if nothing scrolls.
    expect(css).toMatch(/\.wm-chart-timeframes\s*\{[\s\S]*?flex-wrap:\s*wrap/);
    expect(css).not.toMatch(/\.wm-chart-timeframes\s*\{[^}]*?overflow-x:\s*auto/);

    // A menu that opens over a live market must be dismissible without picking.
    expect(chip).toContain('e.key === "Escape"');
    // Outside-press closes it. Asserted as the pair — a handler that closes on
    // an outside press, AND that handler actually bound to `pointerdown` —
    // because either half alone is satisfied by dead code.
    expect(chip).toMatch(/rootRef\.current\?\.contains[\s\S]{0,80}?setOpen\(false\)/);
    expect(chip).toMatch(/addEventListener\("pointerdown", onDown/);

    // The state the colour used to carry alone, still carried by a word.
    expect(chip).toContain('aria-current={active ? "true" : undefined}');
    // …and still NOT by aria-pressed, which promises a reversal this control
    // does not have. See the long note in TimeframeGlassChip.tsx.
    expect(chip).not.toContain("aria-pressed");

    // THE OLD OWNER IS GONE, not merely bypassed. Judged on CODE: the toolbar
    // is allowed — required, really — to keep the sentence saying what it gave
    // up and why, but it may not keep the control or the props that fed it.
    expect(toolbarCode.length, "the toolbar read as empty code").toBeGreaterThan(500);
    expect(toolbarCode).not.toContain("wm-chart-timeframe");
    expect(toolbarCode).not.toContain("setTimeframe");
    // And the canonical timeframe module is no longer imported here at all — a
    // live import in a file that renders no timeframe is how one gets rendered.
    expect(toolbarCode).not.toContain('from "@/lib/timeframes"');
  });

  it("prevents the pinned tools cluster from covering the tools beside it", () => {
    // Narrowed in scope on 2026-09-21 because its original object — "late
    // timeframes" — no longer shares a band with the pinned cluster. The
    // cluster still overlaps everything else in that row (symbol search, hours,
    // indicators), so the wrap is still required; it is simply no longer the
    // thing standing between a trader and a 1D chart.
    expect(toolbar).toContain('className="wm-chart-toolbar-pinned');
    expect(css).toMatch(/\.wm-chart-toolbar-pinned\s*\{[\s\S]*?position:\s*static\s*!important/);
    expect(css).toMatch(/\.wm-chart-toolbar\s*\{[\s\S]*?flex-wrap:\s*wrap/);
  });

  it("mounts the glass chip on the candle pane, and only where the setter is real", () => {
    // Canon C-101 draws the timeframe on the canvas, not beside it. If this
    // ever moves back up into a parent row it becomes a band again, which is
    // the whole thing being cut.
    expect(mainChart).toContain("<TimeframeGlassChip");
    expect(mainChart).toMatch(/\{setTimeframe && \(\s*<TimeframeGlassChip/);

    // ── THE AXIS IS NOT SOMETHING TO SIT ON ────────────────────────────────
    // MEASURED at 1440 on 2026-09-21 (scratchpad/probe-timeaxis.mjs): the
    // candle canvas ran y=129→823 and the time axis was its own 28px canvas
    // from 823→851. The chip's first placement — `bottom: 6` on the pane —
    // occupied y=817→845 and COVERED 22 OF THOSE 28 PIXELS. A date label was
    // gone from the render. Every DOM assertion in this file was green while
    // that was true: one chip, centred to the half-pixel, nine options on
    // screen, none covered. Geometry against the DOM could not see it, because
    // lightweight-charts draws the axis to a canvas that has no DOM at all.
    //
    // So the cure is FLOOR SPACE, and this pins the cure rather than the
    // symptom. The pane reserves the band as padding, which shrinks the chart
    // and the axis with it; a canvas cannot draw into room it was never given.
    // An overlay merely told to sit lower would satisfy a coordinate check and
    // still be one font or locale change away from covering the axis again.
    expect(chip).toContain("export const TIMEFRAME_FOOTER_H");
    expect(mainChart).toContain("TIMEFRAME_FOOTER_H");
    // Reserved ONLY where the chip is real. The compare pane and the 5m/15m
    // panes get no setter, so they must not pay for furniture they never get.
    expect(mainChart).toMatch(/paddingBottom:\s*setTimeframe \? TIMEFRAME_FOOTER_H : undefined/);
    // Exactly one pane owns it. The compare pane mirrors `timeframe` and the
    // 5m/15m panes are pinned to literals; a chip in any of those would claim
    // authority it does not have.
    expect(dashboard.match(/setTimeframe=\{setTimeframe\}/g)?.length ?? 0).toBe(1);
  });
});
