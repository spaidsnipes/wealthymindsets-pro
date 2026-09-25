import { describe, expect, it } from "vitest";
import { SESSION_CONTINUOUS, SESSION_UNKNOWN } from "@/lib/marketData/canonicalBar";
import { selectDataGaps } from "./selectDataGaps";

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
