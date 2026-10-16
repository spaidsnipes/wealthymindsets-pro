/**
 * CODEX PLATE 08 · "ONE DELTA. YOUR VIEW." — the divergence ON THE SAME TIME
 * ANCHORS. Price made a higher high while the delta band's bar made a lower
 * high (or the mirror at lows): a dashed line joins the two price pivots, a
 * second joins the two delta bars under them, and each end is named.
 *
 * This is NOT a second divergence engine. `selectDeltaDivergence` reads the
 * tape in equal-count segments and refuses a time axis; this reads the bars
 * the delta band ALREADY painted (one number per bar, from the band's one
 * owner) and only answers "do the two most recent swing pivots on the camera
 * disagree with the bars under them?". No pair → nothing drawn.
 *
 * Rules, stated:
 *   · a pivot high is a bar whose high is strictly above the PIVOT_K bars
 *     before it and at least equal to the PIVOT_K after (lows mirror);
 *   · the pair is the two most recent pivots at least MIN_GAP bars apart;
 *   · price must make the new extreme and the delta must fail to, by at
 *     least MIN_DELTA_SHARE of the band's own scale — a 3-contract wobble is
 *     not a finding.
 */
export const PIVOT_K = 3;
export const MIN_GAP = 5;
export const MIN_DELTA_SHARE = 0.1;

export interface PaneBar {
  readonly time: number;
  readonly high: number;
  readonly low: number;
  readonly delta: number;
}

export interface PanePivot {
  readonly time: number;
  readonly price: number;
  readonly delta: number;
}

export interface PaneDivergence {
  readonly kind: "BEARISH" | "BULLISH";
  readonly prior: PanePivot;
  readonly recent: PanePivot;
  /** The plate's sentence, plain. */
  readonly sentence: string;
}

function pivots(bars: readonly PaneBar[], side: "high" | "low"): number[] {
  const out: number[] = [];
  for (let i = PIVOT_K; i < bars.length - PIVOT_K; i++) {
    const v = bars[i][side];
    let ok = true;
    for (let j = 1; j <= PIVOT_K && ok; j++) {
      const before = bars[i - j][side], after = bars[i + j][side];
      ok = side === "high" ? v > before && v >= after : v < before && v <= after;
    }
    if (ok) out.push(i);
  }
  return out;
}

function lastPair(idx: readonly number[]): [number, number] | null {
  for (let r = idx.length - 1; r > 0; r--) {
    for (let p = r - 1; p >= 0; p--) {
      if (idx[r] - idx[p] >= MIN_GAP) return [idx[p], idx[r]];
    }
  }
  return null;
}

export function deltaPaneDivergence(bars: readonly PaneBar[], scale: number): PaneDivergence | null {
  if (bars.length < PIVOT_K * 2 + MIN_GAP || !(scale > 0)) return null;
  const minD = scale * MIN_DELTA_SHARE;
  const found: (PaneDivergence & { at: number })[] = [];
  const hp = lastPair(pivots(bars, "high"));
  if (hp) {
    const [a, b] = hp;
    if (bars[b].high > bars[a].high && bars[a].delta - bars[b].delta >= minD) {
      found.push({
        kind: "BEARISH", at: b,
        prior: { time: bars[a].time, price: bars[a].high, delta: bars[a].delta },
        recent: { time: bars[b].time, price: bars[b].high, delta: bars[b].delta },
        sentence: "Price made a higher high while net buying weakened.",
      });
    }
  }
  const lp = lastPair(pivots(bars, "low"));
  if (lp) {
    const [a, b] = lp;
    if (bars[b].low < bars[a].low && bars[b].delta - bars[a].delta >= minD) {
      found.push({
        kind: "BULLISH", at: b,
        prior: { time: bars[a].time, price: bars[a].low, delta: bars[a].delta },
        recent: { time: bars[b].time, price: bars[b].low, delta: bars[b].delta },
        sentence: "Price made a lower low while net selling weakened.",
      });
    }
  }
  if (!found.length) return null;
  const pick = found.reduce((m, f) => (f.at > m.at ? f : m));
  return { kind: pick.kind, prior: pick.prior, recent: pick.recent, sentence: pick.sentence };
}
