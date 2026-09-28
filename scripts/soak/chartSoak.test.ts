import { describe, expect, it } from "vitest";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const soak = require("./chartSoak.browser.js") as {
  _summarize: (s: Record<string, unknown>[]) => Record<string, unknown>;
  _parseClock: (s: string) => Record<string, number | null>;
};

describe("chart soak harness — reports only what it sampled", () => {
  it("parses the market-clock receipt the chart publishes", () => {
    const c = soak._parseClock("evt→state 10/20 · state→series 6.7/9.1 · series→paint 30/49 · fold 2.0/51 · backlog max 3 · n 240");
    expect(c).toMatchObject({ evtToState50: 10, evtToState95: 20, seriesToPaint95: 49, backlogMax: 3 });
  });
  it("no samples is NO_SAMPLES, never a pass", () => {
    expect(soak._summarize([]).verdict).toBe("NO_SAMPLES");
  });
  it("duration is the sampled span; a hidden sample taints the verdict", () => {
    const s = (t: number, vis = "visible") => ({ t, url: "/charts", visibility: vis, heap: 5e7, paintMeanMs: 5, paintLongestMs: 9, paintOverBudget: 0, paintBudgetMet: "MET", evtToState95: 20, seriesToPaint95: 49, backlogMax: 3 });
    const r = soak._summarize([s(0), s(30 * 60_000)]);
    expect(r).toMatchObject({ verdict: "MEASURED", durationMin: 30, samples: 2, budgetMissedSamples: 0 });
    expect(soak._summarize([s(0), s(60_000, "hidden")]).verdict).toBe("TAINTED_HIDDEN");
  });
});
