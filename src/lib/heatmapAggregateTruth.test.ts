import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { summarizeObservedChange } from "./heatmapAggregateTruth";

const page = fs.readFileSync(
  path.join(process.cwd(), "src/app/heatmaps/page.tsx"),
  "utf8",
);

const stocks = [{ sym: "ONE" }, { sym: "TWO" }, { sym: "THREE" }];

describe("Heat Map aggregate truth", () => {
  it("averages only finite own observations and discloses partial coverage", () => {
    expect(summarizeObservedChange(stocks, { ONE: 2, TWO: -1 })).toEqual({
      value: 0.5,
      observedCount: 2,
      totalCount: 3,
    });
    expect(summarizeObservedChange(stocks, { ONE: Number.NaN, TWO: Number.POSITIVE_INFINITY })).toEqual({
      value: null,
      observedCount: 0,
      totalCount: 3,
    });
  });

  it("distinguishes a real observed zero from missing observations", () => {
    expect(summarizeObservedChange(stocks.slice(0, 2), { ONE: 0 })).toEqual({
      value: 0,
      observedCount: 1,
      totalCount: 2,
    });
    expect(summarizeObservedChange(stocks.slice(0, 2), {})).toEqual({
      value: null,
      observedCount: 0,
      totalCount: 2,
    });
  });

  it("renders truthful compact sector coverage and removes the false reducers", () => {
    expect(page).toContain('import { summarizeObservedChange } from "@/lib/heatmapAggregateTruth"');
    expect(page).toContain("const sectorChange = summarizeObservedChange(allStocks, pcts)");
    expect(page).toContain("EW {avgPct === null ? \"—\"");
    expect(page).toContain('`${sectorChange.observedCount}/${sectorChange.totalCount} rows`');
    expect(page).toContain('" · unavailable" : " · partial"');
    expect(page).toContain("flexWrap: \"wrap\"");
    expect(page).not.toContain("allStocks.reduce((sum, st) => sum + (pcts[st.sym] ?? 0)");
    expect(page).not.toContain("const industryPct");
    expect(page).toContain("setActiveSymbol(sym)");
    expect(page).toContain('router.push("/charts")');
  });
});
