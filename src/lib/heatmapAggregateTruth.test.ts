import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { readObservedChange, summarizeObservedChange } from "./heatmapAggregateTruth";

const page = fs.readFileSync(
  path.join(process.cwd(), "src/app/heatmaps/page.tsx"),
  "utf8",
);

const stocks = [{ sym: "ONE" }, { sym: "TWO" }, { sym: "THREE" }];

describe("Heat Map aggregate truth", () => {
  it("reads only own finite observations while preserving a real zero", () => {
    expect(readObservedChange({ A: 0 }, "A")).toBe(0);
    expect(readObservedChange({}, "A")).toBeNull();
    expect(readObservedChange({ A: Number.NaN }, "A")).toBeNull();
    expect(readObservedChange({ A: Number.POSITIVE_INFINITY }, "A")).toBeNull();
  });
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
    expect(page).toContain('import { readObservedChange, summarizeObservedChange } from "@/lib/heatmapAggregateTruth"');
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

  it("fails closed in the Industry Tooltip and Markov scenario surface", () => {
    expect(page).toContain("value: readObservedChange(pcts, stock.sym)");
    expect(page).toContain("Observed change unavailable");
    expect(page).toContain('p === null ? "— unavailable"');
    expect(page).toContain("const observedReturn = readObservedChange(pcts, ms.sym)");
    expect(page).toContain("observedReturn === null ? null : computeMarkovState");
    expect(page).toContain("Return unavailable · scenario not computed");
    expect(page).toContain("Selected-period observed-return heuristic · Not predictive");
    expect(page).not.toContain("Live return heuristic");
    expect(page).not.toContain("computeMarkovState(ms.sym, pcts[ms.sym] ?? 0)");
    expect(page).toContain("const tooltipWidth = Math.min(320");
    expect(page).toContain("winW - tooltipWidth - 12");
  });

  it("never presents embedded static catalog prices as current tooltip quotes", () => {
    const tooltip = page.slice(
      page.indexOf("function IndustryTooltip"),
      page.indexOf("export default function HeatmapsPage"),
    );
    expect(page).not.toContain("price: number");
    expect(page).not.toMatch(/\bmcap:\s*[^,}]+,\s*price:/);
    expect(tooltip).toContain("{topRow.stock.name}");
    expect(tooltip).toContain("{st.name}");
    expect(tooltip).not.toContain(".stock.price");
    expect(tooltip).not.toContain("st.price");
    expect(tooltip).not.toContain("price.toFixed");
    expect(tooltip).toContain("Observed change unavailable");
    expect(tooltip).toContain('p === null ? "— unavailable"');
  });
});
