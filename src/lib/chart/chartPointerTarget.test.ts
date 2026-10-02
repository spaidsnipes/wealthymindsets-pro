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

describe("the header's truth groups never split inside themselves from 1280 up (§50, 1440 glass)", () => {
  it("price+change and OHLC keep their words together at xl; recency is the group that folds", () => {
    const src = readFileSync(path.join(process.cwd(), "src/components/chart/MainChart.tsx"), "utf8");
    // 2026-10-01: the price group now holds together at EVERY width — at 390px
    // it wrapped to four lines and printed over the day-bias row.
    expect(src).toContain('<div className="flex items-baseline gap-2 shrink-0 whitespace-nowrap" data-legend-group="price">');
    expect(src).toContain('className="flex items-center gap-3 text-[10px] font-mono text-wm-text-dim xl:shrink-0 xl:whitespace-nowrap" data-legend-group="ohlc">');
    expect(src).toContain('<div className="ml-auto flex min-w-0 items-center gap-3" style={{ flexShrink: 2 }}>');
  });
});

describe("Settings › Sound Effects has a consumer (§40)", () => {
  it("the chart's sound checks the saved master switch before playing", () => {
    const src = readFileSync(path.join(process.cwd(), "src/components/chart/MainChart.tsx"), "utf8");
    expect(src).toContain('return JSON.parse(localStorage.getItem("wm_settings") || "{}").soundOn === false;');
    const play = src.indexOf("const playBloop = useCallback(");
    const gate = src.indexOf("soundMasterOff()) return;", play);
    const osc = src.indexOf("createOscillator()", play);
    expect(gate).toBeGreaterThan(play);
    expect(osc).toBeGreaterThan(gate);
  });
});
