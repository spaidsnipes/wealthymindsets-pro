/**
 * INSTRUMENT FAMILY × BROKER — what the ONE TRADE ticket may say about each
 * family it offers (Founder P0, 2026-10-10: "charting a market is not the
 * ability to execute it; never fake support; spot FX is not a currency future").
 *
 * WHAT THIS OWNS: the six trade families, the screen that SENDS each family on
 * each rail (the "door"), and the one verdict per family the ticket paints:
 *
 *   EXECUTABLE     a live broker rail is connected and a WM screen sends this
 *                  family to it (always on the trader's armed press).
 *   PAPER ONLY     only the Alpaca paper account can take it — no money.
 *   NOT CONNECTED  WM has built a rail for it, but that rail is not connected
 *                  on this account right now.
 *   CHART ONLY     no rail in WM sends this family — chart, levels and the
 *                  risk calculator work; nothing can be sent.
 *
 * WHAT IT DOES NOT OWN: whether a rail is BUILT for a capability. That is the
 * broker capability ledger (src/lib/broker/capabilityLedger.ts), read here row
 * by row — a family is never declared executable in this file without the
 * ledger's HUMAN_ARMED / PARTIAL row behind it. The Alpaca PAPER rail is not in
 * that ledger (it is not a live broker), so its two families are stated here
 * with the route that earns them.
 *
 * Connection state is an INPUT (read at runtime by useTradeRails); this module
 * never fetches. PURE.
 */

import { CAPABILITY_LEDGER, type CapabilityId, type CapabilityRow } from "@/lib/broker/capabilityLedger";
import { canonicalAssetClass } from "@/lib/marketData/canonicalIdentity";

export type TradeFamily = "STOCK" | "EQUITY_OPTION" | "FUTURE" | "FUTURE_OPTION" | "FX" | "CRYPTO";
export const TRADE_FAMILIES: readonly TradeFamily[] = ["STOCK", "EQUITY_OPTION", "FUTURE", "FUTURE_OPTION", "FX", "CRYPTO"];

export const FAMILY_LABEL: Readonly<Record<TradeFamily, string>> = {
  STOCK: "Stocks & ETFs",
  EQUITY_OPTION: "Equity options",
  FUTURE: "Futures",
  FUTURE_OPTION: "Futures options",
  FX: "Forex",
  CRYPTO: "Crypto",
};

/** The ledger capability that earns each family's execution claim. */
export const FAMILY_EXEC_CAPABILITY: Readonly<Record<TradeFamily, CapabilityId>> = {
  STOCK: "EXEC_EQUITY",
  EQUITY_OPTION: "EXEC_OPTION",
  FUTURE: "EXEC_FUTURE",
  FUTURE_OPTION: "EXEC_FUTURE_OPTION",
  FX: "EXEC_FX",
  CRYPTO: "EXEC_CRYPTO",
};

export type TradeRail = "tastytrade" | "Webull" | "Alpaca paper";
export const TRADE_RAILS: readonly TradeRail[] = ["tastytrade", "Webull", "Alpaca paper"];

/**
 * The SCREEN a trader sends this family from, per rail — null = no WM screen
 * sends it, whatever the route can do. A sentinel pins every door to a file
 * that exists and renders that rail's send block.
 */
export type TradeDoor = "TICKET" | "CHAIN" | "EXPRESSION" | "PAPER";
export const DOOR_OWNER: Readonly<Record<TradeDoor, string>> = {
  TICKET: "src/components/chart/TradePanel.tsx",
  CHAIN: "src/components/chart/FuturesOptionsPanel.tsx",
  EXPRESSION: "src/components/chart/WebullOptionPreflight.tsx",
  PAPER: "src/components/broker/AlpacaTradingPanel.tsx",
};
export const DOOR_WORDS: Readonly<Record<TradeDoor, string>> = {
  TICKET: "this ticket",
  CHAIN: "the options chain (opened from this ticket)",
  EXPRESSION: "the Options tab's expression card",
  PAPER: "the Alpaca paper drawer",
};

