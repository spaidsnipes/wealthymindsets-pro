"use client";
/**
 * A WORD THAT HOLDS (Founder's Chrome, NQ1! 5m 2026-10-23, two-minute recording: the header's "TAPE REGIME" read
 * BALANCE → TREND → BALANCE → TREND every few seconds — flicker, not information). A shown word changes only after the
 * new reading has stood unbroken for `holdMs`; the first reading shows at once. PURE step + a tiny hook.
 */
import { useEffect, useRef, useState } from "react";

export interface DwellState<T> { readonly shown: T; readonly pending: T; readonly pendingSince: number }

export function stepDwell<T>(prev: DwellState<T> | null, next: T, nowMs: number, holdMs: number): DwellState<T> {
  if (prev == null) return { shown: next, pending: next, pendingSince: nowMs };
  if (next === prev.shown) return { shown: prev.shown, pending: next, pendingSince: nowMs };
  if (next !== prev.pending) return { shown: prev.shown, pending: next, pendingSince: nowMs };
  return nowMs - prev.pendingSince >= holdMs ? { shown: next, pending: next, pendingSince: nowMs } : prev;
}

export function useDwellWord<T>(value: T, holdMs: number): T {
  const st = useRef<DwellState<T> | null>(null);
  const [, bump] = useState(0);
  st.current = stepDwell(st.current, value, Date.now(), holdMs);
  const shown = st.current.shown;
  const waiting = st.current.pending !== shown;
  useEffect(() => {
    if (!waiting) return;
    const t = setTimeout(() => bump(n => n + 1), holdMs + 50);
    return () => clearTimeout(t);
  }, [waiting, value, holdMs]);
  return shown;
}
