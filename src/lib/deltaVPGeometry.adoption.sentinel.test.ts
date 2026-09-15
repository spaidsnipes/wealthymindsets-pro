/**
 * SENTINEL — the Delta+VP draw loop must keep DELEGATING its geometry.
 *
 * WHY THIS FILE EXISTS
 *
 * `deltaVPGeometry.ts` was created by lifting bare arithmetic OUT of a ~7000-line
 * canvas draw loop in `MainChart.tsx` so that it could be tested at all. Its own
 * header states the motive plainly: the geometry "lived as bare expressions
 * inside a ~7000-line canvas draw loop ... where no test can reach it and `tsc`
 * sees only numbers going into numbers."
 *
 * `deltaVPGeometry.test.ts` now stands over that arithmetic. But NOTHING stood
 * over the delegation. The extraction is only worth something while the draw
 * loop keeps calling it. If a future edit re-inlines `Math.round(rh / 22)` or
 * `Math.pow(frac, 0.7)` back into the block — the most natural thing in the
 * world to do while debugging a canvas in place — then:
 *
 *   · `tsc --noEmit` stays EXIT=0. It is numbers going into numbers.
 *   · `deltaVPGeometry.test.ts` stays GREEN. The module is still correct;
 *     it has simply stopped being consulted.
 *   · The Founder's chart silently changes, governed by a copy nobody tests.
 *
 * That is the orphan failure class, arriving by drift rather than by design:
 * a tested owner and an untested duplicate, with the duplicate on screen. This
 * codebase already answers it with breadcrumb Sentinels (HeroTruth must consume
 * heroTruthChronology; composeMarketCanvasVM single-writer). This is that gate
 * for the Delta+VP tool.
 *
 * WHAT THIS SENTINEL CAN AND CANNOT SEE — read before trusting a green run.
 *
 * This is a SOURCE-TEXT assertion on the draw block. It is strictly stronger
 * than "the module has tests" and strictly weaker than a rendered canvas. It
 * CANNOT witness:
 *
 *   · whether the box paints correctly on a live chart — a canvas has no DOM,
 *     so neither `scripts/measure-experience-geometry.mjs` nor a
 *     `renderToStaticMarkup` test can reach it
 *   · a call that is present but passes the wrong argument
 *   · a value correctly computed and then never drawn
 *
 * The live-render half of this gate remains OPEN and is recorded as such in
 * `deltaVPGeometry.ts`'s own closing note. This file does not close it and does
 * not claim to. It closes the ADOPTION half: the numbers cannot quietly move
 * back into the draw loop without failing here BY NAME.
 */

import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import * as path from "node:path";

const ROOT = path.resolve(__dirname, "..", "..");
const MAIN_CHART = path.join(ROOT, "src", "components", "chart", "MainChart.tsx");
const GEOMETRY = path.join(ROOT, "src", "lib", "deltaVPGeometry.ts");

const chartSrc = readFileSync(MAIN_CHART, "utf8");
const geometrySrc = readFileSync(GEOMETRY, "utf8");

/**
 * The `delta-vp` arm of the drawing-tool dispatch, by brace matching.
 *
 * Scoping matters. A whole-file scan for `Math.pow(` or `0.7` would drown in
 * `hexToRgba(col, 0.7)` opacity arguments and the fib-spiral's own `Math.pow`,
 * both of which are legitimate and unrelated. A gate that cries wolf on
 * unrelated code is a gate someone deletes.
 */
function deltaVpDrawBlock(src: string): string {
  const marker = src.indexOf('t === "delta-vp"');
  if (marker === -1) throw new Error("delta-vp draw arm not found in MainChart.tsx");
  const open = src.indexOf("{", marker);
  let depth = 0;
  for (let i = open; i < src.length; i++) {
    if (src[i] === "{") depth++;
    else if (src[i] === "}") {
      depth--;
      if (depth === 0) return src.slice(open, i + 1);
    }
  }
  throw new Error("delta-vp draw arm never closes");
}

/** The names MainChart actually imports from the geometry owner. */
function importedGeometryNames(src: string): string[] {
  const m = /import\s*\{([^}]+)\}\s*from\s*"@\/lib\/deltaVPGeometry"/.exec(src);
  if (!m) throw new Error("MainChart.tsx no longer imports from @/lib/deltaVPGeometry");
  return m[1]
    .split(",")
    .map((s) => s.replace(/^\s*type\s+/, "").trim())
    .filter(Boolean);
}

/** Every value exported by the geometry owner (functions and constants). */
function exportedGeometryNames(src: string): string[] {
  return [...src.matchAll(/^export\s+(?:const|function)\s+([A-Za-z0-9_]+)/gm)].map((m) => m[1]);
}

const BLOCK = deltaVpDrawBlock(chartSrc);
const IMPORTED = importedGeometryNames(chartSrc);
const EXPORTED = exportedGeometryNames(geometrySrc);

