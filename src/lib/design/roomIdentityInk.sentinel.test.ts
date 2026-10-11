import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

/**
 * ROOM IDENTITY ON HOUSE MATERIALS (G19 Universal Cinematic Law §2, house audit
 * 2026-10-10: Lounge and Academy painted tiers, rooms, chips, modules and levels in
 * third-party teal / blue / purple). Identity colour comes from the brass / ivory
 * ladder; green stays the market's word. The Lounge trade card's LONG / target ink
 * is market meaning and is the one allowed use left in that room.
 */
const read = (f: string) => readFileSync(path.join(process.cwd(), f), "utf8");
const SAAS = /#(00D4AA|4FA3E0|8B5CF6|00B4D8|06D6A0|00FFC2|FF6B9D)\b/gi;

describe("Lounge and Academy carry no third-party identity colours", () => {
  it("Creator programme: none at all", () => {
    const src = read("src/app/creator/page.tsx");
    expect(src.length).toBeGreaterThan(5_000);
    expect(src.match(SAAS) ?? []).toEqual([]);
    expect(src).not.toMatch(/79,163,224|0,212,170/);
  });
  it("Academy: none at all", () => {
    const src = read("src/app/education/page.tsx");
    expect(src.length).toBeGreaterThan(20_000);
    expect(src.match(SAAS) ?? []).toEqual([]);
  });
  it("Lounge: only the trade card's market colours", () => {
    const src = read("src/app/lounge/page.tsx");
    expect(src.length).toBeGreaterThan(20_000);
    const one = new RegExp(SAAS.source, "i");
    const lines = src.split("\n").filter(l => one.test(l));
    expect(lines.length).toBeGreaterThan(0);
    for (const l of lines) expect(l, l).toMatch(/trade_card/);
  });
});

describe("chart chrome's selected state is the house brass (drawing tools, rail, watchlist, asset switcher, toolbar)", () => {
  const CHROME = [
    "src/components/chart/WatchlistPanel.tsx",
    "src/components/chart/ChartToolbar.tsx",
    "src/components/chart/LeftDrawingSidebar.tsx",
    "src/components/chart/AssetClassSwitcher.tsx",
  ];
  for (const f of CHROME) {
    it(f, () => {
      const src = read(f);
      expect(src.length).toBeGreaterThan(2_000);
      expect(src.match(SAAS) ?? []).toEqual([]);
    });
  }
  it("Drawing Tools: only the trader's own drawing palette and its picker default keep those inks", () => {
    const src = read("src/components/chart/DrawingToolsPanel.tsx");
    expect(src.length).toBeGreaterThan(2_000);
    const one = new RegExp(SAAS.source, "i");
    const lines = src.split("\n").filter(l => one.test(l));
    expect(lines.length).toBe(2);
    expect(lines[0]).toContain('"#00D4AA","#4FA3E0","#F0B429","#FF4D6A","#8B5CF6",');
    expect(lines[1]).toContain('value={style.color.length === 7 ? style.color : "#00D4AA"}');
  });
});

describe("Chart Settings is a house room, not a charting-package navy", () => {
  it("no legacy navy / blue literal outside the defaults block; Done is the house primary", () => {
    const src = read("src/components/chart/ChartSettingsModal.tsx");
    expect(src.length).toBeGreaterThan(10_000);
    const start = src.indexOf("export const DEFAULT_CHART_SETTINGS");
    const end = src.indexOf("\n};", start);
    const ui = src.slice(0, start) + src.slice(end);
    expect(ui.match(/#(263050|8896BE|8b8fa8|141824|2F80ED|E2E8FF|4A5580|C7D0E8|0B0E1A)\b|rgba\(47,128,237/gi) ?? []).toEqual([]);
    expect(src).toMatch(/<button onClick=\{onClose\} style=\{\{\s*\.\.\.WM_PRIMARY_ACTION,/);
  });
});

