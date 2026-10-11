import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

/**
 * A PHONE IS NOT A SMALL DESK (Founder, 2026-10-11): on a phone portrait in the market room the
 * masthead is ONE row (monogram · three doors · four utilities), the LIVE-and-established feed
 * reading stands down (the symbol row says it), and hover-only desk chips leave the glass.
 */
const CSS = readFileSync(path.join(process.cwd(), "src/app/globals.css"), "utf8");
const block = CSS.slice(CSS.indexOf("/* ══ A PHONE IS NOT A SMALL DESK"));

describe("phone portrait market room", () => {
  it("reads the stylesheet", () => {
    expect(CSS.length).toBeGreaterThan(50_000);
    expect(block.length).toBeGreaterThan(1_000);
  });
  it("is scoped to phone portrait and the market room", () => {
    expect(block).toContain("@media (max-width: 639px) and (min-height: 521px) {");
    expect(block).toContain('body:has(.wm-chart-market-pane[data-market-primary="true"]) .wm-os-masthead.wm-os-masthead {');
  });
  it("one row: the word mark steps back to the monogram, plate marks go, doors keep a 44px target", () => {
    expect(block).toContain('[data-testid="os-identity"] .wm-wordmark span { display: none !important; }');
    expect(block).toContain(".wm-os-equipment-plate-mark { display: none !important; }");
    expect(block).toMatch(/:is\(\.wm-os-equipment-plate, \.wm-os-market-rooms\) \{[^}]*min-height: 44px !important;/);
  });
  it("the feed reading stands down ONLY while LIVE and established; any other tone keeps its row", () => {
    expect(block).toContain('.wm-os-feed-standing[data-tone="LIVE"][data-established="true"] { display: none !important; }');
    expect(block).toContain(".wm-os-feed-standing.wm-os-feed-standing { order: 3; flex: 1 0 100% !important;");
  });
  it("hover-only desk chips leave the phone glass", () => {
    expect(block).toContain('.wm-chart-market-pane[data-market-primary="true"] button[aria-label="Data window"]');
    expect(block).toContain('.wm-chart-market-pane[data-market-primary="true"] .wm-nectar-vault-chip { display: none !important; }');
  });
});

describe("the phone's timeframe is a row of one-tap rungs", () => {
  const CHIP = readFileSync(path.join(process.cwd(), "src/components/chart/TimeframeGlassChip.tsx"), "utf8");
  it("reads the chip", () => { expect(CHIP.length).toBeGreaterThan(2_000); });
  it("rungs come from the registry; ⋯ opens the same menu; hidden from 640 up", () => {
    expect(CHIP).toContain("{PHONE_QUICK_TF.map(id => (");
    expect(CHIP).toContain('className="wm-tf-quick wm-tf-quick--more wm-tap-slop" aria-haspopup="true"');
    expect(CSS).toContain(".wm-tf-quickrow { display: none; }");
    expect(block).toContain('.wm-chart-market-pane[data-market-primary="true"] .wm-tf-quickrow {');
    expect(block).toContain('.wm-tf-quick--more { position: sticky; right: 0; }');
  });
});

describe("one price on the phone screen — the quote header owns it, big, with its change", () => {
  const DASH = readFileSync(path.join(process.cwd(), "src/components/chart/ChartsDashboard.tsx"), "utf8");
  it("the symbol row's price copy steps back on a phone; the legend carries price + change", () => {
    expect(DASH.length).toBeGreaterThan(50_000);
    expect(DASH).toContain('<span className="wm-chart-header-price" style={{');
    expect(block).toContain(".wm-chart-market-summary .wm-chart-header-price { order: 9; flex: 1 0 100%; font-size: 26px !important;");
    expect(block).toContain(':is([data-chart-identity], [data-legend-group="price"]) { display: none !important; }');
  });
  it("Backtest stacks setup above results on a phone (results were a ~30px column)", () => {
    const bt = readFileSync(path.join(process.cwd(), "src/app/backtesting/page.tsx"), "utf8");
    expect(bt.length).toBeGreaterThan(10_000);
    expect(bt).toContain('{mainTab === "backtest" && <div className="flex-1 min-h-0 flex flex-col overflow-y-auto md:flex-row md:overflow-hidden">');
    expect(bt).toContain('<div className="w-full md:w-72 border-b md:border-b-0 md:border-r border-wm-border');
  });
  it("WM TV and the Creator tiers stack on a phone (they were ~40px columns)", () => {
    const tv = readFileSync(path.join(process.cwd(), "src/app/tv/page.tsx"), "utf8");
    const creator = readFileSync(path.join(process.cwd(), "src/app/creator/page.tsx"), "utf8");
    expect(tv).toContain('<div className="flex flex-col md:flex-row h-full overflow-hidden">');
    expect(creator).toContain('<div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-12">');
  });
  it("the app bar steps aside while the keyboard is up", () => {
    expect(block).toContain('textarea, [contenteditable="true"]):focus) .wm-mobile-tabbar { display: none !important; }');
  });
  it("the Lounge's banner is short on a phone and its circle / badges stay on /profile there", () => {
    const lounge = readFileSync(path.join(process.cwd(), "src/app/lounge/page.tsx"), "utf8");
    expect(lounge).toContain('<div className="relative h-[96px] md:h-[156px]" style={{');
    expect(lounge).toContain('<div className="mt-3 hidden md:flex flex-col lg:flex-row lg:items-end gap-3">');
  });
  it("the phone chart is a framed glass panel; volume is the bottom 12% and the profile 11%", () => {
    expect(block).toContain("margin-inline: 6px !important; border: 1px solid rgba(212,175,55,0.22) !important; border-radius: 14px !important;");
    const chart = readFileSync(path.join(process.cwd(), "src/components/chart/MainChart.tsx"), "utf8");
    expect(chart).toContain("function volumeTopMargin(paneWidthPx: number): number { return phonePane(paneWidthPx) ? 0.88 : 0.78; }");
    expect(chart).toContain('chart.priceScale("vol").applyOptions({ scaleMargins: { top: volumeTopMargin(paneW), bottom: 0 } });');
  });
  it("narrow glass withholds the two per-bar inks that smeared phone candles, and counts them as silent", () => {
    const chart = readFileSync(path.join(process.cwd(), "src/components/chart/MainChart.tsx"), "utf8");
    expect(chart).toContain('ds.absorptionTerrain = "SILENT:NARROW_GLASS";');
    expect(chart).toContain('const dlNarrowSilent = narrowGlass && layerOnRef.current.deltaLevels && att.paints("deltaLevels");');
    expect(chart).toContain("const vcNarrowSilent = narrowGlass && layerOnRef.current.valueCandle && att.paints(\"valueCandle\");");
  });
  it("a 360px phone keeps every timeframe rung in view", () => {
    expect(block).toContain('@media (max-width: 379px) {\n    .wm-chart-market-pane[data-market-primary="true"] .wm-tf-quickrow { gap: 2px; }');
  });
  it("a full-screen sheet starts below the clock when opened from the Home Screen", () => {
    expect(block).toContain("box-sizing: border-box !important; padding-top: env(safe-area-inset-top, 0px) !important;");
  });
  it("the price is the big number; its qualifier (LAST 5m BAR CLOSE) stays beside it, small", () => {
    expect(DASH).toContain('<span className="wm-chart-header-price-note">');
    expect(block).toContain(".wm-chart-header-price-note { font-size: 11px;");
  });
});

