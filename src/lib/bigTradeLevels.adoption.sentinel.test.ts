/**
 * SENTINEL — the big-trade draw path must keep DELEGATING its ownership.
 *
 * WHY THIS FILE EXISTS
 *
 * `bigTradeLevels.ts` already has unit tests standing over its arithmetic, and
 * `MainChart.tsx` already delegates to it. Neither of those facts is the thing
 * at risk. What was unguarded is the JOINT: `getRealBigTradeLevels` could be
 * re-inlined tomorrow — the single most natural move in the world while
 * chasing a wrong-looking bubble — and `tsc --noEmit` would stay EXIT=0, the
 * module's own tests would stay fully green, and the Founder's chart would be
 * governed by a copy that no test can reach. The module does not become wrong.
 * It stops being consulted, which is worse, because everything still looks
 * proven.
 *
 * This is the third instance of one failure class. `deltaVPGeometry.ts` has an
 * adoption Sentinel; `deltaBubbleLevels.ts` has an adoption Sentinel;
 * `bigTradeLevels.ts` is their sibling in every relevant respect — extracted
 * from the same 7000-line file, consumed from the same canvas block, owning
 * the same kind of price-identity arithmetic — and had none.
 *
 * WHAT THE EXTRACTION ACTUALLY FIXED (the thing worth protecting)
 *
 * The ranking used to round every print for DISPLAY and then use that rounded
 * value as the level's IDENTITY — both the pickMap key here and the
 * `bt:<time>:<price>` spawn key in the renderer. On crypto, where `base > 100`
 * collapses every print to two decimals, two separate block trades routinely
 * produced one key and the second was overwritten. Not merged into the first —
 * gone, with its size and its aggressor side. A trader watching for absorption
 * saw one print where the tape had two.
 *
 * That defect is invisible by construction: the chart renders a plausible
 * bubble at a plausible price either way. Nothing on screen says "a print was
 * dropped." Which is exactly why the guard has to be structural.
 *
 * WHAT THIS SENTINEL CAN AND CANNOT SEE
 *
 * A SOURCE-TEXT assertion on the `getRealBigTradeLevels` callback body.
 * Strictly stronger than "the module has tests," strictly weaker than a
 * rendered canvas on live tape. It CANNOT witness:
 *
 *   · a call that is present but passes the wrong argument — the tests in
 *     `bigTradeLevels.test.ts` are the authority for behaviour given inputs
 *   · a bubble drawn at the wrong pixel — canvas has no DOM to measure
 *   · a spawn-key collision introduced downstream in the renderer
 *
 * It closes ONE thing, by name: the ranking cannot quietly move back into
 * MainChart.
 */

import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import * as path from "node:path";

const ROOT = path.resolve(__dirname, "..", "..");
const MAIN_CHART = path.join(ROOT, "src", "components", "chart", "MainChart.tsx");
const OWNER = path.join(ROOT, "src", "lib", "bigTradeLevels.ts");

const chartSrc = readFileSync(MAIN_CHART, "utf8");
const ownerSrc = readFileSync(OWNER, "utf8");

/**
 * The body of `getRealBigTradeLevels`, brace-matched.
 *
 * Scoping matters more here than in the sibling gates. The function
 * immediately ABOVE this one in MainChart legitimately contains
 * `+(bar.low + i * binW).toFixed(dp)` — a whole-file match on `.toFixed(`
 * would fire on that innocent neighbour forever. A gate that cries wolf is a
 * gate someone deletes, so it reads only the body it polices.
 */
function getRealBigTradeLevelsBody(src: string): string {
  const marker = src.indexOf("const getRealBigTradeLevels =");
  if (marker === -1) throw new Error("getRealBigTradeLevels no longer defined in MainChart.tsx");
  const openBrace = src.indexOf("=> {", marker);
  if (openBrace === -1) throw new Error("getRealBigTradeLevels arrow body not found");
  let depth = 0;
  for (let i = openBrace + 3; i < src.length; i++) {
    if (src[i] === "{") depth++;
    else if (src[i] === "}") {
      depth--;
      if (depth === 0) return src.slice(openBrace + 3, i + 1);
    }
  }
  throw new Error("getRealBigTradeLevels body never closes");
}

/** Names MainChart imports from the owner. */
function importedNames(src: string): string[] {
  const m = /import\s*\{([^}]+)\}\s*from\s*"@\/lib\/bigTradeLevels"/.exec(src);
  if (!m) throw new Error("MainChart.tsx no longer imports from @/lib/bigTradeLevels");
  return m[1]
    .split(",")
    .map((s) => s.replace(/^\s*type\s+/, "").trim())
    .filter(Boolean);
}

/** Values (not types) the owner exports. */
function exportedValues(src: string): string[] {
  return [...src.matchAll(/^export\s+function\s+([A-Za-z0-9_]+)/gm)].map((m) => m[1]);
}

