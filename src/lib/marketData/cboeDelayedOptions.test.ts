import { describe, expect, it } from "vitest";
import { cboeSymbolFor, normalizeCboeOptions } from "./cboeDelayedOptions";

const NOW = Date.parse("2026-09-27T07:00:00Z");
const body = (options: unknown[]) => ({ timestamp: "2026-09-27 00:57:30", data: { symbol: "TSLA", current_price: 372.59, iv30: 43.56, last_trade_time: "2026-09-25T15:59:59", options } });
const opt = (o: Record<string, unknown>) => ({ option: "TSLA261002C00400000", open_interest: 1500, gamma: 0.012, iv: 0.51, volume: 900, ...o });

describe("cboeSymbolFor", () => {
  it("equities pass, cash indices take Cboe's underscore, junk is refused", () => {
    expect(cboeSymbolFor("tsla")).toBe("TSLA");
    expect(cboeSymbolFor("SPX")).toBe("_SPX");
    expect(cboeSymbolFor("^NDX")).toBe("_NDX");
    expect(cboeSymbolFor("BTC-USD")).toBeNull();
    expect(cboeSymbolFor("")).toBeNull();
  });
});

describe("normalizeCboeOptions", () => {
  it("reads identity from the OSI symbol and keeps OI / gamma / iv", () => {
    const r = normalizeCboeOptions(body([opt({})]), "TSLA", 60, NOW);
    expect(r.rows[0]).toEqual({ contract: "TSLA261002C00400000", type: "call", expiration: "2026-10-02", strike: 400, openInterest: 1500, gamma: 0.012, iv: 0.51, volume: 900 });
    expect(r.spot).toBe(372.59);
    expect(r.iv30).toBe(43.56);
    expect(r.chainAsOf).toBe("2026-09-27 00:57:30");
  });
  it("a row with no open interest is dropped and counted — never zero-filled", () => {
    const r = normalizeCboeOptions(body([opt({ open_interest: null }), opt({ option: "garbage" })]), "TSLA", 60, NOW);
    expect(r.rows).toHaveLength(0);
    expect(r.dropped).toBe(2);
  });
  it("expired and beyond-horizon contracts are outside the pressure horizon", () => {
    const r = normalizeCboeOptions(body([opt({ option: "TSLA260925C00400000" }), opt({ option: "TSLA270115P00080000" })]), "TSLA", 60, NOW);
    expect(r.rows).toHaveLength(0);
    expect(r.dropped).toBe(0);
  });
  it("a missing greek stays null", () => {
    expect(normalizeCboeOptions(body([opt({ gamma: undefined })]), "TSLA", 60, NOW).rows[0].gamma).toBeNull();
  });
  it("a malformed body yields an empty receipt", () => {
    const r = normalizeCboeOptions(null, "TSLA", 60, NOW);
    expect(r.rows).toEqual([]);
    expect(r.spot).toBeNull();
  });
});
