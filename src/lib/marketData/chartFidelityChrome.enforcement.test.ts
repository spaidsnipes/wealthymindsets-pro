import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = path.resolve(process.cwd(), "src/components/chart");
const CSS = fs.readFileSync(path.resolve(process.cwd(), "src/app/globals.css"), "utf8");

describe("chart fidelity chrome", () => {
  it("keeps one visible workspace verdict while preserving standalone truth", () => {
    const dashboard = fs.readFileSync(path.join(ROOT, "ChartsDashboard.tsx"), "utf8");
    const chart = fs.readFileSync(path.join(ROOT, "MainChart.tsx"), "utf8");

    expect(dashboard).toContain("showFidelityChrome={false}");
    expect(chart).toContain("showFidelityChrome = true");
    expect(chart).toContain("showFidelityChrome ? (() =>");
    /**
     * What this line protects is a SHAPE, not a spelling: in the workspace
     * (`showFidelityChrome === false`) the badge still renders the standalone
     * freshness reading, and with chrome on it renders that reading PREFIXED
     * by the canonical verdict — one verdict, never two, and never a chrome
     * flag that silently deletes the reading underneath it.
     *
     * The reading itself used to be `LAST ${lastStr}` — a bar's OPENING time
     * wearing a last-update word, and unreadable as staleness without the
     * interval. It is now `feedRecency.glyph`, which names the verb and the
     * age in bars. That is a change of WORDING, not of this contract, so the
     * assertion is re-pinned to the new owner rather than deleted.
     */
    expect(chart).toContain(
      'showFidelityChrome ? `${status.label} · ${feedRecency.glyph}` : feedRecency.glyph',
    );
  });

  it("keeps the canonical verdict visible in the phone market header", () => {
    const dashboard = fs.readFileSync(path.join(ROOT, "ChartsDashboard.tsx"), "utf8");
    const badge = fs.readFileSync(path.resolve(process.cwd(), "src/components/marketData/CanonicalFidelityBadge.tsx"), "utf8");

    expect(dashboard).toContain('className="wm-chart-market-summary"');
    expect(dashboard).toContain('className="wm-chart-header-change"');
    expect(badge).toContain('className="wm-fidelity-badge wm-fidelity-badge--chrome"');
    expect(CSS).toContain(".wm-chart-market-summary .wm-chart-header-change");
    expect(CSS).toContain(".wm-chart-market-summary .wm-fidelity-badge--chrome");
  });
});
