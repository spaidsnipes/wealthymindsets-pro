/**
 * NATIVE IS NATIVE — per symbol, LIVE DOORS ONLY.
 *
 * Garden 16 §26 (2026-09-26) pinned the ladder to the same owners the chart's history
 * load asks. On 2026-10-12 the Founder ordered "remove anything delayed and dead": the
 * Alpaca REST, Finnhub REST, Yahoo and Polygon doors are gone, so the only routes are a
 * crypto venue's own candles and tastytrade's (futures, stocks/ETFs, the coins it lists).
 * An instrument no live door serves has NO route, and the ladder says so.
 */
import { describe, expect, it } from "vitest";
import { bucketWords, canonAvailabilityFor, chartBarRouteFor, ladderOnNowSentence, servedTimeframeFor } from "./chartBarRoute";
import { CANON_LADDER, TF_IDS, timeframePendingFounderDecision, type CanonRung } from "@/lib/timeframes";

const ladderFor = (sym: string) => CANON_LADDER.map(r => canonAvailabilityFor(r, sym));
const table = (sym: string) =>
  ladderFor(sym).map(r => `${r.id}:${r.availability === "NATIVE_PROVIDER" ? "N" : r.availability === "DERIVED_CANONICAL" ? "D" : "U"}`).join(" ");
// tastytrade's own candles: 5s / 15s / 30s, every minute size it streams, hours, days, weeks, months.
const TASTY = "TICK:U 1s:U 5s:N 10s:U 15s:N 30s:N 1m:N 2m:N 3m:N 5m:N 10m:N 15m:N 20m:N 30m:N 1h:N 2h:N 4h:N 1D:N 1W:N 1M:N 1Q:U 6M:U 1Y:U";
const NOTHING = CANON_LADDER.map(r => `${r.id}:U`).join(" ");
const DELAYED = ["Alpaca", "Finnhub", "Yahoo", "Polygon"];

describe("canonAvailabilityFor — the ladder for the instrument actually on the glass", () => {
  it("stocks and futures: tastytrade's own candles at every size it serves", () => {
    for (const sym of ["TSLA", "SPY", "ES1!", "NQ1!", "GC1!"]) expect(table(sym), sym).toBe(TASTY);
    expect(chartBarRouteFor("4h", "TSLA")).toMatchObject({ vendor: "tastytrade", mode: "NATIVE", exact: true, served: "4-hour candles" });
    expect(chartBarRouteFor("5s", "ES1!")).toMatchObject({ vendor: "tastytrade", mode: "NATIVE", exact: true, served: "5-second candles" });
    expect(chartBarRouteFor("1M", "ES1!")).toMatchObject({ vendor: "tastytrade", exact: true, served: "monthly candles" });
  });

  it("BTC: Coinbase where it publishes, tastytrade's listed BTC/USD everywhere else", () => {
    for (const sym of ["BTC", "BTC-USD"]) expect(table(sym), sym).toBe(TASTY);
    for (const id of ["1m", "5m", "15m", "1h"]) expect(chartBarRouteFor(id, "BTC")?.vendor, id).toBe("Coinbase");
    for (const id of ["2m", "3m", "10m", "30m", "2h", "4h", "1D", "1W", "1M"]) expect(chartBarRouteFor(id, "BTC")?.vendor, id).toBe("tastytrade");
  });

  it("a USDT pair keeps only Coinbase's own sizes — no delayed door fills the rest", () => {
    expect(table("BTCUSDT")).toBe("TICK:U 1s:U 5s:U 10s:U 15s:U 30s:U 1m:N 2m:U 3m:U 5m:N 10m:U 15m:N 20m:U 30m:U 1h:N 2h:U 4h:U 1D:U 1W:U 1M:U 1Q:U 6M:U 1Y:U");
    const r = canonAvailabilityFor(CANON_LADDER.find(x => x.id === "1D")!, "BTCUSDT");
    if (r.availability !== "UNAVAILABLE") throw new Error("1D BTCUSDT should be unavailable");
    expect(r.reason).toMatch(/No bar route/);
  });

  it("spot FX and an unlisted coin have no live door — every rung UNAVAILABLE", () => {
    for (const sym of ["EURUSD", "SHIBUSDT"]) expect(table(sym), sym).toBe(NOTHING);
  });

  it("cash indices tastytrade streams take its candles (proved on serving 2026-10-12)", () => {
    for (const sym of ["SPX", "^GSPC", "NDX", "VIX", "^VIX", "RUT"]) expect(table(sym), sym).toBe(TASTY);
    expect(chartBarRouteFor("5m", "SPX")).toMatchObject({ vendor: "tastytrade", mode: "NATIVE", exact: true });
  });

  it("no route ever names a delayed or dead vendor", () => {
    for (const sym of ["TSLA", "ES1!", "BTC", "BTCUSD", "BTCUSDT", "SHIBUSDT", "EURUSD", "SPX", "BTC.COINBASE"]) {
      for (const tf of TF_IDS) expect(DELAYED, `${sym} ${tf}`).not.toContain(chartBarRouteFor(tf, sym)?.vendor);
    }
  });

  it("an UNAVAILABLE rung stays unavailable for every symbol — no route promotes it", () => {
    for (const sym of ["TSLA", "ES1!", "BTC", "BTCUSD", "EURUSD"]) {
      for (const r of CANON_LADDER) {
        if (r.availability === "UNAVAILABLE") expect(canonAvailabilityFor(r, sym), `${sym} ${r.id}`).toBe(r);
      }
    }
  });

  it("a rung no route serves for the symbol is UNAVAILABLE with a reason — not native by default", () => {
    const fake: CanonRung = { id: "3m", group: "MINUTES", n: 3, unit: "minute", availability: "NATIVE_PROVIDER", chartTf: "45m" };
    const r = canonAvailabilityFor(fake, "TSLA");
    expect(r.availability).toBe("UNAVAILABLE");
    if (r.availability === "UNAVAILABLE") expect(r.reason).toMatch(/No bar route/);
  });

  it("a route that serves a DIFFERENT bucket than the rung is UNAVAILABLE and says what it serves", () => {
    const quarter: CanonRung = { id: "1Q", group: "DAYS_LONGER", n: 1, unit: "quarter", availability: "NATIVE_PROVIDER", chartTf: "3M" };
    expect(chartBarRouteFor("3M", "TSLA")).toMatchObject({ vendor: "tastytrade", exact: false, served: "monthly candles" });
    const r = canonAvailabilityFor(quarter, "TSLA");
    if (r.availability !== "UNAVAILABLE") throw new Error(`drifted rung was ${r.availability}`);
    expect(r.reason).toMatch(/^Served as monthly candles here — not /);
  });
});

