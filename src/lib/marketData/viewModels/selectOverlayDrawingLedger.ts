/**
 * WHAT IS ACTUALLY ON THE GLASS RIGHT NOW — FL-06, the layer ledger.
 *
 * ── THE DEFECT THIS CLOSES, FOUND ON THE SERVING CHART ─────────────────────
 *
 * BTCUSD, 5m, live tape, 2026-09-20. The chart canvas carried this, and the
 * trader could not see any of it:
 *
 *     data-value-candle       = DRAWN        (24 rungs, cog 81640.97)
 *     data-liquidity-weather  = DRAWN        (stage ERRATIC)
 *     data-imbalance-stack    = NO_STACK
 *     data-delta-divergence   = NO_SWING
 *
 * Four order-flow layers were switched ON. Two were painting. Two were
 * painting nothing — correctly, honestly, because there was nothing yet to
 * paint. From the trader's chair those two states are INDISTINGUISHABLE from
 * a broken feature, and the difference was written only into `data-` attributes
 * that exist so an outside probe can audit the canvas.
 *
 * That is the drawer-filed-receipt failure this product has already repaired
 * twice: a `title` is hover-only, an `aria-label` is screen-reader-only, and a
 * `data-` attribute is nobody's. Disclosure has to reach the GLASS.
 *
 * So this compiles ONE sentence per layer, and the sentence distinguishes the
 * three states that look identical on an empty chart:
 *
 *   OFF              — the trader turned it off. Nothing is wrong.
 *   NOTHING_TO_DRAW  — it is on, it ran, and it found nothing to mark.
 *   DRAWN            — it is on and it is painting; here is what.
 *
 * ── WHY IT DOES NOT RE-NARRATE ─────────────────────────────────────────────
 *
 * When a layer IS drawing, the sentence is the glass selector's OWN `label`,
 * passed through untouched. Every one of the four glass selectors already owns
 * the vocabulary for its own finding and already refuses to grade it in hue
 * (Build Order §9). A ledger that wrote its own summary of a drawn layer would
 * be a second owner for one pixel — Canon Weakness #1 — and the two would drift
 * apart on the first change to either.
 *
 * This module therefore owns EXACTLY ONE thing the glass selectors do not: the
 * sentence for why a layer that is ON is drawing NOTHING. That sentence has no
 * owner today, which is precisely why the trader never gets it.
 *
 * ── WHAT IS DELIBERATELY NOT IN THIS LEDGER ────────────────────────────────
 *
 * TWO layers, and the list says so. A list that looks complete and is not is
 * worse than a shorter list that names where it stops.
 *
 * The absorption field. It is not room-owned: `MainChart` computes it from the
 * VISIBLE bar range inside the draw loop, because the question it answers —
 * "was the effort in front of me paid for?" — is asked about whatever is on
 * screen. Nothing outside that loop can honestly speak for it, and it does not
 * need a proxy: it already captions itself on the chart ("EFFORT · VOLUME").
 * A ledger row about it here would be a guess wearing a reading's clothes.
 *
 * The big-trade bubbles. Same shape of limit, found the same way — by probing
 * the serving canvas and noticing this layer publishes no state at all. The
 * ROOM owns the switch (`bigTradesSimul && bigTradesOverlay`, and the
 * `big-trades` footprint mode), so an OFF row would be honest. But the bubbles
 * themselves come from `getRealBigTradeLevels`, which reads MainChart's own
 * per-bar tick accumulator — so the room can say it is switched on and still
 * not know whether a single bubble landed. Half a row is not a row. Reporting
 * ON while the layer silently painted nothing would manufacture exactly the
 * confusion this module was built to end.
 *
 * The first version of this file named only the absorption field here, which
 * made the note a false claim of completeness the moment anyone read it beside
 * the big-trade switch. Fixed by naming both.
 *
 * PURE. DETERMINISTIC. No React, no IO, no clock.
 */

import {
  selectStackedImbalanceGlass,
  type StackGlassVM,
} from "@/lib/marketData/viewModels/selectStackedImbalanceGlass";
import {
  selectValueCandleGlass,
  type ValueGlassVM,
} from "@/lib/marketData/viewModels/selectValueCandleGlass";
import {
  selectDeltaDivergenceGlass,
  type DivergenceGlassVM,
} from "@/lib/marketData/viewModels/selectDeltaDivergenceGlass";
import {
  selectLiquidityWeatherGlass,
  type WeatherGlassVM,
} from "@/lib/marketData/viewModels/selectLiquidityWeatherGlass";

export const OVERLAY_LEDGER_VERSION = "wm.overlay-drawing-ledger.v1" as const;

export type LayerId =
  | "VALUE_CANDLE"
  | "IMBALANCE_STACK"
  | "DELTA_DIVERGENCE"
  | "LIQUIDITY_WEATHER";

/**
 * THREE STATES, NOT TWO. "On but silent" is the state the glass could not
 * previously express, and it is the only one a trader mistakes for a fault.
 */
export type LayerState = "OFF" | "NOTHING_TO_DRAW" | "DRAWN";

export interface LedgerRow {
  readonly id: LayerId;
  /** What the trader calls it, matching the switch that turns it on. */
  readonly label: string;
  readonly state: LayerState;
  /**
   * The glass selector's own reason token ("NO_SWING", "UNMEASURED", …), or
   * "OFF". Published so a probe can compare this row against the canvas
   * without parsing a human sentence — the same contract `data-evr-state`
   * holds on the Effort panel.
   */
  readonly reason: string;
  /**
   * The sentence on the glass. When DRAWN this is the glass selector's own
   * `label`, verbatim. Otherwise it is this module's absence sentence.
   */
  readonly detail: string;
}

