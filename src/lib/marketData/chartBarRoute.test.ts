/**
 * NATIVE IS NATIVE, DERIVED IS DERIVED — per symbol (Garden 16 §26, 2026-09-26).
 *
 * The verifier's finding: the ladder marked 3m / 10m / 2h / 4h NATIVE for
 * every symbol. True for TSLA (Alpaca publishes 3Min / 10Min / 2Hour / 4Hour),
 * false for ES1! (Alpaca is never asked for futures; Yahoo folds them from
 * 1m / 5m / 60m bars). These cases pin the per-symbol answer to the SAME
 * owners the chart's history load asks, and pin the one sentence the ladder
 * prints when the chart's timeframe is not a rung it can mark.
 */
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  alpacaCryptoPairResolves, bucketWords, canonAvailabilityFor, chartBarRouteFor, ladderOnNowSentence,
} from "./chartBarRoute";
import { ALPACA_TF_MAP } from "./alpacaBarRoute";
import { CANON_LADDER, TF_IDS, isTFId, timeframePendingFounderDecision, type CanonRung } from "@/lib/timeframes";

const ladderFor = (sym: string) => CANON_LADDER.map(r => canonAvailabilityFor(r, sym));
const table = (sym: string) =>
  ladderFor(sym).map(r => `${r.id}:${r.availability === "NATIVE_PROVIDER" ? "N" : r.availability === "DERIVED_CANONICAL" ? "D" : "U"}`).join(" ");
const TAIL = "TICK:U 1s:U 5s:U 10s:U 15s:U 30s:U ";

describe("canonAvailabilityFor — the ladder for the instrument actually on the glass", () => {
  it("TSLA: every servable rung is native — Alpaca publishes each bucket", () => {
    expect(table("TSLA")).toBe(TAIL +
      "1m:N 2m:N 3m:N 5m:N 10m:N 15m:N 20m:U 30m:N 1h:N 2h:N 4h:N 1D:N 1W:N 1M:N 1Q:U 6M:U 1Y:U");
    for (const id of ["3m", "10m", "2h", "4h"]) expect(chartBarRouteFor(id, "TSLA")).toMatchObject({ vendor: "Alpaca", mode: "NATIVE", exact: true });
  });

  it("ES1!: 3m / 10m / 2h / 4h are DERIVED — Yahoo rebuilds them, Alpaca is never asked for futures", () => {
    expect(table("ES1!")).toBe(TAIL +
      "1m:N 2m:N 3m:D 5m:N 10m:D 15m:N 20m:U 30m:N 1h:N 2h:D 4h:D 1D:N 1W:N 1M:N 1Q:U 6M:U 1Y:U");
    expect(chartBarRouteFor("4h", "ES1!")).toMatchObject({ vendor: "Yahoo", mode: "RECONSTRUCTED", served: "4-hour candles rebuilt from hourly bars" });
    expect(chartBarRouteFor("3m", "ES1!")?.served).toBe("3-minute candles rebuilt from 1-minute bars");
    expect(chartBarRouteFor("10m", "ES1!")?.served).toBe("10-minute candles rebuilt from 5-minute bars");
    // NQ1! and GC1! take the same door.
    for (const sym of ["NQ1!", "GC1!"]) expect(table(sym), sym).toBe(table("ES1!"));
  });

  it("BTC: Coinbase where it publishes, Alpaca's BTC/USD bars elsewhere — nothing rebuilt", () => {
    expect(table("BTC")).toBe(table("TSLA"));
    for (const id of ["1m", "5m", "15m", "1h"]) expect(chartBarRouteFor(id, "BTC")?.vendor, id).toBe("Coinbase");
    // Coinbase does not publish these (and "1D" is not its key), so the
    // chart falls to Alpaca, which does, as BTC/USD.
    for (const id of ["2m", "3m", "10m", "30m", "2h", "4h", "1D", "1W", "1M"]) {
      expect(chartBarRouteFor(id, "BTC"), id).toMatchObject({ vendor: "Alpaca", mode: "NATIVE" });
    }
    expect(alpacaCryptoPairResolves("BTC")).toBe(true);
    expect(alpacaCryptoPairResolves("BTC-USD")).toBe(true);
  });

  it("BTCUSD: Alpaca is asked for BTCUSD/USD, which is not a pair — so Yahoo rebuilds 3m / 10m / 2h / 4h", () => {
    expect(alpacaCryptoPairResolves("BTCUSD")).toBe(false);
    expect(table("BTCUSD")).toBe(table("ES1!"));
    expect(chartBarRouteFor("2h", "BTCUSD")).toMatchObject({ vendor: "Yahoo", mode: "RECONSTRUCTED" });
    expect(chartBarRouteFor("1m", "BTCUSD")?.vendor).toBe("Coinbase");
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
});

describe("the model walks the real route tables, not a copy", () => {
  it("every Alpaca NATIVE answer is the bucket ALPACA_TF_MAP names", () => {
    for (const tf of TF_IDS) {
      const r = chartBarRouteFor(tf, "TSLA");
      if (r?.vendor !== "Alpaca") continue;
      const want = ALPACA_TF_MAP[tf].timeframe;
      const unit = { minute: "Min", hour: "Hour", day: "Day", week: "Week", month: "Month" }[r.bucket.unit];
      expect(`${r.bucket.n}${unit}`, tf).toBe(want);
    }
  });

  it("Finnhub (not walked) serves no chart id Alpaca does not — so skipping it cannot change an answer", () => {
    const src = readFileSync(join(process.cwd(), "src/app/api/finnhub/route.ts"), "utf8");
    const start = src.indexOf("const FH_NATIVE_RES");
    expect(start).toBeGreaterThan(-1);
    const keys = [...src.slice(start, src.indexOf("};", start)).matchAll(/"([^"]+)":\s*"/g)].map(m => m[1]);
    expect(keys.length).toBeGreaterThan(5);
    for (const k of keys.filter(isTFId)) expect(Object.keys(ALPACA_TF_MAP), k).toContain(k);
  });

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
  it("1Y on TSLA: served as Alpaca's monthly candles, pending the Founder's decision", () => {
    expect(ladderOnNowSentence("1Y", "TSLA", ladderFor("TSLA")))
      .toBe("On now: 1Y — served as monthly candles · pending the Founder's decision");
  });

  it("6M on TSLA says monthly; on ES1! it says what Yahoo rebuilds", () => {
    expect(ladderOnNowSentence("6M", "TSLA", ladderFor("TSLA")))
      .toBe("On now: 6M — served as monthly candles · pending the Founder's decision");
    expect(ladderOnNowSentence("6M", "ES1!", ladderFor("ES1!")))
      .toBe("On now: 6M — served as half-year candles rebuilt from quarterly bars · pending the Founder's decision");
    expect(ladderOnNowSentence("1Y", "ES1!", ladderFor("ES1!")))
      .toBe("On now: 1Y — served as yearly candles rebuilt from monthly bars · pending the Founder's decision");
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
