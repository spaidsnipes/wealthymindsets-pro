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
    expect(DASH).toContain("{compareSheetNode}");
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
