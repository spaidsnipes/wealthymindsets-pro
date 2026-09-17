/**
 * A REFERENCE PAGE FOR THE §10 BAND.
 *
 * The band's whole claim is that reach is legible by LENGTH before either
 * number is read — that "1 of 12" and "11 of 12" stop being four characters
 * apart and start looking different. That claim cannot be settled by an
 * assertion about markup; it has to be looked at. So this writes a page showing
 * the same panel at three reaches, and a human (or a screenshot) can check
 * whether the difference actually lands.
 *
 * Every panel here is the REAL `SceneAdmissionPanel` compiled by the REAL
 * `compileScene`. Nothing on the page is a mockup of the component — if the
 * band changes, this page changes with it, which is the only reason a reference
 * page is worth keeping.
 *
 * The scene signals are a FIXTURE and the page says so in its own heading. A
 * reference page that could be mistaken for a live screen is a worse problem
 * than no reference page.
 */

import { describe, expect, it } from "vitest";
import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";

import { SceneAdmissionPanel } from "./SceneAdmissionPanel";
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

const PROVENANCE = {} as Record<SignalGroup, SignalProvenance>;
for (const g of SIGNAL_GROUPS) PROVENANCE[g] = "OBSERVED";

/**
 * The three reaches worth looking at, and why each is here:
 *
 *   NOTHING  — the honest floor. Every mark unruled; no filled segment at all.
 *   TODAY    — what /command-deck actually governs. The uncomfortable number.
 *   EVERYTHING — the case that used to render NO reach figure whatsoever,
 *                because the old sentence was gated on `ungoverned.length > 0`.
 */
const CASES: readonly (readonly [string, string, readonly SurfaceElement[]])[] = [
  ["Governs nothing", "No element on this route is routed through admission.", []],
  [
    "Governs two",
    "One admitted, one the scene actually removed — a real, enforced refusal.",
    ["MARKET_CANVAS", "FLATTEN_CONFIRM"],
  ],
  [
    "Governs everything",
    "The reach figure used to VANISH in this case. It is the reading the meter exists to earn.",
    SURFACE_ELEMENTS,
  ],
];

const SAMPLE_HTML = `<!doctype html>
<html><head><meta charset="utf-8"><title>Scene governance band</title></head>
<body style="margin:0;padding:28px;background:#07080a;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif">
  <h1 style="font-family:Georgia,serif;font-size:17px;color:#c9a55c;letter-spacing:.5px;margin:0 0 4px">
    §10 governance band — how much of the screen the OS actually runs
  </h1>
  <p style="font-size:12px;color:#8a8271;margin:0 0 22px;max-width:760px;line-height:1.6">
    FIXTURE SCENE — NOT A LIVE ROUTE. Three reaches of the same real panel.
    Read the bands, not the numbers: the filled run from the left edge is the
    OS's authority. Solid = admitted, outlined = an enforced refusal, flat grey
    = a pixel no ruling reaches.
  </p>
  ${CASES.map(
    ([title, note, governed]) => `
  <section style="margin-bottom:26px;max-width:760px">
    <div style="font-size:10px;letter-spacing:.6px;text-transform:uppercase;color:#8a8271;margin-bottom:6px">
      ${title} — ${note}
    </div>
    ${renderToStaticMarkup(
      <SceneAdmissionPanel
        compilation={compileScene(BASE)}
        provenance={PROVENANCE}
        observedCount={SIGNAL_GROUPS.length}
        totalCount={SIGNAL_GROUPS.length}
        governed={governed}
      />,
    )}
  </section>`,
  ).join("")}
</body></html>`;

const TMP = path.join("/tmp", "scene-governance-sample.html");
writeFileSync(TMP, SAMPLE_HTML, "utf8");
try {
  mkdirSync(path.join(process.cwd(), "public"), { recursive: true });
  writeFileSync(path.join(process.cwd(), "public", "scene-governance-sample.html"), SAMPLE_HTML, "utf8");
} catch {
  // A reference page is a convenience. It may never fail a build.
}

describe("scene governance sample page", () => {
  it("shows three genuinely different reaches", () => {
    // If all three drew the same band, the page would prove nothing and the
    // band would be decoration.
    const governedCounts = [...SAMPLE_HTML.matchAll(/data-governed="(\d+)"/g)].map((m) => m[1]);
    expect(governedCounts).toEqual(["0", "2", String(SURFACE_ELEMENTS.length)]);
  });

  it("draws the full denominator in every case, including the empty one", () => {
    const totals = [...SAMPLE_HTML.matchAll(/data-total="(\d+)"/g)].map((m) => m[1]);
    expect(totals).toEqual(Array(CASES.length).fill(String(SURFACE_ELEMENTS.length)));
    const marks = [...SAMPLE_HTML.matchAll(/data-standing="/g)];
    expect(marks).toHaveLength(SURFACE_ELEMENTS.length * CASES.length);
  });

  it("prints a reach sentence for every case — including the two that used to hide it", () => {
    const reaches = [...SAMPLE_HTML.matchAll(/The scene governs (\d+) of (\d+) surface/g)];
    expect(reaches.map((m) => m[1])).toEqual(["0", "2", String(SURFACE_ELEMENTS.length)]);
  });

  it("says on its face that the scene is a fixture", () => {
    expect(SAMPLE_HTML).toContain("FIXTURE SCENE — NOT A LIVE ROUTE");
  });

  it("teaches no grade vocabulary anywhere on the page", () => {
    // §15 — a reference page that puts a passing mark in the reader's head has
    // put it there by another door.
    //
    // "GRADE" is NOT in this list, and the omission is deliberate rather than a
    // concession. `PROTECTION_GRADE` is a canonical `SurfaceElement` owned by
    // `compileScene`, and "Protection grade" is the English name this panel is
    // required to print for it. A guard that failed on it would be demanding
    // the page rename another module's vocabulary to satisfy a rule about THIS
    // band — which is how a guard starts distorting the thing it protects.
    //
    // The rule §15 actually carries is that the REACH may not be graded, and
    // that is asserted where it belongs: against the reach line itself, in
    // SceneAdmissionPanel.test.tsx. What stays banned page-wide are the words
    // that no canonical label uses and that could only be a verdict.
    expect(SAMPLE_HTML).not.toMatch(/\b(SCORE|PASSING|HEALTHY|EXCELLENT|POOR)\b/i);
    expect(SAMPLE_HTML).not.toMatch(/\d+%/);

    // And every GRADE on the page must be that one canonical label — if a
    // second sense of the word ever appears here, this fails.
    // Matched on the page's TEXT, not its markup — an attribute value ending
    // in `>` is not the word before "grade".
    const text = SAMPLE_HTML.replace(/<[^>]*>/g, " ");
    const grades = [...text.matchAll(/([A-Za-z]+)\s+grade\b/gi)];
    expect(grades.length).toBeGreaterThan(0); // proof the check is not vacuous
    for (const m of grades) expect(m[1].toLowerCase()).toBe("protection");
  });

  it("carries no green-dominant colour — §9", () => {
    for (const m of SAMPLE_HTML.matchAll(/#([0-9a-f]{6})\b/gi)) {
      const [r, g, b] = [0, 2, 4].map((i) => parseInt(m[1].slice(i, i + 2), 16));
      expect(g > r && g > b, `green-dominant #${m[1]}`).toBe(false);
    }
  });
});

// eslint-disable-next-line no-console
console.log(`\n  Scene governance sample written to: ${TMP}\n  Open it: file://${TMP}\n`);
