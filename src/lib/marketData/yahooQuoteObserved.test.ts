import { describe, it, expect } from "vitest";
import { yahooQuoteObserved, yahooQuoteRefusal } from "./yahooQuoteObserved";

describe("yahooQuoteObserved — SF-D01 consumer gate", () => {
  it("returns true when observation.resolution === 'RESOLVED'", () => {
    expect(yahooQuoteObserved({ price: 100, observation: { resolution: "RESOLVED" } })).toBe(true);
  });

  it("returns false when observation.resolution === 'UNKNOWN' — the fake-fresh failure SF-D01 exists to prevent", () => {
    expect(yahooQuoteObserved({ price: 100, observation: { resolution: "UNKNOWN" } })).toBe(false);
  });

  it("returns false on unknown-shaped resolution values", () => {
    expect(yahooQuoteObserved({ price: 100, observation: { resolution: "MAYBE" } })).toBe(false);
    expect(yahooQuoteObserved({ price: 100, observation: { resolution: "" } })).toBe(false);
  });

  it("permissive fallback when observation field is absent (older cache / other endpoints / test fixtures)", () => {
    expect(yahooQuoteObserved({ price: 100 })).toBe(true);
    expect(yahooQuoteObserved({ price: 100, observation: {} })).toBe(true);
    expect(yahooQuoteObserved({ price: 100, observation: { resolution: null as unknown as string } })).toBe(true);
    expect(yahooQuoteObserved({ price: 100, observation: { resolution: 42 as unknown as string } })).toBe(true);
  });

  it("returns false when the response itself is null / undefined / non-object", () => {
    expect(yahooQuoteObserved(null)).toBe(false);
    expect(yahooQuoteObserved(undefined)).toBe(false);
    expect(yahooQuoteObserved("hello")).toBe(false);
    expect(yahooQuoteObserved(42)).toBe(false);
  });

  it("returns true even when price is missing — the predicate is about observation truth, not price presence (caller composes both)", () => {
    expect(yahooQuoteObserved({ observation: { resolution: "RESOLVED" } })).toBe(true);
  });
});

describe("yahooQuoteRefusal — a decision is not a delay", () => {
  /** Verbatim from `curl /api/yahoo?sym=NQ1!&type=quote` on 2026-09-07. */
  const NQ1_REAL_RESPONSE = {
    sym: "NQ1!",
    price: 29565.25,
    prevClose: 29565.25,
    volume: 88329,
    observation: {
      specVersion: "wm.sf-d01.v1.0.1",
      symbol: "NQ1!",
      normalizedSymbol: "NQ1!",
      resolution: "UNKNOWN",
      reasons: [
        "No live traded price in the pre/post-aware intraday series; a day/meta close must not be presented as a live observation.",
      ],
      receivedAt: 1788806747528,
    },
  };

  it("THE MEASURED FAILURE: carries the endpoint's own reason instead of dropping it", () => {
    // Before this existed, the whole response above collapsed to `null` one
    // line into the client and six default tape rows read "quote pending"
    // forever — while this request completed successfully every ten seconds.
    expect(yahooQuoteRefusal(NQ1_REAL_RESPONSE)).toBe(NQ1_REAL_RESPONSE.observation.reasons[0]);
  });

  it("is silent exactly when the gate is satisfied", () => {
    const observed = { price: 320.01, observation: { resolution: "RESOLVED" } };
    expect(yahooQuoteObserved(observed)).toBe(true);
    expect(yahooQuoteRefusal(observed)).toBeNull();
  });

  it("does not call a MISSING answer a refusal", () => {
    // A thrown fetch, a timeout, a non-JSON body: WM never looked, so it never
    // declined. Naming these a refusal would invent a decision — §14.1. The
    // caller keeps saying "quote pending" for them, which is then true.
    for (const value of [null, undefined, "", "not json", 42, true]) {
      expect(yahooQuoteRefusal(value), String(value)).toBeNull();
    }
    // Pre-SF-D01 responses with no observation field are permitted by the
    // gate, so they are not refusals either.
    expect(yahooQuoteRefusal({ price: 100 })).toBeNull();
    expect(yahooQuoteRefusal({ price: 100, observation: {} })).toBeNull();
  });

  it("never fabricates a reason when the endpoint refuses without giving one", () => {
    expect(yahooQuoteRefusal({ observation: { resolution: "UNKNOWN" } })).toBe(
      "Quote resolution UNKNOWN; no reason supplied.",
    );
    expect(yahooQuoteRefusal({ observation: { resolution: "UNKNOWN", reasons: [] } })).toBe(
      "Quote resolution UNKNOWN; no reason supplied.",
    );
    expect(yahooQuoteRefusal({ observation: { resolution: "UNKNOWN", reasons: ["  ", 42] } })).toBe(
      "Quote resolution UNKNOWN; no reason supplied.",
    );
    expect(yahooQuoteRefusal({ observation: { resolution: "UNKNOWN", reasons: "why" } })).toBe(
      "Quote resolution UNKNOWN; no reason supplied.",
    );
  });

  it("the two functions partition every ANSWERED response — no third state, no overlap", () => {
    // If a response is answered, it is either honoured or refused with a
    // reason. A response that is neither would leave the row with nothing to
    // say, which is how "quote pending" became the default lie.
    const answered: unknown[] = [
      NQ1_REAL_RESPONSE,
      { price: 1, observation: { resolution: "RESOLVED" } },
      { price: 1, observation: { resolution: "UNKNOWN", reasons: ["closed"] } },
      { price: 1, observation: { resolution: "MAYBE" } },
      { price: 1, observation: { resolution: "" } },
      { price: 1 },
      { price: 1, observation: {} },
    ];
    for (const response of answered) {
      const observed = yahooQuoteObserved(response);
      const refusal = yahooQuoteRefusal(response);
      expect(observed || refusal !== null, JSON.stringify(response)).toBe(true);
      expect(observed && refusal !== null, JSON.stringify(response)).toBe(false);
    }
  });
});
