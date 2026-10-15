import { describe, expect, it } from "vitest";
import { REVEAL_HOLD_MS, applyReveal, askReveal, revealReceipt } from "./cameraReveal";

describe("show me — the camera reveals an asked level (order §4)", () => {
  const now = 1_000_000;
  it("an ask above the candles extends the top and asks for top headroom", () => {
    const r = applyReveal({ lo: 100, hi: 110 }, askReveal(118, "WALL", now), now + 10);
    expect(r).toEqual({ lo: 100, hi: 118, top: true, bottom: false, applied: true });
  });
  it("an ask below extends the bottom", () => {
    const r = applyReveal({ lo: 100, hi: 110 }, askReveal(92, "WALL", now), now + 10);
    expect(r).toEqual({ lo: 92, hi: 110, top: false, bottom: true, applied: true });
  });
  it("a level in the middle of the camera changes nothing (applied false)", () => {
    expect(applyReveal({ lo: 100, hi: 110 }, askReveal(105, "WALL", now), now + 10).applied).toBe(false);
  });
  it("a level inside the range but within the edge band still earns headroom (it reads OFF_CAMERA under the header)", () => {
    // QQQ 5m 2026-10-15: range 715.44..729.43, ask 729 → top headroom, range top kept at 729.43.
    expect(applyReveal({ lo: 715.44, hi: 729.43 }, askReveal(729, "CALL_WALL", now), now + 10)).toEqual({ lo: 715.44, hi: 729.43, top: true, bottom: false, applied: true });
    expect(applyReveal({ lo: 100, hi: 110 }, askReveal(100.5, "WALL", now), now + 10)).toEqual({ lo: 100, hi: 110, top: false, bottom: true, applied: true });
    expect(applyReveal({ lo: 100, hi: 110 }, askReveal(108.4, "WALL", now), now + 10).applied).toBe(false);
  });
  it("the camera lets go after REVEAL_HOLD_MS", () => {
    const ask = askReveal(118, "WALL", now);
    expect(applyReveal({ lo: 100, hi: 110 }, ask, now + REVEAL_HOLD_MS - 1).applied).toBe(true);
    expect(applyReveal({ lo: 100, hi: 110 }, ask, now + REVEAL_HOLD_MS).applied).toBe(false);
  });
  it("absent, bad or inverted inputs leave the range alone", () => {
    expect(applyReveal({ lo: 100, hi: 110 }, null, now).applied).toBe(false);
    expect(askReveal(NaN, "WALL", now)).toBeNull();
    expect(askReveal(-5, "WALL", now)).toBeNull();
    expect(applyReveal({ lo: 110, hi: 100 }, askReveal(118, "WALL", now), now).applied).toBe(false);
  });
  it("the receipt says what is shown and for how long, then DONE", () => {
    const ask = askReveal(30200, "WALL", now)!;
    expect(revealReceipt(null, now)).toBe("NONE");
    expect(revealReceipt(ask, now + 2_500)).toBe("REVEAL:WALL@30200:8s");
    expect(revealReceipt(ask, now + REVEAL_HOLD_MS)).toBe("DONE:WALL@30200");
  });
});