export const FAMILY_DOORS: Readonly<Record<TradeRail, Readonly<Partial<Record<TradeFamily, TradeDoor>>>>> = {
  tastytrade: { STOCK: "TICKET", FUTURE: "TICKET", CRYPTO: "TICKET", EQUITY_OPTION: "CHAIN", FUTURE_OPTION: "CHAIN" },
  // Webull's stock route is built and tested, but no WM screen sends a Webull stock order yet.
  Webull: { EQUITY_OPTION: "EXPRESSION" },
  "Alpaca paper": { STOCK: "PAPER", CRYPTO: "PAPER" },
};

/** The paper rail's own evidence: the route refuses futures and forex; it trades US equities and crypto. */
export const PAPER_RAIL_OWNER = "src/app/api/alpaca-trading/route.ts";

export type RailConnection = "CONNECTED" | "NOT_CONNECTED" | "NOT_YOURS" | "CHECKING" | "NOT_READ";
export type RailConnections = Readonly<Record<TradeRail, RailConnection>>;

export type FamilyState = "EXECUTABLE" | "PAPER_ONLY" | "NOT_CONNECTED" | "CHART_ONLY";
export const FAMILY_STATE_WORD: Readonly<Record<FamilyState, string>> = {
  EXECUTABLE: "EXECUTABLE", PAPER_ONLY: "PAPER ONLY", NOT_CONNECTED: "NOT CONNECTED", CHART_ONLY: "CHART ONLY",
};

export interface FamilyCell {
  readonly rail: TradeRail;
  readonly state: FamilyState;
  readonly door: TradeDoor | null;
  /** Trader words — why this rail can or cannot take this family. */
  readonly reason: string;
}

export interface FamilyVerdict {
  readonly family: TradeFamily;
  readonly state: FamilyState;
  readonly reason: string;
  readonly cells: readonly FamilyCell[];
}

const connWords = (rail: TradeRail, c: RailConnection): string =>
  c === "CHECKING" ? `checking your ${rail} account`
  : c === "NOT_YOURS" ? `${rail} is not on your account`
  : c === "NOT_READ" ? `${rail} is not read in this proof scene`
  : `${rail} is not connected`;

function ledgerRow(rail: "tastytrade" | "Webull", family: TradeFamily): CapabilityRow | null {
  const cap = FAMILY_EXEC_CAPABILITY[family];
  return CAPABILITY_LEDGER.find(r => r.provider === rail && r.capability === cap) ?? null;
}

/** One rail's answer for one family. */
export function familyCell(family: TradeFamily, rail: TradeRail, conn: RailConnection): FamilyCell {
  const door = FAMILY_DOORS[rail][family] ?? null;
  if (rail === "Alpaca paper") {
    if (!door) return { rail, state: "CHART_ONLY", door: null, reason: `Alpaca paper does not trade ${FAMILY_LABEL[family].toLowerCase()}.` };
    return conn === "CONNECTED"
      ? { rail, state: "PAPER_ONLY", door, reason: `Alpaca paper takes it from ${DOOR_WORDS[door]} — practice money, never your account.` }
      : { rail, state: "NOT_CONNECTED", door, reason: `Alpaca paper could take it, but ${connWords(rail, conn)}.` };
  }
  const row = ledgerRow(rail, family);
  const built = row != null && (row.state === "HUMAN_ARMED" || row.state === "PARTIAL");
  if (!built) return { rail, state: "CHART_ONLY", door: null, reason: `${rail}: ${row?.note ?? "no order rail in WM"}.` };
  if (!door) return { rail, state: "CHART_ONLY", door: null, reason: `${rail}'s order route is built, but no WM screen sends a ${FAMILY_LABEL[family].toLowerCase()} order to it yet.` };
  return conn === "CONNECTED"
    ? { rail, state: "EXECUTABLE", door, reason: `${rail} — from ${DOOR_WORDS[door]}, on your armed press (${row!.note}).` }
    : { rail, state: "NOT_CONNECTED", door, reason: `${rail} can take it from ${DOOR_WORDS[door]}, but ${connWords(rail, conn)}.` };
}

