import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

const raw = fs.readFileSync(
  path.join(process.cwd(), "src/components/chart/ChartsDashboard.tsx"),
  "utf8",
);
const src = raw
  .replace(/\/\*[\s\S]*?\*\//g, "")
  .replace(/(^|[^:])\/\/.*$/gm, "$1");

/**
 * Chart-header day-change Sentinel — LIVING-PIXEL LAW + Weakness #1.
 *
 * useWebSocket.flush() only writes change/changePct once prevCloseRef holds a
 * REAL prior close; until then it leaves them at their initial 0 while still
 * updating price and volume — deliberately, so a seed-derived fake never
 * reaches the UI.
 *
 * The header's guard required change, changePct AND volume to all be zero
 * before suppressing. Volume accumulates from live ticks, so the zero-change
 * state sailed through: observed on prod as
 *   "BTC 77,556.11 ↑ +0.00 +0.00%"  (green, beside a LIVE badge)
 * while the TickerTape showed BTC +2.49% for the same asset on the same page.
 *
 * A zero change with no reference close is UNKNOWN, not flat — and an
 * exactly-zero change is never "up".
 */
function headerShowsChange(change: number, changePct: number, price: number): boolean {
  return price > 0 && Number.isFinite(change) && Number.isFinite(changePct)
    && !(change === 0 && changePct === 0);
}

describe("chart header day-change truth", () => {
  it("volume can no longer make an unreferenced zero change look real", () => {
    expect(src).not.toContain("ticker.volume === 0)");
    expect(src).toContain("!(ticker.change === 0 && ticker.changePct === 0)");
  });

  it("an exactly-zero change is not painted as up", () => {
    expect(src).toContain("ticker.changePct > 0");
    expect(src).not.toContain("hasReal && ticker.changePct >= 0");
  });

  it("suppresses the change while no reference close exists", () => {
    // The exact prod state: real price, live volume, but change/pct still 0.
    expect(headerShowsChange(0, 0, 77_556.11)).toBe(false);
  });

  it("still renders a genuine move in either direction", () => {
    expect(headerShowsChange(1906.48, 2.49, 78_470)).toBe(true);
    expect(headerShowsChange(-42.75, -0.22, 29_122)).toBe(true);
  });

  it("never renders a change for a missing price", () => {
    expect(headerShowsChange(5, 1, 0)).toBe(false);
  });

  it("never renders a non-finite change", () => {
    expect(headerShowsChange(Number.NaN, 1, 100)).toBe(false);
    expect(headerShowsChange(1, Number.POSITIVE_INFINITY, 100)).toBe(false);
  });
});
