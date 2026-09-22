/**
 * M9 · DISCLOSURE — the replay panel may not narrate a chart it does not drive.
 *
 * MEASURED, not assumed. In `MainChart.tsx` the identifiers `replayActive` and
 * `replayBars` each appear EXACTLY TWICE: once in the props interface, once in
 * the destructure. Zero reads. `replayBars` is passed from no call site at all.
 * Meanwhile `ChartsDashboard.tsx` runs a `500/speed` ms interval that advances
 * `replayIdx`, and the panel rendered a pulsing BAR REPLAY badge, a walking
 * session timestamp, a progress bar and a position-of-total counter on top of
 * it. The trader pressed play, watched the clock walk through the session, and
 * the candles behind it never moved.
 *
 * That is the same class of defect as the NO FEED badge that contradicted a
 * loaded chart: the interface asserting something the data does not support.
 *
 * This file guards the SMALLER of M9's two repairs — disclosure. It does NOT
 * claim replay works. The real wire (frozen CanonicalBar ancestry and truth
 * epochs) is a separate repair that depends on the M8 adoption half, and it is
 * expressly forbidden to fake it by slicing today's bars: that converts a
 * visible lie into an invisible one, and the invisible kind is the expensive
 * kind.
 *
 * The last test is the part that has to survive us. Disclosure decays the
 * moment someone flips the flag to `true` because it looks nicer — so the flag
 * is not allowed to claim more than the code can back.
 */

import { describe, it, expect } from "vitest";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { BarReplayControls } from "./BarReplayControls";

const SRC = join(process.cwd(), "src", "components", "chart");
const read = (f: string) => readFileSync(join(SRC, f), "utf8");

const noop = () => {};

const render = (chartFollowsCursor: boolean) =>
  renderToStaticMarkup(
    <BarReplayControls
      active
      playing
      speed={1}
      position={137}
      total={390}
      currentTime={1_758_204_000}
      chartFollowsCursor={chartFollowsCursor}
      onPlay={noop}
      onPause={noop}
      onStepBack={noop}
      onStepForward={noop}
      onStop={noop}
      onSpeedChange={noop}
    />,
  );

