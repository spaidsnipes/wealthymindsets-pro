import { describe, expect, it } from "vitest";
import { barMinutesOf, futuresRootOf, selectSessionWindowBars, sessionKeyOf, sessionWindowFor } from "./sessionWindow";
import { TF_IDS, getTimeframe } from "@/lib/timeframes";

// January: New York is on EST (UTC−5), so ET hh:mm = UTC hh:mm − 5h.
const et = (day: number, hh: number, mm = 0) => Date.UTC(2026, 0, day, hh + 5, mm) / 1000;
const bar = (time: number) => ({ time });

describe("each market gets its own session definition, named", () => {
  it("labels say which definition was drawn", () => {
    expect(sessionWindowFor("AAPL", "5m", false).label).toBe("SESSION · RTH 09:30–16:00 ET");
    expect(sessionWindowFor("AAPL", "5m", true).label).toBe("SESSION · ETH 04:00–20:00 ET");
    expect(sessionWindowFor("/ES", "5m", false).kind).toBe("GLOBEX_DAY");
    expect(sessionWindowFor("EURUSD=X", "5m", false).kind).toBe("FX_DAY");
    expect(sessionWindowFor("BTC-USD", "1m", false).label).toMatch(/^DAY · 00:00 UTC/);
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

  it("crypto's day is the UTC day (Founder ruling 2026-10-02), and the label says so", () => {
    const w = sessionWindowFor("BTC-USD", "1m", false);
    expect(w.kind).toBe("CRYPTO_UTC_DAY");
    // January: 00:00 UTC = 19:00 ET.
    expect(sessionKeyOf(et(13, 18, 59), w)).toBe("2026-01-13");
    expect(sessionKeyOf(et(13, 19, 0), w)).toBe("2026-01-14");
    expect(sessionKeyOf(et(13, 23, 59), w)).toBe("2026-01-14");
    expect(w.label).toMatch(/^DAY · 00:00 UTC/);
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

  it("an hourly bar that holds the 09:30 open is in the RTH session (overlap, not open time)", () => {
    const rth = sessionWindowFor("AAPL", "1h", false);
    expect(rth.barMinutes).toBe(60);
    const bars = [8, 9, 10, 15, 16].map(h => bar(et(13, h)));
    // 08:00 (08–09) is out; 09:00 (09–10) holds the open; 15:00 is in; 16:00 is out.
    expect(selectSessionWindowBars(bars, rth).map(b => b.time)).toEqual([et(13, 9), et(13, 10), et(13, 15)]);
    // 4h bars at 04/08/12/16: 08:00 and 12:00 overlap RTH.
    const h4 = sessionWindowFor("AAPL", "4h", false);
    expect([4, 8, 12, 16].map(h => sessionKeyOf(et(13, h), h4))).toEqual([null, "2026-01-13", "2026-01-13", null]);
  });
});

describe("not every future keeps the Globex day (2026-09-25)", () => {
  it("reads the futures root from every notation", () => {
    expect(futuresRootOf("ZW1!")).toBe("ZW");
    expect(futuresRootOf("ZW=F")).toBe("ZW");
    expect(futuresRootOf("/ZW")).toBe("ZW");
    expect(futuresRootOf("MNQ1!")).toBe("MNQ");
    expect(futuresRootOf("AAPL")).toBeNull();
  });

  it("CBOT grains: night 20:00→08:45 + day 09:30→14:20 ET; the pause and the close are no session", () => {
    const w = sessionWindowFor("ZW1!", "5m", false);
    expect(w.kind).toBe("CBOT_GRAINS_DAY");
    expect(w.label).toBe("SESSION · CBOT GRAINS 20:00–08:45 + 09:30–14:20 ET");
    // Monday 12 Jan 20:00 ET opens Tuesday's trading day, which ends 14:20.
    const day = [et(12, 20, 0), et(13, 2, 0), et(13, 8, 40), et(13, 9, 30), et(13, 14, 15)].map(t => sessionKeyOf(t, w));
    expect(new Set(day)).toEqual(new Set(["2026-01-13"]));
    expect(sessionKeyOf(et(13, 9, 0), w), "the 08:45–09:30 pause").toBeNull();
    expect(sessionKeyOf(et(13, 16, 0), w), "after the 14:20 close").toBeNull();
    for (const s of ["ZC1!", "ZS1!"]) expect(sessionWindowFor(s, "5m", false).kind, s).toBe("CBOT_GRAINS_DAY");
  });

  it("CME livestock: 09:30→14:05 ET only", () => {
    const w = sessionWindowFor("LE1!", "5m", false);
    expect(w.kind).toBe("CME_LIVESTOCK_DAY");
    expect(sessionKeyOf(et(13, 9, 30), w)).toBe("2026-01-13");
    expect(sessionKeyOf(et(13, 14, 0), w)).toBe("2026-01-13");
    expect(sessionKeyOf(et(13, 14, 10), w)).toBeNull();
    expect(sessionKeyOf(et(13, 3, 0), w)).toBeNull();
  });

  it("NEGATIVE CONTROL — index, energy, metals, rates and VIX futures keep the Globex day", () => {
    for (const s of ["ES1!", "NQ1!", "CL1!", "GC1!", "ZN1!", "ZB1!", "VX1!", "/ES"]) {
      expect(sessionWindowFor(s, "5m", false).kind, s).toBe("GLOBEX_DAY");
    }
  });
});

// ── FAIL CLOSED ON A NON-CLOCK ID (2026-09-26, Garden 16 §21 step 4) ─────────
// barMinutesOf used to answer 1 for "tick and unknown frames": an N-tick id
// would have been profiled as one-minute bars and nothing would have said so.
// It now reads the registry, and an id the registry does not know has no
// minutes. Every REAL id must answer exactly as before; the old implementation
// is kept here, verbatim, as the oracle.
describe("the session clock is the registry's, and a non-clock id gets none", () => {
  const OLD_DAILY = /^(D|1D|W|1W|M|1M|3M|6M|1Y|2Y|3Y|5Y)$/;
  const OLD_BARS: Record<string, number> = { "1D": 5, "1W": 4, "1M": 3, "3M": 4, "6M": 4, "1Y": 3, "2Y": 3, "3Y": 3, "5Y": 3 };
  const oldBarMinutes = (tf: string) => {
    const m = /^(\d+)(m|h)$/i.exec(tf.trim());
    if (!m) return 1;
    const n = Number(m[1]);
    return m[2].toLowerCase() === "h" ? n * 60 : n;
  };
  const oldWindow = (symbol: string, tf: string, ext: boolean) => {
    if (OLD_DAILY.test(tf)) {
      const n = OLD_BARS[tf] ?? 5;
      return { kind: "DAILY_WINDOW", label: `LAST ${n} BARS · each ${tf} bar is already a whole session`, windowBars: n, barMinutes: 1440 };
    }
    return { ...sessionWindowFor(symbol, "5m", ext), barMinutes: oldBarMinutes(tf) };
  };

  it("the seconds clocks profile as their true fraction of a minute, never as one minute", () => {
    expect(sessionWindowFor("ES1!", "5s", false).barMinutes).toBeCloseTo(5 / 60);
    expect(sessionWindowFor("ES1!", "15s", false).barMinutes).toBe(0.25);
    expect(sessionWindowFor("ES1!", "30s", false).barMinutes).toBe(0.5);
  });

  it("every TFId, and the legacy D/W/M, profile exactly as they did", () => {
    // The seconds clocks (2026-10-01) did not exist for the oracle; it would
    // have called them one-minute bars. They are pinned positively below.
    const ids = [...TF_IDS.filter(tf => !/^\d+s$/.test(tf)), "D", "W", "M"];
    for (const sym of ["AAPL", "/ES", "ZW1!", "LE1!", "EURUSD=X", "BTC-USD"]) {
      for (const tf of ids) {
        for (const ext of [false, true]) {
          expect(sessionWindowFor(sym, tf, ext), `${sym} ${tf} ${ext}`).toEqual(oldWindow(sym, tf, ext));
        }
      }
    }
  });

  it("barMinutesOf answers the registry's minutes for every intraday id", () => {
    for (const id of TF_IDS) {
      const sec = getTimeframe(id).candleIntervalSec;
      expect(barMinutesOf(id), id).toBe(sec < 86_400 ? sec / 60 : null);
    }
    expect(barMinutesOf("45m")).toBe(45);
    expect(barMinutesOf("4h")).toBe(240);
  });

  it("× THE TICK THAT READ AS A MINUTE: a non-clock id has no minutes", () => {
    for (const tf of ["1t", "100T", "TICK", "10s", "20m", "7m", "3Y", "", "banana"]) {
      expect(barMinutesOf(tf), `"${tf}"`).toBeNull();
    }
  });

  it("× THE MONTH THAT READ AS A MINUTE: 1M is not 1 minute", () => {
    // The old regex was case-insensitive, so "1M" (one month) answered 1.
    expect(barMinutesOf("1M")).toBeNull();
    expect(barMinutesOf("1D")).toBeNull();
  });

  it("refuses to profile a non-clock id rather than inventing its span — by a NAMED result, never a throw", () => {
    // It used to THROW, and sessionWindowFor is called from render bodies
    // (MainChart, the room's state detail): one stray id took the chart down.
    for (const [sym, tf] of [["AAPL", "100T"], ["BTC-USD", "10s"], ["AAPL", "3Y"], ["ES1!", "TICK"], ["AAPL", ""]] as const) {
      for (const ext of [false, true]) {
        let w: ReturnType<typeof sessionWindowFor> | undefined;
        expect(() => { w = sessionWindowFor(sym, tf, ext); }, `${sym} ${tf}`).not.toThrow();
        expect(w, `${sym} ${tf}`).toEqual({
          kind: "NO_CLOCK",
          label: `NO SESSION · "${tf}" is not a registry clock — not profiled as one-minute bars`,
          windowBars: null,
          barMinutes: null,
        });
      }
    }
  });

  it("a NO_CLOCK window keys no bar to any session, so every consumer draws nothing", () => {
    const w = sessionWindowFor("AAPL", "10s", false);
    const bars = [1_758_900_600, 1_758_900_660, 1_758_904_200].map(time => ({ time }));
    for (const b of bars) expect(sessionKeyOf(b.time, w)).toBeNull();
    expect(selectSessionWindowBars(bars, w)).toEqual([]);
  });
});
