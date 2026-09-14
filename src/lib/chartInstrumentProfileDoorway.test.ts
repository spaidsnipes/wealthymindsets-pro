import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const read = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");
const dashboard = read("src/components/chart/ChartsDashboard.tsx");
const toolbar = read("src/components/chart/ChartToolbar.tsx");

describe("/charts instrument profile is disclosed, not permanent frame chrome", () => {
  it("removes the unlabeled 14px edge toggle from MARKET", () => {
    expect(dashboard).not.toContain('title={infoOpen ? "Collapse info panel" : "Expand info panel"}');
    expect(dashboard).not.toContain("width:14,");
  });

  it("keeps the existing panel behind a written Tools doorway", () => {
    expect(dashboard).toContain("onInstrumentProfile={!narrowViewport || !optionsOpen");
    expect(dashboard).toContain("instrumentProfileActive={(!narrowViewport || !optionsOpen) && infoOpen}");
    expect(dashboard).toContain("{infoOpen && <StockInfoPanel symbol={symbol} />}");
    expect(toolbar).toContain("Instrument profile");
    expect(toolbar).toContain("onInstrumentProfile();");
  });

  it("does not offer a no-op doorway where narrow Options suppresses the panel", () => {
    expect(dashboard).toContain("? () => setInfoOpen(open => !open)");
    expect(dashboard).toContain(": undefined}");
    expect(toolbar).toContain("studyToolsOpen || instrumentProfileActive");
  });
});
