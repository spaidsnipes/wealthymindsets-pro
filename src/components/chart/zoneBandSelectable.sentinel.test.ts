/**
 * R-19 · A ZONE'S BAND IS AS SELECTABLE AS ITS PIN.
 *
 * Serving (2026-09-25, GP12 [S1]): "a zone click landed on the bar ticket
 * instead". The band was painted but only its 28px pin could be clicked, so a
 * click on the band fell through and Inspect stayed on the bar under the
 * cursor. The paint loop now records each band it drew; the click handler
 * selects that zone through the same callback as the pin.
 *
 * A breadcrumb, not a renderer. It reads source.
 */
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";

const CHART = readFileSync(path.join(process.cwd(), "src/components/chart/MainChart.tsx"), "utf8");

describe("zone band selection", () => {
  it("records the band from this frame's paint, cleared with the glass", () => {
    expect(CHART).toContain("zoneHitsRef.current.push({ objectId: z.object.objectId, x: x0, y: top, w: zEnd - x0, h });");
    expect(CHART).toContain("zoneHitsRef.current = [];");
  });

  it("a click inside a painted band selects that zone via the pin's own callback", () => {
    expect(CHART).toMatch(/const zoneHit = zoneHitsRef\.current/);
    expect(CHART).toMatch(/if \(zoneHit\) \{\s*onSelectMarketObject\?\.\(zoneHit\.objectId\);\s*return;/);
  });
});
