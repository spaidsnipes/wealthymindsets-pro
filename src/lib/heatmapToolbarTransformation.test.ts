import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const page = readFileSync(resolve(process.cwd(), "src/app/heatmaps/page.tsx"), "utf8");

describe("heatmap toolbar transformation", () => {
  it("uses a truthful labelled button group for the three views", () => {
    expect(page).toContain('role="group" aria-label="Heatmap view"');
    expect(page).not.toContain('role="tablist" aria-label="Heatmap view"');
    expect(page).not.toContain('role="tab"');
    expect(page).not.toContain('aria-label="Heatmap view and timeframe"');
  });

  it("compresses seven timeframe buttons into one labeled 44px select", () => {
    expect(page).toContain('htmlFor="heatmap-timeframe"');
    expect(page).toContain('id="heatmap-timeframe"');
    expect(page).toContain('aria-label="Heatmap timeframe"');
    expect(page).toContain("onChange={event => setActiveTF(event.target.value)}");
    expect(page).toContain("{TIMEFRAMES.map(tf => <option");
  });

  it("keeps retained-snapshot truth primary and receipt chronology progressive", () => {
    expect(page).toContain('? "RETAINED SNAPSHOT"');
    expect(page).toContain('? "OBSERVED SNAPSHOT"');
    expect(page).toContain(': "NO MAP DATA"');
    expect(page).toContain('className="wm-heatmap-receipt-details"');
    expect(page).toContain("Data receipt");
    expect(page).toContain('role="note"');
    expect(page).toContain("receipt time only");
  });
});
