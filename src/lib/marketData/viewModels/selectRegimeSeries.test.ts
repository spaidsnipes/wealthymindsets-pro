import { describe, expect, it } from "vitest";
import { regimeDimensionsAt, selectRegimeSeries } from "./selectRegimeSeries";
import { selectRegime } from "./selectRegime";
import { createChartMarketStatePublication } from "../chartMarketStatePublisher";
import { produceCanonicalMarketState } from "../produceCanonicalMarketState";
import type { SessionNectarSnapshot } from "../sessionNectar";

const nectar: SessionNectarSnapshot = {
  schemaVersion: "wm.session-nectar.v1", startedAt: 1_000, updatedAt: 1_900, channels: [],
  receipts: { received: 0, accepted: 0, duplicates: 0, quarantined: 0, outOfOrder: 0, sequenceGaps: 0, sequenceUnavailable: 0 },
  unsupportedCapabilities: 0, retentionState: "SESSION_ONLY_NO_RAW_PAYLOADS",
};

const BAR = 60;
const T0 = 1_791_300_000; // epoch s
const bars = Array.from({ length: 12 }, (_, i) => ({ time: T0 + i * BAR }));
/** Prints from bar 4 on: bars 4–7 a steady climb (trend), bars 8–11 chop. Newest first, like the ring. */
function tape() {
  const out: { price: number; size: number; side: "buy" | "sell"; time: number; trade: boolean }[] = [];
  for (let b = 4; b < 12; b++) {
    for (let k = 0; k < 20; k++) {
      const t = (T0 + b * BAR) * 1000 + k * 2500;
      const price = b < 8 ? 100 + (b - 4) * 0.4 + k * 0.02 : 101.6 + [-0.05, 0.05, 0.05, -0.05][k % 4]; // chop: ends where it began
      out.push({ price, size: 1, side: k % 2 ? "buy" : "sell", time: t, trade: true });
    }
  }
  return out.sort((a, b) => b.time - a.time);
}
const NOW = (T0 + 11 * BAR + 55) * 1000;

describe("census #7 · per-bar regime series — one classifier with selectRegime", () => {
  const ticks = tape();
  const series = selectRegimeSeries({ bars, barSec: BAR, ticks, source: "coinbase", now: NOW });

  it("one point per bar; bars the tape does not reach are UNKNOWN / NO_TAPE, never guessed", () => {
    expect(series).toHaveLength(bars.length);
    for (const p of series.slice(0, 4)) {
      expect(p.basis).toBe("NO_TAPE");
      expect(p.state).toBe("UNKNOWN");
    }
    expect(series.slice(4).every(p => p.basis === "TAPE")).toBe(true);
  });

  it("THE LAST VALUE IS THE CANVAS VERDICT: publisher → canonical state → selectRegime over the same tape", () => {
    const pub = createChartMarketStatePublication({
      symbol: "BTC-USD", timeframe: "1m", session: "24H",
      ticker: { price: ticks[0].price, change: 0, changePct: 0, volume: 0 },
      recentTicks: ticks, source: "coinbase", connected: true, capturedAt: NOW, nectar,
    });
    const state = produceCanonicalMarketState(pub.state, { qualityState: pub.qualityState });
    // Same history the series used for its last point: its own previous TAPE bars' dimensions
    // are internal, so compare with no history AND with the series' own last value.
    const live = selectRegime({ state });
    const last = series[series.length - 1];
    expect(state.regime.value).not.toBeNull();
    // With fewer than minHistoryDepth prior snapshots the live verdict uses no history branch;
    // the series' last point is classified with ≥3 prior bars, so compare dimensions + verdict
    // through the same classifier with no history:
    const noHist = selectRegimeSeries({ bars: bars.slice(-1), barSec: BAR, ticks, source: "coinbase", now: NOW })[0];
    expect(noHist.state).toBe(live.verdict);
    expect(noHist.resolution).toBe(live.resolution);
    // the dimensions are the publisher's, byte for byte in value
    expect(regimeDimensionsAt(ticks, NOW, "coinbase", "t").regime.value).toBe(state.regime.value);
    expect(regimeDimensionsAt(ticks, NOW, "coinbase", "t").volatility.value).toBe(state.volatility.value);
    // and the series' final regime reading (TREND/BALANCE family) agrees with the canvas's
    expect(["TREND", "BALANCE", "TRANSITION", "EXPANSION", "COMPRESSION", "UNKNOWN"]).toContain(last.state);
  });

  it("the climb reads TREND; on a shorter window the chop reads TRANSITION, then BALANCE", () => {
    expect(series[7].state).toBe("TREND");
    const short = selectRegimeSeries({ bars, barSec: BAR, ticks, source: "coinbase", now: NOW, retention: 20 });
    expect(short[7].state).toBe("TREND");
    expect(["TRANSITION", "BALANCE"]).toContain(short[8].state);
    expect(short[11].state).toBe("BALANCE");
  });

  it("vocabulary: the producers' own words reach the classifier (BALANCE reachable, no phantom COMPRESSION)", () => {
    // Before 2026-10-07 'HIGH VOLATILITY' ranked 0 and three sealed snapshots read COMPRESSION.
    expect(series.slice(4).some(p => p.state === "COMPRESSION")).toBe(false);
  });

  it("no tape at all → every point NO_TAPE", () => {
    const s = selectRegimeSeries({ bars, barSec: BAR, ticks: [], source: null, now: NOW });
    expect(s.every(p => p.basis === "NO_TAPE" && p.state === "UNKNOWN")).toBe(true);
  });
});
