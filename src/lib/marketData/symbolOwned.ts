/**
 * A VALUE THAT BELONGS TO ONE SYMBOL — Garden 18 §4 (2026-10-06). PURE.
 *
 * The pattern these hooks shared: `useEffect(() => { setVm(null); … }, [symbol])`.
 * An effect runs AFTER the render it follows is painted, so the first frame
 * after a symbol switch returned the PREVIOUS symbol's reading under the new
 * symbol's name — and an async reading (a chain fetch, a book snapshot) kept
 * it there until the reset committed. `marketStateFor` already closes this
 * for the quote hook; this is the same rule for every other per-symbol state:
 * the value is stored WITH the key it was read for, and it is only returned
 * while that key is still the one being asked about.
 */
export interface Owned<T> {
  readonly key: string | null;
  readonly value: T | null;
}

export const UNOWNED: Owned<never> = { key: null, value: null };

export function owned<T>(key: string | null, value: T | null): Owned<T> {
  return { key, value };
}

/** The value, only while it belongs to `key`; otherwise null (never a neighbour's). */
export function readOwned<T>(s: Owned<T>, key: string | null): T | null {
  return key !== null && s.key === key ? s.value : null;
}

/**
 * One write, decided purely: a write from a closure made for `writerKey` lands
 * only while `writerKey` is still the current key; a functional update sees
 * only the current key's value (or `empty`).
 */
export function ownedWrite<T>(
  prev: Owned<T>,
  writerKey: string,
  currentKey: string,
  next: T | ((p: T) => T),
  empty: T,
): Owned<T> {
  if (writerKey !== currentKey) return prev;
  const base = readOwned(prev, writerKey) ?? empty;
  const v = typeof next === "function" ? (next as (p: T) => T)(base) : next;
  return owned(writerKey, v);
}
