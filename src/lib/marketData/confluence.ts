/**
 * Confluence engine — pure, deterministic, versioned.
 *
 * Founder Aug-16 XVI: "NO SCORE when minimum evidence is not met. Do not
 * output 56/100 if four of five components are unavailable." This module
 * lifts the SmartMoneyPanel's inline confluence computation into a pure
 * function with an explicit insufficient-evidence gate, formula version,
 * and per-lens availability breakdown.
 *
 * A serious trader must be able to tell at a glance whether the number
 * is (a) real multi-source confluence, (b) a partial reading with named
 * abstentions, or (c) INSUFFICIENT EVIDENCE. This engine encodes the
 * three states explicitly instead of always emitting a number.
 */

export const CONFLUENCE_FORMULA_VERSION = "wm.confluence.v1" as const;

/** How many lenses (of five) must have real data before we allow a score. */
export const CONFLUENCE_MIN_MEASURED = 3 as const;

export interface ConfluenceFlow {
  /** true when the aggregate feed carries per-trade aggressor side data. */
  hasFlow: boolean;
  vwap: number;
  cvd: number;
  askVol: number;
  bidVol: number;
  imbRatio: number;
  askDom: boolean;
  candleUp: boolean;
}

export interface ConfluenceLens {
  label: string;
  dir: "bull" | "bear" | "na";
  detail: string;
  /** Signed contribution to the raw sum (0 when abstained). */
  contribution: number;
}

export interface ConfluenceReading {
  formulaVersion: typeof CONFLUENCE_FORMULA_VERSION;
  /** null when insufficient evidence. */
  score: number | null;
  bias: "BULL" | "BEAR" | "NEUTRAL" | "INSUFFICIENT";
  bull: number;
  bear: number;
  measured: number;
  totalLenses: number;
  insufficient: boolean;
  minRequired: number;
  reason: string;
  lenses: readonly ConfluenceLens[];
}

function clampN(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
}

/**
 * Deterministic confluence read.
 *
 * Five INDEPENDENT lenses, each of which may abstain (dir "na") if the
 * live feed cannot support it. An abstained lens contributes 0 and does
 * not count toward the measured total. If fewer than CONFLUENCE_MIN_MEASURED
 * lenses have real data, the reading is INSUFFICIENT and score is null.
 * The caller MUST NOT paint a numeric score in that case.
 */
export function computeConfluence(price: number, f: ConfluenceFlow): ConfluenceReading {
  const vwap = f.vwap > 0 ? f.vwap : price;
  const totVol = f.askVol + f.bidVol;
  const lenses: ConfluenceLens[] = [];
  let sum = 0;

  // 1. VWAP position (trend context) — measurable whenever price + VWAP exist.
  if (price > 0 && vwap > 0) {
    const rel = (price - vwap) / vwap;
    const c = 16 * clampN(rel / 0.004, -1, 1);
    sum += c;
    lenses.push({
      label: "VWAP",
      dir: rel > 0.0002 ? "bull" : rel < -0.0002 ? "bear" : "na",
      detail: `${(rel * 100).toFixed(2)}% ${rel >= 0 ? "above" : "below"} VWAP`,
      contribution: c,
    });
  } else {
    lenses.push({ label: "VWAP", dir: "na", detail: "No price/VWAP yet", contribution: 0 });
  }

  // 2. Cumulative delta — only when the feed carries per-trade aggressor side.
  if (f.hasFlow && totVol > 0) {
    const rel = clampN(f.cvd / totVol, -1, 1);
    const c = 16 * rel;
    sum += c;
    lenses.push({
      label: "CVD",
      dir: f.cvd > 0 ? "bull" : f.cvd < 0 ? "bear" : "na",
      detail: `Δ ${f.cvd.toFixed(0)} (${Math.round(Math.abs(rel) * 100)}% one-sided)`,
      contribution: c,
    });
  } else {
    lenses.push({ label: "CVD", dir: "na", detail: "No aggressor tape on this feed", contribution: 0 });
  }

  // 3. Aggressor imbalance — only when hasFlow.
  if (f.hasFlow && totVol > 0) {
    const strength = clampN((f.imbRatio - 100) / 120, 0, 1);
    const c = 10 * (f.askDom ? 1 : -1) * strength;
    sum += c;
    lenses.push({
      label: "Imbalance",
      dir: strength < 0.05 ? "na" : f.askDom ? "bull" : "bear",
      detail: `${Math.round(f.imbRatio)}% ${f.askDom ? "buy" : "sell"}-heavy`,
      contribution: c,
    });
  } else {
    lenses.push({ label: "Imbalance", dir: "na", detail: "Requires per-trade side data", contribution: 0 });
  }

  // 4. Candle body — measurable from the live bar. Abstains when price==0.
  if (price > 0) {
    const c = 6 * (f.candleUp ? 1 : -1);
    sum += c;
    lenses.push({
      label: "Candle",
      dir: f.candleUp ? "bull" : "bear",
      detail: f.candleUp ? "Live bar closing up" : "Live bar closing down",
      contribution: c,
    });
  } else {
    lenses.push({ label: "Candle", dir: "na", detail: "No live bar yet", contribution: 0 });
  }

  // 5. VWAP band position — mean-reversion lens, independent of raw trend.
  if (price > 0 && vwap > 0) {
    const up = vwap * 1.004;
    const down = vwap * 0.996;
    if (price > up) {
      sum -= 6;
      lenses.push({ label: "Band", dir: "bear", detail: "Stretched above upper band", contribution: -6 });
    } else if (price < down) {
      sum += 6;
      lenses.push({ label: "Band", dir: "bull", detail: "Stretched below lower band", contribution: 6 });
    } else {
      lenses.push({ label: "Band", dir: "na", detail: "Inside VWAP bands", contribution: 0 });
    }
  } else {
    lenses.push({ label: "Band", dir: "na", detail: "No VWAP bands yet", contribution: 0 });
  }

  const measured = lenses.filter((l) => l.dir !== "na").length;
  const bull = lenses.filter((l) => l.dir === "bull").length;
  const bear = lenses.filter((l) => l.dir === "bear").length;
  const insufficient = measured < CONFLUENCE_MIN_MEASURED;

  if (insufficient) {
    const abstained = lenses.filter((l) => l.dir === "na").map((l) => l.label).join(", ");
    return {
      formulaVersion: CONFLUENCE_FORMULA_VERSION,
      score: null,
      bias: "INSUFFICIENT",
      bull,
      bear,
      measured,
      totalLenses: lenses.length,
      insufficient: true,
      minRequired: CONFLUENCE_MIN_MEASURED,
      reason: `Only ${measured}/${lenses.length} lenses measurable (need ${CONFLUENCE_MIN_MEASURED}). Unavailable: ${abstained}.`,
      lenses,
    };
  }

  const score = Math.round(clampN(50 + sum, 2, 98));
  const bias: ConfluenceReading["bias"] =
    score >= 58 ? "BULL" : score <= 42 ? "BEAR" : "NEUTRAL";
  return {
    formulaVersion: CONFLUENCE_FORMULA_VERSION,
    score,
    bias,
    bull,
    bear,
    measured,
    totalLenses: lenses.length,
    insufficient: false,
    minRequired: CONFLUENCE_MIN_MEASURED,
    reason: `${measured}/${lenses.length} lenses measured. ${bull} bullish, ${bear} bearish.`,
    lenses,
  };
}
