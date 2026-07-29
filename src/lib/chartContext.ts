/**
 * CHART CONTEXT + STALE-REQUEST PROTECTION — WM-CHART-P0-02
 *
 * The invariant this module exists to enforce: a response fetched for a
 * previous symbol/timeframe must never overwrite the view once the user has
 * moved on. Every async request is tagged with the `dataVersion` active when
 * it was issued; on arrival, if that version no longer matches the current
 * one, the result is discarded rather than rendered. `DataVersionGuard` also
 * aborts the in-flight request for the previous version instead of merely
 * ignoring its result, so a superseded fetch stops costing network/server
 * work the moment the user moves on.
 *
 * Scope note: `regime` / `markov` / `wyckoff` slots below give WM-STATE-P0-01
 * a place to compute into — this ticket does not populate them. Per DEC-009,
 * no Wyckoff engine exists yet, so `wyckoff` must stay `unavailable` until one
 * does; shipping any other status here would fabricate a phase.
 */

export type LoadingState = "idle" | "loading" | "refreshing" | "error";

export interface StateSlot<T> {
  status: "unavailable" | "calculating" | "stale" | "ready" | "error";
  value?: T;
  confidence?: number;
  calculatedAt?: number;
  calculatedFor?: { symbol: string; timeframe: string };
}

export function unavailableSlot<T>(): StateSlot<T> {
  return { status: "unavailable" };
}

export interface VisibleRange {
  startMs: number;
  endMs: number;
}

/**
 * Regime/Markov/Wyckoff payload shapes are owned by WM-STATE-P0-01 and the
 * (separate, unstarted) Wyckoff engine under DEC-009. `unknown` here is
 * deliberate — this ticket only guarantees the slot exists and defaults to
 * `unavailable`, not what a future engine puts in it.
 */
export interface ChartContext {
  symbol: string;
  timeframe: string;
  candleIntervalSec: number;
  visibleRange: VisibleRange;
  dataVersion: number;
  regime: StateSlot<unknown>;
  markov: StateSlot<unknown>;
  wyckoff: StateSlot<unknown>;
  loadingState: LoadingState;
  errorState?: { code: string; message: string; retryable: boolean };
}

export function createChartContext(
  symbol: string,
  timeframe: string,
  candleIntervalSec: number,
  visibleRange: VisibleRange,
): ChartContext {
  return {
    symbol,
    timeframe,
    candleIntervalSec,
    visibleRange,
    dataVersion: 0,
    regime: unavailableSlot(),
    markov: unavailableSlot(),
    wyckoff: unavailableSlot(),
    loadingState: "idle",
  };
}

/**
 * Tracks a monotonic `dataVersion` for one logical view (one chart pane, one
 * heatmap grid, ...). Call `next()` whenever the identity the fetch depends on
 * changes (symbol, timeframe, or both) — it aborts whatever was in flight for
 * the previous identity and returns the version + signal to use for the new
 * request. Tag every async result with the version it was issued under, then
 * check `isCurrent()` before applying it.
 */
export class DataVersionGuard {
  private version = 0;
  private controller: AbortController | null = null;

  /** Start a new logical request. Aborts the previous one. */
  next(): { version: number; signal: AbortSignal } {
    this.controller?.abort();
    this.controller = new AbortController();
    this.version += 1;
    return { version: this.version, signal: this.controller.signal };
  }

  /** True when `version` is still the most recently issued one. */
  isCurrent(version: number): boolean {
    return version === this.version;
  }

  get currentVersion(): number {
    return this.version;
  }

  /** Abort whatever is in flight without starting a new version (unmount). */
  dispose(): void {
    this.controller?.abort();
    this.controller = null;
  }
}

/**
 * Apply a fetched value to a mutable holder only if its tagged version is
 * still current. Returns whether the value was applied, so a caller can log
 * or count discarded stale results without duplicating the version check.
 */
export function applyIfCurrent<T>(
  guard: DataVersionGuard,
  resultVersion: number,
  apply: (value: T) => void,
  value: T,
): boolean {
  if (!guard.isCurrent(resultVersion)) return false;
  apply(value);
  return true;
}
