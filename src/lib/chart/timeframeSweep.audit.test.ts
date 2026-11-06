/**
 * HOURLY-AND-LONGER SWEEP (shift 1106; Codex 01a19aea: "Hourly and longer
 * timeframes were not finished"). 1h / 4h / 1D / 1W, each checked for:
 *
 *   BAR IDENTITY — the bar a print builds (liveBarStartSec) and the bar the
 *                  countdown counts to are ONE bar: start ≤ now < end, and
 *                  the end is the next bar's start.
 *   COUNTDOWN    — remaining = that bar's end − now; never a clock-shaped glyph.
 *   SESSION      — proven closure reads CLOSED on every one of them.
 *
 * DEFECT FOUND (reproduced against 670d599d — the raw-floor arithmetic is
 * pinned below as `rawFloorRemaining`): MainChart counted every timeframe down
 * on `floor(now / sec) * sec + sec`. For 1W that is an EPOCH week, which opens
 * on THURSDAY 00:00 UTC — while the live bar owner (and tastytrade's weekly
 * candle) open Monday 00:00 UTC. On Thursday 2026-11-05 12:00 UTC the 1W
 * countdown read 6d 12h to a Thursday that closes nothing; the week's bar
 * closes Monday 00:00 UTC, 3d 12h away. 1M/1Q had the same fault (30/91-day
 * floors). 1h, 4h and 1D floors agree with the live owner and are pinned.
 */
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { liveBarStartSec, liveBarEndSec } from "@/lib/marketData/liveBarPolicy";
import { chartBarCountdown } from "./chartBarCountdown";

const H = 3600, D = 86_400, W = 7 * D;
const TF: Record<string, number> = { "1h": H, "4h": 4 * H, "1D": D, "1W": W };
const at = (iso: string) => Date.parse(iso) / 1000;
/** The arithmetic MainChart used before this shift. */
const rawFloorRemaining = (now: number, sec: number) => Math.floor(now / sec) * sec + sec - now;

const INSTANTS = [
  "2026-11-02T00:00:00Z", // Monday open of the UTC week
  "2026-11-04T13:37:11Z", // Wednesday mid-session
  "2026-11-05T12:00:00Z", // Thursday — the epoch-week trap
  "2026-11-06T21:59:59Z", // Friday, a second before CME's weekend close (16:00 CT)
  "2026-11-08T23:00:00Z", // Sunday evening, Globex reopen
  "2026-12-31T23:59:59Z", // year end
];

describe("bar identity: the forming bar and the countdown's bar are one bar", () => {
  for (const [tf, sec] of Object.entries(TF)) {
    for (const iso of INSTANTS) {
      it(`${tf} @ ${iso}`, () => {
        const now = at(iso);
        const start = liveBarStartSec(now, sec);
        const end = liveBarEndSec(now, sec);
        expect(start).toBeLessThanOrEqual(now);
        expect(end).toBeGreaterThan(now);
        expect(end - start).toBe(sec);
        expect(liveBarStartSec(end, sec)).toBe(end); // the end is the next bar's start
        if (tf === "1W") expect(new Date(start * 1000).getUTCDay()).toBe(1); // Monday
      });
    }
  }
});

describe("countdown", () => {
  it("1W on Thursday counts to Monday 00:00 UTC (the raw floor counted to Thursday)", () => {
    const now = at("2026-11-05T12:00:00Z");
    expect(liveBarEndSec(now, W) - now).toBe(3.5 * D);
    expect(rawFloorRemaining(now, W)).toBe(6.5 * D); // the defect, pinned
    expect(chartBarCountdown(liveBarEndSec(now, W) - now, W, true).glyph).toBe("84h 00m 00s");
  });
  it("1h / 4h / 1D agree with the raw floor (no change there), and never read as a clock", () => {
    for (const iso of INSTANTS) {
      const now = at(iso);
      for (const sec of [H, 4 * H, D]) {
        expect(liveBarEndSec(now, sec) - now).toBe(rawFloorRemaining(now, sec));
        const g = chartBarCountdown(liveBarEndSec(now, sec) - now, sec, true).glyph;
        expect(g).not.toMatch(/\d:\d/);
        expect(g).toMatch(/^\d+h \d{2}m \d{2}s$/);
      }
    }
  });
  it("1M and 1Q close on the calendar, not on 30 / 91 days", () => {
    const now = at("2026-11-17T08:00:00Z");
    expect(liveBarEndSec(now, 30 * D)).toBe(at("2026-12-01T00:00:00Z"));
    expect(liveBarEndSec(now, 91 * D)).toBe(at("2027-01-01T00:00:00Z"));
    expect(liveBarEndSec(at("2026-12-31T23:59:59Z"), 30 * D)).toBe(at("2027-01-01T00:00:00Z"));
  });
});

describe("session truth: proven closure says CLOSED on every long timeframe", () => {
  for (const [tf, sec] of Object.entries(TF)) {
    it(tf, () => {
      const c = chartBarCountdown(1234, sec, true, "LIVE", true);
      expect(c.kind).toBe("MARKET_CLOSED");
      expect(c.glyph).toBe("CLOSED");
      // A degraded feed counts the clock only, and says so.
      const d = chartBarCountdown(1234, sec, false, "DELAYED");
      expect(d.kind).toBe("CLOCK_ONLY");
      expect(d.closing).toBe(false);
    });
  }
});

describe("MainChart's two countdown clocks use the one bar owner", () => {
  const c = readFileSync("src/components/chart/MainChart.tsx", "utf8");
  it("no raw epoch floor is left in either clock", () => {
    expect(c).not.toContain("const remaining = Math.floor(now / sec) * sec + sec - now;");
    expect(c).not.toContain("const barStart  = Math.floor(now / sec) * sec;");
    expect(c.match(/liveBarEndSec\(now, sec\)/g)?.length).toBe(2);
  });
});