const BODY = getRealBigTradeLevelsBody(chartSrc);
const IMPORTED = importedNames(chartSrc);
const EXPORTED_VALUES = exportedValues(ownerSrc);

describe("bigTradeLevels adoption — MainChart must delegate (Sentinel)", () => {
  it("finds a non-trivial delegating body to police", () => {
    // FALSE_RIPENESS guard. If the function were reduced to a stub the brace
    // matcher still finds, every assertion below would pass vacuously and this
    // file would report green while guarding nothing.
    expect(BODY.length).toBeGreaterThan(80);
    expect(BODY).toContain("computeBigTradeLevels");
  });

  it("the delegating call is a return statement, not a discarded expression", () => {
    // A body that calls `computeBigTradeLevels(...)` on one line for its side
    // effects and then computes its own answer to return would satisfy the
    // assertion above. The delegation has to be the EXIT, not a mention.
    expect(BODY).toMatch(/return\s+computeBigTradeLevels\s*\(/);
  });

  it("leaves no exported value function with nobody to consume it", () => {
    // An export consumed by neither MainChart nor the module itself is an
    // orphan, and an orphan beside a canvas is precisely where a re-inlined
    // duplicate hides: the original stays exported and tested, the chart quietly
    // stops calling it.
    const orphaned = EXPORTED_VALUES.filter((n) => {
      if (IMPORTED.includes(n)) return false;
      const hits = (ownerSrc.match(new RegExp(`\\b${n}\\b`, "g")) || []).length;
      return hits <= 1; // only its own declaration
    });
    expect(
      orphaned,
      `these bigTradeLevels exports have no consumer — not MainChart, not the ` +
        `module itself. Likeliest cause: the ranking was re-inlined into the ` +
        `canvas block where no test can reach it:\n  ${orphaned.join("\n  ")}`,
    ).toEqual([]);
  });

  it("does not re-inline the ranking, the lot threshold, or price-as-identity rounding", () => {
    // Three fingerprints, named individually so the failure message tells the
    // reader WHICH piece of ownership came home and where it belongs. The body
    // legitimately marshals a Map into a ticks array, so a bare `for(` test
    // would be useless; these are shapes the marshaling loop does not have.
    const reInlined: string[] = [];
    if (/\.toFixed\s*\(/.test(BODY)) {
      reInlined.push(
        ".toFixed( — rounding a price and then keying on it is the exact silent " +
          "drop this extraction fixed (two crypto block trades → one key, second " +
          "overwritten). Display rounding belongs to the renderer; identity " +
          "belongs to computeBigTradeLevels",
      );
    }
    if (/\.sort\s*\(/.test(BODY)) {
      reInlined.push(
        ".sort( — ranking which prints count as BIG belongs to computeBigTradeLevels",
      );
    }
    if (/\bbase\s*[*/]|\bsize\s*>=/.test(BODY)) {
      reInlined.push(
        "a lot-size threshold — the min-lot rule belongs to minBigTradeLot, which " +
          "MainChart already imports and uses at its own filter site",
      );
    }
    expect(
      reInlined,
      `getRealBigTradeLevels is computing ownership it must delegate:\n  ${reInlined.join("\n  ")}`,
    ).toEqual([]);
  });

  it("the docstring still names the owner it delegates to", () => {
    // Claim and gate must stay the same size. Stripping the delegation note
    // while keeping the delegation leaves the next reader taking it on faith;
    // stripping the delegation while keeping the note is a lie in a comment.
    const marker = chartSrc.indexOf("const getRealBigTradeLevels =");
    const preamble = chartSrc.slice(Math.max(0, marker - 900), marker);
    expect(preamble).toMatch(
      /Delegates to the shared pure owner in src\/lib\/bigTradeLevels\.ts/,
    );
  });

  it("the spawn key the renderer draws with comes from the owner, not a local template", () => {
    // The identity defect had TWO ends. Fixing the pickMap key while the
    // renderer kept building `bt:${time}:${price.toFixed(dp)}` inline would
    // reintroduce the collision at the only place a human can see it — the
    // bubble on the chart. This asserts the second end stays delegated too.
    expect(IMPORTED).toContain("bigTradeLevelKey");
    expect(chartSrc).toMatch(/bigTradeLevelKey\s*\(/);
    // Read CODE, not prose. The cull site's comment quotes the exact template
    // it removed — quoting a defect is how the next reader learns why the line
    // is shaped the way it is, and a gate that punishes that teaches people to
    // delete their explanations.
    const code = chartSrc.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");
    const localTemplate = /`bt:\$\{/.test(code);
    expect(
      localTemplate,
      "MainChart is building a `bt:` spawn key from a template literal again — " +
        "that key is a price IDENTITY and belongs to bigTradeLevelKey",
    ).toBe(false);
  });
});
