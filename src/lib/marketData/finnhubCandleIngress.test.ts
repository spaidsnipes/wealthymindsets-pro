import { describe, it, expect } from "vitest";
import {
  canonicalTimeframeForFinnhubResolution,
  finnhubSessionModel,
  finnhubSymbolId,
  ingestFinnhubCandles,
  toLegacySecondsTuple,
  type FinnhubCandleColumns,
} from "./finnhubCandleIngress";
import {
  BAR_PROVENANCES,
  SESSION_CONTINUOUS,
  SESSION_UNKNOWN,
  isSessionKnown,
} from "./canonicalBar";
import { MARKET_FIDELITIES } from "./marketFidelityAlgebra";
import { alpacaSymbolId } from "./alpacaCandleIngress";
import { exchangeSymbolId } from "./exchangeCandleIngress";

/** Epoch SECONDS, the unit Finnhub actually sends. */
const T = 1_789_000_200;

const cols = (over: Partial<FinnhubCandleColumns> = {}): FinnhubCandleColumns => ({
  t: [T], o: [100], h: [110], l: [90], c: [105], v: [1_000], ...over,
});

const ingest = (
  columns: FinnhubCandleColumns,
  providerSym = "TSLA",
  resolution = "15",
) =>
  ingestFinnhubCandles({
    providerSym,
    resolution,
    columns,
    receivedAt: T * 1000 + 9_000,
  });

