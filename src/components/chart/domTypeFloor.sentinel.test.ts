/**
 * §16/§17 (Garden 18 v2): NO TINY TEXT ON THE TRADING SHELL — the DOM half.
 * The canvas floor lives in marketType.ts (MARKET_NUMBER_MIN_PX = 9). Measured
 * 2026-10-03: the rail's evidence chips were 8.5px and the shell carried 7–8px
 * labels (Chart Companion, vault pills, drawer chips). Nothing here may set an
 * inline fontSize, or a Tailwind text-[Npx], under 9.
 */
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";

const FILES = [
  "src/components/experience/DecisionSpineBand.tsx",
  "src/components/chart/ChartInspectTicket.tsx",
  "src/components/chart/NectarVaultChip.tsx",
  "src/components/experience/ChartCompanion.tsx",
  "src/components/experience/CanvasSummaryPill.tsx",
  "src/components/layout/HeaderVaultPill.tsx",
  "src/components/layout/MainLayout.tsx",
  "src/components/layout/MobileSessionPill.tsx",
  "src/components/os/WMOperatingSystem.tsx",
  "src/app/command-deck/page.tsx",
  "src/app/scanner/map/page.tsx",
  "src/components/command-deck/WhyInspector.tsx",
  "src/components/experience/BigTradeIntelligenceView.tsx",
  "src/components/experience/LivingProfileView.tsx",
  "src/components/chart/WatchlistRow.tsx",
  "src/components/chart/LeftSidebar.tsx",
  "src/components/marketData/ProviderWireStrip.tsx",
  "src/components/brand/RealmGateway.tsx",
];
const TINY = /fontSize:\s*([0-8](?:\.\d+)?)\s*[,}\s]|text-\[([0-8](?:\.\d+)?)px\]/g;

describe("DOM type floor on the trading shell", () => {
  it("the wordmark's sizes are at or above the floor", () => {
    const src = readFileSync(path.join(process.cwd(), "src/components/brand/WmWordmark.tsx"), "utf8");
    const sizes = [...src.matchAll(/\b(?:word|sub):\s*(\d+(?:\.\d+)?)/g)].map(m => Number(m[1]));
    expect(sizes.length).toBeGreaterThanOrEqual(6);
    expect(sizes.filter(n => n < 9)).toEqual([]);
  });

  it("no inline font under 9px", () => {
    let scannedSizes = 0;
    const offenders: string[] = [];
    for (const rel of FILES) {
      const src = readFileSync(path.join(process.cwd(), rel), "utf8");
      scannedSizes += (src.match(/fontSize:|text-\[\d/g) ?? []).length;
      for (const m of src.matchAll(TINY)) offenders.push(`${rel}: ${m[0].trim()}`);
    }
    // The sentinel proves it scanned (sentinelsProveTheyScanned).
    expect(scannedSizes).toBeGreaterThan(50);
    expect(offenders).toEqual([]);
  });
});
