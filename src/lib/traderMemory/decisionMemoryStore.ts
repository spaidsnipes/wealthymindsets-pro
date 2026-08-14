"use client";
/**
 * decisionMemoryStore — durable-in-runtime store for DecisionMemoryRecord.
 *
 * Parallels canonicalMarketStateStore's shape (subscribable, single-source-
 * of-truth for the running app). NOT a persistence layer — server-durable
 * storage lives behind the market-memory + rights-gated observation
 * routes shipped by origin/main (PR#23 + related). This store is the
 * in-memory client-side authority the UI subscribes to.
 *
 * Owner-scoped by design — subscribers pass their own ownerId, never
 * receive cross-owner records. Enforces the Founder privacy doctrine
 * (§F10, scopeToOwner).
 *
 * Immutability: records are already deep-frozen at seal time (see
 * decisionMemory.ts). This store never mutates them — mutation returns
 * a NEW record via appendManagement/attachOutcome/attachReview and the
 * store swaps the reference atomically.
 */

import type { DecisionMemoryRecord } from "./decisionMemory";
import type { DecisionMemorySnapshot } from "./viewModels/selectProcessLandscape";
import { toDecisionSnapshot } from "./decisionMemory";

export type DecisionMemoryListener = (
  records: readonly DecisionMemoryRecord[],
  ownerId: string,
) => void;

export class DecisionMemoryStore {
  private readonly recordsByOwner = new Map<string, Map<string, DecisionMemoryRecord>>();
  private readonly listeners = new Map<string, Set<DecisionMemoryListener>>();

  put(record: DecisionMemoryRecord): void {
    const bucket = this.recordsByOwner.get(record.ownerId) ?? new Map<string, DecisionMemoryRecord>();
    bucket.set(record.decisionId, record);
    this.recordsByOwner.set(record.ownerId, bucket);
    this.notify(record.ownerId);
  }

  get(ownerId: string, decisionId: string): DecisionMemoryRecord | null {
    return this.recordsByOwner.get(ownerId)?.get(decisionId) ?? null;
  }

  /** Returns own-owner records only. Never leaks cross-owner data. */
  list(ownerId: string): readonly DecisionMemoryRecord[] {
    const bucket = this.recordsByOwner.get(ownerId);
    if (!bucket) return [];
    return Array.from(bucket.values());
  }

  /** Compact projection for selectors like selectProcessLandscape / selectMirror. */
  snapshots(ownerId: string): readonly DecisionMemorySnapshot[] {
    return this.list(ownerId).map(toDecisionSnapshot);
  }

  subscribe(ownerId: string, listener: DecisionMemoryListener): () => void {
    const listeners = this.listeners.get(ownerId) ?? new Set<DecisionMemoryListener>();
    listeners.add(listener);
    this.listeners.set(ownerId, listeners);
    // Immediately fire with current state so consumers don't wait for a mutation
    listener(this.list(ownerId), ownerId);
    return () => {
      const current = this.listeners.get(ownerId);
      current?.delete(listener);
      if (current?.size === 0) this.listeners.delete(ownerId);
    };
  }

  /** Test/logout lifecycle only. */
  clear(): void {
    this.recordsByOwner.clear();
    this.listeners.clear();
  }

  /** Test/logout lifecycle for a specific owner. */
  clearOwner(ownerId: string): void {
    this.recordsByOwner.delete(ownerId);
    this.notify(ownerId);
  }

  private notify(ownerId: string): void {
    const listeners = this.listeners.get(ownerId);
    if (!listeners) return;
    const records = this.list(ownerId);
    for (const l of listeners) l(records, ownerId);
  }
}

export const decisionMemoryStore = new DecisionMemoryStore();
