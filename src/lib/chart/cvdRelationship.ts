/**
 * G19.CVD_REL · C-06 CVD ⇄ PRICE RELATIONSHIP NOTCH — the owner (PROPOSED).
 *
 * QUESTION: is the aggression agreeing with the price move?
 *
 * The PER-BAR half already reaches the candle through the Bar Delta Keel
 * (a keel is HOLLOW when one bar's aggression ran against its own body). A
 * second per-bar mark of the same fact would encode signed flow twice on one
 * bar. This owner reads the CUMULATIVE half, which never reached the candle:
 * the CVD slope across the last CVD_REL_WINDOW finished bars against the
 * price move across the same bars. Where they disagree, the bar gets a notch
 * on its wick tip in the price move's direction. Agreement is silence.
 *
 * Evidence: the SAME signed rows the keel reads (one owner of a bar's delta:
 * footprintCanon.barTapeDelta, else the provider's bar sides). A window with
 * any bar lacking sides is UNMEASURED — never zero-filled. A window holding a
 * provider-sides row is INFERRED (the painter dashes it); tape-only is OBSERVED.
 *
 * Proposed: no "CVD / Delta relationship" Founder plate exists yet (G19-P02),
 * so the layer is default OFF and its receipt says PROPOSED. Pure; no I/O.
 */

export type CvdBasis = "TAPE" | "SIDES";

export interface CvdRelRow {
  readonly time: number;
  readonly open: number;
  readonly close: number;
  /** ATR at that bar (NaN while warming up). */
  readonly atr: number;
  readonly buy: number;
  readonly sell: number;
  readonly basis: CvdBasis;
}

export interface CvdNotch {
  /** The bar the window ends on — the notch's bar. */
  readonly time: number;
  /** The window's first bar. */
  readonly fromTime: number;
  /** The price move's direction across the window: the notch sits on that wick tip. */
  readonly dir: 1 | -1;
  /** Σ(buy − sell) across the window. */
  readonly cvd: number;
  /** close(last) − open(first). */
  readonly move: number;
  /** |cvd| ÷ Σ(buy + sell). */
  readonly ratio: number;
  /** A provider-sides row is in the window (dashed), else captured prints (solid). */
  readonly inferred: boolean;
}

export interface CvdRelReading {
  readonly notches: readonly CvdNotch[];
  /** Windows with every bar sided. */
  readonly measured: number;
  /** Windows with a bar lacking sides — no claim either way. */
  readonly unmeasured: number;
  /** Rows on the provider's bar sides (receipt SIDES:<n>). */
  readonly sidesRows: number;
}

/** Finished bars in one window. */
export const CVD_REL_WINDOW = 5;
/** |Σdelta| ÷ Σvolume below this is balanced flow — no claim. */
export const CVD_REL_MIN_RATIO = 0.15;
/** A price move under this many ATRs is no move — no claim. */
export const CVD_REL_MIN_MOVE_ATR = 0.25;

export function readCvdNotches(rows: readonly CvdRelRow[], window = CVD_REL_WINDOW): CvdRelReading {
  const notches: CvdNotch[] = [];
  let measured = 0, unmeasured = 0, sidesRows = 0;
  for (const r of rows) if (r.buy + r.sell > 0 && r.basis === "SIDES") sidesRows++;
  for (let i = window - 1; i < rows.length; i++) {
    let cvd = 0, vol = 0, sided = true, inferred = false;
    for (let j = i - window + 1; j <= i; j++) {
      const r = rows[j];
      const tot = r.buy + r.sell;
      if (!(tot > 0)) { sided = false; break; }
      cvd += r.buy - r.sell;
      vol += tot;
      if (r.basis === "SIDES") inferred = true;
    }
    if (!sided) { unmeasured++; continue; }
    measured++;
    const first = rows[i - window + 1], last = rows[i];
    const move = last.close - first.open;
    const atr = last.atr;
    if (!(atr > 0) || Math.abs(move) < CVD_REL_MIN_MOVE_ATR * atr) continue;
    const ratio = Math.abs(cvd) / vol;
    if (ratio < CVD_REL_MIN_RATIO) continue;
    if (Math.sign(cvd) === Math.sign(move)) continue;
    notches.push({ time: last.time, fromTime: first.time, dir: move > 0 ? 1 : -1, cvd, move, ratio, inferred });
  }
  return { notches, measured, unmeasured, sidesRows };
}

/** The Inspect line for one notch: CVD Δ, body Δ, window and basis. */
export function cvdNotchProvenance(n: CvdNotch, window = CVD_REL_WINDOW): string {
  const r4 = (v: number) => Math.round(v * 1e4) / 1e4;
  return `CVD ⇄ price · last ${window} finished bars · CVD Δ ${n.cvd > 0 ? "+" : ""}${r4(n.cvd)} · price ${n.move > 0 ? "+" : ""}${r4(n.move)} · ${Math.round(n.ratio * 100)}% one-sided against the move · ${n.inferred ? "provider bar sides (inferred)" : "captured signed prints"}`;
}