describe("finnhubCandleIngress — the artery's fourth production consumer", () => {
  it("mints a CanonicalBar carrying every field a tuple cannot hold", () => {
    const { bars } = ingest(cols());
    expect(bars).toHaveLength(1);
    const bar = bars[0];
    expect(bar.symbolId).toBe("FINNHUB:TSLA");
    expect(bar.timeframe).toBe("15m");
    expect(bar.source).toBe("finnhub");
    expect(bar.provenance).toBe(BAR_PROVENANCES.REST_BACKFILL);
    expect(bar.receivedAt).toBe(T * 1000 + 9_000);
    expect(bar.asOf).not.toBe(bar.receivedAt);
  });

  /* ── THE FABRICATION THAT IS WORSE THAN `?? 0`: A MANUFACTURED WICK ───────── */

  it("refuses a bar with NO high instead of drawing it with no wick", () => {
    // The old mapping was `high: h ?? Math.max(o, c)`. That does not default a
    // value, it MANUFACTURES A CANDLE GEOMETRY — a bar with no wick — and a
    // wick is exactly what a rejection/absorption reader is looking at. It is
    // indistinguishable on screen from a real wickless print.
    const { bars, refusals } = ingest(cols({ h: [undefined] }));
    expect(bars).toHaveLength(0);
    expect(refusals).toHaveLength(1);
    expect(refusals[0].reason).toContain("not a finite number");
  });

  it("refuses a bar with NO low for the same reason", () => {
    const { bars, refusals } = ingest(cols({ l: [undefined] }));
    expect(bars).toHaveLength(0);
    expect(refusals[0].reason).toContain("not a finite number");
  });

  it("never silently invents a high equal to max(open, close)", () => {
    // The precise shape of the old repair: with o=100 c=105 and h absent, the
    // fabricated high was 105. If a bar ever comes back with high === close on
    // an absent high, the repair has returned.
    const { bars } = ingest(cols({ h: [undefined] }));
    expect(bars.map(b => b.high)).not.toContain(105);
  });

  it("still draws a bar whose high GENUINELY equals the close", () => {
    // The fix must not amputate real bars: a true wickless print exists and
    // must still draw. Refusal is for ABSENCE, never for a shape we dislike.
    const { bars, refusals } = ingest(cols({ h: [105], c: [105] }));
    expect(refusals).toHaveLength(0);
    expect(bars[0].high).toBe(105);
  });

  /* ── THE `?? 0` FAMILY, THIRD ROUTE ───────────────────────────────────────── */

  it("refuses a bar with NO volume instead of calling it zero-volume", () => {
    const { bars, refusals } = ingest(cols({ v: [undefined] }));
    expect(bars).toHaveLength(0);
    expect(refusals[0].reason).toContain("volume is not a finite number");
  });

  it("still draws a bar whose volume is GENUINELY zero", () => {
    const { bars, refusals } = ingest(cols({ v: [0] }));
    expect(refusals).toHaveLength(0);
    expect(bars[0].volume).toBe(0);
  });

  /* ── THE SILENT DROP BECOMES A COUNTED REFUSAL ────────────────────────────── */

  it("counts a dropped bar rather than shortening the chart in silence", () => {
    // `if (o == null || c == null) continue;` removed the bar with no count
    // and no record. A silently dropped bar is an INVISIBLE gap.
    const { bars, refusals } = ingest(
      cols({
        t: [T, T + 900, T + 1800],
        o: [100, null, 100],
        h: [110, 110, 110],
        l: [90, 90, 90],
        c: [105, 105, 105],
        v: [1, 1, 1],
      }),
    );
    expect(bars).toHaveLength(2);
    expect(refusals).toHaveLength(1);
    expect(refusals[0].at).toBe(T + 900);
  });

  it("refuses a row whose columns are SHORTER than the timestamp column", () => {
    // A short column is a MISALIGNED response, not a bar with a missing field.
    // `json.h?.[i]` past the end yields undefined, which the old code then
    // repaired into a wick.
    const { bars, refusals } = ingest(
      cols({ t: [T, T + 900], o: [100, 100], h: [110], l: [90, 90], c: [105, 105], v: [1, 1] }),
    );
    expect(bars).toHaveLength(1);
    expect(refusals).toHaveLength(1);
    expect(refusals[0].at).toBe(T + 900);
  });

  /* ── THE UNIT TRAP, IN BOTH DIRECTIONS ────────────────────────────────────── */

  it("widens SECONDS to MILLISECONDS on the way in", () => {
    // First ingress whose PROVIDER speaks seconds. Getting this backwards puts
    // every bar in 1970 with no type error.
    expect(ingest(cols()).bars[0].asOf).toBe(T * 1000);
  });

  it("narrows back to SECONDS on the way out, the unit this route publishes", () => {
    const { bars } = ingest(cols());
    expect(toLegacySecondsTuple(bars[0])).toEqual({
      time: T, open: 100, high: 110, low: 90, close: 105, volume: 1_000,
    });
  });

  /* ── IDENTITY IS THE INSTRUMENT ANSWERED, NOT THE ONE ASKED FOR ───────────── */

  it("keeps the venue that owns the book when the provider symbol names one", () => {
    // "BTCUSD" is answered from BINANCE:BTCUSDT. USDT is not USD. Minting from
    // the REQUEST would file a Binance USDT bar under a USD instrument's name.
    expect(finnhubSymbolId("BINANCE:BTCUSDT")).toBe("BINANCE:BTCUSDT");
    expect(finnhubSymbolId("TSLA")).toBe("FINNHUB:TSLA");
  });

  it("stays distinct from every other migrated ingress in the shared artery", () => {
    // Four ingresses now mint into the SAME id space. Unprefixed, two of them
    // would mint one barId for the same instant and admitBar would refuse the
    // second at equal truthEpoch as a redelivery — deleting a real bar.
    const ids = [
      finnhubSymbolId("BINANCE:BTCUSDT"),
      alpacaSymbolId("BTC/USD"),
      exchangeSymbolId("coinbase", "BTC"),
    ];
    expect(new Set(ids).size).toBe(3);
  });

  it("refuses to mint an identity for a blank or half-formed symbol", () => {
    // "FINNHUB:" is NOT blank, so the prefix would smuggle emptiness past the
    // very check mintBarId exists to perform.
    expect(finnhubSymbolId("   ")).toBe("");
    expect(finnhubSymbolId("BINANCE:")).toBe("");
    expect(finnhubSymbolId(":BTCUSDT")).toBe("");
    const { bars, refusals } = ingest(cols(), "  ");
    expect(bars).toHaveLength(0);
    expect(refusals[0].reason).toContain("no identity to mint");
  });

  /* ── SESSION AND FIDELITY ─────────────────────────────────────────────────── */

  it("says Binance has no sessions and a US equity has an unstated one", () => {
    expect(finnhubSessionModel("BINANCE:BTCUSDT")).toBe(SESSION_CONTINUOUS);
    expect(finnhubSessionModel("TSLA")).toBe(SESSION_UNKNOWN);

    const crypto = ingest(cols(), "BINANCE:BTCUSDT").bars[0];
    const stock = ingest(cols()).bars[0];
    expect(isSessionKnown(crypto.sessionId)).toBe(true);
    expect(isSessionKnown(stock.sessionId)).toBe(false);
  });

  it("never claims EXECUTABLE — real-time is latency, not what an order meets", () => {
    for (const sym of ["TSLA", "BINANCE:BTCUSDT"]) {
      expect(ingest(cols(), sym).bars[0].fidelity).toBe(MARKET_FIDELITIES.INDICATIVE);
      expect(ingest(cols(), sym).bars[0].fidelity).not.toBe(MARKET_FIDELITIES.EXECUTABLE);
    }
  });

  /* ── TIMEFRAME FROM THE RESOLUTION, NEVER THE REQUEST ─────────────────────── */

  it("names the RESOLVED resolution and refuses one it does not know", () => {
    expect(canonicalTimeframeForFinnhubResolution("60")).toBe("1h");
    expect(canonicalTimeframeForFinnhubResolution("D")).toBe("1D");
    expect(canonicalTimeframeForFinnhubResolution("7")).toBe("");
    const { bars, refusals, timeframe } = ingest(cols(), "TSLA", "7");
    expect(timeframe).toBe("");
    expect(bars).toHaveLength(0);
    expect(refusals[0].reason).toContain("no identity to mint");
  });

  /* ── TIMESTAMPS, GEOMETRY, ORDER, COLLISION ───────────────────────────────── */

  it("refuses a non-finite timestamp instead of emitting NaN", () => {
    const { bars, refusals } = ingest(cols({ t: [Number.NaN] }));
    expect(bars).toHaveLength(0);
    expect(refusals[0].reason).toContain("missing or not a finite number");
  });

  it("refuses an inside-out bar rather than drawing it", () => {
    const { bars, refusals } = ingest(cols({ h: [90], l: [110] }));
    expect(bars).toHaveLength(0);
    expect(refusals[0].reason).toContain("inside out");
  });

  it("refuses a negative volume — a bar cannot un-trade", () => {
    expect(ingest(cols({ v: [-1] })).refusals[0].reason).toContain("un-trade");
  });

  it("refuses the same instant delivered twice rather than double-counting it", () => {
    const { bars, refusals } = ingest(
      cols({ t: [T, T], o: [100, 100], h: [110, 110], l: [90, 90], c: [105, 106], v: [1, 1] }),
    );
    expect(bars).toHaveLength(1);
    expect(bars[0].close).toBe(105);
    expect(refusals[0].reason).toContain("does not supersede");
  });

  it("sorts into chronological order whichever way the provider sent it", () => {
    const { bars } = ingest(
      cols({
        t: [T + 1800, T, T + 900],
        o: [100, 100, 100], h: [110, 110, 110],
        l: [90, 90, 90], c: [105, 105, 105], v: [1, 1, 1],
      }),
    );
    expect(bars.map(b => b.asOf)).toEqual([T * 1000, (T + 900) * 1000, (T + 1800) * 1000]);
  });
});
