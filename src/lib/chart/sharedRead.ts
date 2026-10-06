/**
 * ONE READ PER KEY AT A TIME (error sweep 2026-10-06: every chart pane asked
 * /api/broker/webull/positions?symbol=X twice within seconds — four panes on
 * /desk made eight calls for one answer).
 *
 * `sharedRead(key, read)` hands every caller that asks for `key` while a read
 * is in flight the SAME promise, and for `settledMs` after it settles the same
 * answer — so a pane that mounts twice (or four panes on one symbol) costs one
 * request. A failed read is never kept: the next caller asks again. Each
 * caller still decides for itself whether it was cancelled; a shared promise
 * has no single owner to abort it.
 */
type Entry<T> = { readonly promise: Promise<T>; settledAt: number | null; failed: boolean };

const reads = new Map<string, Entry<unknown>>();

export function sharedRead<T>(key: string, read: () => Promise<T>, opts: { readonly settledMs?: number; readonly now?: () => number } = {}): Promise<T> {
  const now = opts.now ?? Date.now;
  const settledMs = opts.settledMs ?? 1500;
  const held = reads.get(key) as Entry<T> | undefined;
  if (held && !held.failed && (held.settledAt === null || now() - held.settledAt < settledMs)) return held.promise;
  const entry: Entry<T> = { promise: Promise.resolve().then(read), settledAt: null, failed: false };
  reads.set(key, entry);
  entry.promise.then(
    () => { entry.settledAt = now(); },
    () => { entry.failed = true; if (reads.get(key) === entry) reads.delete(key); },
  );
  return entry.promise;
}

/** Tests only: forget every held read. */
export function resetSharedReads(): void { reads.clear(); }
