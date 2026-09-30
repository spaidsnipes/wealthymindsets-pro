/**
 * The curated symbol catalog — the shortlist this product OFFERS, owned once.
 *
 * ── Why this is a module and not two arrays (2026-09-11) ────────────────────
 *
 * This list existed twice: `RAW_LOCAL_SYMBOLS` in the chart picker and
 * `ALL_SYMBOLS` in the shell's search dialog. Both are search surfaces, both
 * are reachable in the same session, and they had already drifted. MEASURED:
 *
 *   in the picker, absent from the shell:
 *     6B1! EURGBP UKOIL LUNR LINKUSD MATICUSD SUIUSD FLOKIUSD
 *   same symbol, different words:
 *     6E1!  "Euro Futures"      vs "Euro FX Futures"
 *     MSTR  "MicroStrategy (BTC proxy)" vs "MicroStrategy"
 *     VX1!  "VIX Index (via VX1!)" / Index  vs  "VIX Futures" / Futures
 *
 * The last one is the one that mattered: a correction landed in the picker and
 * could not reach the shell, so one search called VX1! an index while the
 * other still promised a futures contract — for the same ticker, in the same
 * app, on the same afternoon. The shell's list was a strict SUBSET of the
 * picker's, so nothing was lost by collapsing them; eight symbols the shell
 * never offered are now findable there too.
 *
 * ── The `cat` field ────────────────────────────────────────────────────────
 *
 * A CURATOR'S OPINION, not a fact, reconciled against the class owner by
 * `reconcileSearchCategory` exactly like a search vendor's — authoritative
 * where the owner has none, allowed to refine an equity into an ETF, overruled
 * where it contradicts. See that module for what the reconciliation changes.
 *
 * ── A KNOWN GAP this list still carries ─────────────────────────────────────
 *
 * US30, US500, US100, USOIL and UKOIL answer {"error":"No data"} — offered
 * here, and unchartable. Mapping them to near-neighbours (^DJI, CL=F) was
 * tried and reverted; see yahooSymbol.ts. Disclosed, not hidden.
 */

import {
  reconcileSearchCategory,
  type SearchCategory,
} from "@/lib/marketData/searchResultCategory";
import { rankSymbolHits } from "@/lib/marketData/symbolSearchRank";

export interface CuratedSymbol {
  readonly sym: string;
  readonly label: string;
  readonly cat: string;
  readonly aliases?: readonly string[];
  readonly exchange?: string;
}

