import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const indexPage = readFileSync(resolve(__dirname, "../app/nectar/page.tsx"), "utf8");
const detailPage = readFileSync(resolve(__dirname, "../app/nectar/[symbol]/page.tsx"), "utf8");

describe("Nectar chart navigation contract", () => {
  it("sets the card symbol before navigating to the canonical chart route", () => {
    expect(indexPage).toContain("const openOnChart = React.useCallback((symbol: string) => {");
    // Symbol is still set BEFORE navigation, and the route is still /charts —
    // the symbol now also rides in the query so the chart is shareable.
    expect(indexPage).toMatch(/setActiveSymbol\(symbol\);[\s\S]{0,220}?router\.push\(`\/charts\?symbol=\$\{encodeURIComponent\(symbol\)\}`\);/);
    expect(indexPage).toContain("onOpen={() => openOnChart(symbol)}");
  });

  it("uses the same exact-symbol transition for observed and unobserved detail states", () => {
    expect(detailPage).toContain("const openOnChart = React.useCallback(() => {");
    expect(detailPage).toMatch(/setActiveSymbol\(symbol\);\s+router\.push\(`\/charts\?symbol=\$\{encodeURIComponent\(symbol\)\}`\);/);
    expect(detailPage).toContain("<UnobservedState symbol={symbol} onOpen={openOnChart} />");
    expect(detailPage).toContain("onOpen={openOnChart}");
  });

  it("keeps the active-symbol CTA truthful and every chart action touch-sized", () => {
    expect(indexPage).toContain('"Open active symbol on chart →"');
    expect(indexPage).not.toContain('"Active on chart"');
    expect(indexPage).toContain("minHeight: 44");
    expect(detailPage).toContain("minHeight: 44");
  });

  it("lets real large Vault counts stack without overflowing a 360px phone", () => {
    expect(indexPage).toContain(
      'gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 320px), 1fr))"',
    );
    expect(indexPage).toContain(
      'gridTemplateColumns: "repeat(2, minmax(0, 1fr))"',
    );
    expect(indexPage).not.toContain('gridAutoFlow: "column"');
    expect(indexPage).toContain('<div style={{ textAlign: "right", minWidth: 0 }}>');
  });
});