export interface OverlayDrawingLedgerVM {
  readonly version: typeof OVERLAY_LEDGER_VERSION;
  readonly rows: readonly LedgerRow[];
  /** How many layers are painting. */
  readonly drawnCount: number;
  /** How many are switched on — drawing or not. */
  readonly onCount: number;
  /** One line for a collapsed header. Counts only; never a verdict. */
  readonly headline: string;
  /** Names EVERY on-chart layer this ledger does not speak for. Two, today. */
  readonly note: string;
}

/**
 * The absence sentences. Keyed by layer AND by reason, because "it has not
 * measured yet" and "it measured and found nothing" are different facts about
 * the market and only one of them resolves by waiting.
 */
const OFF_DETAIL =
  "Switched off. Nothing is wrong — turn it on to have this layer read the tape.";

function stackDetail(vm: StackGlassVM): string {
  if (vm.drawn) return vm.label;
  if (vm.reason === "UNMEASURED") {
    return (
      "No signed prints have been divided into price levels yet, so there is " +
      "no stack to look for. This resolves as the tape fills in."
    );
  }
  return (
    "The levels have been measured and no run of imbalanced ones was long " +
    "enough to mark. An empty chart here is the finding, not a failure."
  );
}

function valueDetail(vm: ValueGlassVM): string {
  if (vm.drawn) return vm.label;
  return (
    "No sub-bar volume profile is carried for the bars in view, so the candle " +
    "has no rungs to draw. This resolves as the tape fills in."
  );
}

function divergenceDetail(vm: DivergenceGlassVM): string {
  if (vm.drawn) return vm.label;
  if (vm.reason === "UNMEASURED") {
    return (
      "Delta is not being measured against price swings yet, so there is " +
      "nothing to compare. This resolves as the tape fills in."
    );
  }
  return (
    "Price has not made two pivots to compare, so there is no swing that " +
    "delta could have failed to follow. Waiting is the right move."
  );
}

function weatherDetail(vm: WeatherGlassVM): string {
  if (vm.drawn) return vm.label;
  return (
    "No stage has been read from the tape yet, so there is no weather to " +
    "report. This resolves as the tape fills in."
  );
}

export interface OverlayDrawingLedgerInput {
  readonly valueCandleOn: boolean;
  readonly valueCandle: Parameters<typeof selectValueCandleGlass>[0];
  readonly imbalanceStackOn: boolean;
  readonly imbalanceStack: Parameters<typeof selectStackedImbalanceGlass>[0];
  readonly deltaDivergenceOn: boolean;
  readonly deltaDivergence: Parameters<typeof selectDeltaDivergenceGlass>[0];
  readonly liquidityWeatherOn: boolean;
  readonly liquidityWeather: Parameters<typeof selectLiquidityWeatherGlass>[0];
}

function row(
  id: LayerId,
  label: string,
  on: boolean,
  drawn: boolean,
  reason: string,
  detail: string,
): LedgerRow {
  if (!on) return { id, label, state: "OFF", reason: "OFF", detail: OFF_DETAIL };
  return {
    id,
    label,
    state: drawn ? "DRAWN" : "NOTHING_TO_DRAW",
    reason,
    detail,
  };
}

export function selectOverlayDrawingLedger(
  input: OverlayDrawingLedgerInput,
): OverlayDrawingLedgerVM {
  const value = selectValueCandleGlass(input.valueCandle);
  const stack = selectStackedImbalanceGlass(input.imbalanceStack);
  const divergence = selectDeltaDivergenceGlass(input.deltaDivergence);
  const weather = selectLiquidityWeatherGlass(input.liquidityWeather);

  const rows: readonly LedgerRow[] = [
    row("VALUE_CANDLE", "Value Candle", input.valueCandleOn, value.drawn,
      value.reason, valueDetail(value)),
    row("IMBALANCE_STACK", "Imbalance Stack", input.imbalanceStackOn, stack.drawn,
      stack.reason, stackDetail(stack)),
    row("DELTA_DIVERGENCE", "Delta Divergence", input.deltaDivergenceOn, divergence.drawn,
      divergence.reason, divergenceDetail(divergence)),
    row("LIQUIDITY_WEATHER", "Liquidity Weather", input.liquidityWeatherOn, weather.drawn,
      weather.reason, weatherDetail(weather)),
  ];

  const drawnCount = rows.filter(r => r.state === "DRAWN").length;
  const onCount = rows.filter(r => r.state !== "OFF").length;

  // COUNTS, NOT A GRADE. "2 of 4 drawing" is checkable against the canvas;
  // "order flow healthy" is not, and would be a verdict this module has no
  // standing to reach.
  const headline =
    onCount === 0
      ? "All four order-flow layers are switched off."
      : `${drawnCount} of the ${onCount} order-flow layers switched on ` +
        `${drawnCount === 1 ? "is" : "are"} drawing right now.`;

  return {
    version: OVERLAY_LEDGER_VERSION,
    rows,
    drawnCount,
    onCount,
    headline,
    note:
      "Two on-chart layers are not in this list: the absorption field and the " +
      "big-trade bubbles. Both are read inside the draw loop — one from the " +
      "bars in view, one from each bar's own prints — so nothing out here can " +
      "say what they painted. The absorption field captions itself on the chart.",
  };
}

export default selectOverlayDrawingLedger;
