/**
 * SceneAdmissionPanel — the panel that exists because of an overclaim, shipped
 * with no test standing over the correction.
 *
 * Its own header records the defect: the first version printed "Withheld · 9"
 * on /command-deck and struck through nine chips, when exactly ONE of the nine
 * named a surface that route routes through admission. Nine struck-through
 * chips read as "WM has a Flatten control and is choosing not to show it." WM
 * has no Flatten control on that route.
 *
 * The fix — the three-way ADMITTED / WITHHELD / NOT GOVERNED split — was
 * carried entirely by prose and by a required `governed` prop. `tsc` enforces
 * that the prop is PASSED. Nothing enforced what the panel DOES with it, and
 * the whole defect lives on that side: a one-character edit from
 * `governedSet.has(e) && !admittedSet.has(e)` to `!admittedSet.has(e)` restores
 * the original nine-chip lie with the prop still required and still passed.
 *
 * These tests stand over the split itself, and over the second overclaim the
 * header names: the unobserved-signal sentence must be derived from
 * `provenance`, never assumed from the route.
 */

import { describe, it, expect } from "vitest";
import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { SceneAdmissionPanel, ELEMENT_LABEL } from "./SceneAdmissionPanel";
import {
  compileScene,
  SURFACE_ELEMENTS,
  type SceneSignals,
  type SurfaceElement,
} from "@/lib/experience/compileScene";
import {
  SIGNAL_GROUPS,
  type SignalGroup,
  type SignalProvenance,
} from "@/lib/experience/deckSceneSignals";

/** A quiet, fully-resolved baseline. Individual tests move one signal at a time. */
const BASE: SceneSignals = {
  position: "FLAT",
  positionConfidence: "CONFIRMED",
  intentInFlight: false,
  exposureIncreasingWorkingOrders: 0,
  linkVerified: true,
  sessionOpen: true,
  rightOfWay: null,
  composingIntent: false,
  hadCapitalEvent: false,
  receiptWritten: false,
};

function provenanceWhere(observed: readonly SignalGroup[]): Record<SignalGroup, SignalProvenance> {
  const out = {} as Record<SignalGroup, SignalProvenance>;
  for (const g of SIGNAL_GROUPS) out[g] = observed.includes(g) ? "OBSERVED" : "UNOBSERVED";
  return out;
}

const ALL_OBSERVED = provenanceWhere(SIGNAL_GROUPS);

function render(opts: {
  signals?: SceneSignals;
  governed: readonly SurfaceElement[];
  provenance?: Record<SignalGroup, SignalProvenance>;
}): string {
  const provenance = opts.provenance ?? ALL_OBSERVED;
  const observedCount = SIGNAL_GROUPS.filter((g) => provenance[g] === "OBSERVED").length;
  return renderToStaticMarkup(
    <SceneAdmissionPanel
      compilation={compileScene(opts.signals ?? BASE)}
      provenance={provenance}
      observedCount={observedCount}
      totalCount={SIGNAL_GROUPS.length}
      governed={opts.governed}
    />,
  );
}

/** A struck-through chip is the panel ASSERTING a refusal. Counting them counts claims. */
function strikeCount(html: string): number {
  return html.split("text-decoration:line-through").length - 1;
}

