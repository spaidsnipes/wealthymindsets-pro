/**
 * ORDER FLOW REACHES THE GLASS THROUGH ONE DOOR PER READING.
 *
 * THIS SENTINEL EXISTS BECAUSE A SECOND DOOR WAS BUILT, AND IT WAS BUILT BY US.
 *
 * On 2026-09-18 four compilers shipped that take an order-flow reading and hand
 * the canvas the few facts it needs — `selectValueCandleGlass`,
 * `selectStackedImbalanceGlass`, `selectDeltaDivergenceGlass`,
 * `selectLiquidityWeatherGlass` — each with its own sentinel, each called from
 * exactly one place in MainChart. Absorption had already reached price/time
 * space through `selectAbsorptionAnatomy` (Founder Asset 06). Big prints have
 * been drawn by MainChart's bubble engine, anchored by `anchorTime` and
 * `anchorPrice`, longer than any of them.
 *
 * On 2026-09-20 `composeOrderFlowOverlay` was written — a single generic
 * compiler that placed liquidity, absorption and the imbalance stack as bands
 * and levels over a caller-supplied tape window. It was careful, it was tested,
 * and it was a SECOND PLACEMENT AUTHORITY FOR PIXELS THAT ALREADY HAD ONE. Its
 * own header opened with the claim that "none of them draw on the price
 * canvas", which had stopped being true two days earlier. It never acquired a
 * consumer. It has been deleted rather than wired.
 *
 * That is the Founder's brief, verbatim: the OS must not accumulate "broken
 * builds and new builds that work". Two compilers for one band do not make a
 * richer chart; they make two authorities that will eventually disagree about
 * where the same reading sits, and the disagreement will surface as a band in
 * one place and a shelf in another.
 *
 * SO THIS FILE PINS THE OWNERSHIP TABLE. It is a breadcrumb, not a renderer: it
 * reads source. Its job is to make the next person who reaches for "an order
 * flow overlay compiler" find the five that already exist instead of writing a
 * sixth.
 *
 * WHEN A READING GENUINELY NEEDS A NEW PLACE ON THE GLASS, ITS OWNER GAINS IT.
 * The reading MOVES. It is not copied.
 */

import { describe, expect, it } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, resolve } from "node:path";

const ROOT = process.cwd();
const read = (rel: string) => readFileSync(join(ROOT, rel), "utf8");

/** Prose names the things it forbids; only executable code is evidence. */
const strip = (s: string) =>
  s
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/^[ \t]*\/\/.*$/gm, "");

const CHART = read("src/components/chart/MainChart.tsx");
const CHART_CODE = strip(CHART);

/**
 * The ownership table. One row per order-flow reading that is entitled to
 * occupy price/time space, and the ONE module that decides where it sits.
 *
 * `bigTrades` is deliberately absent as a compiler row: its placement lives
 * inside MainChart's bubble engine, which owns rescale and cull passes a pure
 * compiler cannot express. It is asserted separately, below.
 */
const OWNERS = [
  { reading: "value candle", owner: "selectValueCandleGlass" },
  { reading: "stacked imbalance", owner: "selectStackedImbalanceGlass" },
  { reading: "delta divergence", owner: "selectDeltaDivergenceGlass" },
  { reading: "liquidity weather", owner: "selectLiquidityWeatherGlass" },
  { reading: "absorption", owner: "selectAbsorptionAnatomy" },
] as const;

describe("every order-flow reading on the glass has exactly one placement owner", () => {
  for (const { reading, owner } of OWNERS) {
    it(`${reading} is placed by ${owner}, and MainChart calls it once`, () => {
      const calls = CHART_CODE.match(new RegExp(`\\b${owner}\\s*\\(`, "g")) ?? [];
      expect(
        calls.length,
        `${owner} is the one compiler that says where ${reading} sits. ` +
          `Found ${calls.length} call sites in MainChart; there must be exactly one. ` +
          `A second call is a second answer to the same question.`,
      ).toBe(1);
    });
  }

  it("big prints stay with the bubble engine, which anchors them by real time and price", () => {
    // The one reading carrying real time AND real price is the easiest to
    // redraw, which is exactly the trap. It already has an owner.
    expect(CHART_CODE).toMatch(/anchorPrice/);
    expect(CHART_CODE).toMatch(/anchorTime/);
  });
});

describe("no second, generic order-flow placement compiler", () => {
  /**
   * The shape of the thing that was deleted: a module that invents its own
   * band/level vocabulary for order flow over a caller-supplied tape window.
   * Matching by VOCABULARY rather than by filename is deliberate — renaming
   * `composeOrderFlowOverlay.ts` to `orderFlowPlacement.ts` is not a fix.
   */
  const FORBIDDEN: readonly (readonly [RegExp, string])[] = [
    [/spansWholeWindow/, "a generic 'this band covers the whole window' flag"],
    [/requiresOrdinalDisclosure/, "a generic ordinal-position disclosure flag"],
    [/ORDER_FLOW_OVERLAY_VERSION/, "the deleted overlay compiler's version tag"],
    [/composeOrderFlowOverlay/, "the deleted overlay compiler itself"],
  ];

  it("the vocabulary of the deleted compiler is nowhere in src", () => {
    const root = resolve(ROOT, "src");
    const scanned: string[] = [];
    const offenders: string[] = [];

    const walk = (dir: string) => {
      for (const name of readdirSync(dir)) {
        const path = join(dir, name);
        if (statSync(path).isDirectory()) {
          walk(path);
          continue;
        }
        if (!/\.tsx?$/.test(name)) continue;
        // This sentinel must be allowed to name what it forbids.
        if (path.endsWith("orderFlowOnGlassHasOneOwner.sentinel.test.ts")) continue;
        const src = strip(readFileSync(path, "utf8"));
        scanned.push(path);
        for (const [pattern, what] of FORBIDDEN) {
          if (pattern.test(src)) {
            offenders.push(`${path.slice(root.length + 1)} — ${what}`);
          }
        }
      }
    };
    walk(root);

    // PROVE THE SCAN FOUND MATERIAL FIRST. A walk that quietly stopped
    // returning files would certify a clean OS forever — the exact failure mode
    // sentinelsProveTheyScanned.test.ts polices.
    expect(
      scanned.length,
      "this scan found almost no source files — the walk has drifted",
    ).toBeGreaterThan(200);

    expect(
      offenders,
      "an order-flow reading's place on the glass is decided by its own owner " +
        "(see the OWNERS table above), not by a second generic overlay compiler. " +
        "If a reading needs a new shape, give it to the owner — do not copy it.",
    ).toEqual([]);
  });
});
