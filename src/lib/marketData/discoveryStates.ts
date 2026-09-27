/**
 * DISCOVERY · UNUSUAL STATES — the Founder's F14 plate ("Heat lands same
 * camera"): a grid of market states whose heat is how UNUSUAL each one is,
 * a selected cell, and a landing on the existing Market Camera.
 *
 * Garden 16 §29: "No generic heatmap substitute." The Opportunity Map painted
 * a Finviz-style treemap of daily % change — colour = up or down, not unusual.
 * A state here is a measured fact about ONE symbol against ITS OWN history,
 * and the heat is where that fact ranks across the universe today:
 *
 *   RVOL     latest session volume ÷ mean of the prior 20 sessions
 *   MOVE σ   latest close-to-close return ÷ stdev of the prior 60 returns
 *   GAP σ    latest open vs prior close, in the same stdev units
 *   RANGE ×  latest high−low ÷ mean high−low of the prior 20 sessions
 *   52W      where the close sits in the 52-week range, 0 (low) … 1 (high)
 *
 * UNUSUALNESS per column: RVOL and RANGE × rank high; MOVE σ and GAP σ rank
 * by magnitude; 52W ranks by distance from the middle. The percentile is
 * across the symbols that HAVE that state — a missing state is null, never 0.
 * Nothing here is a forecast, a confidence or an "institutional" claim.
 *
 * PURE. DETERMINISTIC.
 */

import type { CanonicalBar } from "./canonicalBar";

export const DISCOVERY_VERSION = "wm.discovery-states.v1" as const;
export const STATE_KEYS = ["RVOL", "MOVE", "GAP", "RANGE", "W52"] as const;
export type StateKey = (typeof STATE_KEYS)[number];

export const STATE_LABEL: Readonly<Record<StateKey, string>> = {
  RVOL: "RVOL",
  MOVE: "MOVE σ",
  GAP: "GAP σ",
  RANGE: "RANGE ×",
  W52: "52W",
};

export const STATE_MEANING: Readonly<Record<StateKey, string>> = {
  RVOL: "Latest session volume ÷ mean of the prior 20 sessions",
  MOVE: "Latest close-to-close return in standard deviations of the prior 60 returns",
  GAP: "Latest open vs prior close, in the same standard deviations",
  RANGE: "Latest high−low ÷ mean high−low of the prior 20 sessions",
  W52: "Close within the 52-week range: 0 = at the low, 1 = at the high",
};

/** One daily bar, as the ONE bar owner shapes it (M8: no private bar shapes). */
export type DailyBar = Pick<CanonicalBar, "open" | "high" | "low" | "close" | "volume">;

export type StateValues = Readonly<Record<StateKey, number | null>>;

const mean = (xs: readonly number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : NaN);
const stdev = (xs: readonly number[]) => {
  if (xs.length < 2) return NaN;
  const m = mean(xs);
  return Math.sqrt(xs.reduce((s, x) => s + (x - m) ** 2, 0) / (xs.length - 1));
};
const fin = (x: number) => (Number.isFinite(x) ? x : null);

/** The five states of one symbol, from its daily bars (oldest first) and 52-week range. */
export function measureStates(
  input: readonly DailyBar[],
  w52: { readonly high: number | null; readonly low: number | null } = { high: null, low: null },
): StateValues {
  const bars = input.filter(b => [b.open, b.high, b.low, b.close, b.volume].every(Number.isFinite) && b.close > 0 && b.high >= b.low);
  const none: StateValues = { RVOL: null, MOVE: null, GAP: null, RANGE: null, W52: null };
  if (bars.length < 22) return none;
  const last = bars[bars.length - 1], prev = bars[bars.length - 2];
  const prior20 = bars.slice(-21, -1);
  const rets: number[] = [];
  for (let i = Math.max(1, bars.length - 61); i < bars.length - 1; i++) rets.push(bars[i].close / bars[i - 1].close - 1);
  const sd = stdev(rets);
  const avgVol = mean(prior20.map(b => b.volume));
  const avgRange = mean(prior20.map(b => b.high - b.low));
  const hi = w52.high, lo = w52.low;
  return {
    RVOL: avgVol > 0 ? fin(last.volume / avgVol) : null,
    MOVE: sd > 0 ? fin((last.close / prev.close - 1) / sd) : null,
    GAP: sd > 0 ? fin((last.open / prev.close - 1) / sd) : null,
    RANGE: avgRange > 0 ? fin((last.high - last.low) / avgRange) : null,
    W52: hi != null && lo != null && hi > lo ? fin(Math.min(1, Math.max(0, (last.close - lo) / (hi - lo)))) : null,
  };
}

