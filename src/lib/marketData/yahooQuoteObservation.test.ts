import { describe, it, expect } from "vitest";
import {
  buildYahooQuoteObservation,
  isResolvedYahooQuote,
  YAHOO_QUOTE_OBSERVATION_SPEC_VERSION,
  type YahooQuoteObservationInput,
} from "./yahooQuoteObservation";

const T_OBS = 1_755_400_000_000; // real observation epoch-ms
const T_CAP = 1_755_400_003_500; // capture 3.5s later
const T_RCV = 1_755_400_003_200; // transport receive

function input(overrides: Partial<YahooQuoteObservationInput> = {}): YahooQuoteObservationInput {
  return {
    symbol: "NQ1!",
    normalizedSymbol: "NQ1!",
    livePrice: 20_476.25,
    liveObservedAt: T_OBS,
    receivedAt: T_RCV,
    capturedAt: T_CAP,
    ...overrides,
  };
}

describe("buildYahooQuoteObservation — SF-D01 truth contract", () => {
  it("RESOLVED when a live price has a real observation timestamp", () => {
    const obs = buildYahooQuoteObservation(input());
    expect(obs.resolution).toBe("RESOLVED");
    if (!isResolvedYahooQuote(obs)) throw new Error("expected RESOLVED");
    expect(obs.price).toBe(20_476.25);
    expect(obs.observedAt).toBe(T_OBS);
    expect(obs.fidelity).toBe("OBSERVED");
    expect(obs.specVersion).toBe(YAHOO_QUOTE_OBSERVATION_SPEC_VERSION);
  });

  it("RESOLVED observedAt is the REAL observation time, never server/capture time", () => {
    const obs = buildYahooQuoteObservation(input());
    if (!isResolvedYahooQuote(obs)) throw new Error("expected RESOLVED");
    // The core SF-D01 guarantee: observation chronology is not borrowed.
    expect(obs.observedAt).toBe(T_OBS);
    expect(obs.observedAt).not.toBe(T_CAP);
    expect(obs.observedAt).not.toBe(obs.receivedAt);
  });

  it("RESOLVED ageMs = capturedAt − observedAt, clamped ≥ 0", () => {
    const obs = buildYahooQuoteObservation(input());
    if (!isResolvedYahooQuote(obs)) throw new Error("expected RESOLVED");
    expect(obs.ageMs).toBe(T_CAP - T_OBS); // 3500
  });

  it("RESOLVED ageMs clamps to 0 when capturedAt precedes observedAt (clock skew)", () => {
    const obs = buildYahooQuoteObservation(input({ capturedAt: T_OBS - 5_000 }));
    if (!isResolvedYahooQuote(obs)) throw new Error("expected RESOLVED");
    expect(obs.ageMs).toBe(0);
  });

  it("RESOLVED availableAt = max(observedAt, receivedAt)", () => {
    const obs = buildYahooQuoteObservation(input({ liveObservedAt: T_RCV + 100 }));
    if (!isResolvedYahooQuote(obs)) throw new Error("expected RESOLVED");
    expect(obs.availableAt).toBe(T_RCV + 100); // observedAt is later
    const obs2 = buildYahooQuoteObservation(input({ liveObservedAt: T_RCV - 100 }));
    if (!isResolvedYahooQuote(obs2)) throw new Error("expected RESOLVED");
    expect(obs2.availableAt).toBe(T_RCV); // receivedAt is later
  });

  it("UNKNOWN when there is no live traded price (e.g. Sunday equity) — no borrowed close", () => {
    const obs = buildYahooQuoteObservation(input({ livePrice: null }));
    expect(obs.resolution).toBe("UNKNOWN");
    if (obs.resolution !== "UNKNOWN") throw new Error("expected UNKNOWN");
    expect(obs.reasons.length).toBeGreaterThan(0);
    // Structurally, UNKNOWN cannot carry a price/observedAt/age/fidelity — the
    // type has none of those fields. Assert the shape has no observation keys.
    expect("price" in obs).toBe(false);
    expect("observedAt" in obs).toBe(false);
    expect("ageMs" in obs).toBe(false);
    expect("fidelity" in obs).toBe(false);
    expect("availableAt" in obs).toBe(false);
  });

  it("UNKNOWN when a live price exists but its observation timestamp is missing — the anti-borrow rule", () => {
    const obs = buildYahooQuoteObservation(input({ livePrice: 20_500, liveObservedAt: null }));
    expect(obs.resolution).toBe("UNKNOWN");
    if (obs.resolution !== "UNKNOWN") throw new Error("expected UNKNOWN");
    expect(obs.reasons.join(" ")).toMatch(/borrow|chronology|timestamp/i);
    // Even though a numeric price existed, it is NOT surfaced — a price without
    // a real observation time is not an observation.
    expect("price" in obs).toBe(false);
  });

  it("UNKNOWN reasons are always nonempty", () => {
    for (const bad of [{ livePrice: null }, { liveObservedAt: null }, { livePrice: 0 }, { liveObservedAt: 0 }]) {
      const obs = buildYahooQuoteObservation(input(bad as Partial<YahooQuoteObservationInput>));
      expect(obs.resolution).toBe("UNKNOWN");
      if (obs.resolution === "UNKNOWN") expect(obs.reasons.length).toBeGreaterThan(0);
    }
  });

  it("UNKNOWN receivedAt is nullable — passes through transport receipt or null", () => {
    const withRcv = buildYahooQuoteObservation(input({ livePrice: null, receivedAt: T_RCV }));
    if (withRcv.resolution !== "UNKNOWN") throw new Error("expected UNKNOWN");
    expect(withRcv.receivedAt).toBe(T_RCV);

    const withoutRcv = buildYahooQuoteObservation(input({ livePrice: null, receivedAt: null }));
    if (withoutRcv.resolution !== "UNKNOWN") throw new Error("expected UNKNOWN");
    expect(withoutRcv.receivedAt).toBeNull();
  });

  it("RESOLVED receivedAt falls back to capturedAt (transport only) when transport time is missing", () => {
    const obs = buildYahooQuoteObservation(input({ receivedAt: null }));
    if (!isResolvedYahooQuote(obs)) throw new Error("expected RESOLVED");
    // capturedAt as transport receivedAt is permitted (not observation chrono),
    // but observedAt still stays the REAL observation time.
    expect(obs.receivedAt).toBe(T_CAP);
    expect(obs.observedAt).toBe(T_OBS);
  });

  it("is a pure function — identical input yields deep-equal output", () => {
    const a = buildYahooQuoteObservation(input());
    const b = buildYahooQuoteObservation(input());
    expect(a).toEqual(b);
  });

  it("negative / NaN prices resolve UNKNOWN (never a fabricated observation)", () => {
    expect(buildYahooQuoteObservation(input({ livePrice: -1 })).resolution).toBe("UNKNOWN");
    expect(buildYahooQuoteObservation(input({ livePrice: Number.NaN })).resolution).toBe("UNKNOWN");
  });
});
