import { describe, expect, it } from "vitest";
import { normalizeAlpacaOptionChain } from "./alpacaOptionChain";

const payload = {
  snapshots: {
    TSLA260918C00365000: {
      latestTrade: { t: "2026-09-09T19:59:11.582810Z", p: 11.55, s: 1 },
      latestQuote: { t: "2026-09-09T19:59:59.467463Z", bp: 11.22, bs: 36, ap: 11.58, as: 5 },
      impliedVolatility: 0.4394,
      greeks: { delta: 0.554, gamma: 0.0156, theta: -0.5758, vega: 0.2279 },
    },
    TSLA260918P00365000: {
      latestQuote: { t: "2026-09-09T19:59:59.666559Z", bp: 8.21, ap: 8.23 },
      greeks: { delta: -0.4442 },
    },
  },
  next_page_token: null,
};

describe("Alpaca option-chain normalization", () => {
  it("derives contract identity from OSI symbols and preserves observed values", () => {
    const result = normalizeAlpacaOptionChain(payload, "TSLA");
    expect(result).toMatchObject({
      source: "alpaca",
      fidelity: "INDICATIVE",
      coverage: "COMPLETE",
      newestProviderTimestamp: "2026-09-09T19:59:59.666559Z",
    });
    expect(result.chain).toEqual([
      expect.objectContaining({ symbol: "TSLA260918C00365000", contractType: "call", expirationDate: "2026-09-18", strike: 365, bid: 11.22, ask: 11.58, last: 11.55, quoteTimestamp: "2026-09-09T19:59:59.467463Z", tradeTimestamp: "2026-09-09T19:59:11.582810Z", delta: 0.554 }),
      expect.objectContaining({ symbol: "TSLA260918P00365000", contractType: "put", expirationDate: "2026-09-18", strike: 365, bid: 8.21, ask: 8.23, quoteTimestamp: "2026-09-09T19:59:59.666559Z", delta: -0.4442 }),
    ]);
  });

  it("keeps each contract's observation times separate from the page-newest receipt", () => {
    const mixed = normalizeAlpacaOptionChain({ snapshots: {
      TSLA260918C00365000: payload.snapshots.TSLA260918C00365000,
      TSLA260918P00365000: {
        latestQuote: { t: "2026-09-09T18:00:00Z", bp: 8.21, ap: 8.23 },
        latestTrade: { t: "2026-09-09T17:55:00Z", p: 8.22 },
      },
    } }, "TSLA");
    const stalePut = mixed.chain.find(contract => contract.contractType === "put");
    expect(mixed.newestProviderTimestamp).toBe("2026-09-09T19:59:59.467463Z");
    expect(stalePut).toMatchObject({
      quoteTimestamp: "2026-09-09T18:00:00Z",
      tradeTimestamp: "2026-09-09T17:55:00Z",
    });
    expect(stalePut?.quoteTimestamp).not.toBe(mixed.newestProviderTimestamp);
  });

  it("does not relabel latest trade size as volume or invent absent fields", () => {
    const [call] = normalizeAlpacaOptionChain(payload, "TSLA").chain;
    expect(call.volume).toBeUndefined();
    expect(call.openInterest).toBeUndefined();
  });

  it("skips mismatched or malformed identities and marks pagination partial", () => {
    const result = normalizeAlpacaOptionChain({
      snapshots: {
        AAPL260918C00365000: payload.snapshots.TSLA260918C00365000,
        TSLA_BAD: {},
      },
      next_page_token: "next",
    }, "TSLA");
    expect(result.chain).toEqual([]);
    expect(result.coverage).toBe("PARTIAL");
  });

  it("does not promote contract identity without a timestamped market observation", () => {
    const result = normalizeAlpacaOptionChain({ snapshots: {
      TSLA260918C00365000: { latestQuote: { bp: 1, ap: 2 }, greeks: { delta: 0.5 } },
      TSLA260918P00365000: { latestTrade: { t: "not-a-time", p: 1.5 } },
    } }, "TSLA");
    expect(result.chain).toEqual([]);
    expect(result.newestProviderTimestamp).toBeNull();
  });

  it("rejects a malformed provider envelope", () => {
    expect(() => normalizeAlpacaOptionChain({ snapshots: [] }, "TSLA")).toThrow(/Malformed/);
  });
});
