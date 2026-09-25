/**
 * WHAT THE MAIN PRICE SERIES IS HANDED, PER CANDLE TYPE — ONE OWNER.
 *
 * Lifted verbatim out of MainChart's bootstrap (2026-09-25) because a SECOND
 * painter now needs the exact same answer: the bar-replay camera repaints the
 * price and volume series with the replay window on every step, and when the
 * trader presses Stop it repaints them with the held live bars. Had the replay
 * path carried its own copy of these transforms, the first edit to either copy
 * would make a replayed Renko chart and a live one disagree about what a brick
 * is — the drift class this codebase has been repaired for many times.
 *
 * PURE and computed over WHATEVER BARS IT IS GIVEN. That matters for replay:
 * volume-candle opacity, the VP-candle POC threshold, Renko bricks and range
 * bars are all recomputed over the window, so no bar in the replayed past is
 * shaded by a volume that has not happened yet.
 *
 * The series OPTIONS (colours of the series itself, line widths, price lines)
 * still live at the `addSeries` call sites in MainChart; only the DATA moved.
 */
import type { LegacyOhlcvTuple } from "@/lib/marketData/canonicalBar";

/** Heikin Ashi transform (moved from MainChart unchanged). Causal: bar i reads only bars ≤ i. */
export function toHeikinAshi(bars: readonly LegacyOhlcvTuple[]): LegacyOhlcvTuple[] {
  const ha: LegacyOhlcvTuple[] = [];
  for (let i = 0; i < bars.length; i++) {
    const b = bars[i];
    const haClose = (b.open + b.high + b.low + b.close) / 4;
    const haOpen  = i === 0
      ? (b.open + b.close) / 2
      : (ha[i - 1].open + ha[i - 1].close) / 2;
    ha.push({
      time:   b.time,
      open:   +haOpen.toFixed(b.close < 10 ? 4 : 2),
      close:  +haClose.toFixed(b.close < 10 ? 4 : 2),
      high:   +Math.max(b.high, haOpen, haClose).toFixed(b.close < 10 ? 4 : 2),
      low:    +Math.min(b.low,  haOpen, haClose).toFixed(b.close < 10 ? 4 : 2),
      volume: b.volume,
    });
  }
  return ha;
}

export interface MainSeriesInk {
  /** chartSettings.candleUp ?? CANDLE_UP_DEFAULT */
  readonly up: string;
  /** chartSettings.candleDown ?? CANDLE_DOWN_DEFAULT */
  readonly down: string;
  /** getBase(symbol) — sizes Renko bricks and range bars. */
  readonly base: number;
  /** getIntervalSec(timeframe) — spacing of the synthetic brick/range timestamps. */
  readonly intervalSec: number;
}

/** A point handed to `series.setData`; shape depends on the candle type. */
export type MainSeriesPoint = { readonly time: number } & Record<string, unknown>;

/** The display bars for a candle type: Heikin Ashi is the only re-shaped OHLC. */
export function mainDisplayBars(candleType: string, bars: readonly LegacyOhlcvTuple[]): readonly LegacyOhlcvTuple[] {
  return candleType === "heikin-ashi" ? toHeikinAshi(bars) : bars;
}

