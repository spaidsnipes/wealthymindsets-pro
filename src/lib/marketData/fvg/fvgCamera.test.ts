import { describe, expect, it } from "vitest";

import type { CanonicalBarIdentity, LegacyOhlcvTuple } from "@/lib/marketData/canonicalBar";
import { detectFvgs, fvgStateAsOf } from "./fvgEngine";
import { fvgReplayClockMs, fvgSceneForCamera } from "./fvgCamera";
import { rejoinCanonicalBars } from "./fvgWireBars";

type Row = readonly [number, number, number, number];
const MIN = 60;
const T0 = 1_791_000_000; // epoch seconds
const SYM = "BTC-USD";
const FLAT: Row[] = Array.from({ length: 15 }, () => [100, 101, 99, 100] as Row);
const BULL: Row[] = [[100, 101, 99, 100.5], [100.5, 104, 100.3, 103.8], [103.8, 105, 102, 104.5]];
const AWAY: Row = [104.5, 105, 103.5, 104.5];
const TOUCH: Row = [104, 104.2, 101.6, 102.6];
const ROWS: Row[] = [...FLAT, ...BULL, AWAY, TOUCH, AWAY, AWAY];

const candles: LegacyOhlcvTuple[] = ROWS.map(([o, h, l, c], i) => ({ time: T0 + i * MIN, open: o, high: h, low: l, close: c, volume: 1 }));
const identities: CanonicalBarIdentity[] = candles.map(c => ({
  barId: `${SYM}|1m|${c.time * 1000}|e0`, symbolId: SYM, sessionId: "SESSION_CONTINUOUS", timeframe: "1m",
  asOf: c.time * 1000, receivedAt: 0, fidelity: "INDICATIVE", source: "fixture", provenance: "REST_BACKFILL", truthEpoch: 0,
}));
const NOW = (T0 + ROWS.length * MIN) * 1000; // every bar closed
const B3 = FLAT.length + 2;
const base = { candles, identities, symbolId: SYM, timeframe: "1m", nowMs: NOW };

describe("FVG camera — Replay reads fvgStateAsOf(replayT), never the live ledger", () => {
  it("LIVE: the full ledger of closed bars", () => {
    const s = fvgSceneForCamera({ ...base, replayCursorTimeSec: null });
    const bars = rejoinCanonicalBars({ candles, identities, symbolId: SYM, timeframe: "1m" }).bars;
    expect(s.mode).toBe("LIVE");
    expect(s.ledger).toEqual(detectFvgs(bars, { symbolId: SYM, timeframe: "1m" }));
    expect(s.ledger.objects[0].firstTouch).not.toBeNull();
  });

  it("REPLAY with the cursor on b3: the gap is BORN and nothing later leaks", () => {
    const s = fvgSceneForCamera({ ...base, replayCursorTimeSec: candles[B3].time });
    expect(s.mode).toBe("REPLAY");
    expect(s.clockMs).toBe((candles[B3].time + MIN) * 1000);
    const o = s.ledger.objects[0];
    expect(o.state).toBe("BORN");
    expect(o.firstTouch).toBeNull();
    expect(o.interactions).toEqual([]);
    expect(s.ledger.barCount).toBe(B3 + 1);
  });

  it("REPLAY one bar before b3: the gap does not exist yet", () => {
    expect(fvgSceneForCamera({ ...base, replayCursorTimeSec: candles[B3 - 1].time }).ledger.objects).toEqual([]);
  });

  it("REPLAY at every cursor == fvgStateAsOf(full, cursor close) == a scan of the window", () => {
    const bars = rejoinCanonicalBars({ candles, identities, symbolId: SYM, timeframe: "1m" }).bars;
    const full = detectFvgs(bars, { symbolId: SYM, timeframe: "1m" });
    for (let i = 0; i < candles.length; i++) {
      const s = fvgSceneForCamera({ ...base, replayCursorTimeSec: candles[i].time });
      expect(s.ledger).toEqual(fvgStateAsOf(full, fvgReplayClockMs(candles[i].time, "1m")!));
      // Passing only the replay WINDOW gives the same objects.
      const w = fvgSceneForCamera({ ...base, candles: candles.slice(0, i + 1), identities: identities.slice(0, i + 1), replayCursorTimeSec: candles[i].time });
      expect(w.ledger.objects).toEqual(s.ledger.objects);
    }
  });

  it("the forming bar is never read; an unknowable replay clock reads nothing", () => {
    const midLast = (T0 + (ROWS.length - 1) * MIN) * 1000 + 1_000;
    const s = fvgSceneForCamera({ ...base, nowMs: midLast, replayCursorTimeSec: null });
    expect(s.forming).toBe(1);
    expect(s.ledger.barCount).toBe(ROWS.length - 1);
    expect(fvgSceneForCamera({ ...base, timeframe: "100T", replayCursorTimeSec: candles[5].time }).ledger.objects).toEqual([]);
  });
});