describe("deltaVPGeometry adoption — the draw loop must delegate (Sentinel)", () => {
  it("finds a non-trivial delta-vp draw block to police", () => {
    // Guards the gate itself: if the dispatch arm is renamed to something the
    // matcher still finds but which is now a stub, every assertion below would
    // pass vacuously. FALSE_RIPENESS is the failure mode being refused here.
    expect(BLOCK.length).toBeGreaterThan(1500);
    expect(BLOCK).toContain("computeDeltaVP");
  });

  it("leaves no exported geometry value with nobody to consume it", () => {
    // NOT "MainChart imports everything" — the first draft of this Sentinel
    // asserted exactly that and failed on DVP_MIN_BOX_W / DVP_MIN_BOX_H, which
    // are consumed INSIDE dvpBoxAdmitsProfile and are exported only so the
    // arithmetic tests can name the threshold they are checking. That would
    // have been a gate crying wolf on correct code.
    //
    // The real invariant is narrower and true: every export has a consumer —
    // either the draw loop imports it, or the module itself uses it. An export
    // with neither is an orphan, and an orphan next to a canvas is where a
    // re-inlined duplicate hides.
    const orphaned = EXPORTED.filter((n) => {
      if (IMPORTED.includes(n)) return false;
      const usesInternally = new RegExp(`\\b${n}\\b`, "g");
      const hits = (geometrySrc.match(usesInternally) || []).length;
      return hits <= 1; // only its own declaration
    });
    expect(
      orphaned,
      `these geometry exports have no consumer — not the draw loop, not the ` +
        `module itself. If the draw loop stopped importing one, the likeliest ` +
        `reason is that its arithmetic was re-inlined into the canvas block ` +
        `where no test can reach it:\n  ${orphaned.join("\n  ")}`,
    ).toEqual([]);
  });

  it("actually USES every imported geometry value inside the delta-vp block", () => {
    // An unused import is the halfway house: the delegation looks intact at the
    // top of the file while the block quietly computes its own answer.
    const unused = IMPORTED.filter((n) => !new RegExp(`\\b${n}\\b`).test(BLOCK));
    expect(
      unused,
      `imported from the geometry owner but never referenced in the delta-vp ` +
        `draw block:\n  ${unused.join("\n  ")}`,
    ).toEqual([]);
  });

  it("does not re-inline the bar-length law or the bin-count law", () => {
    // The two numbers most likely to walk back in, because each is a one-liner
    // a developer would happily type while staring at a canvas.
    const reInlined: string[] = [];
    if (/Math\.pow\s*\(/.test(BLOCK)) {
      reInlined.push("Math.pow( — the 0.7 bar-length curve belongs to dvpBarWidth");
    }
    if (/\/\s*22\b/.test(BLOCK)) {
      reInlined.push("/ 22 — the rows-per-pixel compromise belongs to dvpBinCount");
    }
    expect(
      reInlined,
      `the delta-vp draw block is computing geometry it must delegate:\n  ${reInlined.join("\n  ")}`,
    ).toEqual([]);
  });

  it("does not hard-code a refusal sentence back into the draw loop", () => {
    // THE DEFECT: the block used to answer all three refusal causes with one
    // string, "Delta+VP — draw a wider box over bars". Observed live on
    // 2026-09-15 on a ~548x142px box, where the cause was no per-level data and
    // resizing could never help. The sentence now belongs to dvpRefusalMessage,
    // which is the only place the three causes can be told apart.
    const hardCoded = /chip\(\s*"Delta\+VP\s*—[^"]*"/.exec(BLOCK);
    expect(
      hardCoded?.[0] ?? null,
      `a refusal sentence is spelled out in the draw loop again. Only ` +
        `dvpRefusalMessage(dvpProfileRefusal(...)) may decide it — a literal ` +
        `here cannot tell "no per-level data" from "too narrow" and will send ` +
        `the trader to resize a box that is already large enough.`,
    ).toBeNull();
    expect(BLOCK).toContain("dvpRefusalMessage(dvpProfileRefusal(");
  });

  it("keeps the two bar-length laws under DIFFERENT names", () => {
    // deltaVPGeometry.ts's header records that the first draft exported a second
    // `vpBarWidth` and tsc refused it as a duplicate identifier against
    // vpDrawGeometry. The names were changed rather than the collision aliased
    // away, precisely so a reader of the draw loop can tell which law governs
    // the bar in front of them. An alias would restore the confusion silently.
    expect(geometrySrc).not.toMatch(/^export\s+(?:const|function)\s+vpBarWidth\b/m);
    expect(EXPORTED.every((n) => n.startsWith("dvp") || n.startsWith("DVP_"))).toBe(true);
  });

  it("states honestly that the live-render half is still open", () => {
    // If someone deletes this note, they are claiming a proof this file does not
    // provide. The claim and the gate must stay the same size.
    expect(geometrySrc).toMatch(/NOTE ON THE LIVE GATE/);
  });
});
