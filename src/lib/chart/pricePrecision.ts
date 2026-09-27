/**
 * PRICE PRECISION — how many decimals the market actually quotes, read from
 * the bars themselves.
 *
 * Found on serving (EURUSD 1h desktop, 2026-09-25): the candle series had no
 * `priceFormat`, so every instrument inherited the charting library's default
 * of two decimals. The axis read 1.15 / 1.14 / 1.13, the legend read
 * "1.14 +0.00 (+0.20%)" for a 0.0023 move, and O/H/L all read 1.14 — a
 * forex chart that could not state a forex price.
 *
 * The rule: the smallest decimal count (at least 2, at most 8) that states
 * every recent price exactly. NQ's quarter ticks and a stock's cents stay at
 * 2; EURUSD's pips come out at 4–5. If the feed's floats carry adder noise so
 * no count is exact, fall back on magnitude (4 significant figures below the
 * point), never below 2.
 *
 * PURE. DETERMINISTIC.
 */

import type { CanonicalBar } from "@/lib/marketData/canonicalBar";
import { forexPairCodes } from "@/lib/marketData/canonicalIdentity";
import { instrumentEconomics } from "@/lib/marketData/contractEconomics";
import { classifySymbol } from "@/lib/marketData/symbolAssetClass";
import { spotMetalFutures } from "@/lib/yahooSymbol";

export const MIN_PRICE_PRECISION = 2;
export const MAX_PRICE_PRECISION = 8;
/** How many of the newest bars are read — enough to see the quoting grid. */
export const PRECISION_SAMPLE_BARS = 300;
/** Beyond this many significant figures a price digit is float noise, not a quote. */
export const SIGNIFICANT_FIGURES = 7;
/** Share of recent prices a precision must state exactly — the grid, not the odd print. */
export const GRID_SHARE = 0.9;

/** Only the four prices of the one bar shape (M8: no private bar shapes). */
export type PrecisionBar = Pick<CanonicalBar, "open" | "high" | "low" | "close">;

const exactAt = (v: number, d: number): boolean => {
  const scaled = v * 10 ** d;
  return Math.abs(scaled - Math.round(scaled)) < 1e-6 * Math.max(1, Math.abs(scaled)) ** 0.5;
};

export function pricePrecisionFromBars(bars: readonly PrecisionBar[], symbol?: string): number {
  // A US EQUITY AT OR ABOVE $1 QUOTES IN CENTS (SEC Rule 612), whatever its
  // tape printed. Found on the glass (2026-09-26, TSLA 15m on Webull's
  // consolidated bars): 202 of 1,200 recent prices were genuine sub-penny
  // executions (367.3818, 365.0001 — midpoint / price-improvement prints),
  // so no decimal count under 4 stated 90% of them and the axis, the header
  // and every level name read "388.0000". Prints can be sub-penny; the grid a
  // trader quotes and orders on is not. The class comes from its one owner.
  if (symbol && classifySymbol(symbol) === "EQUITY") {
    const newest = bars.length ? bars[bars.length - 1].close : NaN;
    if (Number.isFinite(newest) && newest >= 1) return MIN_PRICE_PRECISION;
  }
  const values: number[] = [];
  for (let i = bars.length - 1; i >= 0 && values.length < PRECISION_SAMPLE_BARS * 4; i--) {
    const b = bars[i];
    // Normalised to SIGNIFICANT_FIGURES first: a float32 feed ships 91.73 as
    // 91.7300033569336, which no decimal count states exactly (CL1! read
    // 91.730; GC1! read 4333.29980469 before the cap). What the venue quoted
    // is what survives at seven significant figures.
    for (const v of [b.open, b.high, b.low, b.close]) if (Number.isFinite(v) && v !== 0) values.push(Number(v.toPrecision(SIGNIFICANT_FIGURES)));
  }
  if (values.length === 0) return MIN_PRICE_PRECISION;
  // SIGNIFICANT-FIGURE CAP. A feed that ships float32 prices (the BTC
  // backfill: 83947.2421875 is an exact binary fraction) is "exact" at 7
  // decimals, and the chart read 83896.2600000 (serving, 2026-09-25). No
  // venue quotes past ~7 significant figures, so the decimals stop there:
  // 5 integer digits → 2, EURUSD's 1 → up to 6, a sub-penny coin → 8.
  const maxAbs = Math.max(...values.map(v => Math.abs(v)));
  const intDigits = Math.floor(Math.log10(maxAbs)) + 1;
  const cap = Math.min(MAX_PRICE_PRECISION, Math.max(MIN_PRICE_PRECISION, SIGNIFICANT_FIGURES - intDigits));
  // THE QUOTING GRID, NOT THE ODD PRINT. A handful of sub-penny fills
  // (midpoint / dark-pool prints on TSLA: 373.805) put the whole axis on three
  // decimals — "377.000" (serving, 2026-09-25). The grid is the smallest count
  // that states nearly every recent price exactly.
  const need = Math.ceil(values.length * GRID_SHARE);
  // MIDPOINT PRINTS ARE NOT A GRID. Alpaca's stock bars carry midpoint fills
  // exactly half a cent off the quote (366.565): 17–30% of every price on
  // TSLA / AAPL / SPY / NVDA at 1m–1h, and every sub-penny price measured was
  // a half-cent (serving, 2026-09-25 — the TSLA axis read 388.000 again). At
  // and above $1 the market quotes in cents, so a half-cent sits ON the cents
  // grid, between two ticks. Only the cents grid, only at $1 and up: a pip,
  // a 1/64th and a sub-dollar coin keep their own decimals.
  const centsMarket = maxAbs >= 1;
  for (let d = MIN_PRICE_PRECISION; d <= cap; d++) {
    const midpointsCount = centsMarket && d === MIN_PRICE_PRECISION;
    let exact = 0;
    for (const v of values) if (exactAt(v, d) || (midpointsCount && exactAt(v * 2, d))) exact++;
    if (exact >= need) return d;
  }
  // Noise: no count under the cap is exact. Four significant figures below
  // the point, never past the cap.
  const byMagnitude = 4 - Math.floor(Math.log10(maxAbs));
  return Math.min(cap, Math.max(MIN_PRICE_PRECISION, byMagnitude));
}

