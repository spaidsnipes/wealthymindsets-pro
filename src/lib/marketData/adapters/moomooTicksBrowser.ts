import type { CanonicalMarketEvent } from "../marketEvent";

export interface MoomooTicksRouteBody {
  readonly source?: unknown;
  readonly label?: unknown;
  readonly symbol?: unknown;
  readonly receiving?: unknown;
  readonly events?: unknown;
}

/**
 * Browser-side fail-closed selection for the authenticated Moomoo route.
 * The server receipt is evidence, not authority: each event must still match
 * the active symbol and carry a current provider epoch, price, size, and an
 * explicit provider side before it can enter the aggressor tape.
 */
export function selectFreshMoomooTapeEvents(
  body: MoomooTicksRouteBody,
  expectedSymbol: string,
  now = Date.now(),
  maxAgeMs = 30_000,
): CanonicalMarketEvent[] {
  if (body?.source !== "moomoo" || body.label !== "RECEIVING" || body.receiving !== true || !Array.isArray(body.events)) {
    return [];
  }
  const normalized = expectedSymbol.trim().toUpperCase();
  return body.events.filter((value): value is CanonicalMarketEvent => {
    if (!value || typeof value !== "object") return false;
    const event = value as CanonicalMarketEvent;
    const providerAt = event.timestampProvider;
    return event.schemaVersion === "wm.market-event.v2" &&
      event.providerPath === "moomoo-opend-bridge" &&
      event.eventType === "TRADE" &&
      event.normalizedSymbol === normalized &&
      Number.isFinite(providerAt) && (providerAt as number) > 0 &&
      (providerAt as number) <= now + 5 * 60_000 && now - (providerAt as number) <= maxAgeMs &&
      Number.isFinite(event.price) && (event.price as number) > 0 &&
      Number.isFinite(event.size) && (event.size as number) > 0 &&
      (event.aggressorSide === "BUY" || event.aggressorSide === "SELL") &&
      event.aggressorMethod === "PROVIDER";
  });
}
