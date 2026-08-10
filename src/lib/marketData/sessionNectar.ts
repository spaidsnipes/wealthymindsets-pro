import { MARKET_DATA_CAPABILITIES, type MarketDataCapability } from "./capabilityRegistry";
import {
  createChannelCoverage,
  observeChannel,
  type MarketChannelCoverage,
} from "./coverageMap";
import {
  MarketEventGuard,
  type CanonicalMarketEvent,
  type MarketEventGuardResult,
} from "./marketEvent";

export const SESSION_NECTAR_SCHEMA_VERSION = "wm.session-nectar.v1" as const;

export interface SessionNectarSnapshot {
  schemaVersion: typeof SESSION_NECTAR_SCHEMA_VERSION;
  startedAt: number;
  updatedAt?: number;
  channels: readonly MarketChannelCoverage[];
  receipts: ReturnType<MarketEventGuard["snapshot"]>;
  unsupportedCapabilities: number;
  retentionState: "SESSION_ONLY_NO_RAW_PAYLOADS";
}

export type SessionNectarIngestResult =
  | MarketEventGuardResult
  | { status: "UNSUPPORTED_CAPABILITY"; event: CanonicalMarketEvent };

type Listener = () => void;

function capabilityFor(event: CanonicalMarketEvent): MarketDataCapability | null {
  const eventType = event.eventType.toLowerCase();
  return MARKET_DATA_CAPABILITIES.find(entry =>
    entry.providerPath === event.providerPath &&
    entry.assetClass === event.assetClass &&
    entry.eventType === eventType
  ) ?? null;
}

function eventTime(event: CanonicalMarketEvent): number {
  return event.timestampExchange ?? event.timestampProvider ?? event.timestampReceived;
}

/**
 * Browser-session Nectar collector.
 *
 * It retains validation receipts and coverage facts only. It never stores raw
 * market payloads or claims durable Market Memory. Provider retention rights
 * remain governed by the capability registry and currently fail closed.
 */
export class SessionNectarCollector {
  private readonly guard: MarketEventGuard;
  private readonly channels = new Map<string, MarketChannelCoverage>();
  private readonly listeners = new Set<Listener>();
  private updatedAt?: number;
  private unsupportedCapabilities = 0;

  constructor(
    private readonly startedAt = Date.now(),
    maxSeenEventIds = 50_000,
  ) {
    if (!Number.isFinite(startedAt) || startedAt <= 0) {
      throw new Error("Session Nectar requires a valid start timestamp.");
    }
    this.guard = new MarketEventGuard(maxSeenEventIds);
  }

  ingest(event: CanonicalMarketEvent): SessionNectarIngestResult {
    const inspected = this.guard.inspect(event);
    if (inspected.status !== "ACCEPTED") return inspected;

    const capability = capabilityFor(event);
    if (!capability || capability.availability === "UNAVAILABLE") {
      this.unsupportedCapabilities += 1;
      this.updatedAt = event.timestampProcessed;
      this.emit();
      return { status: "UNSUPPORTED_CAPABILITY", event };
    }

    const instrumentId = event.executableIdentity ?? event.normalizedSymbol;
    const channelKey = `${instrumentId}|${event.eventType}|${event.providerPath}`;
    const current = this.channels.get(channelKey) ?? {
      ...createChannelCoverage(instrumentId, capability),
      normalizedSymbol: event.normalizedSymbol.toUpperCase(),
    };
    const next = observeChannel(current, {
      eventAt: eventTime(event),
      receivedAt: event.timestampReceived,
      sequenceGap: inspected.warnings.includes("SEQUENCE_GAP"),
    });

    this.channels.set(channelKey, next);
    this.updatedAt = event.timestampProcessed;
    this.emit();
    return inspected;
  }

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  snapshot(): SessionNectarSnapshot {
    return {
      schemaVersion: SESSION_NECTAR_SCHEMA_VERSION,
      startedAt: this.startedAt,
      updatedAt: this.updatedAt,
      channels: [...this.channels.values()]
        .map(channel => ({ ...channel }))
        .sort((a, b) => `${a.instrumentId}|${a.channel}|${a.providerPath}`
          .localeCompare(`${b.instrumentId}|${b.channel}|${b.providerPath}`)),
      receipts: this.guard.snapshot(),
      unsupportedCapabilities: this.unsupportedCapabilities,
      retentionState: "SESSION_ONLY_NO_RAW_PAYLOADS",
    };
  }

  private emit() {
    this.listeners.forEach(listener => listener());
  }
}

const sessionNectarCollector = new SessionNectarCollector();

export function ingestSessionNectarEvent(event: CanonicalMarketEvent): SessionNectarIngestResult {
  return sessionNectarCollector.ingest(event);
}

export function getSessionNectarSnapshot(): SessionNectarSnapshot {
  return sessionNectarCollector.snapshot();
}

export function subscribeToSessionNectar(listener: Listener): () => void {
  return sessionNectarCollector.subscribe(listener);
}

export function findSessionNectarChannel(
  snapshot: SessionNectarSnapshot,
  normalizedSymbol: string,
  channel: MarketChannelCoverage["channel"],
): MarketChannelCoverage | null {
  const wanted = normalizedSymbol.trim().toUpperCase();
  if (!wanted) return null;
  return snapshot.channels.find(entry =>
    entry.channel === channel &&
    (entry.normalizedSymbol?.toUpperCase() === wanted || entry.instrumentId.toUpperCase() === wanted)
  ) ?? null;
}
