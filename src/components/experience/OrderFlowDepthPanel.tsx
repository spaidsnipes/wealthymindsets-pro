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
 *      — are CONFESSED at every depth in one line, not faked with empty
 *      tiles. A named absence is intelligence; a hidden one is a hole the
 *      trader finds by needing it. (Every depth, not just full: the chart
 *      room never reaches full by canon — see the note above the confession.)
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
import { MARKET_INTELLIGENCE_WINGS, UNBUILT_WINGS, type MarketIntelligenceWing } from "@/lib/workspace/marketIntelligence";

/** The tape window every one of these five reads. Named once. */
const WINDOW_LABEL = "session tape";

/*
 * The Market Intelligence family and its unbuilt wings are OWNED by
 * `lib/workspace/marketIntelligence.ts` (Garden 16 §14/§15) — the W tile's
 * hint in the equipment registry is derived from the same two constants, so
 * the tile cannot promise a wing this panel does not mount. Re-exported here
 * so existing readers keep one import path.
 */
export { MARKET_INTELLIGENCE_WINGS };

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
  /**
   * The STRUCTURE and MEMORY/CONTEXT instruments a room installs from its own
   * chart layers (the chart room: the same switches Chart tools holds). A
   * room that hands none keeps confessing those wings.
   */
  readonly structureInstruments?: React.ReactNode;
  readonly memoryInstruments?: React.ReactNode;
}

export function OrderFlowDepthPanel({
  readings,
  symbol,
  unabridged,
  onOpenReadout,
  structureInstruments,
  memoryInstruments,
}: OrderFlowDepthPanelProps): React.ReactElement {
  // Confessed per room: a wing this room installs is not "not installed".
  const installedHere: MarketIntelligenceWing[] = [
    ...(structureInstruments ? [MARKET_INTELLIGENCE_WINGS.STRUCTURE] : []),
    ...(memoryInstruments ? [MARKET_INTELLIGENCE_WINGS.MEMORY_CONTEXT] : []),
  ];
  const unbuiltHere = UNBUILT_WINGS.filter((w) => !installedHere.includes(w));
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
        </>
      ) : null}
      {/*
        THE CONFESSED WINGS AND THE STAIR — at EVERY depth, deliberately
        OUTSIDE the `unabridged` gate above.

        MEASURED 2026-09-22 in the serving worker: the chart room refuses
        `stage=full` by canon (Last Mile 2026-09-18 — "chart stays"; no
        `onEnter` handed down), so on /charts `unabridged` is ALWAYS false and
        anything gated on it is a door that tests green and never appears —
        the painted-door defect from the other direction. The drawer is that
        room's deepest stage; the stair and the confession must stand at its
        foot or they stand nowhere. The deck still reaches `unabridged` and
        renders these same lines there — same objects, one more depth.
      */}
      {structureInstruments ? (
        <Wing name={MARKET_INTELLIGENCE_WINGS.STRUCTURE}>{structureInstruments}</Wing>
      ) : null}
      {memoryInstruments ? (
        <Wing name={MARKET_INTELLIGENCE_WINGS.MEMORY_CONTEXT}>{memoryInstruments}</Wing>
      ) : null}
      {unbuiltHere.length ? (
        <div
          data-testid="order-flow-unbuilt-wings"
          style={{ fontSize: 10, opacity: 0.5 }}
        >
          No instrument installed yet in {unbuiltHere.join(" or ")}.
        </div>
      ) : null}
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
    </div>
  );
}

export default OrderFlowDepthPanel;
