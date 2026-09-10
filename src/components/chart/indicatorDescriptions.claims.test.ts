/**
 * indicatorDescriptions.claims — the chart's own help text is a SURFACE, and
 * it was making claims the tape cannot support.
 *
 * `truthResolutionMatrix` marks INSTITUTIONAL_INTENT as DISALLOWED at EVERY
 * resolution, because motive and participant identity are not observable from
 * trades no matter how good the feed gets. SmartMoneyPanel obeys that: it
 * renders "Trapped Traders: N/A — needs positioning data" and "Dark Pool
 * Prints: N/A". But the "?" modal on the chart, two clicks away, described the
 * Big Trades bubbles as "institutional-sized order flow" and told the trader
 * that clusters "signal institutional accumulation".
 *
 * The matrix could not stop it, because a static copy table has no source
 * class to evaluate — `evaluateClaim` gates a RENDER against a FEED, and this
 * text is neither. So the rule needed an enforcement surface of its own. This
 * file is that surface, and it DERIVES its premise from the matrix rather than
 * restating it: if INSTITUTIONAL_INTENT ever becomes allowable, the premise
 * test fails first and loudly, instead of this file quietly enforcing a rule
 * its owner has abandoned.
 *
 * SCOPE, stated so the next reader does not think it was missed:
 * this guards claims about WHAT THE DRAWN FEATURE IS. General market education
 * ("institutions benchmark to VWAP", "the 200 EMA is watched as institutional
 * support") is a statement about how the instrument is used by participants at
 * large, not a claim about the current tape, and is deliberately left alone.
 */

import { readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { describe, expect, it } from "vitest";

import { evaluateClaim, RESOLUTION_LADDER } from "@/lib/marketData/truthResolutionMatrix";

const REPO_ROOT = resolve(__dirname, "..", "..", "..");
const FILE = "src/components/chart/indicatorDescriptions.ts";

/** Judge the COPY, not the comments that explain why the copy changed. */
function stripComments(src: string): string {
  return src.replace(/\/\*[\s\S]*?\*\//g, " ").replace(/(^|[^:])\/\/.*$/gm, "$1");
}

const source = stripComments(readFileSync(join(REPO_ROOT, FILE), "utf8"));

/** Pull one authored entry's five strings out of the table. */
function entry(name: string): string {
  const i = source.indexOf(`"${name}": {`);
  expect(i, `authored entry "${name}" not found — was it renamed?`).toBeGreaterThan(-1);
  const end = source.indexOf("\n  },", i);
  return source.slice(i, end);
}

describe("indicator help text does not claim participant identity or motive", () => {
  it("PREMISE: the matrix still forbids INSTITUTIONAL_INTENT at every resolution", () => {
    // Derived, not restated. The rule below only makes sense while this holds.
    for (const res of RESOLUTION_LADDER) {
      const d = evaluateClaim("INSTITUTIONAL_INTENT", res);
      expect(d.allowed, `INSTITUTIONAL_INTENT became allowed at ${res}`).toBe(false);
      expect(d.softened, "a motive claim must be suppressed, never softened").toBeNull();
    }
  });

  it("Big Trades describes measured SIZE, not who placed it or why", () => {
    const big = entry("Big Trades");
    expect(big, "Big Trades calls the bubbles institutional").not.toMatch(/institutional/i);
    expect(big, "Big Trades reads clusters as accumulation/distribution by an actor")
      .not.toMatch(/accumulation|distribution/i);

    // ANTI-VACUITY. "Delete the description" must not pass this file: the
    // measured facts — notional size against a rolling baseline, and the side —
    // are the useful part and have to survive.
    expect(big).toMatch(/notional/i);
    expect(big).toMatch(/rolling baseline/i);
    expect(big).toMatch(/\bside\b/i);
    // And it must say what it CANNOT see, not merely stop saying it can.
    expect(big, "Big Trades no longer names the limit it is honest about")
      .toMatch(/participant identity|does not say who/i);
  });

  it("Imbalance does not assert positioning the overlay cannot observe", () => {
    const imb = entry("Imbalance");
    // The panel declines this exact question: "Trapped Traders: N/A — needs
    // positioning data". The overlay's help text must not answer it anyway.
    expect(imb, "Imbalance claims trapped traders from a bid/ask ratio")
      .not.toMatch(/trapped/i);
    // ANTI-VACUITY: the measured threshold survives.
    expect(imb).toMatch(/2\.5×|2\.5x/);
  });

  it("the panel that already answers these questions honestly still does", () => {
    // If SmartMoneyPanel ever starts ASSERTING trapped positioning or dark-pool
    // prints, the contradiction this atom closed reopens from the other end.
    const panel = stripComments(
      readFileSync(join(REPO_ROOT, "src/components/smart-money/SmartMoneyPanel.tsx"), "utf8"),
    );
    expect(panel).toMatch(/"Trapped Traders",\s*value:\s*"N\/A/);
    expect(panel).toMatch(/"Dark Pool Prints",\s*value:\s*"N\/A/);
  });
});
