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
  describe("phone glass (<= 430px): 11px", () => {
    const css = readFileSync(path.join(process.cwd(), "src/app/globals.css"), "utf8");
    const at = css.indexOf("PHONE GLASS: THE DOM TYPE FLOOR IS 11px");
    const block = css.slice(at);

    it("the floor block exists, is the last block in the stylesheet, and is scoped to 430px", () => {
      expect(at).toBeGreaterThan(-1);
      expect(block).toMatch(/@media \(max-width: 430px\) \{/);
      // Read after every other phone rule: nothing but this block follows it.
      expect((block.match(/@media/g) ?? []).length).toBe(1);
    });

    it("every sub-11 size the shell writes is lifted — inline (both serialisations) and Tailwind", () => {
      for (const size of ["9px", "9.5px", "10px", "10.5px"]) {
        expect(block, size).toContain(`[style*="font-size: ${size}"]`);
        expect(block, size).toContain(`[style*="font-size:${size}"]`);
        expect(block, size).toContain(`.text-\\[${size.replace(".", "\\.")}\\]`);
      }
      // …and through the `font:` shorthand (size + line-height slash), as the Desk writes it.
      for (const size of ["9px", "9.5px", "10px", "10.5px"]) {
        expect(block, size).toContain(`[style*=" ${size}/"]`);
        expect(block, size).toContain(`[style*=" ${size} /"]`);
      }
      expect((block.match(/font-size: 11px !important;/g) ?? []).length).toBe(4);
    });

    it("the owners that size by class or `font:` shorthand are named", () => {
      for (const owner of [".wm-fidelity-badge,", ".wm-chart-market-summary .wm-fidelity-badge--chrome,", ".wm-instrument-context-strip > :is(button, a),", ".wm-legend-recency-narrow,", ".wm-mobile-nav-link,", ".wm-chart-market-standing,", ".wm-chart-market-standing-label {"]) {
        expect(block, owner).toContain(owner);
      }
    });

    it("the one exception is the masthead feed reading, and it is stated", () => {
      expect((block.match(/:not\(\.wm-os-feed-standing/g) ?? []).length).toBe(5);
      expect(block).toContain("133 -> 144px");
      // No wider masthead exemption: the plate words take the floor.
      expect(block).not.toMatch(/:not\(\.wm-os-masthead/);
    });

    it("no DOM size under 11px anywhere in src slips past the phone rule (2026-10-10)", () => {
      // CSS cannot select by computed size, so the floor is exact only if every size the
      // source WRITES is one the rule names. Was a list of nine shell files, and only
      // 9–11px was checked: an 8.5px course tag (FabioInsights, on /education) and
      // 8px ON AIR tags (/lounge) painted under the floor at 390. Now: every .tsx in
      // src, every way a DOM size is written, every size under 11.
      const SIZE = /fontSize:\s*"?(\d+(?:\.\d+)?)(?:px)?"?\s*[,}\s]|text-\[(\d+(?:\.\d+)?)px\]|font:\s*[`"'][^`"']*?\s(\d+(?:\.\d+)?)px\s*\//g;
      const walk = (dir: string): string[] => readdirSync(dir, { withFileTypes: true }).flatMap(e =>
        e.isDirectory() ? walk(path.join(dir, e.name)) : e.name.endsWith(".tsx") && !e.name.includes(".test.") ? [path.join(dir, e.name)] : []);
      const files = walk(path.join(process.cwd(), "src"));
      let scanned = 0;
      const offenders: string[] = [];
      for (const f of files) {
        for (const m of readFileSync(f, "utf8").matchAll(SIZE)) {
          const n = Number(m[1] ?? m[2] ?? m[3]);
          if (!(n < 11)) continue;
          scanned++;
          if (![9, 9.5, 10, 10.5].includes(n)) offenders.push(`${path.relative(process.cwd(), f)}: ${m[0].trim()}`);
        }
      }
      // ANTI-VACUITY: the walk found the source tree and its many small sizes.
      expect(files.length).toBeGreaterThan(250);
      expect(scanned).toBeGreaterThan(1000);
      expect(offenders).toEqual([]);
    });
  });

  /*
    TABLET DRAWERS (431–900px) = 11px, Settings and Connect only (go 2026-10-09).
    Measured at 834: those two drawers lift cleanly; the whole glass does not
    (chart masthead 86 -> 105px, scanner names truncate). So the block is scoped
    by drawer id and must never widen to the glass without a new measurement.
  */
  describe("tablet drawers (431–900px): 11px inside Settings and Connect only", () => {
    const css = readFileSync(path.join(process.cwd(), "src/app/globals.css"), "utf8");
    const at = css.indexOf("TABLET (431–900px): THE SETTINGS AND CONNECT DRAWERS READ AT 11px");
    const end = css.indexOf("/* The thumb bar's end padding", at);
    const block = at > -1 && end > at ? css.slice(at, end) : "";

    it("the block exists, is read before the phone block, and carries one media query", () => {
      expect(at).toBeGreaterThan(-1);
      expect(block.length).toBeGreaterThan(200);
      expect(at).toBeLessThan(css.indexOf("PHONE GLASS: THE DOM TYPE FLOOR IS 11px"));
      expect(block).toContain("@media (min-width: 431px) and (max-width: 900px) {");
      expect((block.match(/@media/g) ?? []).length).toBe(1);
    });

    it("every rule in it is scoped to the two drawers — never the glass", () => {
      expect(block).toContain(":is(#wm-settings-drawer, #wm-broker-connect) :is(");
      // One declaration, under the one scoped selector.
      expect((block.match(/font-size: 11px !important;/g) ?? []).length).toBe(1);
      expect((block.match(/\{/g) ?? []).length).toBe(2); // the media query and the one rule
    });

    it("the drawers it names still carry those ids", () => {
      const settings = readFileSync(path.join(process.cwd(), "src/components/layout/shellPanels.tsx"), "utf8");
      const connect = readFileSync(path.join(process.cwd(), "src/components/broker/BrokerConnectPanel.tsx"), "utf8");
      expect(settings).toContain('id="wm-settings-drawer"');
      expect(connect).toContain('id="wm-broker-connect"');
    });

    it("it lifts the same four sizes, each way they are written", () => {
      for (const size of ["9px", "9.5px", "10px", "10.5px"]) {
        expect(block, size).toContain(`[style*="font-size: ${size}"]`);
        expect(block, size).toContain(`[style*="font-size:${size}"]`);
        expect(block, size).toContain(`[style*=" ${size}/"]`);
        expect(block, size).toContain(`.text-\\[${size.replace(".", "\\.")}\\]`);
      }
    });
  });
});