const RAW_CURATED_SYMBOLS = [
  // ── Futures ──────────────────────────────────────────────
  { sym:"NQ1!",  label:"Nasdaq-100 Futures",        cat:"Futures", aliases:["nq","nasdaq futures","nasdaq-100 futures","tech futures"] },
  { sym:"ES1!",  label:"S&P 500 Futures",           cat:"Futures", aliases:["es","sp500 futures","s&p 500 futures","spy futures"] },
  { sym:"RTY1!", label:"Russell 2000 Futures",      cat:"Futures", aliases:["rty","russell futures"] },
  { sym:"YM1!",  label:"Dow Jones Futures",         cat:"Futures", aliases:["ym","dow futures","us30 futures"] },
  { sym:"GC1!",  label:"Gold Futures",              cat:"Futures", aliases:["gold","gc","gold futures"] },
  { sym:"CL1!",  label:"Crude Oil WTI Futures",     cat:"Futures", aliases:["oil","cl","crude","wti"] },
  { sym:"SI1!",  label:"Silver Futures",            cat:"Futures", aliases:["silver","si","silver futures"] },
  { sym:"HG1!",  label:"Copper Futures",            cat:"Futures", aliases:["copper","hg"] },
  { sym:"PL1!",  label:"Platinum Futures",          cat:"Futures", aliases:["platinum","xptusd"] },
  { sym:"PA1!",  label:"Palladium Futures",         cat:"Futures", aliases:["palladium","xpdusd"] },
  { sym:"ZB1!",  label:"30-Year T-Bond Futures",    cat:"Futures", aliases:["bonds","treasury","zb","30 year","30-year","30yr"] },
  // "10 YEAR" ranked a 5–10-year CORPORATE bond ETF above the note future
  // (serving universal search, 2026-09-30).
  { sym:"ZN1!",  label:"10-Year T-Note Futures",    cat:"Futures", aliases:["10yr","zn","notes","10 year","10-year","ten year"] },
  { sym:"6E1!",  label:"Euro Futures",              cat:"Futures", aliases:["euro","eurusd futures","6e"] },
  { sym:"6J1!",  label:"Yen Futures",               cat:"Futures", aliases:["yen","usdjpy futures","6j"] },
  { sym:"6B1!",  label:"British Pound Futures",     cat:"Futures", aliases:["pound","gbpusd futures","6b"] },
  // GP12 §26 (2026-09-25). This row read "VIX Index (via VX1!)" / Index,
  // because the app loaded the CASH index ^VIX under this FUTURES symbol and the
  // label was bent to match the substitution. The substitution is the defect:
  // VX1! is VIX futures, and the price gate now refuses it (no VIX futures feed
  // is connected) and names ^VIX. The row says what the symbol IS; the cash
  // index has its own row below, and "vix" searches find it, not this one.
  { sym:"VX1!",  label:"VIX Futures",               cat:"Futures", aliases:["vx","vix futures"] },
  { sym:"^VIX",  label:"CBOE Volatility Index",     cat:"Index",   aliases:["vix","volatility","fear"] },
  { sym:"SPX", label:"S&P 500 Index", cat:"Index", aliases:["s&p 500","sp500","s&p"], exchange:"S&P DJI" },
  { sym:"NDX", label:"Nasdaq-100 Index", cat:"Index", aliases:["nasdaq","nasdaq 100"], exchange:"NASDAQ" },
  { sym:"DJI", label:"Dow Jones Industrial Average", cat:"Index", aliases:["dow","dow jones","djia"], exchange:"S&P DJI" },
  { sym:"MNQ1!", label:"Micro E-mini Nasdaq-100 Futures", cat:"Futures", aliases:["mnq","micro nasdaq","micro nasdaq futures"], exchange:"CME" },
  { sym:"MES1!", label:"Micro E-mini S&P 500 Futures", cat:"Futures", aliases:["mes"], exchange:"CME" },
  { sym:"M2K1!", label:"Micro E-mini Russell 2000 Futures", cat:"Futures", aliases:["m2k"], exchange:"CME" },
  { sym:"MYM1!", label:"Micro E-mini Dow Futures", cat:"Futures", aliases:["mym"], exchange:"CME" },
  { sym:"MGC1!", label:"Micro Gold Futures", cat:"Futures", aliases:["mgc"], exchange:"COMEX" },
  { sym:"MCL1!", label:"Micro WTI Crude Oil Futures", cat:"Futures", aliases:["mcl"], exchange:"NYMEX" },
  // World indices (serving universal search, 2026-09-30: "DAX" ranked a DAX
  // ETF and a volatility index above the DAX itself). Each opens as a chart.
  { sym:"^GDAXI", label:"DAX Performance Index",    cat:"Index",   aliases:["dax","germany","dax 40"] },
  { sym:"^N225",  label:"Nikkei 225",               cat:"Index",   aliases:["nikkei","japan"] },
  { sym:"^FTSE",  label:"FTSE 100",                 cat:"Index",   aliases:["ftse","uk index"] },
  { sym:"^HSI",   label:"Hang Seng Index",          cat:"Index",   aliases:["hang seng","hong kong"] },
  { sym:"NG1!",  label:"Natural Gas Futures",       cat:"Futures", aliases:["natgas","natural gas"] },
  // Grains (serving universal search, 2026-09-30: "CORN" ranked Cornerstone
  // and Corning above corn futures). Yahoo carries each as =F (yahooSymbol).
  { sym:"ZC1!",  label:"Corn Futures",              cat:"Futures", aliases:["corn","zc"] },
  { sym:"ZS1!",  label:"Soybean Futures",           cat:"Futures", aliases:["soybeans","soybean","soy","zs"] },
  { sym:"ZW1!",  label:"Wheat Futures",             cat:"Futures", aliases:["wheat","zw"] },
  // ── Forex / FX ───────────────────────────────────────────
  { sym:"EURUSD", label:"Euro / US Dollar",         cat:"Forex", aliases:["euro dollar","eur"] },
  { sym:"GBPUSD", label:"British Pound / USD",      cat:"Forex", aliases:["cable","pound","gbp","sterling"] },
  { sym:"USDJPY", label:"US Dollar / Japanese Yen", cat:"Forex", aliases:["dollar yen","jpy","yen"] },
  // Spot XAUUSD / XAGUSD are not listed: no spot-metal feed is connected.
  // They are not aliases for gold/silver futures, which are distinct markets.
  { sym:"US30",   label:"Dow Jones Index (Cash)",   cat:"Forex", aliases:["us30"] },
  { sym:"US500",  label:"S&P 500 Index (Cash)",     cat:"Forex", aliases:["us500"] },
  { sym:"US100",  label:"Nasdaq 100 Index (Cash)",  cat:"Forex", aliases:["us100"] },
  { sym:"USDCAD", label:"US Dollar / Canadian Dollar",  cat:"Forex", aliases:["loonie","cad","usdcad"] },
  { sym:"AUDUSD", label:"Australian Dollar / USD",  cat:"Forex", aliases:["aussie","aud","audusd"] },
  { sym:"NZDUSD", label:"New Zealand Dollar / USD", cat:"Forex", aliases:["kiwi","nzd"] },
  { sym:"USDCHF", label:"US Dollar / Swiss Franc",  cat:"Forex", aliases:["swissy","chf"] },
  { sym:"GBPJPY", label:"British Pound / Yen",      cat:"Forex", aliases:["guppy","gbpjpy"] },
  { sym:"EURJPY", label:"Euro / Japanese Yen",      cat:"Forex", aliases:["eurjpy","ej"] },
  { sym:"EURGBP", label:"Euro / British Pound",     cat:"Forex", aliases:["eurgbp"] },
  { sym:"USOIL",  label:"US Oil (WTI Spot)",        cat:"Forex", aliases:["oil","crude","wti","usoil"] },
  { sym:"UKOIL",  label:"Brent Crude Oil",          cat:"Forex", aliases:["brent","brent crude"] },
  // ── Stocks ───────────────────────────────────────────────
  { sym:"AAPL",  label:"Apple Inc.",                cat:"Stock" },
  { sym:"TSLA",  label:"Tesla Inc.",                cat:"Stock" },
  { sym:"NVDA",  label:"NVIDIA Corporation",        cat:"Stock" },
  { sym:"AMZN",  label:"Amazon.com Inc.",           cat:"Stock" },
  { sym:"META",  label:"Meta Platforms",            cat:"Stock" },
  { sym:"MSFT",  label:"Microsoft Corp.",           cat:"Stock" },
  { sym:"GOOG",  label:"Alphabet Inc.",             cat:"Stock" },
  { sym:"GOOGL", label:"Alphabet Inc. (A)",         cat:"Stock" },
  { sym:"AVGO",  label:"Broadcom Inc.",             cat:"Stock" },
  { sym:"AMD",   label:"Advanced Micro Devices",    cat:"Stock" },
  { sym:"INTC",  label:"Intel Corporation",         cat:"Stock" },
  { sym:"NFLX",  label:"Netflix Inc.",              cat:"Stock" },
  { sym:"JPM",   label:"JPMorgan Chase",            cat:"Stock" },
  { sym:"COST",  label:"Costco Wholesale",          cat:"Stock", aliases:["costco"] },
  { sym:"GS",    label:"Goldman Sachs",             cat:"Stock" },
  { sym:"V",     label:"Visa Inc.",                 cat:"Stock" },
  { sym:"MA",    label:"Mastercard",                cat:"Stock" },
  { sym:"LLY",   label:"Eli Lilly",                 cat:"Stock" },
  { sym:"RIVN",  label:"Rivian Automotive",         cat:"Stock" },
  { sym:"PLTR",  label:"Palantir Technologies",     cat:"Stock" },
  { sym:"COIN",  label:"Coinbase Global",           cat:"Stock" },
  { sym:"HOOD",  label:"Robinhood Markets",         cat:"Stock" },
  { sym:"GME",   label:"GameStop Corp.",            cat:"Stock" },
  { sym:"AMC",   label:"AMC Entertainment",         cat:"Stock" },
  { sym:"MSTR",  label:"MicroStrategy (BTC proxy)", cat:"Stock" },
  { sym:"SMCI",  label:"Super Micro Computer",      cat:"Stock" },
  { sym:"ARM",   label:"ARM Holdings",              cat:"Stock" },
  { sym:"DJT",   label:"Trump Media & Technology",  cat:"Stock" },
  { sym:"RKLB",  label:"Rocket Lab",                cat:"Stock" },
  { sym:"LUNR",  label:"Intuitive Machines",        cat:"Stock" },
  // ── ETFs ─────────────────────────────────────────────────
  { sym:"SPY",   label:"SPDR S&P 500 ETF",          cat:"ETF" },
  { sym:"QQQ",   label:"Invesco QQQ (Nasdaq 100)",  cat:"ETF" },
  { sym:"IWM",   label:"iShares Russell 2000 ETF",  cat:"ETF" },
  { sym:"GLD",   label:"SPDR Gold Shares",          cat:"ETF" },
  { sym:"SLV",   label:"iShares Silver Trust",      cat:"ETF" },
  { sym:"TLT",   label:"iShares 20+ Year T-Bond",   cat:"ETF" },
  { sym:"XLK",   label:"Technology Select SPDR",    cat:"ETF" },
  { sym:"XLF",   label:"Financial Select SPDR",     cat:"ETF" },
  { sym:"XLE",   label:"Energy Select SPDR",        cat:"ETF" },
  { sym:"SOXS",  label:"Direxion Semi Bear 3x",     cat:"ETF" },
  { sym:"SOXL",  label:"Direxion Semi Bull 3x",     cat:"ETF" },
  { sym:"TQQQ",  label:"ProShares UltraPro QQQ 3x", cat:"ETF" },
  { sym:"SQQQ",  label:"ProShares UltraPro Sh QQQ", cat:"ETF" },
  { sym:"UVXY",  label:"ProShares Ultra VIX",        cat:"ETF" },
  { sym:"VXX",   label:"iPath VIX Short-Term Futures",cat:"ETF" },
  // ── Crypto ───────────────────────────────────────────────
  { sym:"BTCUSD", label:"Bitcoin / USD",            cat:"Crypto", aliases:["btc","bitcoin"] },
  { sym:"ETHUSD", label:"Ethereum / USD",           cat:"Crypto", aliases:["eth","ethereum"] },
  { sym:"SOLUSD", label:"Solana / USD",             cat:"Crypto", aliases:["sol","solana"] },
  { sym:"BNBUSD", label:"BNB / USD",                cat:"Crypto", aliases:["bnb"] },
  { sym:"XRPUSD", label:"XRP / USD",               cat:"Crypto", aliases:["xrp","ripple"] },
  { sym:"DOGEUSD",label:"Dogecoin / USD",           cat:"Crypto", aliases:["doge","dogecoin"] },
  { sym:"ADAUSD", label:"Cardano / USD",            cat:"Crypto", aliases:["ada","cardano"] },
  { sym:"AVAXUSD",label:"Avalanche / USD",          cat:"Crypto", aliases:["avax","avalanche"] },
  { sym:"LTCUSD", label:"Litecoin / USD",           cat:"Crypto", aliases:["ltc","litecoin"] },
  { sym:"LINKUSD",label:"Chainlink / USD",          cat:"Crypto", aliases:["link","chainlink"] },
  { sym:"MATICUSD",label:"Polygon / USD",           cat:"Crypto", aliases:["matic","polygon"] },
  { sym:"PEPEUSD",label:"Pepe / USD",               cat:"Crypto", aliases:["pepe","meme"] },
  { sym:"SHIBUSD",label:"Shiba Inu / USD",          cat:"Crypto", aliases:["shib","shiba"] },
  { sym:"SUIUSD", label:"Sui / USD",                cat:"Crypto", aliases:["sui"] },
  { sym:"WIFUSD", label:"dogwifhat / USD",          cat:"Crypto", aliases:["wif","dogwifhat"] },
  { sym:"BONKUSD",label:"Bonk / USD",               cat:"Crypto", aliases:["bonk"] },
  { sym:"FLOKIUSD",label:"Floki / USD",             cat:"Crypto", aliases:["floki"] },];

/** The catalog, with every badge reconciled against the class owner. */
export const CURATED_SYMBOLS: readonly CuratedSymbol[] = RAW_CURATED_SYMBOLS.map((s) => ({
  ...s,
  cat: reconcileSearchCategory(s.sym, s.cat as SearchCategory),
}));

/**
 * Match and order the catalog through `symbolSearchRank` — the same owner
 * `/api/symbol-search` ranks its vendor results with.
 *
 * The docblock that stood here described four tiers: "symbol prefix, then
 * substring, then label, then alias." The code below it implemented TWO —
 * `startsWith` versus everything else — with no exact-match tier at all, so
 * for `spy` the catalogue could rank `SPYG` level with `SPY`, and the comment
 * had been describing an intention rather than a behaviour.
 *
 * That is the same defect the vendor half had, arrived at independently, which
 * is the argument for one owner rather than two careful copies.
 */
export function matchCuratedSymbols(query: string, limit: number): CuratedSymbol[] {
  return rankSymbolHits(query, CURATED_SYMBOLS, limit);
}