describe("SceneAdmissionPanel — a refusal may only be claimed over a governed element", () => {
  it("never strikes through an element the route does not govern", () => {
    // THE ORIGINAL DEFECT, made executable. A route governing one element
    // cannot possibly be withholding nine.
    const html = render({ governed: ["MARKET_CANVAS"] });
    expect(strikeCount(html)).toBeLessThanOrEqual(1);
  });

  it("reports Withheld · 0 when the single governed element is admitted", () => {
    const compilation = compileScene(BASE);
    expect(compilation.admits).toContain("MARKET_CANVAS");
    const html = render({ governed: ["MARKET_CANVAS"] });
    expect(html).toContain("Withheld · 0");
    expect(strikeCount(html)).toBe(0);
    expect(html).toContain("Nothing this route governs is withheld in this scene.");
  });

  it("names an ungoverned element WITHOUT claiming it was refused", () => {
    // "Flatten control" must appear — dropping it silently would hide how
    // little of the screen the OS governs — but it must not be struck.
    const html = render({ governed: ["MARKET_CANVAS"] });
    expect(html).toContain(ELEMENT_LABEL.FLATTEN_CONFIRM);
    expect(html).toContain("Not governed here · 11");
  });

  it("counts a real refusal when the scene withholds something governed", () => {
    // A scene that does NOT admit the expression shortlist, over a route that
    // genuinely routes it through SceneAdmits, is a refusal the panel may claim.
    const compilation = compileScene(BASE);
    const refused = SURFACE_ELEMENTS.filter((e) => !compilation.admits.includes(e));
    expect(refused.length).toBeGreaterThan(0);
    const html = render({ governed: [refused[0]] });
    expect(html).toContain("Withheld · 1");
    expect(strikeCount(html)).toBe(1);
    expect(html).toContain("Admitted · 0");
  });

  it("drops the NOT GOVERNED section entirely when the route governs everything", () => {
    const html = render({ governed: SURFACE_ELEMENTS });
    expect(html).not.toContain("Not governed here");
    // And every element is now either admitted or a real refusal — the counts
    // must still sum to the full surface list.
    const compilation = compileScene(BASE);
    expect(html).toContain(`Admitted · ${compilation.admits.length}`);
    expect(html).toContain(`Withheld · ${SURFACE_ELEMENTS.length - compilation.admits.length}`);
  });

  it("states the governance ratio using the route's own number, not the compiler's", () => {
    const html = render({ governed: ["MARKET_CANVAS", "ONE_STORY"] });
    expect(html).toContain(`The scene governs 2 of ${SURFACE_ELEMENTS.length}`);
  });
});

describe("SceneAdmissionPanel — the unobserved sentence is derived, never assumed", () => {
  it("says nothing about unread signals when every group was observed", () => {
    const html = render({ governed: ["MARKET_CANVAS"] });
    expect(html).not.toContain("WM has not read");
  });

  it("names ONLY the groups that actually came back UNOBSERVED", () => {
    // The second overclaim from the header: a route with a real book must never
    // be told "WM has not read a book" just because another route lacked one.
    const provenance = provenanceWhere(["SESSION", "POSITION", "ORDERS", "LINK"]);
    const html = render({ governed: ["MARKET_CANVAS"], provenance });
    expect(html).toContain("WM has not read decision on this screen.");
    expect(html).not.toContain("position,");
    expect(html).not.toContain("orders,");
    expect(html).toContain("Signals observed · 4 / 5");
  });

  it("labels each signal group OBSERVED or UNOBSERVED individually", () => {
    const provenance = provenanceWhere(["SESSION"]);
    const html = render({ governed: ["MARKET_CANVAS"], provenance });
    expect(html).toContain("Session · OBSERVED");
    expect(html).toContain("Decision · UNOBSERVED");
    expect(html).toContain("Broker link · UNOBSERVED");
    expect(html).toContain("Signals observed · 1 / 5");
  });

  it("never asserts a signal is flat or safe merely because it was not read", () => {
    const html = render({ governed: ["MARKET_CANVAS"], provenance: provenanceWhere([]) });
    expect(html).toContain("not assumed flat or safe");
  });
});

describe("SceneAdmissionPanel — it is a landmark, and it projects only", () => {
  it("carries the scene and the reason in its accessible name", () => {
    const compilation = compileScene(BASE);
    const html = render({ governed: ["MARKET_CANVAS"] });
    expect(html).toContain(`aria-label="Scene ${compilation.scene}.`);
    expect(html).toContain(compilation.reason.slice(0, 24));
  });

  it("discloses capital accountability only when the compiler found capital at risk", () => {
    const flat = render({ governed: ["MARKET_CANVAS"] });
    expect(flat).not.toContain("Capital accountable");

    const exposed = render({
      signals: { ...BASE, position: "LONG" },
      governed: ["MARKET_CANVAS"],
    });
    expect(exposed).toContain("Capital accountable");
  });

  it("withholds ambient surfaces when the scene says so, and says which way it went", () => {
    const exposed = render({
      signals: { ...BASE, position: "LONG" },
      governed: ["MARKET_CANVAS"],
    });
    expect(exposed).toContain("Ambient surfaces are withheld");
    expect(exposed).not.toContain("may take the room — Academy");
  });

  it("renders no placeholder leakage in any scene", () => {
    for (const signals of [
      BASE,
      { ...BASE, position: "LONG" as const },
      { ...BASE, position: "LONG" as const, linkVerified: false },
      { ...BASE, intentInFlight: true },
    ]) {
      const html = render({ signals, governed: ["MARKET_CANVAS"] });
      expect(html).not.toContain("[object Object]");
      expect(html).not.toContain("undefined");
      expect(html).not.toContain("NaN");
    }
  });
});
