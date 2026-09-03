import { describe, it, expect } from "vitest";
import { selectResponseEnvelope } from "./responseEnvelope";

/**
 * BUILD ORDER §4 — HONEST UNDERLYING → OPTION TRANSLATION.
 *
 *   "Never display TSLA 378.40 = option $0.42 as deterministic truth."
 *   "MODEL PRICE ≠ FUTURE PRICE."
 *   §14.8 "A failed estimate returns UNKNOWN, not last week's dollar."
 */
const NOW = 1_788_000_000_000;
const base = {
  underlyingAtLevel: 378.40,
  strike: 380,
  isCall: true,
  expiryMs: NOW + 7 * 24 * 60 * 60 * 1000,
  evaluateAtMs: NOW,
  iv: 0.5,
};

describe("expected response envelope (§4)", () => {
  it("answers the Founder's question as a RANGE, never a single price", () => {
    const e = selectResponseEnvelope(base);
    expect(e.status).toBe("ESTIMATED");
    expect(e.low).not.toBeNull();
    expect(e.high).not.toBeNull();
    expect(e.display).toContain("–");
    // The exact thing canon forbids: one dollar figure standing alone.
    expect(e.display).not.toMatch(/^\$\d+\.\d\d$/);
  });

  it("is labelled ESTIMATED and carries its assumptions", () => {
    const e = selectResponseEnvelope({ ...base, ivSource: "chain mid" });
    expect(e.status).toBe("ESTIMATED");
    expect(e.assumptions.length).toBeGreaterThan(0);
    expect(e.assumptions.join(" ")).toContain("Black-Scholes");
    expect(e.assumptions.join(" ")).toContain("IV 50%");
    expect(e.assumptions.join(" ")).toContain("chain mid");
  });

  it("the band widens with IV uncertainty — it is not decoration", () => {
    const tight = selectResponseEnvelope({ ...base, ivUncertainty: 0.05 });
    const wide = selectResponseEnvelope({ ...base, ivUncertainty: 0.5 });
    const tightSpan = tight.high! - tight.low!;
    const wideSpan = wide.high! - wide.low!;
    expect(wideSpan).toBeGreaterThan(tightSpan);
  });

  it("low never exceeds high", () => {
    for (const iv of [0.1, 0.3, 0.8, 2.0]) {
      for (const isCall of [true, false]) {
        const e = selectResponseEnvelope({ ...base, iv, isCall });
        expect(e.low!).toBeLessThanOrEqual(e.high!);
      }
    }
  });

  it("premium is never negative", () => {
    // Deep OTM at the level — worthless, but not negative.
    const e = selectResponseEnvelope({ ...base, underlyingAtLevel: 100, strike: 500, isCall: true });
    expect(e.low!).toBeGreaterThanOrEqual(0);
  });

  /* §14.8 — UNKNOWN over a stale or invented number. */
  it("returns UNKNOWN when implied volatility is unavailable", () => {
    const e = selectResponseEnvelope({ ...base, iv: Number.NaN });
    expect(e.status).toBe("UNKNOWN");
    expect(e.display).toBe("UNKNOWN");
    expect(e.low).toBeNull();
    expect(e.high).toBeNull();
    expect(e.unknownReason).toContain("Implied volatility");
  });

  it("returns UNKNOWN when the structural level is missing", () => {
    for (const bad of [0, -1, Number.NaN]) {
      const e = selectResponseEnvelope({ ...base, underlyingAtLevel: bad });
      expect(e.status).toBe("UNKNOWN");
      expect(e.low).toBeNull();
    }
  });

  it("returns UNKNOWN when the contract expires before evaluation", () => {
    const e = selectResponseEnvelope({ ...base, expiryMs: NOW - 1000 });
    expect(e.status).toBe("UNKNOWN");
    expect(e.unknownReason).toContain("expires");
  });

  it("an UNKNOWN carries no numbers at all", () => {
    const e = selectResponseEnvelope({ ...base, iv: 0 });
    expect(e.display).not.toMatch(/\d/);
    expect(e.assumptions).toEqual([]);
  });

  it("a nearer expiry prices below a further one, all else equal", () => {
    const near = selectResponseEnvelope({ ...base, expiryMs: NOW + 24 * 60 * 60 * 1000 });
    const far = selectResponseEnvelope({ ...base, expiryMs: NOW + 30 * 24 * 60 * 60 * 1000 });
    expect(near.high!).toBeLessThan(far.high!);
  });

  it("0DTE does not blow up", () => {
    const e = selectResponseEnvelope({ ...base, expiryMs: NOW + 60 * 60 * 1000 });
    expect(e.status).toBe("ESTIMATED");
    expect(Number.isFinite(e.low!)).toBe(true);
    expect(e.assumptions.join(" ")).toContain("h to expiry");
  });
});
