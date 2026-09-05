/**
 * SceneAdmits tests.
 *
 * The bug these exist to make impossible is not "the gate renders wrong" — it
 * is the screen-level contradiction that actually shipped: the compiler
 * withholding ONE_STORY, the panel printing "Withheld · One story", and the
 * strip rendering anyway, thirteen lines above the panel refusing it.
 *
 * So the load-bearing tests here are not about the component in isolation.
 * They render the gate and the panel from the SAME compilation and assert the
 * two halves of the screen can never disagree again.
 */

import { describe, it, expect } from "vitest";
import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";

import SceneAdmits from "./SceneAdmits";
import SceneAdmissionPanel from "./SceneAdmissionPanel";
import {
  SURFACE_ELEMENTS,
  compileScene,
  type SurfaceElement,
} from "@/lib/experience/compileScene";
import { deckSceneSignals } from "@/lib/experience/deckSceneSignals";
import type { RightOfWay } from "@/lib/marketData/viewModels/decisionPermissionCompiler";

/** The four scenes /command-deck can actually reach today. */
const DECK_STATES: ReadonlyArray<{
  readonly session: string;
  readonly rightOfWay: RightOfWay | null;
  readonly scene: string;
}> = [
  { session: "RTH", rightOfWay: "ACTION", scene: "PERMISSION" },
  { session: "RTH", rightOfWay: "WAIT", scene: "WAIT" },
  { session: "CLOSED", rightOfWay: null, scene: "CLOSED" },
  { session: "UNKNOWN", rightOfWay: "UNKNOWN", scene: "PREGAME" },
];

function deckSignalsFor(state: { session: string; rightOfWay: RightOfWay | null }) {
  return deckSceneSignals({ session: state.session, rightOfWay: state.rightOfWay });
}

function compilationFor(state: { session: string; rightOfWay: RightOfWay | null }) {
  return compileScene(deckSignalsFor(state).signals);
}

function gateHtml(
  state: { session: string; rightOfWay: RightOfWay | null },
  element: SurfaceElement,
  body = "BODY",
): string {
  return renderToStaticMarkup(
    <SceneAdmits compilation={compilationFor(state)} element={element}>
      <div>{body}</div>
    </SceneAdmits>,
  );
}

describe("SceneAdmits — the gate obeys the compiler", () => {
  it("renders children when the scene admits the element", () => {
    expect(gateHtml(DECK_STATES[0], "MARKET_CANVAS", "CANVAS")).toContain("CANVAS");
  });

  it("renders nothing when the scene withholds the element", () => {
    const closed = compilationFor(DECK_STATES[2]);
    expect(closed.admits).not.toContain("ONE_STORY");
    expect(gateHtml(DECK_STATES[2], "ONE_STORY", "STORY")).toBe("");
  });

  it("withholds silently — no placeholder, no stub, no reserved space", () => {
    // §10: a scene changes what is ADMITTED, not what is collapsed. A
    // "hidden by scene" stub is just the surface with extra steps.
    expect(gateHtml(DECK_STATES[3], "ONE_STORY", "STORY")).toBe("");
  });

  it("scene sequencing: the SAME element flips with the scene, nothing else changes", () => {
    // The §10 sentence is "same market state underneath, different admission".
    // ONE_STORY is the proof: identical component, opposite outcome.
    expect(gateHtml(DECK_STATES[0], "ONE_STORY", "STORY")).toContain("STORY");
    expect(gateHtml(DECK_STATES[2], "ONE_STORY", "STORY")).toBe("");
  });

  it("gates every surface element correctly in every reachable deck scene", () => {
    let admitted = 0;
    let withheld = 0;
    for (const state of DECK_STATES) {
      const c = compilationFor(state);
      for (const element of SURFACE_ELEMENTS) {
        const rendered = gateHtml(state, element) !== "";
        expect(rendered).toBe(c.admits.includes(element));
        if (rendered) admitted++;
        else withheld++;
      }
    }
    // Positive control: a gate that always renders — or never does — would
    // satisfy a weaker assertion than the one above. It must do both jobs.
    expect(admitted).toBeGreaterThan(0);
    expect(withheld).toBeGreaterThan(0);
  });
});

describe("the screen never contradicts itself", () => {
  it("LAW: nothing the panel reports as WITHHELD is rendered by the gate", () => {
    // THE regression. Both halves read the same compilation, so a divergence
    // is now a test failure rather than a screen that argues with itself.
    for (const state of DECK_STATES) {
      const signals = deckSignalsFor(state);
      const c = compileScene(signals.signals);

      const panelHtml = renderToStaticMarkup(
        <SceneAdmissionPanel
          compilation={c}
          provenance={signals.provenance}
          observedCount={signals.observedCount}
          totalCount={signals.totalCount}
        />,
      );

      for (const element of SURFACE_ELEMENTS) {
        const admits = c.admits.includes(element);
        expect(gateHtml(state, element)).toBe(admits ? "<div>BODY</div>" : "");
      }

      // And the panel genuinely publishes a withheld list for the scenes that
      // have one — otherwise the assertion above is vacuous.
      const withheldCount = SURFACE_ELEMENTS.length - c.admits.length;
      expect(panelHtml).toContain(`Withheld · ${withheldCount}`);
    }
  });

  it("§9 CLOSED: the story is withheld by the gate, not merely labelled", () => {
    expect(gateHtml(DECK_STATES[2], "ONE_STORY", "ONE STORY")).toBe("");
    expect(gateHtml(DECK_STATES[2], "THESIS_GEOMETRY", "THESIS")).toBe("");
    // ...while the market itself survives. A closed session still shows the
    // canvas; CLOSED reduces capability, it does not blank the screen.
    expect(gateHtml(DECK_STATES[2], "MARKET_CANVAS", "CANVAS")).toContain("CANVAS");
  });

  it("an open session with earned right-of-way admits the story (positive control)", () => {
    expect(gateHtml(DECK_STATES[0], "ONE_STORY", "ONE STORY")).toContain("ONE STORY");
  });

  it("every reachable deck scene withholds SOMETHING — admission is never a no-op", () => {
    for (const state of DECK_STATES) {
      const c = compilationFor(state);
      expect(c.admits.length).toBeLessThan(SURFACE_ELEMENTS.length);
    }
  });
});
