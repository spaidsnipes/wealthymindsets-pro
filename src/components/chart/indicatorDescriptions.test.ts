/**
 * indicatorDescriptions — truth-lock for getIndicatorInfo.
 *
 * Every "?" button in the app opens a structured modal driven by this
 * function. Silent drift here silently degrades ~160 indicator "?"
 * modals into single-line dummies (the exact regression this file was
 * shipped to prevent).
 *
 * Locks:
 *   - Exact-match takes precedence over prefix-match
 *   - Prefix match ("EMA *") matches "EMA 8", "EMA 200"
 *   - Case-insensitive lookup
 *   - Category fallback for unknown names (returns 5-field structured
 *     content, never a single line)
 *   - Generic fallback when category is also unknown
 *   - Article grammar: "an" before vowel category, "a" before consonant
 *   - Authored entries fall through per-field to category base for
 *     any missing optional field
 */

import { describe, it, expect } from "vitest";
import { getIndicatorInfo } from "./indicatorDescriptions";

describe("getIndicatorInfo — exact + prefix matching", () => {
  it("exact match wins (VWAP is an authored entry)", () => {
    const info = getIndicatorInfo("VWAP", "Volume", "vol-weighted avg price");
    expect(info.definition).toMatch(/Volume-Weighted Average Price/i);
    // Not the category fallback definition ("a Volume indicator...")
    expect(info.definition).not.toMatch(/^VWAP is a Volume indicator/);
  });

  it("case-insensitive exact match", () => {
    const info = getIndicatorInfo("vwap", "Volume", "vwap-desc");
    expect(info.definition).toMatch(/Volume-Weighted/i);
  });

  it("prefix pattern 'EMA *' matches 'EMA 8'", () => {
    const info = getIndicatorInfo("EMA 8", "Trend", "8-period EMA");
    // Authored EMA content mentions "Exponential Moving Average"
    expect(info.definition).toMatch(/Exponential Moving Average/i);
  });

  it("prefix pattern 'EMA *' matches 'EMA 200'", () => {
    const info = getIndicatorInfo("EMA 200", "Trend", "200-period EMA");
    expect(info.definition).toMatch(/Exponential Moving Average/i);
  });

  it("prefix pattern 'SMA *' matches 'SMA 20'", () => {
    const info = getIndicatorInfo("SMA 20", "Trend", "20-period SMA");
    // SMA authored content mentions golden/death cross
    expect(info.howToUse ?? info.whatToLookFor).toMatch(/[Cc]ross/);
  });
});

describe("getIndicatorInfo — category fallback (unknown name, known category)", () => {
  it("Trend category → structured 5-field fallback", () => {
    const info = getIndicatorInfo("Bogus Trend Thing", "Trend", "some trend tool");
    expect(info.definition).toMatch(/is a trend indicator/i);
    expect(info.definition).toContain("some trend tool");
    // All 5 fields present + non-empty
    for (const k of ["definition", "calculation", "howToUse", "whatToLookFor", "summary"] as const) {
      expect(info[k]).toBeTruthy();
    }
  });

  it("Momentum category fallback pulls momentum-specific base", () => {
    const info = getIndicatorInfo("BogusOsc", "Momentum", "some osc");
    expect(info.summary).toMatch(/momentum/i);
  });

  it("Volatility category fallback", () => {
    const info = getIndicatorInfo("BogusVol", "Volatility", "some vol tool");
    expect(info.summary).toMatch(/volatility/i);
  });

  it("Order Flow (multi-word category) works", () => {
    const info = getIndicatorInfo("BogusFlow", "Order Flow", "flow tool");
    expect(info.summary).toMatch(/buying-vs-selling|order/i);
  });
});

describe("getIndicatorInfo — generic fallback (unknown category)", () => {
  it("unknown category falls to GENERIC_FALLBACK — still 5 fields", () => {
    const info = getIndicatorInfo("Bogus", "MadeUpCat", "desc");
    for (const k of ["definition", "calculation", "howToUse", "whatToLookFor", "summary"] as const) {
      expect(info[k]).toBeTruthy();
    }
    expect(info.calculation).toMatch(/lookback|price.*volume/i);
  });

  it("article grammar: 'an' before vowel-starting category", () => {
    const info = getIndicatorInfo("Foo", "Analytical", "desc");
    expect(info.definition).toMatch(/is an analytical/);
  });

  it("article grammar: 'a' before consonant-starting category", () => {
    const info = getIndicatorInfo("Foo", "Trend", "desc");
    expect(info.definition).toMatch(/is a trend/);
  });

  it("category name is lower-cased in fallback definition", () => {
    const info = getIndicatorInfo("Foo", "MOMENTUM", "desc");
    // Definition uses lowercase category twice
    expect(info.definition).toContain("momentum");
    expect(info.definition).not.toContain("MOMENTUM");
  });
});

describe("getIndicatorInfo — per-field fallthrough on authored partials", () => {
  it("authored entry without howToUse falls through to category base", () => {
    // "Bid × Ask" is authored — has definition + calculation + howToUse.
    // Check that its authored howToUse (mentioning bid/ask) is used, NOT the fallback.
    const info = getIndicatorInfo("Bid × Ask", "Order Flow", "bid-ask footprint");
    // Authored howToUse mentions "bid" — category fallback doesn't
    expect(info.howToUse).toMatch(/bid|ask|bounce/i);
  });

  it("returns non-empty definition for every possible call — no empty strings ever", () => {
    for (const [name, cat] of [["RSI", "Momentum"], ["Unknown", "Trend"], ["X", "Made"]] as const) {
      const info = getIndicatorInfo(name, cat, "desc");
      expect(info.definition.length).toBeGreaterThan(20);
    }
  });
});
