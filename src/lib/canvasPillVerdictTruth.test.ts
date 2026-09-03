import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { computeRightOfWay, type EvidenceDebt } from "@/lib/marketData/viewModels/decisionPermissionCompiler";

const raw = fs.readFileSync(
  path.join(process.cwd(), "src/components/experience/CanvasSummaryPill.tsx"),
  "utf8",
);
const pill = raw
  .replace(/\/\*[\s\S]*?\*\//g, "")
  .replace(/(^|[^:])\/\/.*$/gm, "$1");

/**
 * Canvas pill verdict-legibility Sentinel.
 *
 * Observed on prod /charts (BTC): "ACTION · 8 missing · 2 cleared".
 *
 * The two numbers have DIFFERENT owners:
 *   verdict  <- decision-chain evidence debt (what authorizes)
 *   missing  <- state.unknowns, i.e. unresolved canonical DIMENSIONS
 *
 * Canon rejection #1 (RightOfWay may never be ACTION while evidence debt has
 * missing nodes) was satisfied — chain debt was 0. But the pill read as a
 * direct contradiction, which is the same failure at the presentation layer.
 *
 * Fix is a relabel, not an authority change: unresolved dimensions are named
 * "unresolved" and the tooltip states they do not gate the verdict. These
 * tests lock BOTH the label and the underlying authorization invariant.
 */
describe("canvas pill verdict legibility", () => {
  it('does not label unresolved dimensions as "missing" beside a verdict', () => {
    expect(pill).not.toContain("} missing`");
    expect(pill).toContain("} unresolved`");
  });

  it("the tooltip states unresolved dimensions do not gate the verdict", () => {
    expect(pill).toContain("do not gate the verdict");
  });

  /* The real authorization invariant, unchanged by the relabel. */
  it("canon rejection #1 still holds: missing chain debt can never yield ACTION", () => {
    for (const missing of [1, 2, 5, 9]) {
      const debt: EvidenceDebt = {
        total: 10,
        resolved: 10 - missing,
        missing,
        warn: 0,
        missingLabels: ["regime", "direction"],
        warnLabels: [],
      };
      const r = computeRightOfWay(null, debt);
      expect(r.value).not.toBe("ACTION");
      expect(r.value).toBe("WAIT");
    }
  });

  it("zero chain debt does not itself fabricate ACTION without permission", () => {
    const debt: EvidenceDebt = {
      total: 8, resolved: 8, missing: 0, warn: 0,
      missingLabels: [], warnLabels: [],
    };
    // No permission supplied → must not invent authorization.
    expect(computeRightOfWay(null, debt).value).not.toBe("ACTION");
  });
});
