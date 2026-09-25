import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("chart tape summary scope", () => {
  it("does not present browser-restored counters as current-tab executions", () => {
    const source = readFileSync(resolve(__dirname, "MainChart.tsx"), "utf8");
    const chip = source.slice(source.indexOf('className="wm-live-session-chip"'), source.indexOf('data-visual-density="compact"', source.indexOf('className="wm-live-session-chip"')));
    expect(chip).not.toMatch(/Current-tab|current-tab|Current tab since|Buys this tab|Sells this tab/);
    expect(chip).toContain("Accumulated summary");
    expect(chip).toContain("may include browser-restored counters");
    expect(chip).toContain("Raw tape is not retained");
  });
});