export function mainSeriesPoints(
  candleType: string,
  bars: readonly LegacyOhlcvTuple[],
  ink: MainSeriesInk,
): MainSeriesPoint[] {
  const displayData = mainDisplayBars(candleType, bars);
  const upC = ink.up, downC = ink.down;
  switch (candleType) {
    case "line":
    case "area":
    case "baseline":
      return displayData.map(b => ({ time: b.time, value: b.close }));
    case "columns":
      // Force open = low and high = close for bull, open = high and low = close for bear (column shape)
      return displayData.map(b => ({
        time: b.time,
        open: b.close > b.open ? b.low : b.high,
        high: b.high,
        low:  b.low,
        close: b.close,
      }));
    case "volume-candles": {
      // Volume Candles — green/red body, OPACITY scales with relative volume
      const maxVol = Math.max(1, ...displayData.map(b => b.volume));
      const minVol = Math.min(...displayData.map(b => b.volume));
      const volRange = maxVol - minVol || 1;
      return displayData.map(b => {
        const frac   = (b.volume - minVol) / volRange;
        const alpha  = Math.round((0.25 + frac * 0.70) * 255).toString(16).padStart(2, "0");
        const isBull = b.close >= b.open;
        return { ...b, color: (isBull ? upC : downC) + alpha, borderColor: isBull ? upC : downC, wickColor: isBull ? upC : downC };
      });
    }
    case "vp-candles": {
      // VP Candles — green/red, but HIGH-VOLUME (value-area / POC) bars get a GOLD border
      const vols = [...displayData.map(b => b.volume)].sort((a, b) => a - b);
      const pocThreshold = vols[Math.floor(vols.length * 0.8)] ?? Infinity; // top 20% = POC bars
      return displayData.map(b => {
        const isBull = b.close >= b.open;
        const isPOC  = b.volume >= pocThreshold;
        return {
          ...b,
          color:       isBull ? upC : downC,
          borderColor: isPOC ? "#F0B429" : (isBull ? upC : downC), // gold border on POC bars
          wickColor:   isBull ? upC : downC,
        };
      });
    }
    case "renko": {
      // RENKO — fixed-size bricks, a new brick only when price moves one brick
      // (time-independent). Bricks are filled green/red blocks (no wicks).
      const brickSize  = ink.base * 0.001;
      let lastBrick    = Math.floor((displayData[0]?.close ?? ink.base) / brickSize) * brickSize;
      const renkoData: Record<string, unknown>[] = [];
      displayData.forEach(b => {
        while (b.close >= lastBrick + brickSize) {
          renkoData.push({ time: b.time, open: lastBrick, high: lastBrick + brickSize, low: lastBrick, close: lastBrick + brickSize, color: upC, borderColor: upC, wickColor: upC });
          lastBrick += brickSize;
        }
        while (b.close <= lastBrick - brickSize) {
          renkoData.push({ time: b.time, open: lastBrick, high: lastBrick, low: lastBrick - brickSize, close: lastBrick - brickSize, color: downC, borderColor: downC, wickColor: downC });
          lastBrick -= brickSize;
        }
      });
      // Renko is TIME-INDEPENDENT — a brick is a price move, not a clock tick.
      // EVENLY-SPACED sequential timestamps pack the bricks side-by-side like
      // TradingView Renko (no gaps on LWC's time axis).
      const rkStep = ink.intervalSec || 60;
      const rkT0 = displayData[0]?.time ?? 0;
      return renkoData.map((r, i) => ({ ...r, time: rkT0 + i * rkStep }));
    }
    case "range-bars": {
      // RANGE BARS — each bar spans a FIXED price range; a new bar opens once price
      // travels one full range from the prior bar's open. Keeps wicks.
      const rangeSize = ink.base * 0.0015;
      const rbData: Record<string, unknown>[] = [];
      let cur: { time: number; open: number; high: number; low: number; close: number } | null = null;
      for (const b of displayData) {
        if (!cur) cur = { time: b.time, open: b.open, high: b.high, low: b.low, close: b.close };
        cur.high = Math.max(cur.high, b.high);
        cur.low  = Math.min(cur.low,  b.low);
        cur.close = b.close;
        if (cur.high - cur.low >= rangeSize) {
          const isBull = cur.close >= cur.open;
          rbData.push({ ...cur, color: isBull ? upC : downC, borderColor: isBull ? upC : downC, wickColor: isBull ? upC : downC });
          cur = null;
        }
      }
      if (cur) {
        const c = cur as { time: number; open: number; high: number; low: number; close: number };
        const isBull = c.close >= c.open;
        rbData.push({ ...c, color: isBull ? upC : downC, borderColor: isBull ? upC : downC, wickColor: isBull ? upC : downC });
      }
      // TIME-INDEPENDENT, like Renko: evenly-spaced sequential timestamps.
      const rbStep = ink.intervalSec || 60;
      const rbT0 = displayData[0]?.time ?? 0;
      return rbData.map((r, i) => ({ ...r, time: rbT0 + i * rbStep }));
    }
    default:
      // bars, hlc-bars, hollow, orderflow-candles, candles, heikin-ashi — the
      // series options carry the look; the data is the display OHLC itself.
      return displayData.map(b => ({ ...b }));
  }
}

/** The Baseline series' base price: the middle display bar's close. */
export function baselineBasePrice(bars: readonly LegacyOhlcvTuple[], fallback: number): number {
  const display = mainDisplayBars("baseline", bars);
  return display[Math.floor(display.length / 2)]?.close ?? fallback;
}

/** The volume histogram's points — raw bars, never Heikin Ashi. */
export function volumeSeriesPoints(
  bars: readonly LegacyOhlcvTuple[],
  volUp: string,
  volDown: string,
): MainSeriesPoint[] {
  return bars.map(c => ({
    time:  c.time,
    value: c.volume,
    color: c.close >= c.open ? volUp : volDown,
  }));
}