/** How unusual a state value is, before ranking (bigger = more unusual). */
export function unusualness(key: StateKey, v: number): number {
  switch (key) {
    case "RVOL":
    case "RANGE":
      return v;
    case "MOVE":
    case "GAP":
      return Math.abs(v);
    case "W52":
      return Math.abs(v - 0.5);
  }
}

export interface DiscoveryRow {
  readonly symbol: string;
  readonly values: StateValues;
  /** Percentile (0–100) of this symbol's unusualness per state across the universe; null when unmeasured. */
  readonly pct: Readonly<Record<StateKey, number | null>>;
  /** The state that ranks highest for this symbol, or null when none was measured. */
  readonly lead: StateKey | null;
  readonly leadPct: number | null;
}

/** Rank every symbol's states against the universe; most unusual symbols first. */
export function rankDiscovery(input: readonly { readonly symbol: string; readonly values: StateValues }[]): DiscoveryRow[] {
  const pctOf = new Map<string, Record<StateKey, number | null>>();
  for (const r of input) pctOf.set(r.symbol, { RVOL: null, MOVE: null, GAP: null, RANGE: null, W52: null });
  for (const key of STATE_KEYS) {
    const scored = input
      .filter(r => r.values[key] != null)
      .map(r => ({ s: r.symbol, u: unusualness(key, r.values[key] as number) }))
      .sort((a, b) => a.u - b.u);
    const n = scored.length;
    scored.forEach((x, i) => {
      // Ties share the lower rank's percentile; a universe of one ranks 100.
      let j = i;
      while (j > 0 && scored[j - 1].u === x.u) j--;
      pctOf.get(x.s)![key] = n === 1 ? 100 : Math.round((j / (n - 1)) * 100);
    });
  }
  return input
    .map(r => {
      const pct = pctOf.get(r.symbol)!;
      let lead: StateKey | null = null;
      for (const k of STATE_KEYS) if (pct[k] != null && (lead == null || (pct[k] as number) > (pct[lead] as number))) lead = k;
      return { symbol: r.symbol, values: r.values, pct, lead, leadPct: lead ? pct[lead] : null };
    })
    .sort((a, b) => (b.leadPct ?? -1) - (a.leadPct ?? -1) || a.symbol.localeCompare(b.symbol));
}

/** The measured value, in the words a trader reads. */
export function formatState(key: StateKey, v: number | null): string {
  if (v == null) return "—";
  switch (key) {
    case "RVOL":
    case "RANGE":
      return `${v.toFixed(2)}×`;
    case "MOVE":
    case "GAP":
      return `${v >= 0 ? "+" : "−"}${Math.abs(v).toFixed(1)}σ`;
    case "W52":
      return `${Math.round(v * 100)}%`;
  }
}

/**
 * F14's unusual-state intensity scale — LOW deep indigo → ember → HIGH brass
 * gold. Heat means UNUSUAL, not up/down: no green, no red.
 */
export const INTENSITY_STOPS: readonly (readonly [number, readonly [number, number, number]])[] = [
  [0, [22, 20, 52]],
  [0.45, [74, 26, 58]],
  [0.75, [142, 42, 48]],
  [0.9, [196, 110, 52]],
  [1, [232, 196, 120]],
];

export function intensityColor(pct: number | null): string {
  if (pct == null) return "rgba(255,255,255,0.03)";
  const t = Math.min(1, Math.max(0, pct / 100));
  for (let i = 1; i < INTENSITY_STOPS.length; i++) {
    const [t1, c1] = INTENSITY_STOPS[i];
    const [t0, c0] = INTENSITY_STOPS[i - 1];
    if (t <= t1) {
      const f = (t - t0) / (t1 - t0);
      const c = c0.map((v, k) => Math.round(v + (c1[k] - v) * f));
      return `rgb(${c[0]},${c[1]},${c[2]})`;
    }
  }
  const c = INTENSITY_STOPS[INTENSITY_STOPS.length - 1][1];
  return `rgb(${c[0]},${c[1]},${c[2]})`;
}
