/**
 * Garden 19 §38 — REPLAY FVG LIFECYCLE through the one replay owner
 * (fvgSceneForCamera with replayCursorTimeSec — what MainChart passes while
 * startReplay drives the camera). Stepping the cursor bar by bar, one gap
 * shows BIRTH → leaves (OPEN) → APPROACH → TOUCH → penetration + response
 * (ACCEPTED) → traded through (scar) → MEMORY, each stage appearing on its own
 * bar and never before; frozen right after formation it is BORN with no
 * approach, no touch, no interaction, no penetration and no scar.
 */
import { describe, expect, it } from "vitest";

import type { CanonicalBarIdentity, LegacyOhlcvTuple } from "@/lib/marketData/canonicalBar";
import { FVG_SCAR_MEMORY_BARS } from "./fvgDefinition";
import { fvgSceneForCamera, type FvgCameraScene } from "./fvgCamera";

type Row = readonly [number, number, number, number];
const MIN = 60, T0 = 1_791_000_000, SYM = "BTC-USD";
const FLAT: Row[] = Array.from({ length: 15 }, () => [100, 101, 99, 100] as Row);
// Bullish gap: b1 high 101, b3 low 102 → territory 101–102, born on b3's close.
const BULL: Row[] = [[100, 101, 99, 100.5], [100.5, 104, 100.3, 103.8], [103.8, 105, 102, 104.5]];
const LEAVE: Row = [104.5, 106, 104.2, 105.5];      // price leaves
const NEAR: Row = [105.5, 105.6, 102.3, 103.2];     // within the approach distance, untouched
const TAP: Row = [103.2, 103.4, 102, 102];          // wick reaches the near edge
const INSIDE: Row = [103.2, 103.4, 101.6, 101.8];   // 40% penetration, second close inside → acceptance
const BACK: Row = [101.8, 104, 101.7, 103.8];
const THROUGH: Row = [103.8, 103.9, 100.2, 100.4];  // close beyond the far edge
const DRIFT: Row = [100.4, 100.8, 99.9, 100.3];
const ROWS: Row[] = [...FLAT, ...BULL, LEAVE, NEAR, TAP, INSIDE, BACK, THROUGH, ...Array.from({ length: FVG_SCAR_MEMORY_BARS + 4 }, () => DRIFT)];

const candles: LegacyOhlcvTuple[] = ROWS.map(([o, h, l, c], i) => ({ time: T0 + i * MIN, open: o, high: h, low: l, close: c, volume: 1 }));
const identities: CanonicalBarIdentity[] = candles.map(c => ({
  barId: `${SYM}|1m|${c.time * 1000}|e0`, symbolId: SYM, sessionId: "SESSION_CONTINUOUS", timeframe: "1m",
  asOf: c.time * 1000, receivedAt: 0, fidelity: "INDICATIVE", source: "fixture", provenance: "REST_BACKFILL", truthEpoch: 0,
}));
const NOW = (T0 + ROWS.length * MIN) * 1000;
const at = (i: number): FvgCameraScene => fvgSceneForCamera({ candles, identities, symbolId: SYM, timeframe: "1m", nowMs: NOW, replayCursorTimeSec: candles[i].time });
const gap = (s: FvgCameraScene) => s.ledger.objects.find(o => o.direction === "BULLISH" && o.bottom === 101 && o.top === 102) ?? null;

const B3 = FLAT.length + 2;
const I = { born: B3, leave: B3 + 1, near: B3 + 2, tap: B3 + 3, inside: B3 + 4, back: B3 + 5, through: B3 + 6 };

describe("§38 Replay lifecycle — progressive, never ahead of the cursor", () => {
  it("before b3 closes, the gap does not exist", () => {
    expect(gap(at(B3 - 1))).toBeNull();
  });

  it("FROZEN right after formation: BORN, no approach, no touch, no interaction, no penetration, no scar", () => {
    const s = at(I.born);
    const o = gap(s)!;
    expect(s.mode).toBe("REPLAY");
    expect(o.state).toBe("BORN");
    expect(o.firstApproach).toBeNull();
    expect(o.firstTouch).toBeNull();
    expect(o.interactions).toEqual([]);
    expect(o.maxPenetration).toBe(0);
    expect(o.mitigation).toBe("NONE");
    expect(o.tradedThrough).toBeNull();
    expect(s.visibility.scars).toEqual([]);
    expect(s.visibility.open.map(x => x.objectId)).toContain(o.objectId);
    // Nothing in the ledger was created or revealed after the replay clock.
    for (const x of s.ledger.objects) {
      expect(x.createdAt).toBeLessThanOrEqual(s.clockMs!);
      for (const e of x.events) expect(e.knownAt).toBeLessThanOrEqual(s.clockMs!);
    }
  });

  it("each stage appears on its own bar, in order", () => {
    const stage = (i: number) => {
      const o = gap(at(i))!;
      return [o.state, o.mitigation, Number(o.maxPenetration.toFixed(2)), o.firstApproach !== null, o.firstTouch !== null, o.interactions.map(x => x.response).join(",")];
    };
    expect(stage(I.born)).toEqual(["BORN", "NONE", 0, false, false, ""]);
    expect(stage(I.leave)).toEqual(["OPEN", "NONE", 0, false, false, ""]);
    expect(stage(I.near)).toEqual(["APPROACHING", "NONE", 0, true, false, ""]);
    expect(stage(I.tap)).toEqual(["TOUCHED", "TOUCHED", 0, true, true, "OPEN"]);
    expect(stage(I.inside)).toEqual(["ACCEPTED", "PARTIAL", 0.4, true, true, "ACCEPTED"]);
    expect(stage(I.through)).toEqual(["TRADED_THROUGH", "FULL", 1, true, true, "ACCEPTED"]);
    expect(gap(at(I.through - 1))!.tradedThrough).toBeNull();
    expect(gap(at(I.through))!.tradedThrough?.barIndex).toBe(I.through);
  });

  it("the scar shows from the trade-through bar, and becomes MEMORY only FVG_SCAR_MEMORY_BARS later", () => {
    expect(at(I.through - 1).visibility.scars).toEqual([]);
    const s = at(I.through);
    expect(s.visibility.scars.map(o => o.objectId)).toEqual([gap(s)!.objectId]);
    expect(gap(at(I.through + FVG_SCAR_MEMORY_BARS - 1))!.state).toBe("TRADED_THROUGH");
    const m = at(I.through + FVG_SCAR_MEMORY_BARS);
    expect(gap(m)!.state).toBe("MEMORY");
    expect(m.visibility.scars).toEqual([]);
    expect(m.visibility.hidden.memory).toBe(1);
  });

  it("monotone: no stage is visible on any cursor before the bar it happened on", () => {
    const firstBar = (pred: (s: FvgCameraScene) => boolean) => { for (let i = 0; i < candles.length; i++) if (pred(at(i))) return i; return -1; };
    expect(firstBar(s => gap(s) !== null)).toBe(I.born);
    expect(firstBar(s => gap(s)?.firstApproach != null)).toBe(I.near);
    expect(firstBar(s => gap(s)?.firstTouch != null)).toBe(I.tap);
    expect(firstBar(s => (gap(s)?.maxPenetration ?? 0) > 0)).toBe(I.inside);
    expect(firstBar(s => (gap(s)?.interactions ?? []).some(x => x.response === "ACCEPTED"))).toBe(I.inside);
    expect(firstBar(s => s.visibility.scars.length > 0)).toBe(I.through);
    expect(firstBar(s => gap(s)?.state === "MEMORY")).toBe(I.through + FVG_SCAR_MEMORY_BARS);
  });
});
