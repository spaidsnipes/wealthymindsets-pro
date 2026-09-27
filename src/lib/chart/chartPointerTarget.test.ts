import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";
import { CHART_CHROME_SELECTOR, isChartChromeTarget } from "./chartPointerTarget";

/** A stand-in element whose ancestors match the listed selectors. */
const el = (matches: string[]) => ({
  closest: (sel: string) => (sel.split(",").map(s => s.trim()).some(s => matches.includes(s)) ? {} : null),
});

describe("a press on a control is not a press on the market (§17, found on the glass)", () => {
  it("presses that start on chrome are the chrome's", () => {
    expect(isChartChromeTarget(el(["button"]))).toBe(true);           // R · A · % · L · ◐ · D
    expect(isChartChromeTarget(el(['[role="button"]']))).toBe(true);
    expect(isChartChromeTarget(el(["a[href]"]))).toBe(true);
    expect(isChartChromeTarget(el(["input"]))).toBe(true);
    expect(isChartChromeTarget(el(['[role="menu"]']))).toBe(true);
    expect(isChartChromeTarget(el(["[data-chart-chrome]"]))).toBe(true);
  });

  it("presses on the market surface still select", () => {
    expect(isChartChromeTarget(el([]))).toBe(false);                   // the canvas
    expect(isChartChromeTarget(null)).toBe(false);
    expect(isChartChromeTarget({})).toBe(false);
  });

  it("the chart pane's selection handler asks before it selects", () => {
    const src = readFileSync(path.join(process.cwd(), "src/components/chart/MainChart.tsx"), "utf8");
    const down = src.indexOf("const handleCursorSelectDown = useCallback(");
    const guard = src.indexOf("if (isChartChromeTarget(e.target as Element)) { cursorDownRef.current = null; return; }", down);
    const record = src.indexOf("cursorDownRef.current = { x: e.clientX - r.left, y: e.clientY - r.top };", down);
    expect(guard, "the chrome guard left the selection handler").toBeGreaterThan(down);
    expect(record).toBeGreaterThan(guard);
    expect(CHART_CHROME_SELECTOR).toContain("button");
  });
});

describe("the pane's small controls say what they are and whether they are on (§49)", () => {
  const src = readFileSync(path.join(process.cwd(), "src/components/chart/MainChart.tsx"), "utf8");
  it("D: a named toggle with aria-pressed, not colour alone", () => {
    expect(src).toMatch(/type="button"\s*onClick=\{\(\) => setDataWindowOpen\(v => !v\)\}[\s\S]{0,400}aria-label="Data window"\s*aria-pressed=\{dataWindowOpen\}/);
  });
  it("◐: the opacity cycle names itself with its value", () => {
    expect(src).toContain("aria-label={`Order-flow overlay opacity ${Math.round(flowOpacity * 100)} percent`}");
  });
});

describe("volume never prints on the price axis (§50)", () => {
  it("the volume overlay has no last-value tag — its number lives in the footer as Vol", () => {
    const src = readFileSync(path.join(process.cwd(), "src/components/chart/MainChart.tsx"), "utf8");
    const i = src.indexOf('priceScaleId:     "vol",');
    expect(i).toBeGreaterThan(-1);
    const block = src.slice(i, src.indexOf("});", i));
    expect(block).toContain("lastValueVisible: false,");
    expect(block).not.toContain("lastValueVisible: true");
  });
});
