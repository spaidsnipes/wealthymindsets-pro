/**
 * Sheriff batch 6 (serving 2026-10-09): two doors in Chart tools › More.
 *   · Compare closed the menu and drew nothing at any width — its field lived
 *     only inside the hidden study row.
 *   · Price Alerts said "get notified" while nothing delivers a notification,
 *     and the Notifications drawer said nothing creates one.
 */
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { PRICE_ALERT_TRUTH } from "./AlertsPanel";

const read = (p: string) => readFileSync(p, "utf8");
const DASH = read("src/components/chart/ChartsDashboard.tsx");
const ALERTS = read("src/components/chart/AlertsPanel.tsx");
const PANELS = read("src/components/layout/shellPanels.tsx");

describe("Compare opens something at every width", () => {
  it("the field is one node, drawn in the study row OR in its own sheet", () => {
    expect(DASH).toContain("const compareFieldNode = compareOpen ? (");
    expect(DASH).toContain("{studyToolsOpen ? compareFieldNode : null}");
    expect(DASH).toContain("const compareSheetNode = compareOpen && !studyToolsOpen ? (");
    expect(DASH).toContain("createPortal(compareSheetNode, document.body)");
    // The field is not written twice.
    expect(DASH.split('placeholder="Search symbol…"').length - 1).toBe(1);
  });
});

describe("a price alert says what it is, in both places", () => {
  it("one sentence, no promise of delivery", () => {
    expect(PRICE_ALERT_TRUTH).toContain("saved in this browser only");
    expect(PRICE_ALERT_TRUTH).toContain("on-screen notice");
    expect(PRICE_ALERT_TRUTH).toContain("nothing is sent to your phone or email");
    expect(ALERTS).not.toMatch(/get notified/i);
    expect(ALERTS).toContain("{PRICE_ALERT_TRUTH}");
  });
  it("the Notifications drawer reads the same sentence", () => {
    expect(PANELS).toContain("{PRICE_ALERT_TRUTH}");
    expect(PANELS).not.toContain("Nothing creates a notification yet");
  });
});

describe("the indicator category chips are all reachable on a narrow glass", () => {
  it("they wrap below 1024px and under a coarse pointer instead of hiding behind an invisible scroll", () => {
    expect(read("src/components/chart/ChartToolbar.tsx")).toContain("overflow-x-auto shrink-0 max-[1023px]:flex-wrap [@media(pointer:coarse)]:flex-wrap");
  });
});

describe("every More-chart-tools item leaves the sheet, or acts in place (the class, not two doors)", () => {
  const TOOLBAR = read("src/components/chart/ChartToolbar.tsx");
  const start = TOOLBAR.indexOf('role="menu"');
  const end = TOOLBAR.indexOf("</ShellModalDrawer>", start);
  const menu = TOOLBAR.slice(start, end);
  // Each menu item's own press handler, in order.
  const handlers = [...menu.matchAll(/role="menuitem"[\s\S]*?onClick=\{\(\) => \{ ([^}]*) \}\}/g)].map(m => m[1]);

  it("the menu was found and its items scanned", () => {
    expect(start).toBeGreaterThan(-1);
    expect(handlers.length).toBeGreaterThanOrEqual(12);
  });
  it("one owner puts the sheet down", () => {
    expect(TOOLBAR).toContain("const leaveSheet = () => { setAdvancedOpen(false); onEquipmentClose?.(); };");
  });
  it("only the in-place Display mode toggle stays inside the sheet", () => {
    const staying = handlers.filter(h => !h.startsWith("leaveSheet();"));
    expect(staying).toEqual(["setAdvancedOpen(false); onAppearanceToggle();"]);
  });
  it("the nine doors named in the ruling all leave it", () => {
    for (const call of ["onReplay();", "onViews();", "onDOM();", "onDraw();", "onCapture();", "onJournalStats();", "onInstrumentProfile();", "onCompare();", "onAlerts();"]) {
      expect(handlers.some(h => h === `leaveSheet(); ${call}`), call).toBe(true);
    }
  });
  it("the dashboard no longer carries per-door copies of the rule", () => {
    expect(DASH).toContain("onCompare={() => setCompareOpen(o => !o)}");
    expect(DASH).toContain("onAlerts={() => setAlertsOpen(o => !o)}");
  });
});
