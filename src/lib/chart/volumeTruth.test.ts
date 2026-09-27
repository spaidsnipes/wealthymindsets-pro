/**
 * No placeholder volume drawn as volume (GP12 §82, 2026-09-26).
 *
 * MEASURED ON SERVING 2026-09-26 05:01 CDT, /charts?symbol=EURUSD&tf=15m: the
 * footer read "Vol 1" and the histogram drew a full-height bar at the live
 * edge. /api/yahoo?sym=EURUSD&type=candles returned `volume: 0` on every bar.
 */
import { describe, expect, it } from "vitest";
import { hasNoCentralVolume, PLACEHOLDER_MIN_BARS, volumeBearingBars, volumeTruthFor } from "./volumeTruth";
import { volumeSeriesPoints } from "./mainSeriesPoints";
import { chartVolumeFooterFact } from "./chartVolumeFooterFact";
import { computeProfileFromBars } from "@/lib/vpEngine";
import { buildLivingProfileSnapshot, selectLivingProfile } from "@/lib/marketData/viewModels/selectLivingProfile";
import { selectVisibleRangeProfile } from "@/lib/marketData/viewModels/selectVisibleRangeProfile";

const mk = (n: number, vol: (i: number) => number, base = 1.139) =>
  Array.from({ length: n }, (_, i) => {
    const p = base + Math.sin(i / 3) * 0.002;
    return { time: 1790359140 + i * 900, open: p, high: p + 0.0006, low: p - 0.0006, close: p + 0.0002, volume: vol(i) };
  });

/** EURUSD 15m as served: a week of 0s and a live bar carrying 1. */
const EURUSD = mk(300, i => (i === 299 ? 1 : 0));
const TSLA = mk(300, i => 12000 + i * 7, 373);

describe("volumeTruthFor", () => {
  it("spot FX and spot metals have no central volume, whatever the feed sends", () => {
    for (const s of ["EURUSD", "EUR/USD", "EURUSD=X", "USDJPY", "USDMXN"]) {
      const t = volumeTruthFor(s, TSLA);
      expect(t.real, s).toBe(false);
      if (!t.real) {
        expect(t.reason).toBe("NO_CENTRAL_VOLUME");
        expect(t.text).toBe("NO CENTRAL VOLUME · spot FX");
      }
    }
    const xau = volumeTruthFor("XAUUSD", TSLA);
    expect(xau.real).toBe(false);
    if (!xau.real) expect(xau.text).toBe("NO CENTRAL VOLUME · spot metals");
  });

  it("futures, equities and crypto with real counts are real", () => {
    expect(volumeTruthFor("TSLA", TSLA).real).toBe(true);
    expect(volumeTruthFor("ES1!", TSLA).real).toBe(true);
    expect(volumeTruthFor("6E1!", TSLA).real).toBe(true); // FX FUTURES trade on one venue
    expect(volumeTruthFor("BTCUSD", mk(300, () => 0.42)).real).toBe(true);
    expect(hasNoCentralVolume("6E1!")).toBeNull();
    expect(hasNoCentralVolume("BTC/USD")).toBeNull();
  });

  it("an all-0/1 feed is a placeholder on any class — once there is a sample to say so", () => {
    const vix = mk(300, i => i % 2);
    const t = volumeTruthFor("VIX", vix);
    expect(t.real).toBe(false);
    if (!t.real) expect(t.reason).toBe("PLACEHOLDER_VOLUME");
    // Too few bars cannot prove it.
    expect(volumeTruthFor("VIX", mk(PLACEHOLDER_MIN_BARS - 1, () => 0)).real).toBe(true);
    // One real count anywhere and the feed is a feed.
    expect(volumeTruthFor("VIX", mk(300, i => (i === 5 ? 2 : 0))).real).toBe(true);
  });
});

describe("the histogram and the footer name the silence", () => {
  it("EURUSD draws no histogram; TSLA draws every bar; no symbol keeps the old contract", () => {
    expect(volumeSeriesPoints(EURUSD, "U", "D", "EURUSD")).toEqual([]);
    expect(volumeSeriesPoints(TSLA, "U", "D", "TSLA")).toHaveLength(300);
    expect(volumeSeriesPoints(EURUSD, "U", "D")).toHaveLength(300);
  });

  it("the footer prints the named silence, never 'Vol 1'", () => {
    const f = chartVolumeFooterFact(1, "scope", volumeTruthFor("EURUSD", EURUSD));
    expect(f.state).toBe("SILENT");
    expect(f.text).toBe("NO CENTRAL VOLUME · spot FX");
    expect(f.text).not.toMatch(/^Vol \d/);
    const real = chartVolumeFooterFact(12345, "scope", volumeTruthFor("TSLA", TSLA));
    expect(real.state).toBe("OBSERVED");
    expect(real.text).toBe(chartVolumeFooterFact(12345, "scope").text);
  });
});

describe("volume-weighted layers do not draw from the placeholder", () => {
  it("the defect: fed raw, one live '1' is enough to build a profile", () => {
    // Proved on the raw bars, so the gate below is not guarding a phantom.
    expect(computeProfileFromBars(EURUSD, { targetRows: 64 }).totalVolume).toBeGreaterThan(0);
    expect(selectVisibleRangeProfile(EURUSD, EURUSD[0].time, EURUSD[EURUSD.length - 1].time).reason).not.toBe("NO_VOLUME");
  });

  it("through the gate, VP / VRP / Living Profile each say NO VOLUME", () => {
    const gated = [...volumeBearingBars("EURUSD", EURUSD)];
    expect(computeProfileFromBars(gated, { targetRows: 64 }).totalVolume).toBe(0);
    expect(selectVisibleRangeProfile(gated, gated[0].time, gated[gated.length - 1].time).reason).toBe("NO_VOLUME");
    const lp = selectLivingProfile(buildLivingProfileSnapshot(null, gated));
    expect(lp.measured).toBe(false);
    expect(lp.missingInput).toBe("NO_PROFILE");
    // Prices untouched.
    expect(gated.map(b => b.close)).toEqual(EURUSD.map(b => b.close));
  });

  it("real volume passes through as the same array", () => {
    expect(volumeBearingBars("TSLA", TSLA)).toBe(TSLA);
  });
});
