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
import SceneAdmissionPanel, { ELEMENT_LABEL } from "./SceneAdmissionPanel";
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

function panelHtmlFor(
  state: { session: string; rightOfWay: RightOfWay | null },
  governed: readonly SurfaceElement[],
): string {
  const signals = deckSignalsFor(state);
  return renderToStaticMarkup(
    <SceneAdmissionPanel
      compilation={compileScene(signals.signals)}
      provenance={signals.provenance}
      observedCount={signals.observedCount}
      totalCount={signals.totalCount}
      governed={governed}
    />,
  );
}

/**
 * The refusals the panel actually PRINTS, read back off the rendered markup.
 *
 * Counting withheld elements in the test and comparing to a count in the panel
 * proves the two arithmetic expressions agree — it does not prove the chips on
 * screen are the refused ones. A strike-through is the visual claim "the scene
 * removed this", so the strike-through is what the law has to be checked
 * against.
 */
function struckThroughLabels(panelHtml: string): readonly string[] {
  return [
    ...panelHtml.matchAll(/<span[^>]*text-decoration:line-through[^>]*>([^<]*)<\/span>/g),
  ].map((m) => m[1]);
}

const LABEL_TO_ELEMENT = new Map<string, SurfaceElement>(
  SURFACE_ELEMENTS.map((e) => [ELEMENT_LABEL[e], e]),
);

/**
 * Governance scopes under test.
 *
 * `["ONE_STORY"]` mirrors what /command-deck declares today — the page-level
 * pin that this really is the deck's list lives in the compileScene enforcement
 * suite, which reads page.tsx directly. The all-elements scope is here because
 * a law checked only against a one-element route would go quiet the moment that
 * element is admitted, and a law checked only against a fully governed route is
 * exactly the assumption that produced the panel's own overclaim.
 */
const GOVERNANCE_SCOPES: ReadonlyArray<{
  readonly name: string;
  readonly governed: readonly SurfaceElement[];
}> = [
  { name: "the deck as shipped", governed: ["ONE_STORY"] },
  { name: "a fully governed route", governed: SURFACE_ELEMENTS },
];

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
    let refusalsPrinted = 0;

    for (const state of DECK_STATES) {
      const c = compilationFor(state);

      for (const element of SURFACE_ELEMENTS) {
        const admits = c.admits.includes(element);
        expect(gateHtml(state, element)).toBe(admits ? "<div>BODY</div>" : "");
      }

      for (const scope of GOVERNANCE_SCOPES) {
        const panelHtml = panelHtmlFor(state, scope.governed);

        for (const label of struckThroughLabels(panelHtml)) {
          const element = LABEL_TO_ELEMENT.get(label);
          expect(element, `unknown chip label: ${label}`).toBeDefined();
          // Printed as refused ⇒ this route governs it, the compiler refused
          // it, and the gate removes it. All three, or the panel is lying.
          expect(scope.governed).toContain(element);
          expect(c.admits).not.toContain(element);
          expect(gateHtml(state, element as SurfaceElement)).toBe("");
          refusalsPrinted++;
        }

        const expected = scope.governed.filter((e) => !c.admits.includes(e)).length;
        expect(panelHtml).toContain(`Withheld · ${expected}`);
      }
    }

    // Positive control: a panel that printed no refusals at all would satisfy
    // every assertion above without proving anything.
    expect(refusalsPrinted).toBeGreaterThan(0);
  });

  it("LAW: the panel never reports a refusal this route has no power to enforce", () => {
    // The mirror image of THE regression, and the second defect this file
    // exists to pin. The gate stopped the SURFACE rendering what the compiler
    // refused; this stops the PANEL refusing what the surface never routed.
    //
    // In CLOSED the compiler withholds nine of twelve elements. The deck routes
    // exactly one of them through admission, so exactly one refusal may be
    // printed. The other eight are verdicts with no owner on this screen —
    // "WM has a Flatten control and is choosing not to show it" is a claim
    // about a control WM does not have here.
    const closed = compilationFor(DECK_STATES[2]);
    expect(SURFACE_ELEMENTS.length - closed.admits.length).toBe(9);

    const panelHtml = panelHtmlFor(DECK_STATES[2], ["ONE_STORY"]);
    expect(panelHtml).toContain("Withheld · 1");
    expect(struckThroughLabels(panelHtml)).toEqual([ELEMENT_LABEL.ONE_STORY]);
  });

  it("an ungoverned element is disclosed, not struck through and not dropped", () => {
    // Two wrong answers were available. Dropping the other eleven silently
    // would hide how little of the screen the OS actually governs; striking
    // them through would claim refusals WM cannot enforce. The panel must
    // disclose them as NOT GOVERNED and count them.
    const panelHtml = panelHtmlFor(DECK_STATES[0], ["ONE_STORY"]);

    // PERMISSION does not admit FLATTEN_CONFIRM, so the old panel struck it
    // through. It is ungoverned here, so it must be named without a strike.
    expect(compilationFor(DECK_STATES[0]).admits).not.toContain("FLATTEN_CONFIRM");
    expect(panelHtml).toContain(ELEMENT_LABEL.FLATTEN_CONFIRM);
    expect(struckThroughLabels(panelHtml)).not.toContain(ELEMENT_LABEL.FLATTEN_CONFIRM);
    expect(panelHtml).toContain("Not governed here · 11");
  });

  it("§10 progress meter: the panel states how much of the screen the OS governs", () => {
    // The uncomfortable number, on purpose. If admission covers one element of
    // twelve, the Founder should be able to read that off the screen rather
    // than infer it from a flattering refusal count.
    const panelHtml = panelHtmlFor(DECK_STATES[2], ["ONE_STORY"]);
    expect(panelHtml).toContain(`governs 1 of ${SURFACE_ELEMENTS.length}`);
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
