import { afterEach, describe, expect, it, vi } from "vitest";
import { fetchInstrumentSearch, mergeInstrumentSearch, instrumentSearchSelection } from "./instrumentSearch";
import { matchCuratedSymbols } from "./curatedSymbolCatalog";
import { toYahooSymbol, fromYahooSearchSymbol } from "../yahooSymbol";
import { instrumentEconomics } from "./contractEconomics";
import { classifySymbol } from "./symbolAssetClass";

afterEach(() => vi.unstubAllGlobals());

describe("universal discovery selection", () => {
  it.each([
    ["Tesla", "TSLA"], ["Apple", "AAPL"], ["Nvidia", "NVDA"], ["SPY", "SPY"],
    ["Nasdaq", "NDX"], ["Nasdaq futures", "NQ1!"], ["NQ", "NQ1!"], ["ES", "ES1!"],
    ["Gold", "GC1!"], ["GC", "GC1!"], ["Oil", "CL1!"], ["CL", "CL1!"],
    ["EUR/USD", "EURUSD"], ["EURGBP", "EURGBP"], ["GBPJPY", "GBPJPY"],
    ["Bitcoin", "BTCUSD"], ["Ethereum", "ETHUSD"], ["SPX", "SPX"], ["NDX", "NDX"],
    ["MNQ", "MNQ1!"], ["MES", "MES1!"], ["MGC", "MGC1!"], ["MCL", "MCL1!"],
  ])("Enter on %s resolves %s", (query, sym) => {
    expect(instrumentSearchSelection(query, matchCuratedSymbols(query, 20))).toBe(sym);
  });
  it("Enter cannot open an unresolved human name while discovery is pending or failed", () => {
    expect(instrumentSearchSelection("Antero Resources", [])).toBeNull();
    expect(instrumentSearchSelection("unknown", [])).toBeNull();
    expect(instrumentSearchSelection("", [{ sym:"TSLA", label:"Tesla", cat:"Stock" }])).toBeNull();
  });
  it.each([
    ["MNQ", "MNQ1!", "MNQ=F", 2, 0.25, 0.5],
    ["MES", "MES1!", "MES=F", 5, 0.25, 1.25],
    ["M2K", "M2K1!", "M2K=F", 5, 0.1, 0.5],
    ["MYM", "MYM1!", "MYM=F", 0.5, 1, 0.5],
    ["MGC", "MGC1!", "MGC=F", 10, 0.1, 1],
    ["MCL", "MCL1!", "MCL=F", 100, 0.01, 1],
  ])("%s discovery retains its micro contract and economics", (query, sym, yahoo, pointValue, tickSize, tickValue) => {
    const selected = instrumentSearchSelection(query as string, matchCuratedSymbols(query as string, 20));
    expect(selected).toBe(sym);
    expect(toYahooSymbol(selected!)).toBe(yahoo);
    expect(fromYahooSearchSymbol(yahoo as string, "FUTURE")).toBe(selected);
    expect(classifySymbol(selected!)).toBe("FUTURES");
    expect(instrumentEconomics(selected!, 100)).toMatchObject({status:"PRICED", pointValue, tickSize, tickValue});
  });
  it.each([["SPX", "^GSPC"], ["NDX", "^NDX"], ["DJI", "^DJI"]])("%s discovery preserves the cash index identity", (sym, yahoo) => {
    expect(instrumentSearchSelection(sym, matchCuratedSymbols(sym, 20))).toBe(sym);
    expect(toYahooSymbol(sym)).toBe(yahoo);
    expect(fromYahooSearchSymbol(yahoo, "INDEX")).toBe(sym);
    expect(classifySymbol(sym)).toBe("INDEX");
    expect(instrumentEconomics(sym, 100)).toMatchObject({status:"REFUSED", refusal:"CASH_INDEX"});
  });
  it("does not let curated substring matches hide an unfamiliar remote ticker", () => {
    const local = [{sym:"ARM",label:"ARM Holdings",cat:"Stock"}];
    const remote = [{sym:"AR",label:"Antero Resources",cat:"Stock",exchange:"NYSE"}];
    expect(mergeInstrumentSearch("ar", local, remote)[0]).toEqual(remote[0]);
  });
  it("deduplicates vendor notation while retaining the curated identity", () => {
    expect(mergeInstrumentSearch("btc", [{sym:"BTCUSD",label:"Bitcoin",cat:"Crypto"}], [{sym:"BTC-USD",label:"Bitcoin USD",cat:"Crypto"}])).toHaveLength(1);
  });
  it("retains a vendor result absent from the curated universe", () => {
    expect(mergeInstrumentSearch("Antero", [], [{sym:"AR",label:"Antero Resources",cat:"Stock"}])[0]?.sym).toBe("AR");
  });
});

describe("request cancellation and truth", () => {
  it("discards a slow old query even if the transport ignores cancellation", async () => {
    let resolve!: (response: Response) => void;
    vi.stubGlobal("fetch", vi.fn(() => new Promise<Response>(r => { resolve = r; })));
    const old = new AbortController();
    const pending = fetchInstrumentSearch("Tesla", old.signal);
    old.abort();
    resolve(Response.json({results:[{sym:"TSLA",label:"Tesla",cat:"Stock"}]}));
    expect(await pending).toBeNull();
  });
  it("reports provider failure rather than calling it no matches", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => Response.json({error:"Unavailable"}, {status:503})));
    await expect(fetchInstrumentSearch("Tesla", new AbortController().signal)).rejects.toThrow("Unavailable");
  });
});
