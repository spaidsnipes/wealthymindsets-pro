/**
 * SENTINEL — the delta-bubble draw path must keep DELEGATING its ownership.
 *
 * WHY THIS FILE EXISTS
 *
 * `deltaBubbleLevels.ts` was created because the binning + level-ownership
 * arithmetic had lived inline inside MainChart.tsx, where the only coverage
 * possible was a re-typed COPY of the loop plus a string match on the file —
 * so a rename went red with no behaviour change while a behaviour change kept
 * the strings. The module's own header records the two defects the extraction
 * fixed: a bubble printing a bucket CENTRE as the price flow happened at, and
 * a rounded price used as a bucket identity (silently merging buckets on tight
 * bars and dropping their aggressor volume). That is real, silent data loss.
 *
 * The unit tests now stand over the arithmetic. Nothing stood over the
 * DELEGATION. Re-inlining the binning loop back into `getDeltaBubbleLevels` —
 * the most natural thing in the world to do while debugging a weird bubble
 * price in place — would leave `tsc --noEmit` at EXIT=0 and the module's own
 * tests fully green, because the module is still correct; it has simply
 * stopped being consulted.
 *
 * The Founder's chart would then be governed by a copy no test can reach.
 * That is the same orphan failure class the Delta+VP adoption Sentinel closes
 * for `deltaVPGeometry.ts` — sibling ownership, sibling gate.
 *
 * WHAT THIS SENTINEL CAN AND CANNOT SEE
 *
 * This is a SOURCE-TEXT assertion on the `getDeltaBubbleLevels` callback body.
 * Strictly stronger than "the module has tests," strictly weaker than a
 * rendered canvas of bubbles on live tape. It CANNOT witness:
 *
 *   · a call that is present but passes the wrong argument (e.g. bar.high and
 *     bar.low swapped) — the tests inside `deltaBubbleLevels.test.ts` are the
 *     authority for what the function does with its inputs
 *   · a bubble that renders at the wrong pixel — canvas has no DOM
 *   · a spawn-key collision downstream in the renderer
 *
 * It closes ONE thing: the arithmetic cannot quietly move back into MainChart
 * without failing here BY NAME.
 */

import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import * as path from "node:path";

const ROOT = path.resolve(__dirname, "..", "..");
const MAIN_CHART = path.join(ROOT, "src", "components", "chart", "MainChart.tsx");
const OWNER = path.join(ROOT, "src", "lib", "deltaBubbleLevels.ts");

const chartSrc = readFileSync(MAIN_CHART, "utf8");
const ownerSrc = readFileSync(OWNER, "utf8");

/**
 * The body of `getDeltaBubbleLevels` — scoped so a match on `numLev` or a bin
 * loop elsewhere in this 7000-line file cannot falsely trip the gate. A gate
 * that cries wolf is a gate someone deletes.
 */
function getDeltaBubbleLevelsBody(src: string): string {
  const marker = src.indexOf("const getDeltaBubbleLevels =");
  if (marker === -1) throw new Error("getDeltaBubbleLevels no longer defined in MainChart.tsx");
  const openBrace = src.indexOf("=> {", marker);
  if (openBrace === -1) throw new Error("getDeltaBubbleLevels arrow body not found");
  let depth = 0;
  for (let i = openBrace + 3; i < src.length; i++) {
    if (src[i] === "{") depth++;
    else if (src[i] === "}") {
      depth--;
      if (depth === 0) return src.slice(openBrace + 3, i + 1);
    }
  }
  throw new Error("getDeltaBubbleLevels body never closes");
}

/** Names MainChart imports from the owner. */
function importedNames(src: string): string[] {
  const m = /import\s*\{([^}]+)\}\s*from\s*"@\/lib\/deltaBubbleLevels"/.exec(src);
  if (!m) throw new Error("MainChart.tsx no longer imports from @/lib/deltaBubbleLevels");
  return m[1]
    .split(",")
    .map((s) => s.replace(/^\s*type\s+/, "").trim())
    .filter(Boolean);
}

/** Values (not types) the owner exports. */
function exportedValues(src: string): string[] {
  return [...src.matchAll(/^export\s+function\s+([A-Za-z0-9_]+)/gm)].map((m) => m[1]);
}

const BODY = getDeltaBubbleLevelsBody(chartSrc);
const IMPORTED = importedNames(chartSrc);
const EXPORTED_VALUES = exportedValues(ownerSrc);

