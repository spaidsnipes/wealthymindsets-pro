"use client";
/**
 * decisionMemoryStore — in-memory client store for DecisionMemoryRecord.
 *
 * Parallels canonicalMarketStateStore's shape (subscribable, single-source-
 * of-truth for the running app). NOT a persistence layer. Market-memory
 * observation routes do not establish persistence for these Decision records.
 * This client store alone cannot provide reload or cross-device continuity.
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

// Records are JSON-shaped. Compare keys independent of transport ordering so
// an identical hydrated replay is idempotent, not another UI mutation.
function sameValue(a: unknown, b: unknown): boolean {
  if (Object.is(a, b)) return true;
  if (!a || !b || typeof a !== "object" || typeof b !== "object") return false;
  if (Array.isArray(a) !== Array.isArray(b)) return false;
  const left = Object.keys(a).sort();
  const right = Object.keys(b).sort();
  return left.length === right.length && left.every((key, i) =>
    key === right[i] && sameValue((a as Record<string, unknown>)[key], (b as Record<string, unknown>)[key]));
}

function assertProgress(previous: DecisionMemoryRecord, next: DecisionMemoryRecord): void {
  if (previous.sessionIdentity !== next.sessionIdentity ||
      !sameValue(previous.frozen, next.frozen) || !sameValue(previous.plan, next.plan)) {
    throw new Error("DecisionMemoryStore: sealed decision cannot be rewritten");
  }
  for (const key of ["management", "amendments"] as const) {
    if (next[key].length < previous[key].length ||
        previous[key].some((entry, i) => !sameValue(entry, next[key][i]))) {
      throw new Error(`DecisionMemoryStore: ${key} must remain append-only`);
    }
  }
  for (const key of ["outcome", "review"] as const) {
    if (previous[key] && !sameValue(previous[key], next[key])) {
      throw new Error(`DecisionMemoryStore: ${key} cannot be erased or rewritten; append an amendment`);
    }
  }
}

function freezeRecordTree(value: unknown, seen = new WeakSet<object>()): void {
  if (!value || typeof value !== "object" || seen.has(value)) return;
  seen.add(value);
  // Hydrated JSON may not have gone through sealDecision. Freeze nested
  // values even when a caller already froze only the outer record.
  for (const child of Object.values(value)) freezeRecordTree(child, seen);
  Object.freeze(value);
}

export class DecisionMemoryStore {
  private readonly recordsByOwner = new Map<string, Map<string, DecisionMemoryRecord>>();
  private readonly listeners = new Map<string, Set<DecisionMemoryListener>>();
  // Cached projections keyed by owner. Same reference is returned across
  // reads until a mutation invalidates the entry. REQUIRED for
  // useSyncExternalStore consumers — a fresh array on every getSnapshot()
  // call trips React's infinite-loop guard (error #185) and crashes any
  // page that hosts the store (e.g. /command-deck).
  private readonly listCache = new Map<string, readonly DecisionMemoryRecord[]>();
  private readonly snapshotCache = new Map<string, readonly DecisionMemorySnapshot[]>();
  private static readonly EMPTY_RECORDS: readonly DecisionMemoryRecord[] = Object.freeze([]);
  private static readonly EMPTY_SNAPSHOTS: readonly DecisionMemorySnapshot[] = Object.freeze([]);

  put(record: DecisionMemoryRecord): void {
    if (!record.ownerId.trim() || !record.decisionId.trim() ||
        record.frozen.traderState.ownerId !== record.ownerId) {
      throw new Error("DecisionMemoryStore: invalid decision owner/identity");
    }
    const previous = this.get(record.ownerId, record.decisionId);
    if (previous) {
      assertProgress(previous, record);
      if (sameValue(previous, record)) return;
    }
    freezeRecordTree(record);
    const bucket = this.recordsByOwner.get(record.ownerId) ?? new Map<string, DecisionMemoryRecord>();
    bucket.set(record.decisionId, record);
    this.recordsByOwner.set(record.ownerId, bucket);
    this.invalidateCache(record.ownerId);
    this.notify(record.ownerId);
  }

  get(ownerId: string, decisionId: string): DecisionMemoryRecord | null {
    return this.recordsByOwner.get(ownerId)?.get(decisionId) ?? null;
  }

  /** Returns own-owner records only. Never leaks cross-owner data.
   *  Result reference is stable until the next mutation for this owner. */
  list(ownerId: string): readonly DecisionMemoryRecord[] {
    const cached = this.listCache.get(ownerId);
    if (cached) return cached;
    const bucket = this.recordsByOwner.get(ownerId);
    if (!bucket) return DecisionMemoryStore.EMPTY_RECORDS;
    const fresh = Object.freeze(Array.from(bucket.values()));
    this.listCache.set(ownerId, fresh);
    return fresh;
  }

  /** Compact projection for selectors like selectProcessLandscape / selectMirror.
   *  Result reference is stable until the next mutation for this owner
   *  (useSyncExternalStore correctness — do not remove the memoization). */
  snapshots(ownerId: string): readonly DecisionMemorySnapshot[] {
    const cached = this.snapshotCache.get(ownerId);
    if (cached) return cached;
    const bucket = this.recordsByOwner.get(ownerId);
    if (!bucket) return DecisionMemoryStore.EMPTY_SNAPSHOTS;
    const fresh = Object.freeze(this.list(ownerId).map(toDecisionSnapshot));
    this.snapshotCache.set(ownerId, fresh);
    return fresh;
  }

  private invalidateCache(ownerId: string): void {
    this.listCache.delete(ownerId);
    this.snapshotCache.delete(ownerId);
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
    this.listCache.clear();
    this.snapshotCache.clear();
  }

  /** Test/logout lifecycle for a specific owner. */
  clearOwner(ownerId: string): void {
    this.recordsByOwner.delete(ownerId);
    this.invalidateCache(ownerId);
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
