"use client";

/**
 * useState for a value that belongs to ONE symbol — Garden 18 §4 (2026-10-06).
 *
 * Reads return `empty` until the current symbol has written; writes from a
 * closure created for a previous symbol (a late REST answer, a socket message
 * in flight) are dropped. Functional updaters see only the current symbol's
 * value. See `symbolOwned.ts` for the pure rule this hook applies.
 */
import { useCallback, useRef, useState } from "react";
import { ownedWrite, readOwned, UNOWNED, type Owned } from "./symbolOwned";

export type OwnedSetter<T> = (next: T | ((prev: T) => T)) => void;

export function useSymbolOwnedState<T>(key: string, empty: T): [T, OwnedSetter<T>] {
  const [state, setState] = useState<Owned<T>>(UNOWNED);
  const keyRef = useRef(key);
  keyRef.current = key;
  const emptyRef = useRef(empty);
  const value = readOwned(state, key) ?? emptyRef.current;
  // One setter per key: closures built for a previous symbol carry that
  // symbol's key and are refused once the room has moved on.
  const set = useCallback<OwnedSetter<T>>((next) => {
    if (keyRef.current !== key) return;
    setState(prev => ownedWrite(prev, key, keyRef.current, next, emptyRef.current));
  }, [key]);
  return [value, set];
}
