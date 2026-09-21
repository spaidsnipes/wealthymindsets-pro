import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * ONE NUMBER, ONE OWNER — the traded quantity on the candle pane.
 *
 * WHY THIS GUARD EXISTS. Canon frame F24 draws `Vol 68.92M` in the footer band
 * below the time axis and draws NO volume in the floating O/H/L/C legend. This
 * build had it in the legend, because until `TIMEFRAME_FOOTER_H` reserved a
 * band there was nowhere else to put it. Moving it created, for one commit, a
 * state in which both nodes could render it — and the most expensive defect
 * this chart has shipped was exactly that shape: the `NO FEED` pill appeared in
 * TWO different DOM nodes and had to be found and fixed twice, months apart,
 * because fixing the first one left the second one true.
 *
 * So the invariant is not "the footer has a volume". It is:
 *
 *     EXACTLY ONE of {footer band, price legend} renders it, in EVERY
 *     configuration, and the choice is made by ONE boolean.
 *
 * Both halves matter. "At most one" permits a build that shows the figure
 * nowhere; "at least one" permits showing it twice. The boolean is what makes
 * the two branches provably exclusive rather than merely currently-consistent —
 * two independent conditions that happen to be opposite today is how they stop
 * being opposite tomorrow.
 *
 * THIS FILE IS A SOURCE SCAN, WITH THE LIMITS THAT IMPLIES. It cannot prove
 * what renders; it pins the SHAPE that makes double-rendering unrepresentable.
 * The behavioural half — what the number says in each state — is covered by
 * real unit tests in `src/lib/chart/chartVolumeFooterFact.test.ts`, and the
 * geometric half was MEASURED at 1440 (`scratchpad/probe-footer-left.mjs`).
 */

const mainChartRaw = readFileSync(
  resolve(process.cwd(), "src/components/chart/MainChart.tsx"), "utf8");
const css = readFileSync(resolve(process.cwd(), "src/app/globals.css"), "utf8");

/**
 * Comments stripped before judging, for the reason recorded at length in
 * `chartPhoneControlReachability.test.ts`: the file under test deliberately
 * carries prose ABOUT the strings this guard forbids, and a guard that can only
 * go green by deleting the record of a repair is not a guard. Stripping also
 * makes the POSITIVE assertions stricter — they then pass on code, not on a
 * comment that merely mentions the identifier.
 */
function codeOnly(src: string): string {
  return src
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/(^|[^:])\/\/.*$/gm, "$1");
}
const mainChart = codeOnly(mainChartRaw);

describe("the traded quantity has exactly one owner on the candle pane", () => {
  it("decides between the two places with a single named boolean", () => {
    // ANCHOR FIRST. Every `not.toContain` below is satisfied vacuously by "",
    // and `mainChart` is DERIVED — a renamed file or a bad strip regex would
    // yield "" and turn this guard green by deleting its own subject.
    expect(mainChart.length, "MainChart read as empty code").toBeGreaterThan(5000);

    // The boolean exists, and is derived from the SAME condition that decides
    // the footer band physically exists. If these ever diverge, a pane could
    // reserve a band and not fill it, or fill a band it never reserved.
    expect(mainChart).toContain("const volumeInFooter = Boolean(setTimeframe)");
    expect(mainChart).toMatch(
      /paddingBottom:\s*setTimeframe \? TIMEFRAME_FOOTER_H : undefined/);

    // Both branches are keyed off that ONE name — not off two independent
    // conditions that happen to agree today.
    expect(mainChart).toContain("{volumeInFooter && last && (()");
    expect(mainChart).toContain("{volumeInFooter ? null : (");
  });

  it("renders the figure in the footer through the pure fact, never inline", () => {
    // The footer composes the tested selector. Formatting the number inline
    // here is how the `0K` hazard — formatVolumeMagnitude(57) === "0K" — would
    // get back onto the glass past its own unit tests.
    expect(mainChart).toContain('from "@/lib/chart/chartVolumeFooterFact"');
    expect(mainChart).toContain("chartVolumeFooterFact(");
    // NOT `className="wm-chart-volume-footer ..."`. The class is COMPOSED,
    // because the colour token is state-dependent and a literal attribute
    // could not carry that choice. Asserting the literal form failed here and
    // was re-aimed at the real shape — a `clsx` call whose FIRST argument is
    // the stable hook the stylesheet and both probes select on. Pinning it as
    // the first argument matters: a class that arrives only down a conditional
    // branch is a class that can be absent while the element renders.
    expect(mainChart).toMatch(/clsx\(\s*"wm-chart-volume-footer font-mono",/);
    // And the two colour tokens are the two STATES, not decoration.
    expect(mainChart).toMatch(
      /fact\.state === "OBSERVED"[\s\S]{0,80}?text-wm-text-dim[\s\S]{0,40}?text-wm-text-muted/);

    // Provenance travels with the figure: it is hoverable AND announced, and
    // the sentence naming the bar comes from the single owner of that claim.
    expect(mainChart).toMatch(/dataWindowBarScope\([\s\S]{0,120}?\)\.volume\.title/);
    expect(mainChart).toMatch(/title=\{fact\.title\}/);
    expect(mainChart).toMatch(/aria-label=\{fact\.title\}/);

    // It is a caption, not a control. Swallowing a pointer here would eat a
    // crosshair or a drawing gesture aimed at the market underneath.
    expect(mainChart).toMatch(/wm-chart-volume-footer[\s\S]{0,600}?pointerEvents: "none"/);
  });

  it("keeps the legend's cell alive for the panes that have no band", () => {
    // The compare pane and the pinned 5m/15m panes get no setter, so they get
    // no band — and must therefore KEEP the legend cell. Deleting it outright
    // would have been the easy read of "canon says the legend has no volume",
    // and it would have silently removed the figure from three panes.
    expect(mainChart).toContain("last.volume.toLocaleString()");
  });

  it("styles the band's caption with real tokens, never an invented var()", () => {
    // MEASURED THE HARD WAY. The first draft of this rule said
    // `color: var(--wm-text-dim)`. No such custom property exists — `wm.text-dim`
    // is a TAILWIND colour consumed as `text-wm-text-dim`. `var()` with an
    // undefined name and no fallback computes to nothing, so the caption would
    // have inherited some other colour and looked plausible. tsc was clean over
    // it; no stylesheet linter caught it. This pins the cure.
    expect(css).toMatch(/\.wm-chart-volume-footer\s*\{/);
    expect(css).not.toMatch(/\.wm-chart-volume-footer\s*\{[^}]*var\(--wm-text/);
    expect(mainChart).toContain("text-wm-text-dim");
    expect(mainChart).toContain("text-wm-text-muted");

    // A refusal must not be shaped like a measurement.
    expect(css).toMatch(
      /\.wm-chart-volume-footer\[data-volume-state="NOT_REPORTED"\]\s*\{[\s\S]*?font-style:\s*italic/);
    expect(mainChart).toContain("data-volume-state={fact.state}");
  });
});
