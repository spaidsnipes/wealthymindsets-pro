import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

const raw = fs.readFileSync(
  path.join(process.cwd(), "src/components/command-deck/HeroTruth.tsx"),
  "utf8",
);
const src = raw
  .replace(/\/\*[\s\S]*?\*\//g, "")
  .replace(/(^|[^:])\/\/.*$/gm, "$1");

/**
 * HeroTruth null-state Sentinel — LIVING-PIXEL LAW.
 *
 * With no sealed canonical snapshot the strip rendered
 * "coverage 0 channels · unknowns 0". Both are fabricated zeros, and the
 * second inverts the truth: "unknowns 0" is the most reassuring number on the
 * strip and it appeared exactly when NOTHING had been resolved. No state means
 * we know nothing — it does not mean nothing is unknown.
 *
 * The sibling `session` field already degraded honestly to "unknown".
 */
describe("HeroTruth null-state honesty", () => {
  it("does not zero-fill coverage or unknowns", () => {
    expect(src).not.toContain("state?.coverage.length ?? 0");
    expect(src).not.toContain("state?.unknowns.length ?? 0");
  });

  it("degrades to an explicit unknown, matching the session field", () => {
    expect(src).toContain('state ? state.unknowns.length : "unknown"');
    expect(src).toContain('state?.session ?? "unknown"');
  });

  it("still renders real counts when state exists", () => {
    expect(src).toContain("${state.coverage.length} channel");
  });
});
