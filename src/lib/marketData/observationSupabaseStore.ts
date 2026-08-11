import type { MarketDataCapability } from "./capabilityRegistry";
import type { CanonicalMarketEvent } from "./marketEvent";
import type { MarketObservationPersistenceMode, MarketObservationStore } from "./observationPersistence";

type RpcStatus = "PERSISTED_RAW" | "PERSISTED_DERIVED" | "RIGHTS_BLOCKED" | "INVALID" | "DUPLICATE" | "WRITE_FAILED";

export class SupabaseMarketObservationStore implements MarketObservationStore {
  constructor(
    private readonly ownerId: string,
    private readonly url: string,
    private readonly serviceKey: string,
  ) {}

  async write(
    event: CanonicalMarketEvent,
    mode: MarketObservationPersistenceMode,
    _capability: MarketDataCapability,
  ): Promise<"INSERTED" | "DUPLICATE" | "RIGHTS_BLOCKED" | "WRITE_FAILED"> {
    const response = await fetch(`${this.url}/rest/v1/rpc/wm_persist_market_observation`, {
      method: "POST",
      headers: {
        apikey: this.serviceKey,
        Authorization: `Bearer ${this.serviceKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ p_owner_id: this.ownerId, p_mode: mode, p_event: event }),
      cache: "no-store",
    });
    if (!response.ok) return "WRITE_FAILED";
    const result = await response.json() as { status?: RpcStatus };
    if (result.status === "DUPLICATE") return "DUPLICATE";
    if (result.status === "RIGHTS_BLOCKED") return "RIGHTS_BLOCKED";
    if (result.status === "PERSISTED_RAW" || result.status === "PERSISTED_DERIVED") return "INSERTED";
    return "WRITE_FAILED";
  }
}