/** The series' `priceFormat` for that precision: the axis, last-price tag and crosshair read it. */
export function priceFormatFor(precision: number): { type: "price"; precision: number; minMove: number } {
  const p = Math.min(MAX_PRICE_PRECISION, Math.max(MIN_PRICE_PRECISION, Math.round(precision)));
  return { type: "price", precision: p, minMove: Number((10 ** -p).toFixed(p)) };
}

/**
 * THE AXIS NEVER PRINTS A PRICE THE INSTRUMENT CANNOT HAVE — Garden 16 §50,
 * found on the glass 2026-09-27 (TSLA 1M, real Webull bars): the candle pane
 * keeps a margin under the lowest price for the volume band, and the axis
 * labelled that margin "-40.00 · -80.00 · -120.00" — prices a share cannot
 * trade at. For classes that cannot print below zero (equities, crypto,
 * cash indices) a negative level gets no label; the margin stays (the volume
 * band needs it), only the untrue numbers go. Futures and FX keep every label:
 * a future can settle negative (CL, April 2020) and a spread can be negative.
 */
export type AxisPriceFormat =
  | ReturnType<typeof priceFormatFor>
  | { type: "custom"; minMove: number; formatter: (price: number) => string };

export function cannotPrintBelowZero(symbol: string): boolean {
  const c = classifySymbol(symbol);
  return c === "EQUITY" || c === "CRYPTO" || c === "INDEX";
}

export function axisPriceFormatFor(precision: number, symbol: string): AxisPriceFormat {
  const base = priceFormatFor(precision);
  if (!cannotPrintBelowZero(symbol)) return base;
  return {
    type: "custom",
    minMove: base.minMove,
    formatter: (price: number) => (price < 0 ? "" : price.toFixed(base.precision)),
  };
}

/* ════════════════════════════════════════════════════════════════════════
 * DISPLAY PRECISION — the ONE owner of how many decimals a price is SHOWN at.
 *
 * MEASURED ON SERVING (2026-09-26 05:01 CDT, desktop, /charts?symbol=EURUSD
 * &tf=15m): the legend and axis read "1.139212" — six decimals. EURUSD quotes
 * five (pipettes). Yahoo's FX rates are computed float32s with no venue grid
 * (1.1393414735794067 on the wire); normalised to seven significant figures
 * that is 1.139341, "exact" at six decimals, so the grid detector said 6. The
 * detector was right about the floats and wrong about the market.
 *
 * GP12 §27: split calculation precision from display precision; use tick size
 * / asset-class metadata for display. So display asks the INSTRUMENT first,
 * when its class is known, and the bars only when it is not:
 *
 *   spot metals        XAUUSD 2 · XAGUSD 3 · XPTUSD 2 · XPDUSD 2 (quote convention)
 *   spot FX            JPY-quoted 3 · other listed quotes 5 (pipettes)
 *   futures            the contract's tick (contractEconomics' one tick table), never below 2;
 *                      1/32-family treasuries and unlisted roots → bar grid
 *   equities / indices 2 at and above $1 (cents); sub-dollar → bar grid
 *   crypto / unknown   the bar-grid detector, unchanged
 *
 * `pricePrecisionFromBars` stays exactly as it was: it is still the answer for
 * every class above that says "bar grid", and calculation paths (the magnet
 * snap) keep reading it directly.
 *
 * PURE. DETERMINISTIC.
 * ════════════════════════════════════════════════════════════════════════ */

