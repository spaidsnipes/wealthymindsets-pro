import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { liveBarBucketSec } from "@/lib/timeframes";

/**
 * P0 2026-10-25 (serving 10339f8, Founder's Chrome, BTC): the socket effect
 * re-runs on [symbol] only, so the tick handlers it captures must read the
 * live-bar clock through a ref. When getIntervalSec closed over `timeframe`,
 * 1h → 1m froze the candle (every tick STALE-dropped, data-live-drops
 * STALE:45 while the header moved) and 1m → 1h opened a candle every minute
 * on the hourly chart ("OPENED 2:57 PM" on 1h).
 */
const src = readFileSync(join(__dirname, "useWebSocket.ts"), "utf8");

describe("live-bar clock follows the timeframe without a socket rebuild", () => {
  it("getIntervalSec reads a ref and is stable (no timeframe closure)", () => {
    const line = src.split("\n").find(l => l.includes("const getIntervalSec = useCallback"));
    expect(line).toBeDefined();
    expect(line).toContain("intervalSecRef.current");
    expect(line).toMatch(/,\s*\[\s*\]\s*\);\s*$/);
  });

  it("the timeframe effect moves the clock and empties the bar together", () => {
    const m = src.match(/useEffect\(\(\) => \{\n([\s\S]*?)\n\s*\/\/ eslint-disable-next-line react-hooks\/exhaustive-deps\n\s*\}, \[timeframe\]\);/);
    expect(m).not.toBeNull();
    const body = m![1];
    expect(body).toContain("intervalSecRef.current = liveBarBucketSec(timeframe)");
    expect(body.indexOf("intervalSecRef.current")).toBeLessThan(body.indexOf("barRef.current = null"));
  });

  it("the socket effect still re-runs on symbol only (the reason the ref exists)", () => {
    expect(src).toMatch(/\}, \[symbol\]\);/);
  });

  it("the clocks differ across the switch the Founder makes", () => {
    expect(liveBarBucketSec("1m")).toBe(60);
    expect(liveBarBucketSec("1h")).toBe(3600);
  });
});
