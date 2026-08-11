import type { CanonicalMarketState } from "./canonicalMarketState";

export type MarketStatePublishResult =
  | { readonly status: "PUBLISHED"; readonly state: CanonicalMarketState }
  | { readonly status: "DUPLICATE"; readonly state: CanonicalMarketState }
  | {
      readonly status: "REJECTED_STALE";
      readonly current: CanonicalMarketState;
      readonly rejected: CanonicalMarketState;
    };

export type MarketStateListener = (
  state: CanonicalMarketState,
  previous: CanonicalMarketState | null,
) => void;

/**
 * The runtime identity is deliberately narrower than symbol alone. The same
 * instrument may have distinct decision contexts without one overwriting the
 * other.
 */
export function canonicalMarketStateKey(
  state: Pick<CanonicalMarketState, "instrumentId" | "session" | "timeframeContext">,
): string {
  return JSON.stringify([state.instrumentId, state.session, state.timeframeContext]);
}

function isOlder(candidate: CanonicalMarketState, current: CanonicalMarketState): boolean {
  return candidate.availableAt < current.availableAt ||
    (candidate.availableAt === current.availableAt && candidate.capturedAt < current.capturedAt);
}

/**
 * One in-memory command owner for sealed Market State packets. It does not
 * derive intelligence or persist data; producers must seal state upstream.
 */
export class CanonicalMarketStateStore {
  private readonly states = new Map<string, CanonicalMarketState>();
  private readonly snapshotIds = new Map<string, string>();
  private readonly listeners = new Map<string, Set<MarketStateListener>>();

  publish(state: CanonicalMarketState): MarketStatePublishResult {
    const key = canonicalMarketStateKey(state);
    const existingKey = this.snapshotIds.get(state.snapshotId);
    const current = this.states.get(key) ?? null;

    if (existingKey) {
      if (existingKey === key && current?.snapshotId === state.snapshotId) {
        return { status: "DUPLICATE", state: current };
      }
      throw new Error(`Canonical Market State snapshotId already belongs to ${existingKey}.`);
    }

    if (current && isOlder(state, current)) {
      return { status: "REJECTED_STALE", current, rejected: state };
    }

    // This is a current-state owner, not an unbounded history database. Once a
    // newer packet replaces the identity, release the superseded snapshot ID.
    // Durable history belongs in the rights-gated memory layer.
    if (current) this.snapshotIds.delete(current.snapshotId);
    this.states.set(key, state);
    this.snapshotIds.set(state.snapshotId, key);
    for (const listener of this.listeners.get(key) ?? []) listener(state, current);
    return { status: "PUBLISHED", state };
  }

  get(
    identity: Pick<CanonicalMarketState, "instrumentId" | "session" | "timeframeContext">,
  ): CanonicalMarketState | null {
    return this.states.get(canonicalMarketStateKey(identity)) ?? null;
  }

  getBySnapshotId(snapshotId: string): CanonicalMarketState | null {
    const key = this.snapshotIds.get(snapshotId);
    return key ? this.states.get(key) ?? null : null;
  }

  subscribe(
    identity: Pick<CanonicalMarketState, "instrumentId" | "session" | "timeframeContext">,
    listener: MarketStateListener,
  ): () => void {
    const key = canonicalMarketStateKey(identity);
    const listeners = this.listeners.get(key) ?? new Set<MarketStateListener>();
    listeners.add(listener);
    this.listeners.set(key, listeners);

    return () => {
      const current = this.listeners.get(key);
      current?.delete(listener);
      if (current?.size === 0) this.listeners.delete(key);
    };
  }

  /** Test/document lifecycle only; auth logout policy can call this later. */
  clear(): void {
    this.states.clear();
    this.snapshotIds.clear();
    this.listeners.clear();
  }
}

export const canonicalMarketStateStore = new CanonicalMarketStateStore();
