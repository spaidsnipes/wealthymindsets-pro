import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { selectChannelCoverageHealth } from "./marketData/selectChannelCoverageHealth";

const page = fs.readFileSync(
  path.join(process.cwd(), "src/app/nectar/page.tsx"),
  "utf8",
);

const selector = fs.readFileSync(
  path.join(process.cwd(), "src/lib/marketData/selectChannelCoverageHealth.ts"),
  "utf8",
);

/**
 * Coverage-vocabulary Sentinel.
 *
 * The COLLECTING/STALE/UNAVAILABLE reduction moved out of /nectar/page.tsx and
 * into selectChannelCoverageHealth so the Vault Ribbon and the Session
 * Intelligence Strip share ONE writer (they previously disagreed: the ribbon
 * showed a gold "no gaps recorded" while the strip proved STALE 6/OBSERVING 0).
 *
 * This Sentinel follows the logic to its new home and additionally asserts the
 * BEHAVIOUR, not just the source text — a stronger guarantee than the original
 * string match, which a refactor could satisfy while still lying to the trader.
 */
describe("coverage activity vocabulary", () => {
  it("counts canonical COLLECTING channels as observing", () => {
    expect(selector).toContain('case "COLLECTING"');
    // The visible label must still exist on the page.
    expect(page).toContain('label="CHANNELS OBSERVING"');
    expect(selectChannelCoverageHealth([{ coverageState: "COLLECTING", gapCount: 0 }]).observing).toBe(1);
  });

  it("never invents a LIVE coverage state", () => {
    expect(page).not.toContain('coverageState === "LIVE"');
    expect(page).not.toContain('label="CHANNELS LIVE"');
    expect(selector).not.toContain('case "LIVE"');
    // COLLECTING must never be promoted into a LIVE claim.
    const h = selectChannelCoverageHealth([{ coverageState: "COLLECTING", gapCount: 0 }]);
    expect(h.verdict).toBe("OBSERVING");
    expect(JSON.stringify(h)).not.toContain("LIVE");
  });

  it("keeps stale, unavailable, and gap truth visible", () => {
    expect(selector).toContain('case "STALE"');
    expect(selector).toContain('case "UNAVAILABLE"');
    expect(page).toContain('label="COVERAGE GAPS"');
    expect(page).toContain('label="CHANNELS STALE"');
    expect(page).toContain('label="CHANNELS UNAVAILABLE"');

    const h = selectChannelCoverageHealth([
      { coverageState: "STALE", gapCount: 0 },
      { coverageState: "UNAVAILABLE", gapCount: 0 },
    ]);
    expect(h.stale).toBe(1);
    expect(h.unavailable).toBe(1);
  });

  it("both /nectar panels read the SAME reduction — no second writer", () => {
    // The page must not re-derive coverage counts with its own filters.
    expect(page).not.toMatch(/channels\.filter\(\s*c\s*=>\s*c\.coverageState/);
    // Both the ribbon tile and the strip must go through the selector.
    expect(page).toContain("selectChannelCoverageHealth");
    const uses = page.match(/selectChannelCoverageHealth\(/g) ?? [];
    expect(uses.length).toBeGreaterThanOrEqual(2);
  });

  it("an all-stale channel set can never render in a resolved tone", () => {
    const h = selectChannelCoverageHealth(
      Array.from({ length: 6 }, () => ({ coverageState: "STALE", gapCount: 0 })),
    );
    expect(h.tone).not.toBe("resolved");
    expect(h.detail).not.toContain("no gaps recorded");
  });
});
