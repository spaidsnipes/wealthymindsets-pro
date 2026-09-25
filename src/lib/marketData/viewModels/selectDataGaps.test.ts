import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { stripComments } from "@/lib/sourceScan";
import { SESSION_CONTINUOUS, SESSION_UNKNOWN } from "@/lib/marketData/canonicalBar";
import { selectDataGaps } from "./selectDataGaps";
import { sessionWindowFor } from "@/lib/marketData/sessionWindow";

const bar = (time: number, p = 100) => ({ time, open: p, close: p + 1 });
const run = (from: number, n: number, step = 300) => Array.from({ length: n }, (_, i) => bar(from + i * step));
const ids = (bars: readonly { time: number }[], sessionOf: (t: number) => string) =>
  bars.map(b => ({ asOf: b.time * 1000, sessionId: sessionOf(b.time) }));

const DAY = 86_400;
/** Mon 2026-09-07 00:00 UTC. Weekdays only, as an equity daily feed delivers them. */
const MONDAY = Date.UTC(2026, 8, 7) / 1000;
const weekdays = (weeks: number) =>
  Array.from({ length: weeks * 7 }, (_, d) => MONDAY + d * DAY)
    .filter(t => { const wd = new Date(t * 1000).getUTCDay(); return wd !== 0 && wd !== 6; })
    .map(t => bar(t));

describe("selectDataGaps", () => {
  it("refuses too few bars", () => {
    expect(selectDataGaps({ bars: [bar(0)], continuous: true }).reason).toBe("TOO_FEW_BARS");
  });

  it("an unbroken series has no gaps", () => {
    expect(selectDataGaps({ bars: run(0, 50), continuous: true }).gaps).toEqual([]);
  });

  it("names a hole on a continuous instrument by its empty intervals, never as bars the feed dropped", () => {
    const bars = [...run(0, 20), ...run(20 * 300 + 2 * 300, 20)]; // two intervals with no bar
    const vm = selectDataGaps({ bars, continuous: true });
    expect(vm.gaps).toHaveLength(1);
    expect(vm.gaps[0].emptyIntervals).toBe(2);
    expect(vm.gaps[0].fromTime).toBe(19 * 300);
    expect(vm.gaps[0].toTime).toBe(22 * 300);
    expect(vm.gaps[0].label).toBe("NO BAR · 2 intervals");
    expect(vm.gaps[0].label).not.toMatch(/missing|dropped|GAP/i);
  });

  it("a 1D equity chart never paints weekends or holidays as holes", () => {
    const bars = weekdays(6).filter(b => b.time !== MONDAY + 16 * DAY); // Wed of week 3 is a holiday
    const unknown = selectDataGaps({ bars, identities: ids(bars, () => SESSION_UNKNOWN), continuous: false });
    expect(unknown.reason).toBe("NO_SESSION_IDENTITY");
    expect(unknown.gaps).toEqual([]);
    // Even with dated sessions, each daily bar is its own session: Fri→Mon is a close, not a hole.
    const dated = selectDataGaps({ bars, identities: ids(bars, t => `XNYS:${t}`), continuous: false });
    expect(dated.reason).toBe("MEASURED");
    expect(dated.gaps).toEqual([]);
  });

  it("the CME daily halt on 1h bars is never a hole when the feed does not know the session", () => {
    const hour = 3600;
    const day = (d: number) => Array.from({ length: 23 }, (_, h) => bar(d * DAY + (h < 16 ? h : h + 1) * hour));
    const bars = [...day(0), ...day(1), ...day(2)];
    const vm = selectDataGaps({ bars, identities: ids(bars, () => SESSION_UNKNOWN), continuous: false });
    expect(vm.gaps).toEqual([]);
  });

  it("marks every hole inside one known session, whatever its length", () => {
    const bars = [...run(0, 20), ...run(20 * 300 + 7 * 300, 20)]; // seven empty intervals
    const vm = selectDataGaps({ bars, identities: ids(bars, () => "XNYS:2026-09-24:RTH"), continuous: false });
    expect(vm.gaps).toHaveLength(1);
    expect(vm.gaps[0].emptyIntervals).toBe(7);
  });

  it("a real outage of many bars on a 24x7 feed is marked, not mistaken for a session break", () => {
    const bars = [...run(0, 30, 60), ...run(30 * 60 + 5 * 60, 30, 60)]; // 1m bars, five-minute silence
    const vm = selectDataGaps({ bars, identities: ids(bars, () => SESSION_CONTINUOUS), continuous: true });
    expect(vm.gaps).toHaveLength(1);
    expect(vm.gaps[0].emptyIntervals).toBe(5);
    expect(vm.gaps[0].label).toBe("NO BAR · 5 intervals");
  });

  it("bars that declare SESSION_CONTINUOUS share their one session even without the instrument flag", () => {
    const bars = [...run(0, 20), ...run(20 * 300 + 300, 20)];
    const vm = selectDataGaps({ bars, identities: ids(bars, () => SESSION_CONTINUOUS), continuous: false });
    expect(vm.gaps.map(g => g.emptyIntervals)).toEqual([1]);
  });

  it("never calls a session break a data gap", () => {
    const a = run(0, 20), b = run(100_000, 20);
    const bars = [...a, ...b];
    const vm = selectDataGaps({ bars, identities: ids(bars, t => (t < 100_000 ? "S1" : "S2")), continuous: false });
    expect(vm.reason).toBe("MEASURED");
    expect(vm.gaps).toEqual([]);
  });

  it("a hole beside a bar with no identity is not marked on a sessioned instrument", () => {
    const bars = [...run(0, 20), ...run(20 * 300 + 2 * 300, 20)];
    const known = ids(bars, () => "S1").filter(i => i.asOf !== 22 * 300 * 1000); // the bar after the hole has none
    expect(selectDataGaps({ bars, identities: known, continuous: false }).gaps).toEqual([]);
  });
});

