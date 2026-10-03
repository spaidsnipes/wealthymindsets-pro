/**
 * TWO REGISTRY READINGS OVER THE CAMERA'S CLOSED BARS — PURE.
 *
 * TEMPORAL EVIDENCE DENSITY (TED, F10 Time): clock time is not evidence. A
 * stretch of bars can be long on the clock and nearly empty of trading. TED
 * says how unevenly the traded volume is spread across the window's clock
 * time — what share of all volume sits in its densest fifth of bars — and how
 * dense the newest closed bar is against the window's median bar.
 *
 * RESPONSE MATRIX (Registry §AB; "Market Surprise = observed response vs
 * contextual expected response"): each bar's EFFORT (volume vs the window
 * median) against its RESPONSE (range vs the window median), sorted into four
 * cells — big effort / small response (ABSORBED), big / big (INITIATIVE),
 * small / big (VACUUM), small / small (QUIET). Counts per cell and the newest
 * bar's cell. A cell is a description of that bar, never a signal.
 *
 * Both need real traded volume; a feed without it (spot FX) returns null.
 */

export interface EvidenceBar { readonly high: number; readonly low: number; readonly volume: number }

export const EVIDENCE_WINDOW = 100;
export const EVIDENCE_MIN = 30;
const HIGH = 1.5;
const LOW = 0.67;

const median = (xs: readonly number[]) => { const s = [...xs].sort((a, b) => a - b); const m = s.length >> 1; return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; };
const usable = (bars: readonly EvidenceBar[]) =>
  bars.filter(b => Number.isFinite(b.volume) && b.volume > 0 && Number.isFinite(b.high) && Number.isFinite(b.low) && b.high >= b.low).slice(-EVIDENCE_WINDOW);

export interface TemporalEvidenceDensity {
  readonly sample: number;
  /** Share (0–1) of the window's volume carried by its densest 20% of bars. */
  readonly topFifthShare: number;
  /** Newest closed bar's volume as a multiple of the window median. */
  readonly newestDensity: number;
  /** Bars carrying under a third of the median volume — clock time with little evidence. */
  readonly thinBars: number;
}

export function readTemporalEvidenceDensity(bars: readonly EvidenceBar[]): TemporalEvidenceDensity | null {
  const w = usable(bars);
  if (w.length < EVIDENCE_MIN) return null;
  const vols = w.map(b => b.volume);
  const total = vols.reduce((s, v) => s + v, 0);
  const med = median(vols);
  const top = [...vols].sort((a, b) => b - a).slice(0, Math.max(1, Math.round(w.length / 5))).reduce((s, v) => s + v, 0);
  return {
    sample: w.length,
    topFifthShare: Math.round((top / total) * 1000) / 1000,
    newestDensity: Math.round((vols[vols.length - 1] / med) * 100) / 100,
    thinBars: vols.filter(v => v < med / 3).length,
  };
}

export type ResponseCell = "ABSORBED" | "INITIATIVE" | "VACUUM" | "QUIET" | "ORDINARY";

export interface ResponseMatrix {
  readonly sample: number;
  readonly counts: Readonly<Record<ResponseCell, number>>;
  readonly newest: ResponseCell;
  readonly newestEffort: number;
  readonly newestResponse: number;
}

export function cellFor(effort: number, response: number): ResponseCell {
  if (effort >= HIGH && response <= LOW) return "ABSORBED";
  if (effort >= HIGH && response >= HIGH) return "INITIATIVE";
  if (effort <= LOW && response >= HIGH) return "VACUUM";
  if (effort <= LOW && response <= LOW) return "QUIET";
  return "ORDINARY";
}

export function readResponseMatrix(bars: readonly EvidenceBar[]): ResponseMatrix | null {
  const w = usable(bars);
  if (w.length < EVIDENCE_MIN) return null;
  const vMed = median(w.map(b => b.volume));
  const rMed = median(w.map(b => b.high - b.low));
  if (!(vMed > 0) || !(rMed > 0)) return null;
  const counts: Record<ResponseCell, number> = { ABSORBED: 0, INITIATIVE: 0, VACUUM: 0, QUIET: 0, ORDINARY: 0 };
  let newest: ResponseCell = "ORDINARY", ne = 0, nr = 0;
  for (const b of w) {
    const e = b.volume / vMed, r = (b.high - b.low) / rMed;
    const c = cellFor(e, r);
    counts[c]++;
    newest = c; ne = e; nr = r;
  }
  return { sample: w.length, counts, newest, newestEffort: Math.round(ne * 100) / 100, newestResponse: Math.round(nr * 100) / 100 };
}
