/**
 * PLATE 29 · "Real panes with big labels and the current value in the corner" (Garden 19 finish line,
 * Founder 2026-10-15). Serving 517532a at 1440×900: the RSI pane carried no name at all, and the
 * CVD pane's only words were a 9.5px source caption.
 *
 * Every indicator pane is named from the indicators that are ON and painting into it — the menu's own
 * names — so a pane shared by two indicators says both. The table maps the chart's pane ids to the
 * indicator names that paint there; paneNames.sentinel.test.ts keeps it total over MainChart.
 */

export const PANE_INDICATORS: Readonly<Record<string, readonly string[]>> = {
  ac: ["Accelerator Oscillator"],
  ad: ["Accumulation/Distribution"],
  adx: ["DMI"],
  ao: ["Awesome Oscillator"],
  aoac: ["Awesome / AC Combo"],
  aroon: ["Aroon Up/Down"],
  atr: ["ATR"],
  bbw: ["Bollinger Band Width"],
  bbw2: ["BB Width"],
  bop: ["Balance of Power"],
  cci: ["CCI"],
  cho: ["Chaikin Oscillator"],
  chop: ["Choppiness Index"],
  chv: ["Chaikin Volatility"],
  cmf: ["Chaikin Money Flow"],
  cmo: ["Chande Momentum Oscillator"],
  cop: ["Coppock Curve"],
  crsi: ["ConnorsRSI"],
  dcw: ["Donchian Width"],
  dpo: ["DPO"],
  dst: ["Dual Stochastic"],
  elder: ["Elder Ray Index"],
  eom: ["Ease of Movement"],
  fi: ["Force Index"],
  fish: ["Ehlers Fisher"],
  hvol: ["Historical Volatility"],
  kcw: ["KC Width"],
  kdj: ["KDJ"],
  klinger: ["Klinger Oscillator"],
  lrslope: ["Linear Regression Slope"],
  macd: ["MACD", "MACD Histogram", "MACD Signal"],
  mass: ["Mass Index"],
  mfi: ["Money Flow Index"],
  mom: ["Momentum"],
  natr: ["Normalized ATR"],
  nvi: ["Negative Volume Index"],
  obv: ["OBV"],
  park: ["Parkinson Volatility"],
  ppo: ["PPO"],
  prank: ["Percentile Rank"],
  pvi: ["Positive Volume Index"],
  pvt: ["Price Volume Trend"],
  roc: ["ROC"],
  rsi: ["RSI"],
  rvig: ["RVGI"],
  rvol: ["RVOL"],
  rvola: ["Realized Volatility"],
  smi: ["Stochastic Pop"],
  smrsi: ["Color RSI"],
  srsi: ["Stochastic RSI"],
  stc: ["Schaff Trend Cycle"],
  stddev: ["Standard Deviation"],
  stoch: ["Stochastic"],
  stoprun: ["Stop Run Alert"],
  tapecvd: ["Tape CVD"],
  trix: ["TRIX"],
  tsi: ["TSI"],
  ttm: ["Squeeze Momentum"],
  ulcer: ["Ulcer Index"],
  uo: ["Ultimate Oscillator"],
  vol_hist: ["Volume"],
  volma: ["Volume MA"],
  volosc: ["Volume Oscillator"],
  vpace: ["Volume Pace"],
  vortex: ["Vortex Indicator"],
  vwrsi: ["Volume Weighted RSI"],
  wae: ["Waddah Attar Explosion"],
  willr: ["Williams %R"],
  zscore: ["Z-Score"],
};

/** The pane's name: the active indicators painting into it, else its id in capitals. */
export function paneTitle(id: string, active: ReadonlySet<string>): string {
  const names = (PANE_INDICATORS[id] ?? []).filter(n => active.has(n));
  return names.length ? names.join(" · ") : id.toUpperCase();
}

import { volumePaceWords } from "./flowIndicators";

/** The corner words for a pane: its own unit where it has one ("1.6× normal"), else the plain value. */
export function paneValueWords(id: string, v: number | null | undefined): string | null {
  if (id === "vpace") return volumePaceWords(v);
  return paneValueText(v);
}

/** The corner value: up to 2 decimals, thousands grouped, a sign only when negative ("−" not "-"). */
export function paneValueText(v: number | null | undefined): string | null {
  if (v == null || !Number.isFinite(v)) return null;
  const a = Math.abs(v);
  const dp = a >= 1000 ? 0 : a >= 100 ? 1 : 2;
  const t = a.toLocaleString("en-US", { minimumFractionDigits: dp, maximumFractionDigits: dp });
  return v < 0 ? `−${t}` : t;
}