const RANK: Readonly<Record<FamilyState, number>> = { EXECUTABLE: 3, PAPER_ONLY: 2, NOT_CONNECTED: 1, CHART_ONLY: 0 };

/** The family's one verdict: the best rail wins, and its reason is the one said. */
export function familyVerdict(family: TradeFamily, conns: RailConnections): FamilyVerdict {
  const cells = TRADE_RAILS.map(r => familyCell(family, r, conns[r]));
  const best = cells.reduce((a, b) => (RANK[b.state] > RANK[a.state] ? b : a));
  const state = best.state;
  const winners = cells.filter(c => c.state === state);
  const reason =
    state === "CHART_ONLY"
      ? family === "FX"
        ? "No connected spot-forex broker — chart, levels and the pip calculator work; nothing can be sent. A currency future (/6E) is a Futures trade, never swapped in."
        : `No WM rail sends ${FAMILY_LABEL[family].toLowerCase()} — chart and risk math only.`
      : winners.map(c => c.reason).join(" ");
  return { family, state, reason, cells };
}

/** Which family the CHART's instrument belongs to (the ticket opens on it). */
export function chartFamily(symbol: string): TradeFamily {
  const s = (symbol ?? "").trim().toUpperCase();
  const c = canonicalAssetClass(s);
  if (c === "futures") return "FUTURE";
  if (c === "crypto") return "CRYPTO";
  if (c === "forex") return "FX";
  if (c === "options") return s.startsWith("./") ? "FUTURE_OPTION" : "EQUITY_OPTION";
  return "STOCK";
}

/**
 * Contract pickers' menus (the ticket switches the CHART to the pick, so the
 * order, its staged lines and its Decision stay on the glass the trader sees).
 * Futures come in mini / micro pairs — the same market at a tenth of the money.
 */
export const FUTURES_PAIRS: readonly { readonly market: string; readonly mini: string; readonly micro: string }[] = [
  { market: "S&P 500", mini: "ES1!", micro: "MES1!" },
  { market: "Nasdaq 100", mini: "NQ1!", micro: "MNQ1!" },
  { market: "Russell 2000", mini: "RTY1!", micro: "M2K1!" },
  { market: "Dow", mini: "YM1!", micro: "MYM1!" },
  { market: "Crude oil", mini: "CL1!", micro: "MCL1!" },
  { market: "Gold", mini: "GC1!", micro: "MGC1!" },
];
export const STOCK_PICKS: readonly string[] = ["SPY", "QQQ", "IWM", "AAPL", "NVDA", "TSLA", "MSFT", "AMZN"];
export const CRYPTO_PICKS: readonly string[] = ["BTC", "ETH", "SOL", "XRP", "LINK"];
export const FX_PICKS: readonly string[] = ["EUR/USD", "GBP/USD", "USD/JPY", "AUD/USD", "USD/CAD", "EUR/JPY", "EUR/GBP"];

/**
 * ATTACHED PROTECTION (bracket: entry + stop + target, OCO between the exits) on a rail — read from
 * the ledger's BRACKET row. The ticket says "BRACKET · stop + target attached" ONLY when the row is
 * HUMAN_ARMED; otherwise it says attached protection is not available on this rail, and why.
 */
export function bracketSupport(rail: "tastytrade" | "Webull"): { readonly supported: boolean; readonly words: string } {
  const row = CAPABILITY_LEDGER.find(r => r.provider === rail && r.capability === "BRACKET");
  return row?.state === "HUMAN_ARMED"
    ? { supported: true, words: "BRACKET · stop + target attached" }
    : { supported: false, words: `Attached protection (bracket) is not available on ${rail} yet — ${row?.note ?? "not built"}.` };
}