describe("deltaBubbleLevels adoption — MainChart must delegate (Sentinel)", () => {
  it("finds a non-trivial delegating body to police", () => {
    // Guards against FALSE_RIPENESS: if the function is renamed to a stub the
    // matcher still finds, every assertion below would pass vacuously.
    expect(BODY.length).toBeGreaterThan(80);
    expect(BODY).toContain("computeDeltaBubbleLevels");
  });

  it("the delegating call is a return statement, not a discarded expression", () => {
    // A body that calls `computeDeltaBubbleLevels(...)` on one line and then
    // computes its own answer for the return would still contain the string,
    // and the previous assertion would pass. The delegation must be the exit.
    expect(BODY).toMatch(/return\s+computeDeltaBubbleLevels\s*\(/);
  });

  it("leaves no exported value function with nobody to consume it", () => {
    // Same shape as the deltaVPGeometry adoption Sentinel: every exported
    // function is either imported by MainChart or used internally by the
    // module. An export with neither is an orphan, and an orphan next to a
    // canvas is exactly where a re-inlined duplicate hides.
    const orphaned = EXPORTED_VALUES.filter((n) => {
      if (IMPORTED.includes(n)) return false;
      const hits = (ownerSrc.match(new RegExp(`\\b${n}\\b`, "g")) || []).length;
      return hits <= 1; // only its own declaration
    });
    expect(
      orphaned,
      `these deltaBubbleLevels exports have no consumer — not MainChart, not ` +
        `the module itself. Likeliest cause: the arithmetic was re-inlined ` +
        `into the canvas block where no test can reach it:\n  ${orphaned.join("\n  ")}`,
    ).toEqual([]);
  });

  it("does not re-inline the binning loop or a for-loop over ticks inside the callback", () => {
    // The specific shapes the extracted loop had. Named individually so the
    // failure message tells the reader what belongs where.
    //
    // "for(" alone is too broad — the body legitimately iterates a Map into an
    // array to build the ticks input. What the extraction moved OUT was the
    // binning arithmetic, which has three fingerprints the marshaling loop
    // does not: bucket count (`numLev`), a price computed from `bar.high` /
    // `bar.low`, and price-as-identity rounding (`toFixed`).
    //
    const reInlined: string[] = [];
    if (/\bnumLev\b/.test(BODY)) {
      reInlined.push("numLev — bucket count belongs to bucketCountFor");
    }
    if (/bar\.(high|low)\s*[-+]/.test(BODY)) {
      reInlined.push(
        "bar.high/bar.low arithmetic — bucket-edge math belongs to binDeltaTicks",
      );
    }
    if (/\.toFixed\s*\(/.test(BODY)) {
      reInlined.push(
        ".toFixed( — a rounded price used as bucket identity is the exact silent " +
          "data-loss defect the extraction fixed; identity belongs to bucket INDEX",
      );
    }
    expect(
      reInlined,
      `getDeltaBubbleLevels is computing ownership it must delegate:\n  ${reInlined.join("\n  ")}`,
    ).toEqual([]);
  });

  it("the spawn key is built by the owner, never re-inlined in the canvas", () => {
    // The identity formula lived inline in the draw block as
    // `dt:${c.time}:L${lv.levelIdx}` — a bucket INDEX over a window that moves
    // whenever a live bar makes a new extreme, which double-spawned one price
    // zone and silently suppressed another. See deltaBubbleLevelKey's header
    // for the measured drift table.
    //
    // The sibling big-trade cull site already carries a comment calling an
    // unreachable duplicate of `bigTradeLevelKey` "a loaded gun". This is that
    // gun unloaded by a gate rather than by a comment.
    expect(
      chartSrc,
      "MainChart must not build a delta spawn key itself — delegate to deltaBubbleLevelKey",
    ).not.toMatch(/`dt:\$\{/);
    expect(IMPORTED).toContain("deltaBubbleLevelKey");
    expect(chartSrc).toMatch(/const spawnKey = deltaBubbleLevelKey\(/);
  });

  it("the docstring still names the owner it delegates to", () => {
    // If someone strips the "Delegates to the shared pure owner" note, they
    // are claiming a delegation that the next reader must take on faith.
    // Claim and gate must stay the same size.
    const marker = chartSrc.indexOf("const getDeltaBubbleLevels =");
    const preamble = chartSrc.slice(Math.max(0, marker - 800), marker);
    expect(preamble).toMatch(/Delegates to the shared pure owner in src\/lib\/deltaBubbleLevels\.ts/);
  });
});
