import { describe, it, expect } from "vitest";
import { yahooQuoteObserved } from "./yahooQuoteObserved";

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
