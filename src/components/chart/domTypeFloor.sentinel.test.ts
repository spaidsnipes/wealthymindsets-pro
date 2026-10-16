/**
 * §16/§17 (Garden 18 v2): NO TINY TEXT ON THE TRADING SHELL — the DOM half.
 * The canvas floor lives in marketType.ts (MARKET_NUMBER_MIN_PX = 9). Measured
 * 2026-10-03: the rail's evidence chips were 8.5px and the shell carried 7–8px
 * labels (Chart Companion, vault pills, drawer chips). Nothing here may set an
 * inline fontSize, or a Tailwind text-[Npx], under 9.
 */
import { describe, expect, it } from "vitest";
import { readdirSync, readFileSync } from "node:fs";
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

  /*
    PHONE GLASS FLOOR = 11px (ruling 2026-10-09). 9px stays the floor at tablet
    and desktop (the test above). Measured on serving f9f61fe at 390x844: 71
    DOM text nodes under 11px on /charts, nearly all inline 9 / 9.5 / 10 /
    10.5px. The floor is one stylesheet block at <=430px that lifts each way a
    sub-11 size is written; this locks that block and its one stated exception.
  */
  /*
    PLATE 21 (Garden 19 finish line, Founder 2026-10-15): "nothing below 13px anywhere, no
    exceptions". Measured on serving 3d35aeb, /charts desk: 93 of 101 visible text nodes were
    9–12px. The phone (11px) and tablet-drawer (11px) floors are subsumed by ONE global block,
    read last, at every width. CSS cannot select by computed size, so the floor is exact only if
    every size the source WRITES is one the rule names — the walk below keeps that true.
  */
  describe("plate 21: the DOM type floor is 13px at every width", () => {
    const css = readFileSync(path.join(process.cwd(), "src/app/globals.css"), "utf8");
    const at = css.indexOf("PLATE 21 · NOTHING UNDER 13px, ANYWHERE");
    const block = css.slice(at);
    const SIZES = ["7px", "7.5px", "8px", "8.5px", "9px", "9.5px", "10px", "10.5px", "11px", "11.5px", "12px", "12.5px"];

    it("the floor block exists, is the last block in the stylesheet, and has no media query", () => {
      expect(at).toBeGreaterThan(-1);
      expect(block).not.toMatch(/@media/);
      expect((block.match(/font-size: 13px !important;/g) ?? []).length).toBe(1);
    });

    it("every sub-13 size is lifted — inline (both serialisations), the font: shorthand, and Tailwind", () => {
      for (const size of SIZES) {
        expect(block, size).toContain(`[style*="font-size: ${size}"]`);
        expect(block, size).toContain(`[style*="font-size:${size}"]`);
        expect(block, size).toContain(`[style*=" ${size}/"]`);
        expect(block, size).toContain(`[style*=" ${size} /"]`);
        expect(block, size).toContain(`.text-\\[${size.replace(".", "\\.")}\\]`);
      }
      expect(block).toContain(".text-xs");
    });

    it("no stylesheet declaration outside the block sets a size under 13px", () => {
      const head = css.slice(0, at);
      expect(head.match(/font-size:\s*(?:7|7\.5|8|8\.5|9|9\.5|10|10\.5|11|11\.5|12|12\.5)px/g) ?? []).toEqual([]);
      expect(head.match(/font:\s*(?:italic\s+)?\d{3}\s+(?:9|9\.5|10|10\.5|11|11\.5|12|12\.5)px/g) ?? []).toEqual([]);
    });

    it("no DOM size under 13px anywhere in src slips past the rule", () => {
      const SIZE = /fontSize:\s*"?(\d+(?:\.\d+)?)(?:px)?"?\s*[,}\s]|text-\[(\d+(?:\.\d+)?)px\]|font:\s*[`"'][^`"']*?\s(\d+(?:\.\d+)?)px\s*\//g;
      const walk = (dir: string): string[] => readdirSync(dir, { withFileTypes: true }).flatMap(e =>
        e.isDirectory() ? walk(path.join(dir, e.name)) : e.name.endsWith(".tsx") && !e.name.includes(".test.") ? [path.join(dir, e.name)] : []);
      const files = walk(path.join(process.cwd(), "src"));
      const named = SIZES.map(s => Number(s.replace("px", "")));
      let scanned = 0;
      const offenders: string[] = [];
      for (const f of files) {
        for (const m of readFileSync(f, "utf8").matchAll(SIZE)) {
          const n = Number(m[1] ?? m[2] ?? m[3]);
          if (!(n < 13)) continue;
          scanned++;
          if (!named.includes(n)) offenders.push(`${path.relative(process.cwd(), f)}: ${m[0].trim()}`);
        }
      }
      expect(files.length).toBeGreaterThan(250);
      expect(scanned).toBeGreaterThan(1000);
      expect(offenders).toEqual([]);
    });
  });
});
