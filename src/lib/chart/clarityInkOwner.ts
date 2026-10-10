/**
 * CLARITY INK OWNER — the ONE owner of the native candle series' ink while
 * Clarity Candles (F05A) may be on.
 *
 * Founder defect (2026-10-10): "Gold Clarity Candles blink or revert to
 * red/green." Root cause: three writers fought over the same six series
 * colours —
 *   1. the appearance effect re-applied the trader's red/green on EVERY
 *      `chartSettings` identity change, and the dashboard built a new settings
 *      object on every render (every live tick re-renders it), clearing the
 *      "hidden" flag each time;
 *   2. every new series (symbol / timeframe change) was born red/green and
 *      only hidden after the Clarity layer's next frame;
 *   3. one paint frame with no Clarity candle drawn (bars swapping between
 *      the data ref and the series) restored red/green immediately.
 * Each writer handed the library one frame of red/green under the gold →
 * blink, and on a busy tape the blink was continuous.
 *
 * Now: one owner decides. While Clarity is on and has painted, any re-apply of
 * appearance keeps the series transparent; a new series is born transparent
 * when Clarity will paint it; the native ink comes back only when Clarity is
 * turned off, the layer faults, or it has drawn nothing for a sustained run of
 * frames (§XLIX: the face is never blank because a layer did not run).
 */

import { CANDLE_DOWN_DEFAULT, CANDLE_UP_DEFAULT } from "@/lib/chart/marketFieldMaterial";

export interface CandleInk {
  upColor: string;
  downColor: string;
  borderUpColor: string;
  borderDownColor: string;
  wickUpColor: string;
  wickDownColor: string;
}

export interface CandleInkSettings {
  candleUp?: string;
  candleDown?: string;
  borderUp?: string;
  borderDown?: string;
  wickUp?: string;
  wickDown?: string;
}

export interface InkSeries { applyOptions(o: Record<string, unknown>): void }

const CLEAR = "rgba(0,0,0,0)";
export const CLARITY_HIDDEN_INK: Readonly<CandleInk> = Object.freeze({
  upColor: CLEAR, downColor: CLEAR, borderUpColor: CLEAR, borderDownColor: CLEAR, wickUpColor: CLEAR, wickDownColor: CLEAR,
});

/** The trader's own six candle channels, with the room's fallbacks. */
export function traderCandleInk(s: CandleInkSettings | null | undefined): CandleInk {
  const up = s?.candleUp ?? CANDLE_UP_DEFAULT;
  const down = s?.candleDown ?? CANDLE_DOWN_DEFAULT;
  return {
    upColor: up,
    downColor: down,
    borderUpColor: s?.borderUp ?? up,
    borderDownColor: s?.borderDown ?? down,
    wickUpColor: s?.wickUp ?? up,
    wickDownColor: s?.wickDown ?? down,
  };
}

export function isHiddenInk(o: Partial<CandleInk>): boolean {
  return o.upColor === CLEAR && o.downColor === CLEAR && o.borderUpColor === CLEAR
    && o.borderDownColor === CLEAR && o.wickUpColor === CLEAR && o.wickDownColor === CLEAR;
}

/**
 * Frames with bars on hand but no Clarity candle drawn before the native ink
 * returns. ~0.5 s at 60 fps: long enough to ride out a series/data-ref swap,
 * short enough that a genuinely silent layer never leaves the face blank.
 */
export const CLARITY_EMPTY_FRAMES_BEFORE_RESTORE = 30;

/**
 * Content key for an appearance-settings object: two objects with the same
 * values share a key, so a consumer keyed on it re-runs only when a value
 * actually changed (never on a parent re-render that rebuilt the object).
 */
export function settingsContentKey(s: object | null | undefined): string {
  if (!s) return "";
  try { return JSON.stringify(s); } catch { return String(Math.random()); }
}

export class ClarityInkOwner {
  /** The series currently carries CLARITY_HIDDEN_INK. */
  hidden = false;
  private emptyFrames = 0;

  /**
   * Ink a NEW candle series is born with. Hidden whenever Clarity is on — even
   * with no bars yet: a series born empty took the trader's ink, and the first
   * live print painted one red/green candle before Clarity's next frame
   * (serving 135eec5, BTC-USD 15s with no history: one frame per rebuild,
   * 228–1636 red/green px). `hasBars` is kept for the receipt only; an empty
   * series shows nothing either way, and a Clarity layer that never paints is
   * still caught by the empty-frame restore below.
   */
  inkForNewSeries(settings: CandleInkSettings | null | undefined, clarityOn: boolean, _hasBars: boolean): CandleInk {
    this.emptyFrames = 0;
    if (clarityOn) { this.hidden = true; return { ...CLARITY_HIDDEN_INK }; }
    this.hidden = false;
    return traderCandleInk(settings);
  }

  /** The appearance effect re-applies settings. Never un-hides a painting Clarity. */
  applySettings(series: InkSeries, settings: CandleInkSettings | null | undefined, clarityOn: boolean): void {
    if (clarityOn && this.hidden) { series.applyOptions({ ...CLARITY_HIDDEN_INK }); return; }
    series.applyOptions({ ...traderCandleInk(settings) });
    this.hidden = false;
  }

  /** Clarity drew `drawn` candles this frame out of `barCount` on hand. */
  afterFrame(series: InkSeries, settings: CandleInkSettings | null | undefined, drawn: number, barCount: number): void {
    if (drawn > 0) {
      this.emptyFrames = 0;
      if (!this.hidden) {
        try { series.applyOptions({ ...CLARITY_HIDDEN_INK }); this.hidden = true; } catch { /* next frame */ }
      }
      return;
    }
    // Nothing on hand: nothing for either painter to draw — no flip.
    if (barCount <= 0) return;
    this.emptyFrames++;
    if (this.emptyFrames >= CLARITY_EMPTY_FRAMES_BEFORE_RESTORE) this.restore(series, settings);
  }

  /** Clarity turned off, or the layer faulted: the trader's ink returns now. */
  restore(series: InkSeries, settings: CandleInkSettings | null | undefined): void {
    if (!this.hidden) return;
    try {
      series.applyOptions({ ...traderCandleInk(settings) });
      this.hidden = false;
      this.emptyFrames = 0;
    } catch { /* series rebuilding; stay hidden so the next frame retries */ }
  }
}
