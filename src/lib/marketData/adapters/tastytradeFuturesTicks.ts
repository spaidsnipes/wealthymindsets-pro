/**
 * TASTYTRADE FUTURES PRINTS → CANONICAL MARKET EVENTS (Garden 18 §XLV/§XLIX).
 *
 * Webull's futures market data is not subscribed (403 MARKET_DATA_NOT_SUBSCRIBED);
 * tastytrade's DXLink stream carries the real CME contract. A continuous chart
 * symbol (ES1!) is fed by tastytrade's own active-month contract, named in the
 * event's contractId so the provenance never pretends the print was "ES1!".
 *
 * Two event shapes, two doors:
 *   TimeAndSale — every print with the EXCHANGE-REPORTED aggressor (BUY/SELL),
 *     proven on the owner's socket 2026-10-01. Signed prints feed the tape
 *     (footprint, delta, big trades); an UNDEFINED side stays unsigned.
 *   Trade — a last-trade snapshot with no side: UNSIGNED fallback only, for a
 *     product whose prints are not streamed.
 * PURE.
 */

import type { ContractEvent } from "@/lib/broker/tastyContractQuote";
import { UNKNOWN_RIGHTS_POLICY_ID } from "@/lib/marketData/capabilityRegistry";
import { MARKET_EVENT_SCHEMA_VERSION, type CanonicalMarketEvent } from "@/lib/marketData/marketEvent";

export interface TastyFrontMonth { readonly symbol: string; readonly streamer: string }

/** tastytrade's active-month contract (else the nearest unexpired), from `GET /instruments/futures?product-code=`. */
export function resolveTastyFrontMonth(futures: unknown): TastyFrontMonth | null {
  if (!Array.isArray(futures)) return null;
  const rows = futures.flatMap(f => {
    const o = (f ?? {}) as Record<string, unknown>;
    const symbol = typeof o.symbol === "string" ? o.symbol : "";
    const streamer = typeof o["streamer-symbol"] === "string" ? (o["streamer-symbol"] as string) : "";
    const dte = Number(o["days-to-expiration"]);
    if (!symbol || !streamer || o.active === false || o["is-closing-only"] === true) return [];
    return [{ symbol, streamer, dte: Number.isFinite(dte) ? dte : Infinity, active: o["active-month"] === true }];
  }).filter(r => r.dte >= 0);
  const pick = rows.find(r => r.active) ?? [...rows].sort((a, b) => a.dte - b.dte)[0];
  return pick ? { symbol: pick.symbol, streamer: pick.streamer } : null;
}

/**
 * A SPECIFIC month the trader chose (/MNQH7), never silently swapped for the
 * active month: the exact contract, or null when tastytrade does not list it.
 */
export function resolveTastyContract(futures: unknown, exactSymbol: string): TastyFrontMonth | null {
  if (!Array.isArray(futures)) return null;
  const want = exactSymbol.trim().toUpperCase();
  for (const f of futures) {
    const o = (f ?? {}) as Record<string, unknown>;
    if (typeof o.symbol !== "string" || o.symbol.toUpperCase() !== want) continue;
    const streamer = typeof o["streamer-symbol"] === "string" ? (o["streamer-symbol"] as string) : "";
    return streamer ? { symbol: o.symbol, streamer } : null;
  }
  return null;
}

