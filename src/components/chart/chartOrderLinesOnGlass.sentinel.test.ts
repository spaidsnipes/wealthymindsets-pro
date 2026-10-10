/**
 * ORDER LINES REACH THE GLASS — Garden 19 §23 (chart lane breadcrumb).
 * The ticket publishes; MainChart must subscribe, paint through the words the
 * store chose, withhold on a replay camera, host the price pick, and send
 * nothing. Reads source.
 */
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";

const CHART = readFileSync(path.join(process.cwd(), "src/components/chart/MainChart.tsx"), "utf8");
const block = (() => {
  const at = CHART.indexOf("const chartOrderLines = useChartOrderLines(symbol);");
  expect(at).toBeGreaterThan(-1);
  return CHART.slice(at, CHART.indexOf("window.removeEventListener(\"click\", onClick, true)", at));
})();

describe("chart order lines on the glass", () => {
  it("subscribes to the one store and paints its words, not its own", () => {
    // The words and the stroke come from the store, wearing the appearance law's lawful looks.
    expect(block).toMatch(/const w = orderLineWords\(l, orderLineLooks\);/);
    expect(block).toMatch(/color: w\.stroke,/);
    expect(CHART).toMatch(/lawfulOrderLineLooks\(chartSettings, /);
    expect(block).toMatch(/lineStyle: w\.lineStyle,/);
    expect(block).toMatch(/title: PRICE_LINE_NATIVE_TITLE/);
    expect(block).toMatch(/kind: "ORDER"/);
  });
  it("withholds every order line on a replay camera", () => {
    expect(block).toMatch(/if \(replayCameraOn\) \{[^\n]*WITHHELD:REPLAY/);
  });
  it("the ORDER words are placed with paper and broker words", () => {
    expect(CHART).toMatch(/\.\.\.priceLineWordsRef\.current\.broker, \.\.\.priceLineWordsRef\.current\.order\]/);
  });
  it("hosts the price pick and consumes only an armed press", () => {
    expect(block).toMatch(/useEffect\(\(\) => registerChartPricePickHost\(\), \[\]\);/);
    expect(block).toMatch(/if \(!chartPricePickArmed\(\)\) return;/);
    expect(block).toMatch(/deliverChartPricePick\(pickSymbolRef\.current, \+p\)/);
  });
  it("the stroke stands ABOVE the analytical glass and never takes a pointer (Founder P0 2026-10-10)", () => {
    const at = CHART.indexOf('data-testid="order-line-stroke"');
    expect(at).toBeGreaterThan(-1);
    const el = CHART.slice(at, at + 700);
    expect(el).toMatch(/zIndex: 71, pointerEvents: "none"/);
    expect(el).toMatch(/\$\{look\.stroke\}/);
    // Its words sit beside the line (above, else below), never under the stroke.
    expect(CHART).toMatch(/const onLine = wd\.kind === "ORDER" \? above :/);
  });
  it("sends nothing", () => {
    expect(block).not.toMatch(/fetch\(|order-submit|placeOrder|submitOrder/);
  });
});