/**
 * THE MARKET CLOCK (2026-09-25). Measured on serving: AAPL, SPY, ES1!, CL1!,
 * GC1!, NQ1!, USDJPY all read NO_SESSION_IDENTITY — every non-crypto ingress
 * mints SESSION_UNKNOWN, so no in-session hole was ever marked on them. The
 * instrument's published session clock (sessionWindowFor) now answers for
 * bars that do not know their session. Each class below proves BOTH halves:
 * a real hole inside the session is marked, and the market being shut is not.
 */
describe("selectDataGaps — the market clock names the session the bars could not", () => {
  // September 2026: New York is on EDT (UTC−4). 2026-09-24 is a Thursday.
  const et = (day: number, hh: number, mm = 0) => Date.UTC(2026, 8, day, hh + 4, mm) / 1000;
  /** Bars every `stepMin` from start to end (inclusive), minus any listed ET times. */
  const span = (from: number, to: number, stepMin = 5, skip: readonly number[] = []) => {
    const out: ReturnType<typeof bar>[] = [];
    for (let t = from; t <= to; t += stepMin * 60) if (!skip.includes(t)) out.push(bar(t));
    return out;
  };
  const unknownIds = (bars: readonly { time: number }[]) => ids(bars, () => SESSION_UNKNOWN);
  const gapsOf = (symbol: string, bars: ReturnType<typeof bar>[], tf = "5m", ext = false) =>
    selectDataGaps({ bars, identities: unknownIds(bars), continuous: false, sessionClock: sessionWindowFor(symbol, tf, ext) });

  it("AAPL (RTH): a mid-session hole is marked; the overnight and the weekend are not", () => {
    const bars = [
      ...span(et(24, 9, 30), et(24, 15, 55), 5, [et(24, 11, 0), et(24, 11, 5), et(24, 11, 10)]), // Thu, 3-interval hole
      ...span(et(25, 9, 30), et(25, 15, 55)), // Fri
      ...span(et(28, 9, 30), et(28, 15, 55)), // Mon
    ];
    const vm = gapsOf("AAPL", bars);
    expect(vm.reason).toBe("MEASURED");
    expect(vm.sessionSource).toBe("MARKET_CLOCK");
    expect(vm.gaps.map(g => [g.fromTime, g.toTime, g.emptyIntervals])).toEqual([[et(24, 10, 55), et(24, 11, 15), 3]]);
    expect(vm.gaps[0].label).toBe("NO BAR · 3 intervals");
    // WITHOUT the clock the same chart could mark nothing — the serving receipt.
    expect(selectDataGaps({ bars, identities: unknownIds(bars), continuous: false }).reason).toBe("NO_SESSION_IDENTITY");
  });

  it("SPY (ETH mode): a pre-market hole is marked; 20:00 → 04:00 is the market shut", () => {
    const bars = [
      ...span(et(24, 4, 0), et(24, 19, 55), 5, [et(24, 6, 0), et(24, 6, 5)]),
      ...span(et(25, 4, 0), et(25, 19, 55)),
    ];
    const vm = gapsOf("SPY", bars, "5m", true);
    expect(vm.gaps.map(g => g.emptyIntervals)).toEqual([2]);
    expect(vm.gaps[0].fromTime).toBe(et(24, 5, 55));
  });

  it("ES1! / NQ1! / CL1! / GC1! (Globex): an overnight hole is marked; the 17:00 halt and the weekend are not", () => {
    for (const sym of ["ES1!", "NQ1!", "CL1!", "GC1!"]) {
      const bars = [
        ...span(et(23, 18, 0), et(24, 16, 55), 5, [et(24, 3, 0), et(24, 3, 5), et(24, 3, 10)]), // Thu session
        ...span(et(24, 18, 0), et(25, 16, 55)), // Fri session — 17:00–18:00 halt between
        ...span(et(27, 18, 0), et(28, 16, 55)), // Sun 18:00 opens Monday
      ];
      const vm = gapsOf(sym, bars);
      expect(vm.sessionSource, sym).toBe("MARKET_CLOCK");
      expect(vm.gaps.map(g => [g.fromTime, g.emptyIntervals]), sym).toEqual([[et(24, 2, 55), 3]]);
    }
  });

  it("USDJPY (FX day): an in-day hole is marked; Friday 17:00 → Sunday 17:00 is not", () => {
    const bars = [
      ...span(et(24, 17, 0), et(25, 16, 55), 5, [et(25, 10, 0)]),
      ...span(et(27, 17, 0), et(28, 16, 55)),
    ];
    const vm = gapsOf("USDJPY", bars);
    expect(vm.gaps.map(g => [g.fromTime, g.emptyIntervals])).toEqual([[et(25, 9, 55), 1]]);
  });

  it("ZW1! (CBOT grains): the 08:45–09:30 ET pause is the pit's schedule, not a hole", () => {
    const night = span(et(23, 20, 0), et(24, 8, 40));
    const day = span(et(24, 9, 30), et(24, 14, 15), 5, [et(24, 12, 0), et(24, 12, 5)]);
    const bars = [...night, ...day, ...span(et(24, 20, 0), et(25, 8, 40))];
    const vm = gapsOf("ZW1!", bars);
    expect(vm.gaps.map(g => [g.fromTime, g.emptyIntervals])).toEqual([[et(24, 11, 55), 2]]);
    // Negative control: read on the Globex clock, the pause WOULD be called a hole.
    const globex = selectDataGaps({ bars, identities: unknownIds(bars), continuous: false, sessionClock: sessionWindowFor("ES1!", "5m", false) });
    expect(globex.gaps.some(g => g.fromTime === et(24, 8, 40))).toBe(true);
  });

  it("daily bars and unclassifiable symbols still say why they mark nothing", () => {
    const daily = span(et(1, 0, 0), et(28, 0, 0), 24 * 60);
    expect(gapsOf("AAPL", daily, "1D").reason).toBe("NO_SESSION_IDENTITY");
    const bars = span(et(24, 9, 30), et(24, 15, 55), 5, [et(24, 11, 0)]);
    expect(gapsOf("NOTATICKERATALL", bars).reason).toBe("NO_SESSION_IDENTITY");
    expect(gapsOf("NOTATICKERATALL", bars).sessionSource).toBeNull();
  });

  it("a bar's own known session outranks the clock", () => {
    const bars = span(et(24, 9, 30), et(24, 15, 55), 5, [et(24, 11, 0)]);
    const vm = selectDataGaps({
      bars, identities: ids(bars, t => (t < et(24, 11, 0) ? "A" : "B")), continuous: false,
      sessionClock: sessionWindowFor("AAPL", "5m", false),
    });
    expect(vm.sessionSource).toBe("BAR_IDENTITY");
    expect(vm.gaps).toEqual([]); // the bars say two sessions; the clock does not overrule them
  });

  it("the chart hands the reader the SAME clock its Session Profile draws by", () => {
    // A selector that can read a clock nobody passes reads nothing: the serving
    // receipt stays NO_SESSION_IDENTITY. Read what MainChart RUNS.
    const code = stripComments(readFileSync(resolve(process.cwd(), "src/components/chart/MainChart.tsx"), "utf8"));
    expect(code.length, "the scan read the real chart").toBeGreaterThan(100_000);
    const call = /selectDataGaps\(\{[\s\S]{0,400}?\}\)/.exec(code)?.[0] ?? "";
    expect(call, "the selectDataGaps call site was not found").not.toBe("");
    expect(call).toMatch(/sessionClock:\s*sessionWin\b/);
    expect(code).toMatch(/const sessionWin = sessionWindowFor\(symbol, timeframe, !!extendedHours\)/);
  });
});
