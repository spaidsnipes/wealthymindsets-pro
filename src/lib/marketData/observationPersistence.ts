import {
  MARKET_DATA_CAPABILITIES,
  canPersistDerived,
  canPersistRaw,
  type MarketDataCapability,
} from "./capabilityRegistry";
import { validateMarketEvent, type CanonicalMarketEvent } from "./marketEvent";

export type MarketObservationPersistenceMode = "RAW" | "DERIVED";

export type MarketObservationPersistenceResult =
  | { status: "PERSISTED_RAW"; rightsPolicyId: string }
  | { status: "PERSISTED_DERIVED"; rightsPolicyId: string }
  | { status: "RIGHTS_BLOCKED"; rightsPolicyId: string; reason: string }
  | { status: "INVALID"; reasons: readonly string[] }
  | { status: "DUPLICATE"; rightsPolicyId: string }
  | { status: "WRITE_FAILED"; rightsPolicyId: string };

export interface MarketObservationStore {
  write(
    event: CanonicalMarketEvent,
    mode: MarketObservationPersistenceMode,
    capability: MarketDataCapability,
  ): Promise<"INSERTED" | "DUPLICATE" | "RIGHTS_BLOCKED" | "WRITE_FAILED">;
}

function reviewedCapabilityFor(event: CanonicalMarketEvent): MarketDataCapability | null {
  return MARKET_DATA_CAPABILITIES.find(entry =>
    entry.providerPath === event.providerPath &&
    entry.assetClass === event.assetClass.toLowerCase() &&
    entry.eventType === event.eventType.toLowerCase()
  ) ?? null;
}

/**
 * The only supported persistence entry point for canonical market evidence.
 * Callers cannot supply or override rights. Code review and the durable
 * source-rights table must both approve a future write path.
 */
export async function persistMarketObservation(
  event: CanonicalMarketEvent,
  mode: MarketObservationPersistenceMode,
  store: MarketObservationStore,
): Promise<MarketObservationPersistenceResult> {
  const invalidReasons = validateMarketEvent(event);
  if (invalidReasons.length) return { status: "INVALID", reasons: invalidReasons };

  const capability = reviewedCapabilityFor(event);
  if (!capability) {
    return {
      status: "RIGHTS_BLOCKED",
      rightsPolicyId: "wm.rights.unregistered.v1",
      reason: "No reviewed provider/feed capability exists.",
    };
  }

  const permitted = mode === "RAW" ? canPersistRaw(capability) : canPersistDerived(capability);
  if (!permitted || event.rightsPolicyId !== capability.rightsPolicyId) {
    return {
      status: "RIGHTS_BLOCKED",
      rightsPolicyId: capability.rightsPolicyId,
      reason: "Provider/feed persistence is not explicitly allowed by the reviewed policy.",
    };
  }

  let writeResult: Awaited<ReturnType<MarketObservationStore["write"]>>;
  try {
    writeResult = await store.write(event, mode, capability);
  } catch {
    writeResult = "WRITE_FAILED";
  }
  if (writeResult === "DUPLICATE") return { status: "DUPLICATE", rightsPolicyId: capability.rightsPolicyId };
  if (writeResult === "RIGHTS_BLOCKED") {
    return {
      status: "RIGHTS_BLOCKED",
      rightsPolicyId: capability.rightsPolicyId,
      reason: "The durable database policy did not authorize this provider/feed write.",
    };
  }
  if (writeResult === "WRITE_FAILED") return { status: "WRITE_FAILED", rightsPolicyId: capability.rightsPolicyId };
  return {
    status: mode === "RAW" ? "PERSISTED_RAW" : "PERSISTED_DERIVED",
    rightsPolicyId: capability.rightsPolicyId,
  };
}
