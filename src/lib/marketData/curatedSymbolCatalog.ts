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

export interface CuratedSymbol {
  readonly sym: string;
  readonly label: string;
  readonly cat: string;
  readonly aliases?: readonly string[];
}

const RAW_CURATED_SYMBOLS = [
  // ── Futures ──────────────────────────────────────────────
  { sym:"NQ1!",  label:"Nasdaq-100 Futures",        cat:"Futures", aliases:["nasdaq","nq","tech futures","mnq"] },
  { sym:"ES1!",  label:"S&P 500 Futures",           cat:"Futures", aliases:["sp500","es","spy futures","mes"] },
  { sym:"RTY1!", label:"Russell 2000 Futures",      cat:"Futures", aliases:["rty","russell","m2k"] },
  { sym:"YM1!",  label:"Dow Jones Futures",         cat:"Futures", aliases:["ym","dow","us30 futures","mym"] },
  { sym:"GC1!",  label:"Gold Futures",              cat:"Futures", aliases:["gold","xauusd","xau","mgc"] },
  { sym:"CL1!",  label:"Crude Oil WTI Futures",     cat:"Futures", aliases:["oil","crude","wti","mcl"] },
  { sym:"SI1!",  label:"Silver Futures",            cat:"Futures", aliases:["silver","xagusd","sil"] },
  { sym:"HG1!",  label:"Copper Futures",            cat:"Futures", aliases:["copper"] },
  { sym:"ZB1!",  label:"30-Year T-Bond Futures",    cat:"Futures", aliases:["bonds","treasury","zb"] },
  { sym:"ZN1!",  label:"10-Year T-Note Futures",    cat:"Futures", aliases:["10yr","zn","notes"] },
  { sym:"6E1!",  label:"Euro Futures",              cat:"Futures", aliases:["euro","eurusd futures","6e"] },
  { sym:"6J1!",  label:"Yen Futures",               cat:"Futures", aliases:["yen","usdjpy futures","6j"] },
  { sym:"6B1!",  label:"British Pound Futures",     cat:"Futures", aliases:["pound","gbpusd futures","6b"] },
  // Labelled for what LOADS, not for what the ticker looks like: this app
  // resolves `VX1!` to the `^VIX` cash index (yahooSymbol.ts), so a trader who
  // picked "VIX Futures" here was handed the index and told it was a contract.
  { sym:"VX1!",  label:"VIX Index (via VX1!)",      cat:"Index",   aliases:["vix","volatility","fear"] },
  { sym:"NG1!",  label:"Natural Gas Futures",       cat:"Futures", aliases:["natgas","natural gas"] },
  // ── Forex / FX ───────────────────────────────────────────
  { sym:"EURUSD", label:"Euro / US Dollar",         cat:"Forex", aliases:["euro dollar","6e","eur"] },
  { sym:"GBPUSD", label:"British Pound / USD",      cat:"Forex", aliases:["cable","pound","gbp","sterling"] },
  { sym:"USDJPY", label:"US Dollar / Japanese Yen", cat:"Forex", aliases:["dollar yen","jpy","yen"] },
  { sym:"XAUUSD", label:"Gold / US Dollar (Spot)",  cat:"Forex", aliases:["gold","xau","spot gold","gc"] },
  { sym:"XAGUSD", label:"Silver / US Dollar (Spot)",cat:"Forex", aliases:["silver","xag","spot silver"] },
  { sym:"US30",   label:"Dow Jones Index (Cash)",   cat:"Forex", aliases:["dow","dji","dow jones","us30","ym"] },
  { sym:"US500",  label:"S&P 500 Index (Cash)",     cat:"Forex", aliases:["sp500","spx","s&p","us500"] },
  { sym:"US100",  label:"Nasdaq 100 Index (Cash)",  cat:"Forex", aliases:["nasdaq","ndx","us100","nq"] },
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
  { sym:"AVAXUSD",label:"Avalanche / USD",          cat:"Crypto", aliases:["avax"] },
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
 * Match the catalog the way both search surfaces did — symbol prefix, then
 * substring, then label, then alias. Shared so the two cannot rank the same
 * query differently.
 */
export function matchCuratedSymbols(query: string, limit: number): CuratedSymbol[] {
  const q = query.toLowerCase().replace(/[/\-_\s!]/g, "");
  if (!q) return [];
  const raw = query.toLowerCase();
  return CURATED_SYMBOLS.filter((s) => {
    const clean = s.sym.toLowerCase().replace(/[/\-_\s!]/g, "");
    return (
      clean.startsWith(q) ||
      clean.includes(q) ||
      s.label.toLowerCase().includes(raw) ||
      s.aliases?.some((a) => a.includes(raw))
    );
  })
    .sort((a, b) => {
      const aE = a.sym.toLowerCase().replace(/[/\-_\s!]/g, "").startsWith(q);
      const bE = b.sym.toLowerCase().replace(/[/\-_\s!]/g, "").startsWith(q);
      return aE === bE ? 0 : aE ? -1 : 1;
    })
    .slice(0, limit);
}
