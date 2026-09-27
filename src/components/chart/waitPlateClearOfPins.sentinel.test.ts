/**
 * H-101 · THE WAIT PLATE STAYS ON ITS EVENT, CLEAR OF PINS AND BODIES.
 *
 * Found in the Founder's own Chrome beside canon T-210 (serving, BTC 15m,
 * 1440, 2026-09-27): a MarketObject pin sat on the plate — it read "◆AIT".
 * Moving it sideways off the pin then parked it on older candle bodies, and a
 * wider slide put it ~250px from its bar on a long leader. The order now:
 * below, above, then farther rows in the SAME column, then slide — with every
 * pin and every body on those rows kept out.
 */
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const MC = readFileSync("src/components/chart/MainChart.tsx", "utf8");

describe("the WAIT plate's placement", () => {
  it("pins publish their diamonds for placers", () => {
    expect(MC).toContain("marketObjectPinRectsRef.current = projectedMarketObjects.map(");
  });
  it("the plate steps around pins and every body on its candidate rows", () => {
    expect(MC).toContain("blockers: [...floatingChips, ...marketObjectPinRectsRef.current],");
    expect(MC).toMatch(/placeClearOfKeepOut\(below, \[\.\.\.keepOut\(\), \.\.\.rowBodiesAt\(/);
  });
  it("tries farther rows on its own column before any sideways slide", () => {
    expect(MC).toContain("alternates: [above, ...fartherT],");
    expect(MC).toMatch(/const fartherT = \[1, 2, 3\]\.flatMap/);
  });
});
