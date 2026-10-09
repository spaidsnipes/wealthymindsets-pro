/**
 * ⓘ CLAIMS — the chart's own help text is a SURFACE, and it must not claim
 * what the tape cannot support.
 *
 * Moved 2026-10-08 from `components/chart/indicatorDescriptions.claims.test.ts`
 * when that second description table was retired (ONE DEFINITION: the ⓘ
 * registry — `inventionEducation`, `indicatorEducation`, `surfaceEducation` —
 * and the catalogue's own one-liners are the surviving owners). Every claim
 * the old file guarded is guarded here against those owners.
 *
 * `truthResolutionMatrix` marks INSTITUTIONAL_INTENT as DISALLOWED at every
 * resolution: motive and participant identity are not observable from trades.
 * The premise is DERIVED from the matrix, so if the rule is ever abandoned the
 * premise test fails first.
 */
import { readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { describe, expect, it } from "vitest";

import { evaluateClaim, RESOLUTION_LADDER } from "@/lib/marketData/truthResolutionMatrix";
import { educationFor } from "@/lib/chart/inventionEducation";
import { INDICATOR_EDUCATION } from "@/lib/chart/indicatorEducation";
import { SMART_MONEY_EDUCATION } from "@/lib/chart/surfaceEducation";

const REPO_ROOT = resolve(__dirname, "..", "..", "..");
function stripComments(src: string): string {
  return src.replace(/\/\*[\s\S]*?\*\//g, " ").replace(/(^|[^:])\/\/.*$/gm, "$1");
}
const text = (id: string) => {
  const e = educationFor(id) as unknown as Record<string, string> | null;
  expect(e, id).toBeTruthy();
  return Object.entries(e!).filter(([k]) => k !== "canon").map(([, v]) => v).join(" ");
};
const footprint = stripComments(readFileSync(join(REPO_ROOT, "src/components/chart/FootprintControls.tsx"), "utf8"));
const catalogueDesc = (id: string) => {
  const m = new RegExp(`id: "${id}",\\s*label: "[^"]*",\\s*desc: "([^"]*)"`).exec(footprint);
  expect(m, `footprint catalogue row "${id}" not found`).toBeTruthy();
  return m![1];
};

describe("ⓘ text does not claim participant identity or motive", () => {
  it("PREMISE: the matrix still forbids INSTITUTIONAL_INTENT at every resolution", () => {
    for (const res of RESOLUTION_LADDER) {
      const d = evaluateClaim("INSTITUTIONAL_INTENT", res);
      expect(d.allowed, `INSTITUTIONAL_INTENT became allowed at ${res}`).toBe(false);
      expect(d.softened, "a motive claim must be suppressed, never softened").toBeNull();
    }
  });

  it("Big Trades describes measured SIZE, not who placed it or why", () => {
    const big = `${text("FP_big-trades")} ${catalogueDesc("big-trades")}`;
    expect(big).not.toMatch(/institutional/i);
    expect(big).not.toMatch(/accumulation|distribution/i);
    // ANTI-VACUITY: the measured facts survive.
    expect(big).toMatch(/notional/i);
    expect(big).toMatch(/rolling baseline/i);
    expect(big).toMatch(/\bside\b/i);
    // And it says what it CANNOT see.
    expect(big).toMatch(/participant identity|does not say who/i);
  });

  it("Imbalance does not assert positioning the overlay cannot observe", () => {
    const imb = `${text("FP_imbalance")} ${catalogueDesc("imbalance")}`;
    expect(imb, "Imbalance claims trapped traders from a bid/ask ratio").not.toMatch(/trapped/i);
    // ANTI-VACUITY: the measured threshold survives.
    expect(imb).toMatch(/2\.5×|2\.5x/);
  });

  it("no indicator or Smart Money record names an actor behind the prints", () => {
    for (const [k, v] of [...Object.entries(INDICATOR_EDUCATION), ...Object.entries(SMART_MONEY_EDUCATION)]) {
      const s = Object.entries(v).filter(([f]) => f !== "canon").map(([, x]) => String(x)).join(" ");
      expect(s, k).not.toMatch(/institution|smart money (is|are)|whales?\b/i);
    }
  });

  it("the panel that already answers these questions honestly still does", () => {
    const panel = stripComments(readFileSync(join(REPO_ROOT, "src/components/smart-money/SmartMoneyPanel.tsx"), "utf8"));
    expect(panel).toMatch(/"Trapped Traders",\s*value:\s*"N\/A/);
    expect(panel).toMatch(/"Dark Pool Prints",\s*value:\s*"N\/A/);
  });
});
