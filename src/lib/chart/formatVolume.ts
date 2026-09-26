/**
 * A VOLUME IS NEVER ROUNDED TO ZERO.
 *
 * Measured on serving, BTCUSD 5m, 2026-09-26: the Data Window read "V 0" on
 * a bar whose volume pane showed traded size. Crypto trades in fractions of a
 * coin and `toLocaleString()` keeps three decimals, so 0.0004 BTC printed as
 * "0" — a traded bar called empty (GP12 §27: precision is instrument-specific).
 *
 * Whole units from 100 up; below that four significant figures, so a fraction
 * of a coin says what it is. Zero only when the bar truly traded nothing.
 */
export function formatVolume(v: number): string {
  if (!Number.isFinite(v)) return "—";
  if (v === 0) return "0";
  if (Math.abs(v) >= 100) return Math.round(v).toLocaleString("en-US");
  return String(Number(v.toPrecision(4)));
}
