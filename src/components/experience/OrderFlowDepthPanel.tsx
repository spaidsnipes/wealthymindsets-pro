"use client";

/**
 * OrderFlowDepthPanel — the depth behind the chart room's ORDER FLOW equipment.
 *
 * ── WHAT THIS SUBTRACTS ───────────────────────────────────────────────────
 * Five finished inventions — value candle, absorption anatomy, delta
 * divergence, liquidity weather, stacked imbalance — were mounted in exactly
 * ONE place each: a long scrolling column inside a legacy side panel. The room
 * where the trader actually spends their time could not show any of them.
 *
 * This is not a sixth card. It is the DOOR those five never had.
 *
 * ── WHY IT TAKES READINGS AND COMPILES NOTHING ────────────────────────────
 * The room compiles the five ONCE, and hands the finished objects here and to
 * the legacy panel alike. If this component called the selectors itself, the
 * drawer and the panel could render two reads of a moving tape taken at two
 * moments — the second-brain failure wearing a different panel.
 *
 * ── WHY DEPTH CHANGES LENGTH AND NEVER CONTENT ────────────────────────────
 * The drawer shows the readings that CONSTRAIN A DECISION and stops; FULL shows
 * all five. Both render the SAME objects, which is why a trader cannot press
 * deeper and be told something different. Depth buys room, never a second
 * opinion. Nothing here is a `<details>`: entering is the room's grammar, not
 * a widget's.
 */

import React from "react";

import AbsorptionAnatomyPanel from "@/components/experience/AbsorptionAnatomyPanel";
import DeltaDivergencePanel from "@/components/experience/DeltaDivergencePanel";
import LiquidityWeatherPanel from "@/components/experience/LiquidityWeatherPanel";
import StackedImbalancePanel from "@/components/experience/StackedImbalancePanel";
import ValueCandlePanel from "@/components/experience/ValueCandlePanel";

import type { OrderFlowReadingSet } from "@/lib/marketData/useOrderFlowReadings";

/** The tape window every one of these five reads. Named once. */
const WINDOW_LABEL = "session tape";

export interface OrderFlowDepthPanelProps {
  readonly readings: OrderFlowReadingSet;
  readonly symbol: string;
  readonly unabridged: boolean;
}

export function OrderFlowDepthPanel({
  readings,
  symbol,
  unabridged,
}: OrderFlowDepthPanelProps): React.ReactElement {
  return (
    <div style={{ display: "grid", gap: 12 }} data-testid="order-flow-depth">
      {/*
        CONSTRAINT ORDER, not loudness — the same order the preview sentence was
        chosen in, so the headline is always the first thing the trader reads
        underneath it.
      */}
      <StackedImbalancePanel vm={readings.stackedImbalance} symbol={symbol} window={WINDOW_LABEL} />
      <AbsorptionAnatomyPanel vm={readings.absorption} symbol={symbol} window={WINDOW_LABEL} />
      {unabridged ? (
        <>
          <DeltaDivergencePanel vm={readings.deltaDivergence} symbol={symbol} window={WINDOW_LABEL} />
          <LiquidityWeatherPanel vm={readings.liquidityWeather} symbol={symbol} window={WINDOW_LABEL} />
          <ValueCandlePanel vm={readings.valueCandle} symbol={symbol} window={WINDOW_LABEL} />
        </>
      ) : null}
    </div>
  );
}

export default OrderFlowDepthPanel;
