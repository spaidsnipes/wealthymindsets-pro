/**
 * THE TRADE DOOR IS PROMINENT, AND THE PHONE WAIT PLAQUE IS NOT UNDER THE SHEET.
 *
 * Founder order §6 (2026-10-09): "the TRADE control must be prominent… order
 * entry cannot be buried." Read on serving c9303a7: the door was a 75x26 outline
 * with 10.5px gold words on a 14% tint, the same weight as Desk and Watchlist.
 * Same read, 390x844: the selected object's WAIT plaque sat 100% under the
 * inspect sheet.
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const read = (rel: string) => readFileSync(path.join(process.cwd(), rel), "utf8");
const strip = read("src/components/chart/InstrumentContextStrip.tsx");
const css = read("src/app/globals.css");
const chart = read("src/components/chart/MainChart.tsx");

describe("the Trade door", () => {
  it("ANTI-VACUITY: the files were read", () => {
    expect(strip.length).toBeGreaterThan(2000);
    expect(css.length).toBeGreaterThan(50000);
    expect(chart.length).toBeGreaterThan(100000);
  });

  it("is the one filled control on the strip: brass fill, dark words, 12px, 30px tall", () => {
    const at = strip.indexOf('data-testid="context-trade"');
    expect(at).toBeGreaterThan(-1);
    const door = strip.slice(at, strip.indexOf("</button>", at));
    expect(door).toContain('className="wm-trade-door"');
    expect(door).toContain("background: GOLD");
    expect(door).toContain('color: "#14110a"');
    expect(door).toContain("minHeight: 30");
    expect(door).toContain('font: "800 12px/1');
    // Exactly one filled control: nothing else on the strip takes the solid brass.
    expect((strip.match(/background: GOLD\b/g) ?? []).length).toBe(1);
  });

  it("still opens the ticket itself — a button with the instrument in its name, never a link or a menu", () => {
    const at = strip.indexOf('data-testid="context-trade"');
    const door = strip.slice(strip.lastIndexOf("<button", at), strip.indexOf("</button>", at));
    expect(door).toContain("onClick={onTrade}");
    expect(door).toContain("aria-label={`Trade ${symbol}`}");
    expect(door).toContain("aria-pressed={tradeOpen}");
  });

  it("keeps its fill where the short-landscape rule paints strip buttons black, and when open", () => {
    expect(css).toMatch(/\.wm-instrument-context-strip > \.wm-trade-door \{\s*background-color: #c9a55c !important;\s*color: #14110a !important;/);
    expect(css).toMatch(/\.wm-trade-door\[aria-pressed="true"\] \{\s*background-color: #b08d45 !important;/);
    // Read after the short-landscape block, or that block's black wins.
    expect(css.indexOf(".wm-instrument-context-strip > .wm-trade-door {")).toBeGreaterThan(css.indexOf("background-color: #0b0a08 !important;"));
  });

  it("keeps the touch floor and first place on the phone bar", () => {
    expect(css).toMatch(/\[data-testid="context-trade"\] \{ order: -3;/);
    expect(css).toMatch(/\.wm-instrument-context-strip > button,\s*\.wm-instrument-context-strip > a \{ min-height: 44px !important; \}/);
  });
});

describe("phone: the selected object's WAIT plaque and the inspect sheet", () => {
  it("the retired CSS lift stays retired — placement is the chart's one owner (2026-10-10)", () => {
    expect(css).not.toContain('[data-h101-wait-plaque][data-h101-wait-plaque-spot="BELOW"]');
    expect(css).toContain("is RETIRED: the chart lane's plaque placement now");
  });
});