describe("bucket words", () => {
  it("bucket words are plain and calendar-honest", () => {
    expect(bucketWords({ n: 1, unit: "month" })).toBe("monthly");
    expect(bucketWords({ n: 3, unit: "month" })).toBe("quarterly");
    expect(bucketWords({ n: 12, unit: "month" })).toBe("yearly");
    expect(bucketWords({ n: 60, unit: "month" })).toBe("5-year");
    expect(bucketWords({ n: 4, unit: "hour" })).toBe("4-hour");
    expect(bucketWords({ n: 1, unit: "hour" })).toBe("hourly");
  });
});

describe("ladderOnNowSentence — the chart's timeframe in words when no rung can be marked", () => {
  it("6M / 1Y on TSLA and ES1!: served as tastytrade's monthly candles, pending the Founder's decision", () => {
    for (const sym of ["TSLA", "ES1!"]) for (const tf of ["6M", "1Y"]) {
      expect(ladderOnNowSentence(tf, sym, ladderFor(sym)), `${sym} ${tf}`)
        .toBe(`On now: ${tf} — served as monthly candles · pending the Founder's decision`);
    }
  });

  it("45m: no route serves it — said so, still pending", () => {
    for (const sym of ["TSLA", "ES1!", "BTC"]) {
      expect(ladderOnNowSentence("45m", sym, ladderFor(sym)), sym)
        .toBe("On now: 45m — no bar route serves it for this instrument · pending the Founder's decision");
    }
  });

  it("is null when a servable rung IS the timeframe — its own aria-current says it", () => {
    for (const tf of ["1m", "3m", "4h", "1D", "1M"]) expect(ladderOnNowSentence(tf, "TSLA", ladderFor("TSLA")), tf).toBeNull();
    expect(ladderOnNowSentence("4h", "ES1!", ladderFor("ES1!"))).toBeNull();
  });

  it("pending means exactly the six ids the registry names as pending", () => {
    expect(TF_IDS.filter(timeframePendingFounderDecision)).toEqual(["45m", "3M", "6M", "1Y", "2Y", "5Y"]);
    expect(timeframePendingFounderDecision("TICK")).toBe(false);
    expect(timeframePendingFounderDecision("20m")).toBe(false);
  });
});

describe("the header names the bars actually served (Garden 16 §26)", () => {
  it("TSLA / ES1! 6M and 1Y are served as monthly candles, so the header speaks of 1M bars", () => {
    for (const sym of ["TSLA", "ES1!"]) {
      expect(servedTimeframeFor("6M", sym)).toBe("1M");
      expect(servedTimeframeFor("1Y", sym)).toBe("1M");
    }
  });
  it("an exact route keeps its own timeframe", () => {
    expect(servedTimeframeFor("1D", "TSLA")).toBe("1D");
    expect(servedTimeframeFor("15m", "TSLA")).toBe("15m");
  });
});
