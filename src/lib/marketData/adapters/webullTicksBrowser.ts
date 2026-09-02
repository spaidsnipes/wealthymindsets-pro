import { UNKNOWN_RIGHTS_POLICY_ID } from "../capabilityRegistry";
import { MARKET_EVENT_SCHEMA_VERSION, type CanonicalMarketEvent } from "../marketEvent";

interface WebullRouteTick {
  readonly symbol?: unknown;
  readonly price?: unknown;
  readonly volume?: unknown;
  readonly observedAtMs?: unknown;
  readonly side?: unknown;
  readonly tradingSession?: unknown;
}

export interface WebullTicksRouteBody {
  readonly source?: unknown;
  readonly state?: unknown;
  readonly fidelity?: unknown;
  readonly symbol?: unknown;
  readonly ticks?: unknown;
}

/**
 * Fail-closed browser normalization for the authenticated Webull snapshot.
 * Recent exact-symbol prints may update price/volume even when Webull does not
 * declare aggressor side. Snapshot retrieval never becomes a streaming/LIVE
 * claim, and UNKNOWN side remains barred from signed order-flow consumers.
 */
export function selectFreshWebullObservedEvents(
  body: WebullTicksRouteBody,
  expectedSymbol: string,
  receivedAt = Date.now(),
  maxAgeMs = 30_000,
): CanonicalMarketEvent[] {
  const normalized = expectedSymbol.trim().toUpperCase();
  if (
    body?.source !== "webull" ||
    body.state !== "OBSERVED" ||
    body.fidelity !== "SNAPSHOT" ||
    body.symbol !== normalized ||
    !Array.isArray(body.ticks)
  ) return [];

  const events = body.ticks.flatMap((value) => {
    if (!value || typeof value !== "object") return [];
    const tick = value as WebullRouteTick;
    const symbol = typeof tick.symbol === "string" ? tick.symbol.trim().toUpperCase() : "";
    const price = Number(tick.price);
    const size = Number(tick.volume);
    const providerAt = Number(tick.observedAtMs);
    const side = tick.side === "BUY" || tick.side === "SELL" ? tick.side : "UNKNOWN";
    if (
      symbol !== normalized ||
      !(price > 0) ||
      !(size > 0) ||
      !Number.isFinite(providerAt) ||
      providerAt <= 0 ||
      providerAt > receivedAt + 5 * 60_000 ||
      receivedAt - providerAt > maxAgeMs
    ) return [];

    // Webull does not expose a sequence in this response. Keep identity stable
    // across overlapping polls so the ingress guard can reject repeats.
    const identity = `${symbol}:${providerAt}:${price}:${size}:${side}`;
    return [{
      schemaVersion: MARKET_EVENT_SCHEMA_VERSION,
      normalizationVersion: "webull-browser-v1",
      eventId: `webull:${identity}`,
      sourceEventId: identity,
      symbol,
      normalizedSymbol: symbol,
      assetClass: "EQUITY",
      providerClass: "BROKER",
      providerPath: "webull-openapi-ticks",
      eventType: "TRADE",
      timestampProvider: providerAt,
      timestampReceived: receivedAt,
      timestampProcessed: receivedAt,
      availableAt: receivedAt,
      sequenceState: "UNAVAILABLE",
      price,
      size,
      sessionId: typeof tick.tradingSession === "string" ? tick.tradingSession : undefined,
      aggressorSide: side,
      aggressorMethod: side === "UNKNOWN" ? "NONE" : "PROVIDER",
      aggressorConfidence: side === "UNKNOWN" ? 0 : 1,
      sourceClass: "PRIMARY",
      dataMode: "DELAYED",
      fidelityClass: "OBSERVED",
      rightsPolicyId: UNKNOWN_RIGHTS_POLICY_ID,
    } satisfies CanonicalMarketEvent];
  });
  return events.sort((left, right) => left.timestampProvider! - right.timestampProvider!);
}

/** Only provider-sided observations may enter tape/CVD/footprint consumers. */
export function selectFreshWebullTapeEvents(
  body: WebullTicksRouteBody,
  expectedSymbol: string,
  receivedAt = Date.now(),
  maxAgeMs = 30_000,
): CanonicalMarketEvent[] {
  return selectFreshWebullObservedEvents(body, expectedSymbol, receivedAt, maxAgeMs)
    .filter((event) => event.aggressorSide === "BUY" || event.aggressorSide === "SELL");
}
