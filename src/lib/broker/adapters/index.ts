/**
 * broker/adapters — registry of all BrokerAdapter implementations.
 *
 * Founder canon §Broker Golden Path W2: "New provider = new adapter,
 * never a new UI/domain path." This registry is the ONE place
 * consumers look up an adapter by BrokerId. Adding a new adapter
 * means adding a file under this directory + registering it here.
 *
 * Consumers:
 *   · /api/broker/status aggregate (future refactor)
 *   · /api/broker/{id}/status individual routes (this shift's atom)
 *   · TradeLine order router (future atom)
 *   · Portfolio surface (future atom)
 *
 * Zero runtime side effects — importing this file only registers
 * references; no upstream calls.
 */

import type { BrokerAdapter, BrokerId } from "../BrokerAdapter";
import { webullAdapter } from "./webullAdapter";
import { alpacaAdapter } from "./alpacaAdapter";
import { tastytradeAdapter } from "./tastytradeAdapter";

/**
 * All shipped adapters keyed by their canonical BrokerId.
 * Missing keys → adapter not shipped yet; consumers must handle
 * absence honestly (return UNKNOWN / not-implemented rather than
 * fabricating capabilities).
 */
const REGISTRY: Partial<Record<BrokerId, BrokerAdapter>> = {
  webull: webullAdapter,
  alpaca: alpacaAdapter,
  tastytrade: tastytradeAdapter,
};

/**
 * Look up an adapter by canonical BrokerId. Returns null when no
 * adapter is shipped — never returns a "default" or fabricated
 * placeholder that would silently hide the truth.
 */
export function getAdapter(id: BrokerId): BrokerAdapter | null {
  return REGISTRY[id] ?? null;
}

/** All shipped adapters as an array — stable iteration order. */
export function listAdapters(): readonly BrokerAdapter[] {
  return (Object.values(REGISTRY) as BrokerAdapter[]).filter((a): a is BrokerAdapter => a != null);
}

/** True if an adapter has been registered for this provider. */
export function hasAdapter(id: BrokerId): boolean {
  return REGISTRY[id] != null;
}
