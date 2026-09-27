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
import {
  alpacaCryptoPairResolves, bucketWords, canonAvailabilityFor, chartBarRouteFor, finnhubBucket, ladderOnNowSentence,
} from "./chartBarRoute";
import { ALPACA_TF_MAP } from "./alpacaBarRoute";
import { FH_NATIVE_RES } from "./finnhubBarRoute";
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
    // Finnhub REST (door 3) is not asked for crypto, so Yahoo answers 30m / 1D
    // before the last-door Finnhub is reached.
    for (const tf of ["30m", "1D"]) expect(chartBarRouteFor(tf, "BTCUSD")?.vendor, tf).toBe("Yahoo");
  });

  /*
   * USDT PAIRS (verifier, 2026-09-27). The chart's history load for BTCUSDT,
   * read off MainChart's waterfall (exchange → Alpaca → Finnhub REST → Yahoo →
   * Finnhub):
   *   /api/exchange  Coinbase BTC-USD (coinbaseProduct names the tape's venue):
   *                  1m / 5m / 15m / 1h only — "1D" is not a Coinbase key.
   *   /api/alpaca    asked for "BTCUSDT/USD" — no such pair, empty.
   *   Finnhub REST   not asked for crypto.
   *   /api/yahoo     notAsked: WM does not answer a USDT request with USD.
   *   /api/finnhub   BINANCE:BTCUSDT, FH_NATIVE_RES: 1m 5m 15m 30m 1h 1D 1W 1M.
   *                  3m / 10m / 2h / 4h answer UNAVAILABLE with no bars.
   * So 30m / 1D / 1W / 1M load (from Finnhub) and were mislabelled "No bar
   * route"; 3m / 10m / 2h / 4h load from NO door and are rightly unavailable.
   */
  it("BTCUSDT / ETHUSDT / SOLUSDT: Coinbase where it publishes, Finnhub's USDT pair for 30m and 1D / 1W / 1M", () => {
    for (const sym of ["BTCUSDT", "ETHUSDT", "SOLUSDT"]) {
      expect(table(sym), sym).toBe(TAIL +
        "1m:N 2m:U 3m:U 5m:N 10m:U 15m:N 20m:U 30m:N 1h:N 2h:U 4h:U 1D:N 1W:N 1M:N 1Q:U 6M:U 1Y:U");
      expect(chartBarRouteFor("1h", sym), sym).toMatchObject({ vendor: "Coinbase", mode: "NATIVE", exact: true });
      expect(chartBarRouteFor("1D", sym), sym).toMatchObject({ vendor: "Finnhub", mode: "NATIVE", exact: true, served: "daily candles" });
      expect(chartBarRouteFor("30m", sym)?.vendor, sym).toBe("Finnhub");
      for (const tf of ["3m", "10m", "2h", "4h"]) {
        expect(chartBarRouteFor(tf, sym), `${sym} ${tf}`).toBeNull();
        const r = canonAvailabilityFor(CANON_LADDER.find(x => x.id === tf)!, sym);
        if (r.availability !== "UNAVAILABLE") throw new Error(`${sym} ${tf} is ${r.availability}`);
        expect(r.reason).toMatch(/No bar route/);
      }
    }
  });

  it("SHIBUSDT: no Coinbase product, so Finnhub is the only door — every size it publishes is native", () => {
    expect(table("SHIBUSDT")).toBe(TAIL +
      "1m:N 2m:U 3m:U 5m:N 10m:U 15m:N 20m:U 30m:N 1h:N 2h:U 4h:U 1D:N 1W:N 1M:N 1Q:U 6M:U 1Y:U");
    expect(chartBarRouteFor("1m", "SHIBUSDT")?.vendor).toBe("Finnhub");
  });

  it("Finnhub is never walked for what the chart does not ask it: futures, venue-pinned rows", () => {
    // ES1! is never asked of Finnhub (equityVendorSkipNoun); BTC.COINBASE is
    // refused by toFinnhubSym (a venue row). Neither is ever answered by it.
    for (const sym of ["ES1!", "GC1!", "BTC.COINBASE"]) {
      for (const tf of TF_IDS) expect(chartBarRouteFor(tf, sym)?.vendor, `${sym} ${tf}`).not.toBe("Finnhub");
    }
    expect(chartBarRouteFor("30m", "ES1!")?.vendor).toBe("Yahoo");
    // The door itself, asked directly: the route 404s when toFinnhubSym is
    // null, and MainChart never asks it for futures. (Yahoo answers both rows
    // first today, so only the door can show the refusal.)
    expect(finnhubBucket("1D", "BTC.COINBASE")).toBeNull();
    expect(finnhubBucket("1D", "ES1!")).toBeNull();
    expect(finnhubBucket("1D", "BTCUSDT")).toEqual({ n: 1, unit: "day" });
    expect(finnhubBucket("3m", "BTCUSDT")).toBeNull();
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
    // No shipped rung reaches this today (every servable rung's chartTf is its
    // own size). It is the guard for drift: a quarter rung pointed at the 3M
    // chart id would get Alpaca's MONTHLY candles, and must not be called native.
    const quarter: CanonRung = { id: "1Q", group: "DAYS_LONGER", n: 1, unit: "quarter", availability: "NATIVE_PROVIDER", chartTf: "3M" };
    expect(chartBarRouteFor("3M", "TSLA")).toMatchObject({ vendor: "Alpaca", exact: false, served: "monthly candles" });
    const r = canonAvailabilityFor(quarter, "TSLA");
    if (r.availability !== "UNAVAILABLE") throw new Error(`drifted rung was ${r.availability}`);
    expect(r.reason).toMatch(/^Served as monthly candles here — not /);
    for (const sym of ["TSLA", "ES1!", "BTC", "BTCUSD", "BTCUSDT", "SHIBUSDT", "EURUSD"]) {
      for (const rung of CANON_LADDER) {
        const got = canonAvailabilityFor(rung, sym);
        if (got.availability === "UNAVAILABLE") expect(got.reason, `${sym} ${rung.id}`).not.toMatch(/^Served as/);
      }
    }
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

  it("every Finnhub NATIVE answer is the resolution FH_NATIVE_RES names — the route's own table", () => {
    const res = { minute: (n: number) => String(n), hour: (n: number) => String(n * 60), day: () => "D", week: () => "W", month: () => "M" } as const;
    let seen = 0;
    for (const sym of ["BTCUSDT", "SHIBUSDT"]) {
      for (const tf of TF_IDS) {
        const r = chartBarRouteFor(tf, sym);
        if (r?.vendor !== "Finnhub") continue;
        seen++;
        expect(res[r.bucket.unit as "minute"](r.bucket.n), `${sym} ${tf}`).toBe(FH_NATIVE_RES[tf]);
      }
    }
    expect(seen).toBeGreaterThan(5);
  });

  it("door 3 (Finnhub REST, equities) is unreachable: for non-crypto symbols Alpaca covers every FH_NATIVE_RES id", () => {
    // Door 3 is walked only after Alpaca (door 2) declined, and for a
    // non-crypto symbol Alpaca declines only an id ALPACA_TF_MAP lacks.
    for (const tf of Object.keys(FH_NATIVE_RES)) {
      expect(Object.prototype.hasOwnProperty.call(ALPACA_TF_MAP, tf), `FH_NATIVE_RES "${tf}" is not in ALPACA_TF_MAP — door 3 is live`).toBe(true);
    }
    for (const sym of ["TSLA", "SPY", "AAPL"]) {
      for (const tf of TF_IDS) expect(chartBarRouteFor(tf, sym)?.vendor, `${sym} ${tf}`).not.toBe("Finnhub");
    }
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
