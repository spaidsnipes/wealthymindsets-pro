import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

const SOURCE = fs.readFileSync(
  path.join(process.cwd(), "src/components/broker/AlpacaTradingPanel.tsx"),
  "utf8",
);

/**
 * Comments must be stripped before any absence assertion. A Sentinel that
 * forbids NAMING a defect punishes documenting it, and the comments in this
 * panel deliberately quote the failure they prevent.
 */
const CODE = SOURCE.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");

describe("Alpaca panel — position truth surface (§14.1)", () => {
  it("asks the reducer what is held instead of deciding for itself", () => {
    expect(CODE).toContain('from "@/lib/positionTruth"');
    expect(CODE).toContain("selectPositionTruth({");
    // The broker's own reconciliation must outrank any local view.
    expect(CODE).toContain("rank: RANK_RECONCILIATION");
  });

  it("records when the broker last actually reconciled", () => {
    expect(CODE).toContain("setPositionsAsOf(Date.now())");
    // The as-of stamp is only set on the success path; a failed refresh must
    // not be able to advance it.
    const success = CODE.indexOf("setPositionsAsOf(Date.now())");
    const failure = CODE.indexOf('setPositionsLoad("failed")');
    expect(success).toBeGreaterThan(-1);
    expect(failure).toBeGreaterThan(-1);
    expect(CODE).not.toContain('setPositionsLoad("failed"); setPositionsAsOf');
  });

  it("keeps held positions on screen when a refresh fails", () => {
    // The regression this locks: the failure branch used to be evaluated FIRST
    // and replaced the entire list, so a trader carrying risk saw an error box
    // where their position had been. A failure may reduce capability; it may
    // not remove the position from the screen.
    expect(CODE).not.toContain('positionsLoad === "failed" ? (');
    expect(CODE).toContain('{positionsLoad === "failed" && (');
    expect(CODE).toContain("Could not refresh positions.");
    expect(CODE).toContain("This is not a confirmation that you hold none.");
    expect(CODE).toContain("Last confirmed ${fmtClock(positionsAsOf)}");
  });

  it("renders the reducer's sentence rather than inventing its own wording", () => {
    expect(CODE).toContain("{truth.sentence}");
    expect(CODE).toContain('truth.confidence !== "CONFIRMED"');
  });

  it("does not paint an unverified position with a reassuring green (§9)", () => {
    // Green means safe, and safety is exactly what an unverified position is not.
    const caution = CODE.indexOf("const CAUTION =");
    expect(caution).toBeGreaterThan(-1);
    expect(CODE).toContain("style={{ color: CAUTION }}");
    expect(CODE).not.toContain("truth.confidence === \"CONFIRMED\" ? \"#00C076\"");
  });

  it("still refuses to claim an empty book it never observed", () => {
    // "No open positions" may only render on a non-failed load.
    const emptyState = CODE.indexOf('"No open positions"');
    expect(emptyState).toBeGreaterThan(-1);
    expect(CODE).toContain('positionsLoad === "pending" ? "Loading positions…" : "No open positions"');
  });
});
