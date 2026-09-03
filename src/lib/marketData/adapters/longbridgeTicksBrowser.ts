import type { CanonicalMarketEvent } from "../marketEvent";

export interface LongbridgeTicksRouteBody {
  readonly source?: unknown;
  readonly label?: unknown;
  readonly symbol?: unknown;
  readonly receiving?: unknown;
  readonly events?: unknown;
}

/**
 * Admit only current, exact-symbol Longbridge prints as unsigned price/volume
 * observations. Longbridge trade direction is lineage, not aggressor side, so
 * these events may update the chart but can never enter tape/CVD/DOM.
 */
export function selectFreshLongbridgeObservedEvents(
  body: LongbridgeTicksRouteBody,
  expectedSymbol: string,
  now = Date.now(),
  maxAgeMs = 30_000,
): CanonicalMarketEvent[] {
  if (
    body?.source !== "longbridge" ||
    body.label !== "RECEIVING" ||
    body.receiving !== true ||
    !Array.isArray(body.events)
  ) return [];

  const normalized = expectedSymbol.trim().toUpperCase();
  if (body.symbol !== normalized) return [];

  return body.events.filter((value): value is CanonicalMarketEvent => {
    if (!value || typeof value !== "object") return false;
    const event = value as CanonicalMarketEvent;
    const providerAt = event.timestampProvider;
    return event.schemaVersion === "wm.market-event.v2" &&
      event.providerPath === "longbridge-openapi-bridge" &&
      event.eventType === "TRADE" &&
      event.normalizedSymbol === normalized &&
      Number.isFinite(providerAt) && (providerAt as number) > 0 &&
      (providerAt as number) <= now + 5 * 60_000 && now - (providerAt as number) <= maxAgeMs &&
      Number.isFinite(event.price) && (event.price as number) > 0 &&
      Number.isFinite(event.size) && (event.size as number) > 0 &&
      event.aggressorMethod === "NONE" &&
      event.aggressorSide !== "BUY" &&
      event.aggressorSide !== "SELL";
  });
}
