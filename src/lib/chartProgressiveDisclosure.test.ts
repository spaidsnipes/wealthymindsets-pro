import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const toolbar = readFileSync(resolve(process.cwd(), "src/components/chart/ChartToolbar.tsx"), "utf8");
const dashboard = readFileSync(resolve(process.cwd(), "src/components/chart/ChartsDashboard.tsx"), "utf8");
const chip = readFileSync(resolve(process.cwd(), "src/components/chart/TimeframeGlassChip.tsx"), "utf8");
const mainChart = readFileSync(resolve(process.cwd(), "src/components/chart/MainChart.tsx"), "utf8");

describe("chart progressive disclosure", () => {
  /**
   * ── RE-AIMED 2026-09-21 · THE TIMEFRAME IS STILL PRIMARY, JUST NOT HERE ───
   *
   * This case pinned `TIMEFRAMES.map` in `ChartToolbar.tsx`. That table and the
   * nine-chip strip it fed were DELETED this shift and the timeframe now lives
   * on the candle glass as one bottom-centre chip (canon F24 draws exactly one
   * bordered `1D` chip there; canon C-101 draws the market canvas with a price
   * axis right, a time axis bottom, and NOTHING above the candles).
   *
   * The LAW of this case is its own title — trading decision controls are
   * PRIMARY, not buried behind a disclosure — and the law is why the pin is
   * being moved rather than dropped. Dropping it would leave the product free
   * to file the timeframe into the Tools menu alongside "Pine workspace",
   * which is precisely the demotion this test exists to forbid.
   *
   * MEASURED at 1440 on 2026-09-21, and the reason the move is a REPAIR and
   * not just a relocation: `.wm-chart-toolbar` is `overflow-x: auto` with
   * `scrollbarWidth: "none"` and the pinned workspace strip overlaps it from
   * the right. The band rendered `1m 2m` and then stopped — SEVEN OF THE NINE
   * TIMEFRAMES WERE PAST THE END OF AN INVISIBLE SCROLLER. This assertion was
   * green throughout that, because `TIMEFRAMES.map` was in the source the whole
   * time. A control can be present, mapped, and mounted and still be primary
   * to nobody. So the replacement pins the thing source could not see before:
   * WHERE it is mounted.
   */
  it("keeps trading decision controls primary", () => {
    // The timeframe is still primary — on the glass, in its own layer, which
    // is the one place in this layout that cannot be clipped by a neighbour.
    expect(chip).toContain("CHART_TF_SHIPPED.map");
    expect(mainChart).toContain("<TimeframeGlassChip");
    // NOT demoted into the Tools disclosure. This is the failure mode the
    // title forbids, and it is now stated instead of implied.
    const menuStart = toolbar.indexOf('role="menu"');
    const menuEnd = toolbar.indexOf("</div>", menuStart);
    expect(toolbar.slice(menuStart, menuEnd)).not.toContain("imeframe");

    expect(toolbar).toContain("RTH — Regular Hours");
    expect(toolbar).toContain("Indicators");
    expect(toolbar).toContain("Connect brokers");
  });

  it("moves secondary chart utilities into one accessible tools menu", () => {
    expect(toolbar).toContain('aria-haspopup="menu"');
    expect(toolbar).toContain('role="menu"');
    expect(toolbar).toContain('role="menuitem"');
    expect(toolbar).toContain("Depth ladder");
    expect(toolbar).toContain("Flow &amp; studies");
    expect(toolbar).toContain("Pine workspace");
    expect(toolbar).toContain("Capture &amp; share");
    expect(toolbar).toContain("Watchlist");
    expect(toolbar).toContain("Drawing tools");
    expect(toolbar).toContain('aria-controls="wm-broker-connect"');
    expect(toolbar).toContain("onConnectBrokers();");
    expect(toolbar).toContain('aria-controls="chart-settings-modal"');
    expect(toolbar).toContain("<span>Appearance</span>");
    expect(toolbar).toContain("Display mode · {appearanceLabel");
  });

  it("keeps provider setup behind the persistent Tools doorway", () => {
    const menuStart = toolbar.indexOf('role="menu"');
    const menuEnd = toolbar.indexOf("</div>", menuStart);
    const brokerEntry = toolbar.indexOf("Connect brokers");
    expect(menuStart).toBeGreaterThan(-1);
    expect(brokerEntry).toBeGreaterThan(menuStart);
    expect(brokerEntry).toBeLessThan(menuEnd);
    expect(toolbar).not.toContain('aria-label="Connect one or more brokers"');
    expect(dashboard).toContain("openBrokerConnect(toolsTriggerRef.current)");
  });

  it("rehomes capture and share behind Tools without changing its drawer owner", () => {
    const menuStart = toolbar.indexOf('role="menu"');
    const menuEnd = toolbar.indexOf("</div>", menuStart);
    const menu = toolbar.slice(menuStart, menuEnd);
    expect(menu).toContain("onCapture();");
    expect(menu).toContain("Capture &amp; share");
    expect(menu).toContain('aria-haspopup="dialog"');
    expect(menu).toContain('aria-controls="chart-tools-sheet"');
    expect(dashboard).toContain("onCapture={() => openCaptureShare(toolsTriggerRef.current)}");
    expect(dashboard).toContain('title="Capture & share"');
    expect(dashboard).toContain("fallbackTriggerRef={captureFallbackTriggerRef}");
    expect(dashboard).not.toContain("wm-chart-tools-trigger");
    expect(dashboard).toMatch(/activeTab !== "Chart" && activeTab !== "Options"[\s\S]{0,700}?wm-chart-orientation-tools/);
    expect(dashboard).toContain("openCaptureShare(orientationToolsTriggerRef.current)");
    expect(dashboard).toMatch(/const openCaptureShare = useCallback\(\(trigger: HTMLButtonElement \| null\) => \{\s*captureFallbackTriggerRef\.current = trigger;\s*setToolsSheetOpen\(true\);/);
  });

  it("rehomes drawing tools behind Tools without forking drawing state", () => {
    const menuStart = toolbar.indexOf('role="menu"');
    const menuEnd = toolbar.indexOf("</div>", menuStart);
    const menu = toolbar.slice(menuStart, menuEnd);
    expect(menu).toContain("onDraw();");
    expect(menu).toContain("Drawing tools");
    expect(menu).toContain('aria-controls="chart-draw-sheet"');
    expect(dashboard).toContain("onDraw={() => openDrawingTools(toolsTriggerRef.current)}");
    expect(dashboard).toContain('title="Drawing tools"');
    expect(dashboard).toContain("fallbackTriggerRef={drawSheetTriggerRef}");
    expect(dashboard).not.toContain("wm-chart-draw-trigger");
    expect(dashboard).toMatch(/const openDrawingTools = useCallback\(\(trigger: HTMLButtonElement \| null\) => \{\s*drawSheetTriggerRef\.current = trigger;\s*setDrawSheetOpen\(true\);/);
  });

  it("rehomes the chart watchlist behind Tools while preserving a non-chart doorway", () => {
    const menuStart = toolbar.indexOf('role="menu"');
    const menuEnd = toolbar.indexOf("</div>", menuStart);
    const menu = toolbar.slice(menuStart, menuEnd);
    expect(menu).toContain("onWatchlist();");
    expect(menu).toContain("Watchlist");
    expect(menu).toContain('aria-controls="chart-watchlist-sheet"');
    expect(dashboard).toContain("onWatchlist={() => openWatchlist(toolsTriggerRef.current)}");
    expect(dashboard).toContain("fallbackTriggerRef={watchlistSheetTriggerRef}");
    expect(dashboard).toMatch(/activeTab !== "Chart" && activeTab !== "Options"[\s\S]{0,700}?wm-chart-orientation-tools/);
    expect(dashboard).toContain("openWatchlist(orientationToolsTriggerRef.current)");
    expect(dashboard).toMatch(/const openWatchlist = useCallback\(\(trigger: HTMLButtonElement \| null\) => \{\s*watchlistSheetTriggerRef\.current = trigger;\s*setWatchlistOpen\(true\);/);
  });

  it("collapses non-chart watchlist and capture utilities behind one doorway", () => {
    expect(dashboard).toContain('aria-label="Open secondary view tools"');
    expect(dashboard).toContain('role="menu"');
    expect(dashboard).toContain('aria-label="Secondary view tools"');
    expect(dashboard).toContain("openWatchlist(orientationToolsTriggerRef.current)");
    expect(dashboard).toContain("openCaptureShare(orientationToolsTriggerRef.current)");
    expect(dashboard).not.toContain("wm-chart-capture-fallback");
  });

  /**
   * REMAPPED 2026-09-19. The pinned string was
   * `aria-label="Symbol view category"` — the masthead VIEW select, removed
   * this shift as a destination picker that swapped the canvas without
   * touching the URL.
   *
   * The LAW is unchanged and is the reason this test exists: there is ONE
   * way back to Chart, not a bespoke "← Back to Chart" button bolted onto
   * each secondary view. The negatives below are the actual teeth and they
   * are untouched. The positive now names where the single way back lives.
   */
  it("uses one canonical view door instead of a duplicate back-to-chart control", () => {
    expect(dashboard).toContain('aria-controls="chart-views-sheet"');
    expect(dashboard).not.toContain('aria-label="Symbol view category"');
    expect(dashboard).not.toContain("← Back to Chart");
    expect(dashboard).not.toContain("onBack={() => setActiveTab");
  });

  it("keeps the dense flow and study strip closed until the trader asks for it", () => {
    expect(dashboard).toContain("studyToolsOpen && <div className=\"wm-chart-tools");
    expect(dashboard).toContain("onToggleStudyTools={() => setStudyToolsOpen(open => !open)}");
  });

  it("keeps unresolved infrastructure out of permanent chart chrome", () => {
    expect(dashboard).not.toContain("LIQUIDITY WEATHER · NOT WIRED");
    expect(dashboard).not.toContain("ROW · {chartPermission.verdict}");
    expect(dashboard).toContain("<CanvasSummaryPill");
    expect(dashboard).toContain("(narrowViewport || optionsOpen)");
    expect(dashboard).toContain("canvasSummary: (");
  });

  /**
   * ── REMAPPED FROM A SPELLING TO THE LAW ──────────────────────────────────
   * This used to assert `aria-label="Breadcrumb"`, which pinned the crumb's
   * SPELLING rather than the law it existed to serve. The law is the title of
   * this test: the GLOBAL SHELL owns product identity, and the dashboard
   * starts with CHART orientation — not with page navigation.
   *
   * The crumb violated the second half. `INSTRUMENT_VIEW_ROUTE` is `/charts`
   * and ChartsDashboard renders only on `/charts`, so the "Charts" crumb was
   * a Link to the page the reader was already on: page-nav chrome with no
   * destination. The Last Mile support doc §2 lists left page nav among the
   * automatic rejects, and the approved frame has no crumb row.
   *
   * So the negative below is now the tooth: the dashboard must not grow a
   * navigational landmark back. The positives that carry real orientation —
   * the symbol, the non-chart view name, the canvas verdict — are unchanged,
   * because those were never the problem.
   */
  it("lets the global shell own product identity and starts with chart orientation", () => {
    expect(dashboard).not.toContain('import WmWordmark from "@/components/brand/WmWordmark"');
    expect(dashboard).not.toContain("the trader's chart");
    expect(dashboard).not.toContain('aria-label="Breadcrumb"');
    expect(dashboard).toContain("{symbol}");
    expect(dashboard).toContain('{activeTab !== "Chart"');
    expect(dashboard).toContain("<CanvasSummaryPill");
    expect(dashboard).toContain("(narrowViewport || optionsOpen)");
    expect(dashboard).toContain("Market object passport");
    expect(dashboard).not.toContain("wm-chart-passport-trigger");
  });

  it("keeps the canonical WHY doorway operable across every symbol view", () => {
    expect(dashboard).toContain('aria-label={whyOpen ? "Close Decision Why" : "Open Decision Why"}');
    expect(dashboard).toMatch(/\{\(narrowViewport \|\| optionsOpen\) && \(chartCanvasVM\.decisionWhy \|\| chartPassportVM\.capturedAt !== null\) && \(/);
    expect(dashboard).toContain("whyTriggerRef.current = event.currentTarget");
    expect(dashboard).toContain("onOpenWhy: openWhyFrom");
    expect(dashboard).toContain('id="chart-decision-why"');
    expect(dashboard).toContain("fallbackTriggerRef={whyTriggerRef}");
    expect(dashboard).toMatch(/\{whyOpen && \(\s*<ShellModalDrawer/);
    expect(dashboard).not.toMatch(/\{whyOpen && \(activeTab === "Chart" \|\| activeTab === "Options"\) && \(/);
  });

  it("keeps the menu viewport-bound instead of extending the toolbar", () => {
    expect(toolbar).toContain('position: "fixed"');
    expect(toolbar).toContain("window.innerWidth - (rect?.right ?? window.innerWidth)");
  });
});