/** Which fact the displayed decimals were read from — for receipts and tests. */
export type DisplayPrecisionBasis =
  | "SPOT_METAL"
  | "FX_PIPETTE"
  | "FX_JPY_PIPETTE"
  | "FUTURES_TICK"
  | "EQUITY_CENTS"
  | "BAR_GRID";

export interface DisplayPrecisionReading {
  readonly dp: number;
  readonly basis: DisplayPrecisionBasis;
}

/** Spot metals' quote convention (dollars per troy ounce). */
const SPOT_METAL_DP: Readonly<Record<string, number>> = { XAUUSD: 2, XAGUSD: 3, XPTUSD: 2, XPDUSD: 2 };

/** Quote currencies whose pairs are conventionally quoted to five decimals. */
const FIVE_DP_QUOTES = new Set(["USD", "EUR", "GBP", "AUD", "NZD", "CAD", "CHF", "SGD", "CNH", "HKD", "NOK", "SEK", "ZAR", "MXN", "TRY"]);

const clampDp = (d: number) => Math.min(MAX_PRICE_PRECISION, Math.max(MIN_PRICE_PRECISION, d));

/** The decimals a decimal tick states: 0.25 → 2, 0.005 → 3, 1 → 0. */
function tickDecimals(tick: number): number {
  for (let d = 0; d <= MAX_PRICE_PRECISION; d++) if (exactAt(tick, d)) return d;
  return MAX_PRICE_PRECISION;
}

export function displayPrecisionReading(symbol: string, bars: readonly PrecisionBar[]): DisplayPrecisionReading {
  const grid = (): DisplayPrecisionReading => ({ dp: pricePrecisionFromBars(bars), basis: "BAR_GRID" });
  const sym = (symbol ?? "").trim().toUpperCase();
  if (!sym) return grid();

  const metal = spotMetalFutures(sym);
  if (metal) {
    const key = sym.replace(/[-/]/g, "");
    const dp = SPOT_METAL_DP[key === "XAU" ? "XAUUSD" : key === "XAG" ? "XAGUSD" : key];
    if (dp != null) return { dp: clampDp(dp), basis: "SPOT_METAL" };
  }

  const cls = classifySymbol(sym);
  // The class owner answers UNKNOWN for listed pairs its notation regex does
  // not name (USDMXN, USDZAR); the pair owner still knows both legs.
  if (cls === "FOREX" || (cls === "UNKNOWN" && forexPairCodes(sym) !== null)) {
    const pair = forexPairCodes(sym.replace(/=X$/, ""));
    if (pair) {
      if (pair[1] === "JPY") return { dp: 3, basis: "FX_JPY_PIPETTE" };
      if (FIVE_DP_QUOTES.has(pair[1])) return { dp: 5, basis: "FX_PIPETTE" };
    }
    return grid();
  }

  if (cls === "FUTURES") {
    // The tick comes from its one owner (contractEconomics): a contract with a
    // published spec shows its tick's decimals; any other root reads the grid.
    const e = instrumentEconomics(sym, null);
    if (e.status === "PRICED" && e.tickSize != null) return { dp: clampDp(tickDecimals(e.tickSize)), basis: "FUTURES_TICK" };
    return grid();
  }

  if (cls === "EQUITY" || cls === "INDEX") {
    let last: number | null = null;
    for (let i = bars.length - 1; i >= 0; i--) {
      const c = bars[i]?.close;
      if (Number.isFinite(c) && c > 0) { last = c; break; }
    }
    if (last != null && last >= 1) return { dp: MIN_PRICE_PRECISION, basis: "EQUITY_CENTS" };
    return grid();
  }

  return grid();
}

/** How many decimals every DISPLAYED price of this instrument is printed at. */
export function displayPrecisionFor(symbol: string, bars: readonly PrecisionBar[]): number {
  return displayPrecisionReading(symbol, bars).dp;
}
