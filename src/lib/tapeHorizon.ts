/**
 * Map an exact observed-trade timestamp to the candle time point that contains
 * it. Lightweight Charts only resolves coordinates for time points that exist
 * in the series, so passing an arbitrary trade second normally returns null.
 */
export function tapeHorizonBarStart(startedAtSec: number, intervalSec: number): number {
  if (!Number.isFinite(startedAtSec) || startedAtSec < 0) {
    throw new Error("Tape horizon requires a non-negative finite timestamp.");
  }
  if (!Number.isFinite(intervalSec) || intervalSec <= 0) {
    throw new Error("Tape horizon requires a positive finite interval.");
  }

  return Math.floor(startedAtSec / intervalSec) * intervalSec;
}

export function tapeHorizonLabel(
  localTime: string,
  duration: string,
  tradeCount: number,
  compact: boolean,
): string {
  return compact
    ? `● TAPE ${localTime} · ${tradeCount}`
    : `● WM SESSION TAPE · from ${localTime} · ${duration} · ${tradeCount} trades`;
}