describe("the phone app bar", () => {
  const BAR = readFileSync(path.join(process.cwd(), "src/components/mobile/MobileTabBar.tsx"), "utf8");
  it("presses the room's own controls — still one trade door", () => {
    expect(BAR.length).toBeGreaterThan(1_000);
    expect(BAR).toContain(`target: '[data-testid="context-trade"]', fallbackHref: \`\${INSTRUMENT_VIEW_ROUTE}?open=trade\`, primary: true`);
    expect(BAR).not.toMatch(/setTradeOpen|TradePanel/);
    expect(CSS).toContain(".wm-mobile-tabbar { display: none; }");
    expect(block).toContain('body:has(.wm-chart-market-pane[data-market-primary="true"]) .wm-instrument-context-strip { display: none !important; }');
  });
  it("the masthead leaves only while the feed is LIVE and established", () => {
    expect(block).toContain(':has(.wm-os-feed-standing[data-tone="LIVE"][data-established="true"]) .wm-os-masthead.wm-os-masthead { display: none !important; }');
  });
});

describe("every other room on a phone gets the compact header too", () => {
  it("monogram + doors + room name share a row; the lifecycle steps are one sideways row", () => {
    expect(block).toContain('body:not(:has(.wm-chart-market-pane[data-market-primary="true"])) .wm-os-masthead.wm-os-masthead {');
    expect(block).toContain('body:not(:has(.wm-chart-market-pane[data-market-primary="true"])) .wm-os-masthead-center {');
  });
});

describe("phone landscape is the chart", () => {
  it("the masthead leaves while LIVE and established; the legend's repeat steps back", () => {
    const land = CSS.slice(CSS.indexOf("/* PHONE LANDSCAPE IS THE CHART"));
    expect(land.length).toBeGreaterThan(200);
    expect(land).toContain("@media (max-height: 520px) and (max-width: 1023px) {");
    expect(land).toContain(':has(.wm-os-feed-standing[data-tone="LIVE"][data-established="true"]) .wm-os-masthead.wm-os-masthead { display: none !important; }');
  });
});

describe("one app bar in every room", () => {
  const OS = readFileSync(path.join(process.cwd(), "src/components/os/WMOperatingSystem.tsx"), "utf8");
  const DASH = readFileSync(path.join(process.cwd(), "src/components/chart/ChartsDashboard.tsx"), "utf8");
  it("the OS shell mounts the same bar; the four-door strip steps back where it stands", () => {
    expect(OS.length).toBeGreaterThan(20_000);
    expect(OS).toContain("{phoneDoorOnly ? null : <MobileTabBar />}");
    expect(block).toContain("body:has(.wm-mobile-tabbar) :is(.wm-os-phone-nav, .wm-mobile-nav) { display: none !important; }");
  });
  it("from another room, TRADE / Watchlist arrive at the chart and open once; opening sends nothing", () => {
    expect(DASH).toContain('if (want === "trade") setTradeOpen(true);');
    expect(DASH).toContain(`const target = want === "watchlist" ? '[data-testid="context-watchlist"]' : '[data-testid="os-market-rooms"]';`);
  });
});