describe("M9 · the replay panel discloses that it does not drive the chart", () => {
  it("has real material to reason about (FALSE_RIPENESS guard)", () => {
    // A scan that reads nothing reports clean forever. Prove the files exist
    // and are substantial before any assertion below is allowed to mean
    // anything.
    for (const f of ["BarReplayControls.tsx", "ChartsDashboard.tsx", "MainChart.tsx"]) {
      expect(read(f).length, `${f} → read as empty; every claim below would be vacuous`).toBeGreaterThan(400);
    }
  });

  it("makes NO claim about the chart's position while it is not driving the chart", () => {
    const html = render(false);
    expect(html, "the panel vanished entirely — the trader loses the way out").toContain("bar-replay-controls");
    // Each of these is a sentence about a chart that is not moving.
    expect(html, "a position-of-total counter over a motionless chart").not.toContain("137/390");
    expect(html, "a walking session timestamp over a motionless chart").not.toMatch(/\d{2}:\d{2}/);
    // The progress fill is the only percentage width in this component, and a
    // percentage of the session is precisely the claim being withdrawn.
    expect(html, "a progress bar is a claim about how far the replay has got").not.toMatch(/width:\s*[\d.]+%/);
  });

  it("says so in words, rather than merely going quiet", () => {
    // Silence is not disclosure. A panel that simply drops its readouts looks
    // like a loading state, and the trader would wait for it.
    const html = render(false);
    expect(html.toLowerCase(), "the panel hides the defect instead of naming it").toContain("not wired");
    expect(html, "the disclosure branch must be machine-checkable, not just prose")
      .toContain('data-chart-follows-cursor="false"');
  });

  it("still gives the trader a way out of the panel it is disclosing", () => {
    // A panel that cannot be dismissed is a worse defect than the one it
    // discloses.
    expect(render(false), "no Close control on the disclosure panel").toContain("Close replay");
  });

  it("names the way out to a screen reader, not only to a hovering mouse", () => {
    // MEASURED 2026-09-19 on live /charts: this button carried `title="Close
    // replay"` and nothing else. `title` is the weakest naming source there
    // is — a tooltip, absent entirely on touch — and the button is icon-only,
    // so there was no text to fall back to. The sole exit from a panel whose
    // whole purpose is to confess a defect was itself unnamed.
    expect(
      render(false),
      "the way out lost its aria-label; an icon-only button named only by `title` " +
        "is unnamed on touch and weakly named everywhere else",
    ).toContain('aria-label="Close replay"');
  });

  it("does not let the disclosure text squeeze the way out", () => {
    // MEASURED 2026-09-19 on live /charts: the exit rendered 14x26, not 26x26.
    // The panel is a flex row with `maxWidth: min(460px, ...)`, `width` is only
    // a basis, and the long honest sentence won the contest for the pixels. The
    // more truth the panel told, the smaller the escape hatch got.
    //
    // TEETH-CHECKED 2026-09-19, and the first version FAILED the check: it
    // sliced from `function CtrlBtn` and matched /flexShrink:\s*0/, which the
    // long comment ABOVE the button satisfies by quoting the property it is
    // explaining. Deleting the real declaration left the test green — the
    // sentinel was guarding its own prose. A static-source test must anchor
    // past its own commentary, so this one starts at the `<button` tag.
    const src = read("BarReplayControls.tsx");
    const fn = src.indexOf("function CtrlBtn");
    expect(fn, "CtrlBtn vanished; re-pin this to whatever renders the way out").toBeGreaterThan(-1);
    const at = src.indexOf("<button", fn);
    expect(at, "CtrlBtn no longer renders a <button>; the way out must stay a real button").toBeGreaterThan(-1);
    expect(
      src.slice(at),
      "CtrlBtn lost `flexShrink: 0` — in a flex row `width` is a basis, not a floor, " +
        "so the only exit from the disclosure panel can be squeezed below its target size",
    ).toMatch(/flexShrink:\s*0/);
  });

  it("renders the full instrument — clock, progress and counter — ONLY when it is driving", () => {
    const html = render(true);
    expect(html, "the driving branch lost its position counter").toContain("137/390");
    expect(html, "the driving branch lost its walking timestamp").toMatch(/\d{2}:\d{2}/);
    expect(html, "the driving branch lost its progress fill").toMatch(/width:\s*[\d.]+%/);
    expect(html, "the driving branch must be machine-checkable too")
      .toContain('data-chart-follows-cursor="true"');
  });

  it("refuses to let a call site inherit the flattering answer by saying nothing", () => {
    // If `chartFollowsCursor` acquired a default, a future call site could omit
    // it and silently resume claiming a replay. The prop is required on purpose;
    // TypeScript is the enforcement, and this is the tripwire that notices the
    // enforcement being removed.
    const src = read("BarReplayControls.tsx");
    expect(src, "chartFollowsCursor gained a default — omission now means 'yes'")
      .not.toMatch(/chartFollowsCursor\s*=\s*(true|false)/);
    expect(src, "chartFollowsCursor is no longer a required prop")
      .toMatch(/chartFollowsCursor:\s*boolean;/);
  });

  it("does not let the flag claim more than MainChart can back", () => {
    // THE RATCHET. Disclosure rots the moment someone flips the flag because
    // the honest panel looks unfinished. So the flag is bound to the evidence:
    // a call site may only assert `chartFollowsCursor={true}` once MainChart
    // actually READS the replay bars, rather than merely declaring and
    // destructuring them.
    const dash = read("ChartsDashboard.tsx");
    const claimsDriving = /chartFollowsCursor=\{true\}/.test(dash);
    if (!claimsDriving) {
      // REMODELLED, NOT WEAKENED. This used to demand the literal
      // `chartFollowsCursor={false}`, which forbade the only correct DRY fix
      // for the bug measured on prod 2026-09-22: the panel's disclosure and the
      // room's fidelity chips were two independent literals, so the panel could
      // say "nothing behind me is a replay" while the masthead an inch above
      // certified HISTORICAL BARS over live candles. Both now read ONE named
      // owner. The assertion is correspondingly stronger, not looser — it pins
      // the owner AND its value AND that the fidelity publications are gated on
      // it, where before it pinned a single literal.
      expect(dash, "no call site claims to drive, so the disclosure must be fed a false answer")
        .toMatch(/chartFollowsCursor=\{(false|REPLAY_DRIVES_THE_CAMERA)\}/);
      if (/chartFollowsCursor=\{REPLAY_DRIVES_THE_CAMERA\}/.test(dash)) {
        expect(dash, "the named owner is not declared false")
          .toMatch(/const REPLAY_DRIVES_THE_CAMERA: boolean = false;/);
        expect(dash, "the fidelity surfaces are not gated on the same owner")
          .toMatch(/const cameraWalksHistory = replayActive && REPLAY_DRIVES_THE_CAMERA;/);
        // The whole point: NO surface may answer the panel's open/closed state.
        expect(
          dash.match(/replayEngaged: replayActive\b/g) ?? [],
          "a fidelity surface is still answering 'is the panel open' instead of " +
            "'is a camera driving' — that is the OWL facing the other way",
        ).toHaveLength(0);
      }
      return;
    }
    const main = read("MainChart.tsx");
    const uses = (main.match(/\breplayBars\b/g) ?? []).length;
    expect(
      uses,
      "a call site now claims the chart follows the replay cursor, but MainChart.tsx " +
        "still only DECLARES and DESTRUCTURES replayBars (two mentions, zero reads). " +
        "Either wire it for real — frozen CanonicalBar ancestry, never a slice of " +
        "today's bars — or set chartFollowsCursor back to false.",
    ).toBeGreaterThan(2);
    expect(dash, "the chart cannot follow bars nobody passes it").toMatch(/replayBars=\{/);
  });
});
