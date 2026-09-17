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

/**
 * THE §10 BAND MAY NEVER REPORT MORE AUTHORITY THAN THE OS HOLDS.
 *
 * This panel's header calls the governed-of-total figure "the §10 progress
 * meter" and says it "is meant to be uncomfortable and to rise". It was never
 * drawn, and — the defect these tests were written for — the sentence carrying
 * it was rendered inside `{ungoverned.length > 0 && ...}`. A route that
 * governed every element printed no reach figure at all, so the one number
 * proving the OS had finally taken the screen vanished exactly when it became
 * good news.
 */
describe("SceneAdmissionPanel — the §10 reach gets a shape", () => {
  function marks(html: string): string[] {
    return [...html.matchAll(/data-standing="([A-Z]+)"/g)].map((m) => m[1]);
  }

  it("draws the whole surface, not just the part the OS runs", () => {
    // A band drawn over governed elements alone would be FULL on every route
    // and would report total authority over a screen the OS barely touches.
    const html = render({ governed: ["MARKET_CANVAS"] });
    expect(marks(html)).toHaveLength(SURFACE_ELEMENTS.length);
    expect(html).toContain(`data-total="${SURFACE_ELEMENTS.length}"`);
    expect(html).toContain('data-governed="1"');
  });

  it("keeps every mark the same width, so the denominator cannot shrink", () => {
    const html = render({ governed: ["MARKET_CANVAS", "ONE_STORY"] });
    const band = html.split('data-testid="scene-governance-band"')[1].split("</div>")[0];
    expect(band.match(/flex:1 1 0/g) ?? []).toHaveLength(SURFACE_ELEMENTS.length);
  });

  it("leads with the reach — governed marks run from the left edge", () => {
    // So the OS's actual authority can be judged by length without counting.
    const html = render({ governed: ["MARKET_CANVAS", "FLATTEN_CONFIRM"] });
    const seen = marks(html);
    const lastGoverned = seen.lastIndexOf("ADMITTED") > seen.lastIndexOf("WITHHELD")
      ? seen.lastIndexOf("ADMITTED")
      : seen.lastIndexOf("WITHHELD");
    expect(seen.slice(0, lastGoverned + 1).every((s) => s !== "UNGOVERNED")).toBe(true);
    expect(seen.slice(lastGoverned + 1).every((s) => s === "UNGOVERNED")).toBe(true);
  });

  it("distinguishes the three by FILL, not by hue — §9 greyscale rule", () => {
    // A colour-blind reader and a greyscale screen must both see the split.
    // An enforced refusal is OUTLINED; an unruled pixel is neither filled nor
    // outlined, because an absence of authority is not a decision.
    const html = render({ governed: ["MARKET_CANVAS", "FLATTEN_CONFIRM"] });
    const styleOf = (standing: string) =>
      html.split(`data-standing="${standing}"`)[1].split(">")[0];
    expect(styleOf("ADMITTED")).toContain("background:#c9a55c");
    expect(styleOf("WITHHELD")).toContain("background:transparent");
    expect(styleOf("WITHHELD")).toContain("inset 0 0 0 1px #8a8271");
    expect(styleOf("UNGOVERNED")).not.toContain("inset 0 0 0 1px");
  });

  it("prints the reach on a route that governs NOTHING", () => {
    const html = render({ governed: [] });
    expect(html).toContain(`The scene governs 0 of ${SURFACE_ELEMENTS.length} surface`);
    expect(marks(html).every((s) => s === "UNGOVERNED")).toBe(true);
  });

  it("still prints the reach when the answer is good news — THE defect", () => {
    // The old sentence lived behind `ungoverned.length > 0`. A fully governed
    // route lost the figure entirely. A meter that hides its best reading is
    // not a meter, and this is the case that used to render nothing.
    const html = render({ governed: SURFACE_ELEMENTS });
    expect(html).toContain(
      `The scene governs ${SURFACE_ELEMENTS.length} of ${SURFACE_ELEMENTS.length} surface`,
    );
    expect(marks(html).some((s) => s === "UNGOVERNED")).toBe(false);
  });

  it("counts the band and the headings from one partition", () => {
    // Two partitions could disagree about how much of the screen the OS runs
    // while both stayed green — §24, one answer per question.
    const html = render({ governed: ["MARKET_CANVAS", "FLATTEN_CONFIRM", "ONE_STORY"] });
    const seen = marks(html);
    const admitted = seen.filter((s) => s === "ADMITTED").length;
    const withheld = seen.filter((s) => s === "WITHHELD").length;
    expect(html).toContain(`Admitted · ${admitted}`);
    expect(html).toContain(`Withheld · ${withheld}`);
    expect(html).toContain(`data-governed="${admitted + withheld}"`);
  });

  it("hides the band from screen readers, which get the chips themselves", () => {
    // Twelve unlabelled marks announced in sequence would be noise; every
    // element's name and standing is already spoken by the chip lists.
    const html = render({ governed: ["MARKET_CANVAS"] });
    expect(html).toMatch(/data-testid="scene-governance-band"[^>]*aria-hidden="true"/);
  });

  it("carries no percentage and no grade", () => {
    // §15. "92% governed" reads as a passing mark for a screen the OS mostly
    // does not touch.
    const html = render({ governed: ["MARKET_CANVAS", "ONE_STORY"] });
    const reach = html.split('data-testid="scene-governance-reach"')[1].split("</p>")[0];
    expect(reach).not.toMatch(/%/);
    expect(reach).not.toMatch(/\b(GOOD|STRONG|WEAK|PASS|FAIL|GRADE)\b/i);
  });
});
