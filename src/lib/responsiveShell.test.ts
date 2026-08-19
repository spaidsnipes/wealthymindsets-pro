import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const source = (path: string) => readFileSync(resolve(__dirname, path), "utf8");

describe("responsive P0 command surfaces", () => {
  const css = source("../app/globals.css");

  it("replaces desktop rails with a focused mobile command bar", () => {
    const layout = source("../components/layout/MainLayout.tsx");
    expect(layout).toContain('className="wm-primary-sidebar"');
    expect(layout).toContain('className="wm-mobile-nav"');
    expect(layout).toContain('aria-label="Primary navigation"');
    expect(css).toContain("@media (max-width: 1023px)");
    expect(css).toContain(".wm-primary-sidebar,");
    expect(css).toContain(".wm-chart-watchlist,");
    expect(css).toContain(".wm-chart-dom,");
    expect(css).toContain(".wm-music-player,");
    expect(css).toContain(".wm-draw-rail");
    expect(css).toContain("(orientation: landscape)");
    expect(css).toContain("margin-left: calc(56px + env(safe-area-inset-left))");
    expect(css).toContain("border-right: 1px solid rgba(232,185,35,.18)");
  });

  it("keeps long-form Nectar and Command Deck surfaces vertically reachable", () => {
    const layout = source("../components/layout/MainLayout.tsx");
    expect(layout).toContain('pathname === "/nectar"');
    expect(layout).toContain('pathname.startsWith("/nectar/")');
    expect(layout).toContain('data-scroll-owner={documentScroll ? "shell" : "workspace"}');
    expect(layout).toContain('overflowY: documentScroll ? "auto" : "hidden"');
    expect(layout).toContain('{ position: "relative", minHeight: "100%" }');
  });

  it("does not force an installed phone into one orientation", () => {
    const manifest = JSON.parse(source("../../public/manifest.json"));
    expect(manifest.orientation).toBe("any");
  });

  it("keeps chart truth and navigation visible without stacking desktop chrome in phone landscape", () => {
    const dashboard = source("../components/chart/ChartsDashboard.tsx");
    const toolbar = source("../components/chart/ChartToolbar.tsx");
    expect(dashboard).toContain("wm-chart-tabs");
    expect(dashboard).toContain("wm-chart-tools");
    expect(toolbar).toContain("wm-chart-toolbar");
    expect(css).toContain(".wm-chart-page-tab,");
    expect(css).toContain('.wm-chart-dashboard [role="status"][aria-live="polite"]');
  });

  it("keeps scanner filters contextual and reduces the mobile result grid", () => {
    const scanner = source("../app/scanner/page.tsx");
    expect(scanner).toContain('className="wm-scanner-filters');
    expect(scanner).toContain('className="wm-scanner-header');
    expect(scanner).toContain("wm-scanner-mobile-secondary");
    expect(scanner).toContain('"wm-scanner-row grid');
    expect(scanner).toContain('matchMedia("(max-width: 639px)")');
    expect(css).toContain(".wm-scanner-row > :nth-child(n+6)");
  });

  it("makes journal list and detail mutually navigable on mobile", () => {
    const journal = source("../app/journal/page.tsx");
    expect(journal).toContain("wm-journal-list");
    expect(journal).toContain("wm-journal-detail");
    expect(journal).toContain("New journal entry");
    expect(journal).toContain("Back to journal");
    expect(css).toContain(".wm-mobile-hidden");
    expect(css).toContain(".wm-mobile-only");
  });
});
