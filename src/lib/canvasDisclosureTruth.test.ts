import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

const read = (p: string) => fs.readFileSync(path.join(process.cwd(), p), "utf8");
const panel = read("src/components/experience/MarketCanvasPanel.tsx");
const pill = read("src/components/experience/CanvasSummaryPill.tsx");

/**
 * Market Canvas disclosure Sentinel — coverage non-disclosure class.
 *
 * The panel rendered `vm.blockers.slice(0, 6)`. The header did disclose the
 * COUNT ("Why not (8)"), but the 7th and 8th blockers were unreadable. On a
 * decision surface a blocker you cannot read is a blocker you cannot clear,
 * and blockers are the reasons not to put money at risk.
 *
 * The summary pill truncated blockers, invalidators and missing dimensions to
 * a fixed head with no marker at all, so a partial list read as a complete one.
 */
describe("market canvas blocker disclosure", () => {
  it("renders every blocker rather than a head of six", () => {
    expect(panel).not.toContain("vm.blockers.slice(0, 6)");
    expect(panel).toContain("{vm.blockers.map((b, i) => (");
  });

  it("still discloses the remainder for the affirmative list", () => {
    // Clearances stay capped — hiding a PASSED check is a coverage issue, not
    // a safety one — but the count withheld must be stated.
    expect(panel).toContain("vm.clearances.length > 6");
    expect(panel).toContain("more cleared, not shown");
  });
});

describe("canvas summary pill disclosure", () => {
  it("marks every truncated list with its remainder", () => {
    expect(pill).toContain("more — open the canvas");
    expect(pill).toContain("const withRemainder");
  });

  it("no list is sliced without going through the disclosing helper", () => {
    expect(pill).not.toContain("vm.blockers.slice(0, 3).map");
    expect(pill).not.toContain("vm.invalidators.slice(0, 3).map");
    expect(pill).not.toContain("vm.missing.slice(0, 4).map");
  });

  it("names the full count in the tooltip heading", () => {
    expect(pill).toContain("`Why not (${vm.blockers.length}):`");
    expect(pill).toContain("`Would invalidate (${vm.invalidators.length}):`");
  });
});
