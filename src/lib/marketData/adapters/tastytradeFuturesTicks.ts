/**
 * TASTYTRADE FUTURES PRINTS → CANONICAL MARKET EVENTS (Garden 18 §XLV/§XLIX).
 *
 * Webull's futures market data is not subscribed (403 MARKET_DATA_NOT_SUBSCRIBED);
 * tastytrade's DXLink stream carries the real CME contract. A continuous chart
 * symbol (ES1!) is fed by tastytrade's own active-month contract, named in the
 * event's contractId so the provenance never pretends the print was "ES1!".
 *
 * dxFeed's Trade event carries no aggressor side: these events are UNSIGNED
 * (aggressorMethod NONE) and move price and the forming bar only — never the
 * signed tape. PURE.
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

export function tastyTradeToMarketEvent(
  e: ContractEvent,
  appSymbol: string,
  contract: TastyFrontMonth,
  receivedAtMs: number,
  index: number,
): CanonicalMarketEvent | null {
  if (e.type !== "Trade" || e.symbol !== contract.streamer) return null;
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