export function tastyTradeToMarketEvent(
  e: ContractEvent,
  appSymbol: string,
  contract: TastyFrontMonth,
  receivedAtMs: number,
  index: number,
): CanonicalMarketEvent | null {
  // TradeETH is the extended-hours last (2026-10-01: after 16:00 ET the
  // masthead dated a stock's feed at 15:59:59 while it traded to 20:00). An
  // older snapshot arriving later is refused by the bar clock (LATE_EVENT).
  if ((e.type !== "Trade" && e.type !== "TradeETH") || e.symbol !== contract.streamer) return null;
  const price = e.values.price;
  const size = e.values.size;
  if (!(price != null && price > 0) || !(size != null && size > 0)) return null;
  const t = e.values.time;
  // A provider time from the future, or none, is not a provider time.
  const providerTime = t != null && t > 0 && t <= receivedAtMs + 5_000 ? t : undefined;
  return {
    schemaVersion: MARKET_EVENT_SCHEMA_VERSION,
    normalizationVersion: "tastytrade-dxlink-trade.v1",
    eventId: `tastytrade:${contract.streamer}:${providerTime ?? receivedAtMs}:${price}:${size}:${index}`,
    symbol: appSymbol,
    normalizedSymbol: appSymbol.toUpperCase(),
    assetClass: "futures",
    contractId: contract.symbol,
    exchange: contract.streamer.split(":")[1],
    providerClass: "BROKER",
    providerPath: "tastytrade-dxlink",
    eventType: "TRADE",
    timestampProvider: providerTime,
    timestampReceived: receivedAtMs,
    timestampProcessed: receivedAtMs,
    availableAt: receivedAtMs,
    sequenceState: "UNAVAILABLE",
    price,
    size,
    volume: size,
    aggressorMethod: "NONE",
    sourceClass: "PRIMARY",
    dataMode: "LIVE",
    fidelityClass: "OBSERVED",
    // Retention, redistribution and training stay unreviewed: fail closed.
    rightsPolicyId: UNKNOWN_RIGHTS_POLICY_ID,
    rawLineageRef: `tastytrade:${contract.streamer}`,
  };
}

/** One print off tastytrade's TimeAndSale stream, signed only when the exchange said so. */
export function tastyTimeAndSaleToMarketEvent(
  e: ContractEvent,
  appSymbol: string,
  contract: TastyFrontMonth,
  receivedAtMs: number,
  index: number,
): CanonicalMarketEvent | null {
  if (e.type !== "TimeAndSale" || e.symbol !== contract.streamer) return null;
  const price = e.values.price;
  const size = e.values.size;
  if (!(price != null && price > 0) || !(size != null && size > 0)) return null;
  const t = e.values.time;
  const providerTime = t != null && t > 0 && t <= receivedAtMs + 5_000 ? t : undefined;
  const raw = e.text.aggressorSide;
  const side = raw === "BUY" ? "BUY" : raw === "SELL" ? "SELL" : "UNKNOWN";
  const bid = e.values.bidPrice;
  const ask = e.values.askPrice;
  return {
    schemaVersion: MARKET_EVENT_SCHEMA_VERSION,
    normalizationVersion: "tastytrade-dxlink-timeandsale.v1",
    // (time, sequence) is the exchange print's own identity: live and history
    // spell the same id, so the ONE fold dedupes them. Without a sequence the
    // id falls back to this connection's arrival order.
    eventId: providerTime != null && e.values.sequence != null
      ? `tastytrade:${contract.streamer}:${providerTime}:${e.values.sequence}`
      : `tastytrade:${contract.streamer}:${providerTime ?? receivedAtMs}:${price}:${size}:${raw ?? "-"}:${index}`,
    symbol: appSymbol,
    normalizedSymbol: appSymbol.toUpperCase(),
    assetClass: "futures",
    contractId: contract.symbol,
    exchange: contract.streamer.split(":")[1],
    providerClass: "BROKER",
    providerPath: "tastytrade-dxlink",
    eventType: "TRADE",
    timestampExchange: providerTime,
    timestampProvider: providerTime,
    timestampReceived: receivedAtMs,
    timestampProcessed: receivedAtMs,
    availableAt: receivedAtMs,
    sequenceState: "UNAVAILABLE",
    price,
    size,
    volume: size,
    ...(bid != null && bid > 0 ? { bid } : {}),
    ...(ask != null && ask > 0 ? { ask } : {}),
    aggressorSide: side,
    aggressorMethod: side === "UNKNOWN" ? "NONE" : "PROVIDER",
    ...(side === "UNKNOWN" ? {} : { aggressorConfidence: 1 }),
    sourceClass: "PRIMARY",
    dataMode: "LIVE",
    fidelityClass: "OBSERVED",
    // Retention, redistribution and training stay unreviewed: fail closed.
    rightsPolicyId: UNKNOWN_RIGHTS_POLICY_ID,
    rawLineageRef: `tastytrade:${contract.streamer}:TimeAndSale`,
  };
}
