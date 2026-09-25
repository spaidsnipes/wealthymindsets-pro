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
 *
 * 2026-09-25 — REPAIR 2 LANDED and the flag is `true`, backed: the room freezes
 * its bars at the press (never a slice of today's bars — see
 * src/lib/chart/replayWindow.ts) and MainChart paints the window and holds live
 * ticks off the camera. The disclosure branch of the panel stays, and stays
 * tested here, because it is still what renders whenever the camera is NOT
 * being driven; the ratchet below now demands the wire's evidence instead of
 * the disclosure's.
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

  it("puts the replay down on Escape — the room-side half of the frame's promise", () => {
    // MEASURED on production 2026-09-22 (probe-truth-recovery.mjs): with the
    // replay panel held, Escape did NOTHING — `replayStillUp: true`, the rail
    // honestly reporting `aria-pressed="true"`. The OS frame deliberately does
    // not listen for Escape while a journey is open, on the stated premise that
    // the room "ALSO closes on Escape, one step at a time". Draw / Smart Money
    // / Chart Tools keep that promise through ShellModalDrawer's focus hook;
    // Bar Replay is a disclosure with no focus trap, so the room must keep it
    // itself. Without this, a panel over a live chart is a MODE — dismissible
    // only by re-finding the toggle while price is moving.
    const dash = read("ChartsDashboard.tsx");
    expect(
      dash,
      "the room no longer stops the replay on Escape — the frame's premise is a lie again",
    ).toMatch(/if \(e\.key !== "Escape" \|\| e\.defaultPrevented\) return;\s*\n\s*stopReplay\(\);/);
    // `defaultPrevented` is the one-level-per-press seam: a modal drawer above
    // the panel prevents default before stopping propagation, so it consumes
    // the press and the replay survives. Dropping the guard would make one
    // Escape close two levels.
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
    // the owner may only claim the chart follows the cursor once MainChart
    // actually READS the replay bars, rather than merely declaring and
    // destructuring them. (The full wire — freeze, window, tick gate, restore —
    // is bound to the same flag by replayCameraIsReal.sentinel.test.ts.)
    const dash = read("ChartsDashboard.tsx");
    // A bare literal `true` is never lawful — it would claim driving whether or
    // not a window exists. The claim must come from the room's owner.
    expect(dash, "chartFollowsCursor={true} is a literal claim; feed it from cameraWalksHistory")
      .not.toMatch(/chartFollowsCursor=\{true\}/);
    // `readFileSync` from this file's `SRC` only reaches src/components/chart,
    // so the registry is read from the repo root explicitly.
    const registryForClaim = readFileSync(
      join(process.cwd(), "src", "lib", "workspace", "roomEquipment.ts"),
      "utf8",
    );
    // REMODELLED 2026-09-25 (M9 repair 2), NOT WEAKENED. This used to key on a
    // call site writing `chartFollowsCursor={true}`, which the DRY fix made
    // impossible: the call site reads an owner, so the CLAIM now lives in the
    // owner's value. When the owner says the wire exists, every piece of
    // evidence the old `true` branch demanded is demanded — plus the call site
    // reading the room's real-path boolean rather than the bare flag.
    const claimsDriving = /export const REPLAY_DRIVES_THE_CAMERA: boolean = true;/.test(registryForClaim);
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
        .toMatch(/chartFollowsCursor=\{(false|REPLAY_DRIVES_THE_CAMERA|cameraWalksHistory)\}/);
      if (/chartFollowsCursor=\{(REPLAY_DRIVES_THE_CAMERA|cameraWalksHistory)\}/.test(dash)) {
        // THE OWNER LIVES IN THE REGISTRY NOW, and the assertion followed it
        // rather than being relaxed. It moved because the WORKSPACE menu needs
        // the same answer to disclose "not wired" BEFORE the trader presses
        // Replay; a registry holding its own `false` would be a second owner.
        expect(registryForClaim, "the named owner is not declared false in its own file")
          .toMatch(/export const REPLAY_DRIVES_THE_CAMERA: boolean = false;/);
        expect(dash, "ChartsDashboard does not read the single owner")
          .toContain('import { REPLAY_DRIVES_THE_CAMERA } from "@/lib/workspace/roomEquipment";');
        expect(dash, "the fidelity surfaces are not gated on the same owner")
          .toMatch(/const cameraWalksHistory = replayActive && REPLAY_DRIVES_THE_CAMERA && replayCamera !== null;/);
        // The whole point: NO surface may answer the panel's open/closed state.
        expect(
          dash.match(/replayEngaged: replayActive\b/g) ?? [],
          "a fidelity surface is still answering 'is the panel open' instead of " +
            "'is a camera driving' — that is the OWL facing the other way",
        ).toHaveLength(0);
      }
      return;
    }
    // ── THE OWNER CLAIMS THE WIRE. Demand the evidence, all of it. ──────────
    // The panel follows the ROOM's real-path boolean — owner AND a window held
    // right now — never the bare flag, which is true even while no window
    // describes this chart (the render after a symbol switch).
    expect(dash, "the panel must read the room's real-path boolean, not the bare flag")
      .toContain("chartFollowsCursor={cameraWalksHistory}");
    expect(dash, "the camera boolean must require a held window as well as the owner")
      .toMatch(/const cameraWalksHistory = replayActive && REPLAY_DRIVES_THE_CAMERA && replayCamera !== null;/);
    expect(
      dash.match(/replayEngaged: replayActive\b/g) ?? [],
      "a fidelity surface is answering 'is the panel open' — that is the OWL facing the other way",
    ).toHaveLength(0);
    const main = read("MainChart.tsx");
    const uses = (main.match(/\breplayBars\b/g) ?? []).length;
    expect(
      uses,
      "the owner claims the chart follows the replay cursor, but MainChart.tsx " +
        "still only DECLARES and DESTRUCTURES replayBars (two mentions, zero reads). " +
        "Either wire it for real — frozen CanonicalBar ancestry, never a slice of " +
        "today's bars — or set REPLAY_DRIVES_THE_CAMERA back to false.",
    ).toBeGreaterThan(2);
    expect(dash, "the chart cannot follow bars nobody passes it").toMatch(/replayBars=\{/);
  });
});
