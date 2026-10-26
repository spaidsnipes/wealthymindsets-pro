"use client";

import { useEffect, useReducer, useRef } from "react";

/**
 * THE ANALYTIC CADENCE (perf P0, Founder 2026-10-25: "lag on the second charts and delays …
 * no lags, no delays").
 *
 * The socket hook publishes the tape once per animation frame — that is what keeps the forming
 * candle and the header price live, and it stays per-frame. But the room hands the SAME array to
 * a dozen analytic readers (order-flow readings, regime series, Living Profile, Big Trades
 * intelligence, aggressor flow, the footprint worksheet, the canonical market-state publication),
 * and each one sorts or folds up to 8,000 prints. Measured on a local production build, BTC 1m with
 * every invention on and a 40 prints/s tape: the room's render alone held the main thread ~37% of
 * the time and the chart fell to ~33 fps — the "lag" in the Founder's recordings.
 *
 * A reading of the auction does not change meaning between two frames 16 ms apart. This hook holds
 * a value and lets it advance at most once per `ms` (leading edge + guaranteed trailing edge), so
 * those readers re-derive ≤4×/s instead of 60×/s. Rules:
 *   - a new `key` (symbol / timeframe) is taken AT ONCE — never a previous instrument's sample;
 *   - an empty sample is replaced AT ONCE by the first non-empty one — the first prints pop up;
 *   - otherwise the newest value is taken when the held one is `ms` old, and a timer guarantees
 *     the trailing value lands even if nothing else re-renders the room.
 * Nothing is invented or dropped: the held value is always a real, complete earlier publication.
 */
export const ANALYTIC_CADENCE_MS = 250;

export interface CadenceHeld<T> {
  readonly value: T;
  readonly at: number;
  readonly key: string;
}

/** Pure decision (tested): take the incoming value now, or keep holding? */
export function cadenceTakes<T>(
  held: CadenceHeld<T> | null,
  value: T,
  key: string,
  now: number,
  ms: number,
  isEmpty?: (v: T) => boolean,
): boolean {
  if (held == null) return true;
  if (held.key !== key) return true;
  if (Object.is(held.value, value)) return false;
  if (isEmpty && isEmpty(held.value) && !isEmpty(value)) return true;
  return now - held.at >= ms;
}

export function useCadencedValue<T>(
  value: T,
  key: string,
  ms: number = ANALYTIC_CADENCE_MS,
  isEmpty?: (v: T) => boolean,
): T {
  const heldRef = useRef<CadenceHeld<T> | null>(null);
  const [, wake] = useReducer((n: number) => n + 1, 0);
  const now = typeof performance !== "undefined" ? performance.now() : Date.now();
  if (cadenceTakes(heldRef.current, value, key, now, ms, isEmpty)) heldRef.current = { value, at: now, key };
  const held = heldRef.current!;
  const behind = !Object.is(held.value, value);
  useEffect(() => {
    if (!behind) return;
    const since = (typeof performance !== "undefined" ? performance.now() : Date.now()) - held.at;
    const timer = setTimeout(wake, Math.max(0, ms - since));
    return () => clearTimeout(timer);
  }, [behind, held, ms]);
  return held.value;
}

/** "First sample" tests for useCadencedValue — module-level so their identity never changes. */
export const ticksAreEmpty = (t: readonly unknown[]): boolean => t.length === 0;
export const priceIsUnknown = (p: number): boolean => !(Number.isFinite(p) && p > 0);
