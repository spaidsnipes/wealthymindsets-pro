/**
 * Canonical Broker State — the ONE aggregate broker-state contract.
 *
 * Founder P0: "Prove one Canonical Broker State." Consumers (portfolio surface,
 * order ticket account picker, Decision Receipt writer) read THIS shape, never
 * a per-broker raw account response. It composes the broker adapter registry:
 * each registered BrokerAdapter contributes its health + its authenticated
 * accounts, normalized to CanonicalAccount.
 *
 * Honest by construction: a broker with no adapter, no connection, or that
 * throws on listAccounts contributes an entry with connected=false and an
 * empty accounts array + a truthful note — never a fabricated balance.
 */

import type { BrokerAdapter, BrokerId, CanonicalAccount } from "./BrokerAdapter";
import { listAdapters } from "./adapters";

export interface BrokerStateEntry {
  readonly id: BrokerId;
  readonly implemented: boolean;
  readonly connected: boolean;
  readonly accounts: readonly CanonicalAccount[];
  readonly note: string;
}

export interface CanonicalBrokerState {
  readonly generatedAt: string;
  readonly brokers: readonly BrokerStateEntry[];
  readonly totalAccounts: number;
  /** Sum of equity across every account, in account-declared currency units. */
  readonly totalEquity: number;
  /** How many brokers reported a live connection. */
  readonly connectedCount: number;
}

/**
 * Pure composition — given per-broker entries, produce the canonical aggregate.
 * No I/O; fully testable. `generatedAt` is injected so the function stays pure.
 */
export function composeBrokerState(
  entries: readonly BrokerStateEntry[],
  generatedAt: string,
): CanonicalBrokerState {
  let totalAccounts = 0;
  let totalEquity = 0;
  let connectedCount = 0;
  for (const e of entries) {
    totalAccounts += e.accounts.length;
    for (const a of e.accounts) {
      if (Number.isFinite(a.equity)) totalEquity += a.equity;
    }
    if (e.connected) connectedCount += 1;
  }
  return {
    generatedAt,
    brokers: entries,
    totalAccounts,
    totalEquity: +totalEquity.toFixed(2),
    connectedCount,
  };
}

/** Build one broker's state entry, translating a listAccounts throw into honesty. */
export async function buildBrokerEntry(adapter: BrokerAdapter): Promise<BrokerStateEntry> {
  const h = adapter.health();
  if (!h.envConfigured) {
    return { id: adapter.id, implemented: h.implemented, connected: false, accounts: [], note: h.note };
  }
  try {
    const accounts = await adapter.listAccounts();
    return {
      id: adapter.id,
      implemented: h.implemented,
      connected: accounts.length > 0, // an authenticated adapter with accounts is connected
      accounts,
      note: accounts.length > 0 ? h.note : `${h.note} No accounts returned yet.`,
    };
  } catch (err) {
    return {
      id: adapter.id,
      implemented: h.implemented,
      connected: false,
      accounts: [],
      note: `${adapter.id} account read failed: ${err instanceof Error ? err.message : "unknown error"}`,
    };
  }
}

/**
 * Runtime aggregate over the whole broker registry. Currently every shipped
 * adapter stubs listAccounts to [], so this returns an honest zero-account
 * state until the adapters are wired — never a fabricated portfolio.
 */
export async function getBrokerState(nowIso: string = new Date().toISOString()): Promise<CanonicalBrokerState> {
  const entries = await Promise.all(listAdapters().map((a) => buildBrokerEntry(a)));
  return composeBrokerState(entries, nowIso);
}
