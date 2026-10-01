import { describe, expect, it, vi, afterEach } from "vitest";
import { parseFuturesNotation } from "./futuresNotation";
import { canonicalAssetClass } from "./canonicalIdentity";
import { classifySymbol } from "./symbolAssetClass";
import { futuresProductFor } from "../broker/tastytradeFuturesChain";
import { resolveTastyContract, resolveTastyFrontMonth } from "./adapters/tastytradeFuturesTicks";
import { toTastytradeOrder } from "../broker/tastytradeOrder";
import { matchCanonicalInstruments } from "./instrumentSearch";
import { tastySymbolHits, matchFutureProducts } from "./brokerInstrumentSearch";

afterEach(() => { vi.resetModules(); vi.unstubAllGlobals(); });
const futures = [{symbol:"/MNQZ6","streamer-symbol":"/MNQZ26:XCME","active-month":true,"days-to-expiration":78},{symbol:"/MNQH7","streamer-symbol":"/MNQH27:XCME","days-to-expiration":169}];
describe("MNQ discovery-to-execution identity", () => {
  it.each(["/MNQ", "MNQ1!", "MNQZ6", "/MNQZ6", "MNQ=F"])("%s stays a future across both class owners and product resolution", sym => {
    expect(canonicalAssetClass(sym)).toBe("futures");
    expect(classifySymbol(sym)).toBe("FUTURES");
    expect(futuresProductFor(sym)).toBe("MNQ");
    expect(matchFutureProducts([{code:"MNQ",description:"Micro Nasdaq"}], sym)[0]?.code).toBe("MNQ");
  });
  it("bare MNQ search resolves explicitly; ES/CL equities are not silently made futures", () => {
    expect(matchCanonicalInstruments("MNQ")[0]?.sym).toBe("MNQ1!");
    expect(parseFuturesNotation("ES")).toBeNull();
    expect(classifySymbol("ES")).toBe("EQUITY");
    expect(classifySymbol("CL")).toBe("EQUITY");
  });
  it("synthetic and unfamiliar alphanumeric equity tickers do not become dated futures", () => {
    for(let i=0;i<100;i++) {
      expect(parseFuturesNotation(`SYM${i}`)).toBeNull();
      expect(canonicalAssetClass(`SYM${i}`)).toBe("equity");
    }
    expect(parseFuturesNotation("ABCM26")).toBeNull();
  });
  it("the real broker root is Futures even when the provider omitted its type", () => {
    expect(tastySymbolHits([{symbol:"/MNQ",description:"Micro E-mini Nasdaq-100 Index Futures"}])[0]).toMatchObject({sym:"/MNQ",cat:"Futures"});
  });
  it("specific month cannot be silently replaced by the active month", () => {
    expect(resolveTastyContract(futures,"/MNQH7")?.symbol).toBe("/MNQH7");
    expect(resolveTastyContract(futures,"/MNQM7")).toBeNull();
    expect(resolveTastyFrontMonth(futures)?.symbol).toBe("/MNQZ6");
  });
  it("execution mapper refuses roots/continuous and accepts the broker's exact contract", () => {
    const base={instrumentType:"Future" as const,action:"Buy to Open" as const,qty:1,type:"Limit" as const,limitPx:30000,decisionId:"wmd_test",clientOrderId:"wmo_test12345"};
    for(const symbol of ["MNQ","/MNQ","MNQ1!","MNQ=F"]) expect(toTastytradeOrder({...base,symbol}).ok).toBe(false);
    expect(toTastytradeOrder({...base,symbol:"/MNQZ6"}).ok).toBe(true);
  });
  it("the live resolver resolves unprefixed chosen month exactly, never by continuous fallback", async () => {
    vi.stubGlobal("fetch",vi.fn(async()=>Response.json({state:"OK",data:futures})));
    const {tastyFrontMonthFor}=await import("../broker/tastyFrontMonth");
    expect((await tastyFrontMonthFor("MNQH7"))?.symbol).toBe("/MNQH7");
    expect((await tastyFrontMonthFor("/MNQ"))?.symbol).toBe("/MNQZ6");
    expect(await tastyFrontMonthFor("MNQM7")).toBeNull();
  });
});
