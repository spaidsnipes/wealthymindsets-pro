import { describe, expect, it } from "vitest";
import { selectSessionWindowBars, sessionKeyOf, sessionWindowFor } from "./sessionWindow";

// January: New York is on EST (UTC−5), so ET hh:mm = UTC hh:mm − 5h.
const et = (day: number, hh: number, mm = 0) => Date.UTC(2026, 0, day, hh + 5, mm) / 1000;
const bar = (time: number) => ({ time });

describe("each market gets its own session definition, named", () => {
  it("labels say which definition was drawn", () => {
    expect(sessionWindowFor("AAPL", "5m", false).label).toBe("SESSION · RTH 09:30–16:00 ET");
    expect(sessionWindowFor("AAPL", "5m", true).label).toBe("SESSION · ETH 04:00–20:00 ET");
    expect(sessionWindowFor("/ES", "5m", false).kind).toBe("GLOBEX_DAY");
    expect(sessionWindowFor("EURUSD=X", "5m", false).kind).toBe("FX_DAY");
    expect(sessionWindowFor("BTC-USD", "1m", false).label).toMatch(/continuous market, no venue session/);
    expect(sessionWindowFor("BTC-USD", "1D", false)).toMatchObject({ kind: "DAILY_WINDOW", windowBars: 5 });
  });

  it("a Globex session runs 18:00 ET → 17:00 ET and is NOT split at midnight", () => {
    const w = sessionWindowFor("/ES", "5m", false);
    // Monday 12 Jan 18:00 ET opens Tuesday 13 Jan's session.
    const open = et(12, 18), late = et(12, 23, 55), afterMidnight = et(13, 0, 5), close = et(13, 16, 55);
    const keys = [open, late, afterMidnight, close].map(t => sessionKeyOf(t, w));
    expect(new Set(keys).size).toBe(1);
    expect(keys[0]).toBe("2026-01-13");
    // The maintenance hour belongs to no session; 18:00 starts the next one.
    expect(sessionKeyOf(et(13, 17, 30), w)).toBeNull();
    expect(sessionKeyOf(et(13, 18, 0), w)).toBe("2026-01-14");
    // The old ET-midnight cut profiled only the back half of the session.
    const bars = [open, late, afterMidnight, close].map(bar);
    expect(selectSessionWindowBars(bars, w)).toHaveLength(4);
  });

  it("the FX day rolls at 17:00 ET", () => {
    const w = sessionWindowFor("EURUSD=X", "15m", false);
    expect(sessionKeyOf(et(13, 16, 59), w)).toBe("2026-01-13");
    expect(sessionKeyOf(et(13, 17, 0), w)).toBe("2026-01-14");
    expect(sessionKeyOf(et(14, 0, 30), w)).toBe("2026-01-14");
  });

  it("US equities honour the chart's own session mode", () => {
    const rth = sessionWindowFor("AAPL", "5m", false);
    const eth = sessionWindowFor("AAPL", "5m", true);
    const pre = et(13, 8, 0), open = et(13, 9, 30), close = et(13, 15, 55), post = et(13, 18, 0);
    expect(sessionKeyOf(pre, rth)).toBeNull();
    expect(sessionKeyOf(post, rth)).toBeNull();
    expect(sessionKeyOf(open, rth)).toBe("2026-01-13");
    expect(sessionKeyOf(pre, eth)).toBe("2026-01-13");
    expect(sessionKeyOf(post, eth)).toBe("2026-01-13");
    expect(sessionKeyOf(et(13, 20, 0), eth)).toBeNull();
    const bars = [pre, open, close, post].map(bar);
    expect(selectSessionWindowBars(bars, rth).map(b => b.time)).toEqual([open, close]);
    expect(selectSessionWindowBars(bars, eth)).toHaveLength(4);
  });

  it("before the open the RTH session is the previous one, never an empty guess", () => {
    const rth = sessionWindowFor("AAPL", "5m", false);
    const yesterday = [et(12, 9, 30), et(12, 15, 55)];
    const bars = [...yesterday, et(13, 7, 0)].map(bar);
    expect(selectSessionWindowBars(bars, rth).map(b => b.time)).toEqual(yesterday);
  });

  it("a continuous market uses the ET calendar day, and says it is the chart's day", () => {
    const w = sessionWindowFor("BTC-USD", "1m", false);
    expect(sessionKeyOf(et(13, 23, 59), w)).toBe("2026-01-13");
    expect(sessionKeyOf(et(14, 0, 0), w)).toBe("2026-01-14");
    expect(w.label).toMatch(/^DAY · ET MIDNIGHT/);
  });

  it("daily-or-longer is a named window of the latest bars", () => {
    const w = sessionWindowFor("AAPL", "1D", false);
    const bars = [1, 2, 3, 4, 5, 6, 7].map(bar);
    expect(selectSessionWindowBars(bars, w).map(b => b.time)).toEqual([3, 4, 5, 6, 7]);
    expect(w.label).toMatch(/^LAST 5 BARS/);
  });

  it("no bar in any session → no bars (the column declines NO_BARS), never the whole history", () => {
    const rth = sessionWindowFor("AAPL", "5m", false);
    expect(selectSessionWindowBars([bar(et(13, 3, 0)), bar(et(13, 21, 0))], rth)).toEqual([]);
  });
});
