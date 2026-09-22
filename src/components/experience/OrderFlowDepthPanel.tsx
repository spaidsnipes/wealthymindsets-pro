"use client";

/**
 * OrderFlowDepthPanel — the depth behind the chart room's ORDER FLOW equipment,
 * and since 2026-09-22 the ONE W DOOR's interior.
 *
 * ── WHAT THIS SUBTRACTS ───────────────────────────────────────────────────
 * Five finished inventions — value candle, absorption anatomy, delta
 * divergence, liquidity weather, stacked imbalance — were mounted in exactly
 * ONE place each: a long scrolling column inside a legacy side panel. The room
 * where the trader actually spends their time could not show any of them.
 *
 * This is not a sixth card. It is the DOOR those five never had.
 *
 * ── ONE W DOOR (HOUSE PLAN bolt-on, FIRST CURRENT BUILD ORDER #5) ─────────
 * The bolt-on names the family this door serves — Market Intelligence:
 * FLOW · LIQUIDITY · VOLUME/PROFILE · STRUCTURE · MEMORY/CONTEXT — and
 * forbids keeping Smart Money and Order Flow as separate warehouses. So:
 *
 *   1. Every reading below wears the family WING it answers for. The wings
 *      are labels on the readings, not sections that reorder them, because
 *      constraint order (see below) is this panel's older law and the wings
 *      interleave across it. A tag tells the truth without moving furniture.
 *   2. The wings with no installed instrument — STRUCTURE and MEMORY/CONTEXT
 *      — are CONFESSED at full depth in one line, not faked with empty tiles.
 *      A named absence is intelligence; a hidden one is a hole the trader
 *      finds by needing it.
 *   3. The legacy Smart Money read-out is reached THROUGH this door
 *      (`onOpenReadout`), not through a second rail entry. The prop is
 *      optional because only the chart room owns that panel; a room without
 *      it (the deck) simply does not offer the stair, which is honest —
 *      offering a stair to a floor a room does not have is the painted-door
 *      defect the direct-equipment Sentinel exists to catch.
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

/**
 * The Market Intelligence family, in the bolt-on's own order. Named once so
 * the wing tags and the confession line cannot drift into two spellings.
 */
export const MARKET_INTELLIGENCE_WINGS = {
  FLOW: "Flow",
  LIQUIDITY: "Liquidity",
  VOLUME_PROFILE: "Volume/Profile",
  STRUCTURE: "Structure",
  MEMORY_CONTEXT: "Memory/Context",
} as const;

/**
 * The two wings with no installed instrument today, confessed by name at full
 * depth. When an instrument lands in one, remove it here and mount the
 * reading above — the sentinel pins this list so silent staleness fails loud.
 */
const UNBUILT_WINGS: readonly string[] = [
  MARKET_INTELLIGENCE_WINGS.STRUCTURE,
  MARKET_INTELLIGENCE_WINGS.MEMORY_CONTEXT,
];

/** One reading, wearing the family wing it answers for. */
function Wing({
  name,
  children,
}: {
  readonly name: string;
  readonly children: React.ReactNode;
}): React.ReactElement {
  return (
    <div data-of-wing={name}>
      <div
        style={{
          fontSize: 9,
          letterSpacing: "0.14em",
          textTransform: "uppercase",
          opacity: 0.55,
          marginBottom: 4,
        }}
      >
        {name}
      </div>
      {children}
    </div>
  );
}

export interface OrderFlowDepthPanelProps {
  readonly readings: OrderFlowReadingSet;
  readonly symbol: string;
  readonly unabridged: boolean;
  /**
   * Opens the legacy Smart Money read-out — the same `smartMoneyOpen` boolean
   * the toolbar button flips, handed in by the ONE room that owns it. Absent
   * in rooms that have no such panel; no stair is drawn there.
   */
  readonly onOpenReadout?: () => void;
}

export function OrderFlowDepthPanel({
  readings,
  symbol,
  unabridged,
  onOpenReadout,
}: OrderFlowDepthPanelProps): React.ReactElement {
  return (
    <div style={{ display: "grid", gap: 12 }} data-testid="order-flow-depth">
      {/*
        CONSTRAINT ORDER, not loudness — the same order the preview sentence was
        chosen in, so the headline is always the first thing the trader reads
        underneath it. The wings interleave across this order on purpose: see
        the header note.
      */}
      <Wing name={MARKET_INTELLIGENCE_WINGS.VOLUME_PROFILE}>
        <StackedImbalancePanel vm={readings.stackedImbalance} symbol={symbol} window={WINDOW_LABEL} />
      </Wing>
      <Wing name={MARKET_INTELLIGENCE_WINGS.LIQUIDITY}>
        <AbsorptionAnatomyPanel vm={readings.absorption} symbol={symbol} window={WINDOW_LABEL} />
      </Wing>
      {unabridged ? (
        <>
          <Wing name={MARKET_INTELLIGENCE_WINGS.FLOW}>
            <DeltaDivergencePanel vm={readings.deltaDivergence} symbol={symbol} window={WINDOW_LABEL} />
          </Wing>
          <Wing name={MARKET_INTELLIGENCE_WINGS.LIQUIDITY}>
            <LiquidityWeatherPanel vm={readings.liquidityWeather} symbol={symbol} window={WINDOW_LABEL} />
          </Wing>
          <Wing name={MARKET_INTELLIGENCE_WINGS.VOLUME_PROFILE}>
            <ValueCandlePanel vm={readings.valueCandle} symbol={symbol} window={WINDOW_LABEL} />
          </Wing>
          {/*
            THE CONFESSED WINGS. One line, no tiles, no controls — a control
            for an uninstalled instrument would be the painted door.
          */}
          <div
            data-testid="order-flow-unbuilt-wings"
            style={{ fontSize: 10, opacity: 0.5 }}
          >
            No instrument installed yet in {UNBUILT_WINGS.join(" or ")}.
          </div>
          {onOpenReadout ? (
            <button
              type="button"
              data-testid="order-flow-open-readout"
              onClick={onOpenReadout}
              style={{
                justifySelf: "start",
                fontSize: 11,
                padding: "8px 12px",
                minHeight: 32,
                cursor: "pointer",
              }}
            >
              Full read-out — Smart money panel
            </button>
          ) : null}
        </>
      ) : null}
    </div>
  );
}

export default OrderFlowDepthPanel;
