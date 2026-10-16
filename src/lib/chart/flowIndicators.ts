/**
 * PLATE 29 · NEW ORDER-FLOW INDICATORS (Garden 19 finish line, Founder 2026-10-15).
 * "Real panes with big labels and the current value in the corner."
 *
 * VOLUME PACE — this bar's volume against the median volume of the bars before it ("1.6× normal").
 * Read from the bars alone, so it covers every candle on camera. The median (not the mean) so one
 * spike does not make every bar after it look quiet.
 */

export const VOLUME_PACE_LOOKBACK = 20;

/** volume[i] ÷ median(volume[i−n … i−1]); NaN until n earlier bars exist or when the median is 0. */
export function volumePace(volumes: readonly number[], n: number = VOLUME_PACE_LOOKBACK): number[] {
  const out: number[] = [];
  for (let i = 0; i < volumes.length; i++) {
    if (i < n) { out.push(NaN); continue; }
    const win = volumes.slice(i - n, i).filter(v => Number.isFinite(v) && v >= 0).sort((a, b) => a - b);
    if (win.length < n) { out.push(NaN); continue; }
    const med = win.length % 2 ? win[(win.length - 1) / 2] : (win[win.length / 2 - 1] + win[win.length / 2]) / 2;
    const v = volumes[i];
    out.push(med > 0 && Number.isFinite(v) ? v / med : NaN);
  }
  return out;
}

/** "1.6× normal" — one decimal; the word says which side of normal. */
export function volumePaceWords(x: number | null | undefined): string | null {
  if (x == null || !Number.isFinite(x)) return null;
  return `${x.toFixed(1)}× normal`;
}

/**
 * ABSORPTION METER (plate 29) — effort against displacement per bar, 0–100.
 * effort = the bar's volume ÷ the median volume of the `n` bars before it;
 * displacement = the bar's body |close − open| ÷ their median range.
 * score = 100 · effort ÷ (effort + displacement): 50 is ordinary, toward 100 is heavy effort that moved
 * price little (absorbed), toward 0 is a move on little effort. Bars only — it covers every candle, and
 * it does NOT say who absorbed (no side is claimed; the canon's volume-only absorption is side-unknown).
 */
export function absorptionMeter(
  bars: readonly { readonly open: number; readonly close: number; readonly high: number; readonly low: number; readonly volume: number }[],
  n: number = VOLUME_PACE_LOOKBACK,
): number[] {
  const out: number[] = [];
  const med = (v: number[]) => { const s = v.filter(Number.isFinite).sort((a, b) => a - b); return s.length ? (s.length % 2 ? s[(s.length - 1) / 2] : (s[s.length / 2 - 1] + s[s.length / 2]) / 2) : NaN; };
  for (let i = 0; i < bars.length; i++) {
    if (i < n) { out.push(NaN); continue; }
    const win = bars.slice(i - n, i);
    const mv = med(win.map(b => b.volume)), mr = med(win.map(b => b.high - b.low));
    const b = bars[i];
    if (!(mv > 0) || !(mr > 0) || !(b.volume >= 0)) { out.push(NaN); continue; }
    const effort = b.volume / mv, disp = Math.abs(b.close - b.open) / mr;
    out.push(effort + disp > 0 ? Math.round((100 * effort) / (effort + disp)) : 50);
  }
  return out;
}

/** "72 · heavy effort, little move" / "48 · ordinary" / "18 · moved on little effort" */
export function absorptionWords(x: number | null | undefined): string | null {
  if (x == null || !Number.isFinite(x)) return null;
  const v = Math.round(x);
  return `${v} · ${v >= 70 ? "heavy effort, little move" : v <= 30 ? "moved on little effort" : "ordinary"}`;
}

/** DELTA VELOCITY (plate 29) — a bar's delta per minute: how fast the cumulative delta is changing. */
export function deltaVelocity(delta: number, barSeconds: number): number | null {
  return barSeconds > 0 && Number.isFinite(delta) ? delta / (barSeconds / 60) : null;
}

/** "+42 /min" */
export function deltaVelocityWords(v: number | null | undefined, unit = "/min"): string | null {
  if (v == null || !Number.isFinite(v)) return null;
  const a = Math.abs(v), t = a >= 100 ? Math.round(a).toLocaleString("en-US") : a.toFixed(1);
  return `${v > 0 ? "+" : v < 0 ? "−" : ""}${t} ${unit}`;
}
