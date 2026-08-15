import { MARKET_DATA_CAPABILITIES, type MarketDataCapability } from "./capabilityRegistry";
import {
  createChannelCoverage,
  markCoverageStale,
  observeChannel,
  type MarketChannelCoverage,
} from "./coverageMap";
import {
  MarketEventGuard,
  type CanonicalMarketEvent,
  type MarketEventGuardResult,
} from "./marketEvent";
import {
  createCoverageContinuityRecord,
  mergeCoverageChannels,
  parseCoverageContinuityRecord,
} from "./coverageContinuity";

export const SESSION_NECTAR_SCHEMA_VERSION = "wm.session-nectar.v1" as const;

export interface SessionNectarSnapshot {
  schemaVersion: typeof SESSION_NECTAR_SCHEMA_VERSION;
  startedAt: number;
  updatedAt?: number;
  channels: readonly MarketChannelCoverage[];
  receipts: ReturnType<MarketEventGuard["snapshot"]>;
  unsupportedCapabilities: number;
  retentionState:
    | "SESSION_ONLY_NO_RAW_PAYLOADS"
    | "BROWSER_LOCAL_SUMMARY_NO_RAW_PAYLOADS"
    | "SERVER_DURABLE_SUMMARY_NO_RAW_PAYLOADS";
  continuityStartedAt?: number;
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
  private continuityRestored = false;
  private serverContinuityRestored = false;
  // Cached snapshot — same reference is returned between mutations so
  // useSyncExternalStore consumers cannot trip React #185 (identity change
  // per render → infinite re-render). Invalidated by every path that
  // changes visible state (ingest / restoreCoverageSummaries).
  private cachedSnapshot: SessionNectarSnapshot | null = null;

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
      this.cachedSnapshot = null;
    this.emit();
      return { status: "UNSUPPORTED_CAPABILITY", event };
    }

    const instrumentId = event.executableIdentity ?? event.normalizedSymbol;
    // Capability/coverage channels use lowercase values (`trade`, `quote`, …).
    // Canonical events use uppercase (`TRADE`, `QUOTE`, …). Normalize here so
    // a restored summary and resumed live collection update the same row.
    const channelKey = `${instrumentId}|${capability.eventType}|${event.providerPath}`;
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
    this.cachedSnapshot = null;
    this.emit();
    return inspected;
  }

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  restoreCoverageSummaries(
    channels: readonly MarketChannelCoverage[],
    source: "browser" | "server" = "browser",
  ): number {
    let restored = 0;
    for (const channel of channels) {
      if (channel.memoryState !== "SUMMARY_ONLY" || channel.observedFrom == null || channel.observedThrough == null) continue;
      const key = `${channel.instrumentId}|${channel.channel}|${channel.providerPath}`;
      const current = this.channels.get(key);
      const merged = current ? mergeCoverageChannels([channel], [current])[0] : channel;
      this.channels.set(key, current ? {
        ...merged,
        coverageState: current.coverageState,
        memoryState: current.memoryState,
        detail: current.detail,
      } : { ...merged, coverageState: "STALE", memoryState: "SUMMARY_ONLY" });
      restored += 1;
    }
    this.continuityRestored = restored > 0;
    if (source === "server" && restored > 0) this.serverContinuityRestored = true;
    if (restored > 0) this.emit();
    return restored;
  }

  snapshot(): SessionNectarSnapshot {
    if (this.cachedSnapshot) return this.cachedSnapshot;
    const channels = [...this.channels.values()]
      .map(channel => ({ ...channel }))
      .sort((a, b) => `${a.instrumentId}|${a.channel}|${a.providerPath}`
        .localeCompare(`${b.instrumentId}|${b.channel}|${b.providerPath}`));
    this.cachedSnapshot = {
      schemaVersion: SESSION_NECTAR_SCHEMA_VERSION,
      startedAt: this.startedAt,
      updatedAt: this.updatedAt,
      channels,
      receipts: this.guard.snapshot(),
      unsupportedCapabilities: this.unsupportedCapabilities,
      retentionState: this.serverContinuityRestored
        ? "SERVER_DURABLE_SUMMARY_NO_RAW_PAYLOADS"
        : this.continuityRestored || channels.some(channel => channel.memoryState === "SUMMARY_ONLY")
        ? "BROWSER_LOCAL_SUMMARY_NO_RAW_PAYLOADS"
        : "SESSION_ONLY_NO_RAW_PAYLOADS",
      continuityStartedAt: channels.reduce<number | undefined>((earliest, channel) =>
        channel.observedFrom == null ? earliest : Math.min(earliest ?? channel.observedFrom, channel.observedFrom), undefined),
    };
    return this.cachedSnapshot;
  }

  private emit() {
    this.listeners.forEach(listener => listener());
  }
}

interface SessionNectarRuntime {
  collector: SessionNectarCollector;
  continuityInitialized: boolean;
}

