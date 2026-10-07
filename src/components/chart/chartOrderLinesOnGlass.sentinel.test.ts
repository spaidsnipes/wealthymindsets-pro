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
    expect(block).toMatch(/const w = orderLineWords\(l\);/);
    expect(block).toMatch(/color: w\.ink,/);
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
  it("sends nothing", () => {
    expect(block).not.toMatch(/fetch\(|order-submit|placeOrder|submitOrder/);
  });
});