const SESSION_NECTAR_RUNTIME_KEY = Symbol.for("wm.session-nectar.runtime.v1");

/**
 * Next.js can evaluate a client module in more than one compiled chunk. Keep
 * the operational collector on the browser realm so feed ingestion and UI
 * readers cannot silently observe different module-local instances.
 */
export function getOrCreateSessionNectarRuntime(
  scope: Record<PropertyKey, unknown>,
  createCollector: () => SessionNectarCollector = () => new SessionNectarCollector(),
): SessionNectarRuntime {
  const existing = scope[SESSION_NECTAR_RUNTIME_KEY] as SessionNectarRuntime | undefined;
  if (existing) return existing;
  const runtime: SessionNectarRuntime = {
    collector: createCollector(),
    continuityInitialized: false,
  };
  Object.defineProperty(scope, SESSION_NECTAR_RUNTIME_KEY, {
    value: runtime,
    configurable: false,
    enumerable: false,
    writable: false,
  });
  return runtime;
}

const sessionNectarRuntime = getOrCreateSessionNectarRuntime(
  globalThis as unknown as Record<PropertyKey, unknown>,
);
const sessionNectarCollector = sessionNectarRuntime.collector;

const COVERAGE_STORAGE_KEY = "wm:nectar:coverage-continuity:v1";
if (typeof window !== "undefined" && !sessionNectarRuntime.continuityInitialized) {
  sessionNectarRuntime.continuityInitialized = true;
  try {
    const restored = parseCoverageContinuityRecord(window.localStorage.getItem(COVERAGE_STORAGE_KEY));
    if (restored) sessionNectarCollector.restoreCoverageSummaries(restored.channels);
  } catch {
    // Storage can be blocked by browser privacy policy. Live session collection
    // must continue honestly without continuity in that case.
  }

  let persistTimer: ReturnType<typeof setTimeout> | null = null;
  let remotePersistTimer: ReturnType<typeof setTimeout> | null = null;
  const checkpoint = () => {
    const snapshot = sessionNectarCollector.snapshot();
    const previous = parseCoverageContinuityRecord(window.localStorage.getItem(COVERAGE_STORAGE_KEY));
    const channels = mergeCoverageChannels(previous?.channels ?? [], snapshot.channels);
    return createCoverageContinuityRecord(channels);
  };
  const persist = () => {
    if (persistTimer) {
      clearTimeout(persistTimer);
      persistTimer = null;
    }
    try {
      window.localStorage.setItem(COVERAGE_STORAGE_KEY, JSON.stringify(checkpoint()));
    } catch {
      // Quota/SecurityError is a degraded continuity state, not a reason to
      // interrupt the live chart or claim that anything was retained.
    }
  };
  const persistRemote = () => {
    if (remotePersistTimer) {
      clearTimeout(remotePersistTimer);
      remotePersistTimer = null;
    }
    try {
      void fetch("/api/market-memory/coverage", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(checkpoint()),
        keepalive: true,
      });
    } catch {
      // The local checkpoint remains available. A later live event retries the
      // server ledger; the UI must never claim durable state from this attempt.
    }
  };
  sessionNectarCollector.subscribe(() => {
    if (!persistTimer) persistTimer = setTimeout(persist, 2_000);
    if (!remotePersistTimer) remotePersistTimer = setTimeout(persistRemote, 15_000);
  });
  window.addEventListener("pagehide", () => { persist(); persistRemote(); });

  // Hydrate durable operational coverage after the authenticated WM session is
  // available. If live events arrive first, restoreCoverageSummaries merges
  // maxima without downgrading the active channel.
  void fetch("/api/market-memory/coverage", {
    credentials: "same-origin",
    cache: "no-store",
  }).then(async response => {
    if (!response.ok) return;
    const payload = await response.json() as { record?: unknown };
    const restored = parseCoverageContinuityRecord(JSON.stringify(payload.record ?? null));
    if (restored) {
      sessionNectarCollector.restoreCoverageSummaries(restored.channels, "server");
      persist();
    }
  }).catch(() => {
    // Offline/degraded mode continues with the bounded local summary.
  });
}

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
  providerPath?: string | null,
  now = Date.now(),
  staleAfterMs = 15_000,
): MarketChannelCoverage | null {
  const wanted = normalizedSymbol.trim().toUpperCase();
  if (!wanted) return null;
  const matching = snapshot.channels.filter(entry =>
    entry.channel === channel &&
    (entry.normalizedSymbol?.toUpperCase() === wanted || entry.instrumentId.toUpperCase() === wanted)
  );
  const providerMatch = providerPath
    ? matching.find(entry => entry.providerPath === providerPath)
    : undefined;
  const newest = providerMatch ?? matching.sort((a, b) => (b.lastEventAt ?? 0) - (a.lastEventAt ?? 0))[0];
  if (!newest) return null;
  return markCoverageStale(newest, now, staleAfterMs);
}
