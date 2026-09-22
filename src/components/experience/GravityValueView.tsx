"use client";

/**
 * GravityValueView — Canon Asset 02, GRAVITY / VALUE CENTER, as a full view.
 *
 * The Founder's Asset 02 mockup gives the Value Center of Gravity a room of its
 * own: the one number in the largest type, the formula beneath it, and the
 * migration verdict as the headline. Everything on that mockup that has a real
 * owner in this repo is already compiled by `selectValueCandle` and already
 * drawn by `ValueCandlePanel` — so this view is deliberately THIN. It gives the
 * reading the microstructure split (candles stay visible above, 42/58), states
 * the verdict as a headline, and mounts the ONE renderer. It derives no market
 * truth of its own.
 *
 * WHAT THE MOCKUP ASKED FOR THAT THIS VIEW REFUSES, AND WHY
 *
 *   · per-bar historical "gravity-adjusted OHLC" — there is no owner for a
 *     within-bar distribution of PAST bars (the tape window is the present).
 *     Drawing it from candle geometry would be a fabricated distribution.
 *   · a fixed 68%/70% value area — the band here is measured (CoG ± 1
 *     volume-weighted σ) and `concentration` is an observation, never a target
 *     echoed back. See selectValueCandle's header, lie #1.
 *   · "who moved value" attribution — a print's price and size say where value
 *     is, not who put it there. That question belongs to `selectAggressorFlow`.
 *
 * ONE VOICE FOR THE VERDICT. The headline repeats `vm.migration` and
 * `vm.migrationDetail` VERBATIM from the compiler — this view composes no
 * sentence of its own about the market, so it can never disagree with the
 * panel below it or with any other surface reading the same VM.
 *
 * UNMEASURED IS A FIRST-CLASS RENDER: the headline carries the compiler's own
 * absence sentence and the panel explains what a CoG needs. No zeros.
 */

import * as React from "react";
import type { ValueCandleVM } from "@/lib/marketData/viewModels/selectValueCandle";
import { ValueCandlePanel } from "@/components/experience/ValueCandlePanel";

const GOLD = "#d4af37";
const GOLD_DIM = "#c9a55c";
const MUTED = "#8a8271";
const HAIR = "rgba(139,106,41,0.22)";
const PRICE = "#4FA3E0";

export interface GravityValueViewProps {
  readonly vm: ValueCandleVM;
  readonly symbol?: string;
  readonly timeframe?: string;
}

export function GravityValueView({
  vm,
  symbol,
  timeframe,
}: GravityValueViewProps): React.ReactElement {
  const headlineTone =
    vm.migration === "LAGGED" ? PRICE : vm.migration === "ALIGNED" ? GOLD_DIM : MUTED;

  return (
    <section
      aria-label={`Gravity — value center for ${symbol ?? "the current symbol"}`}
      data-testid="gravity-value-view"
      style={{ padding: "12px 14px 16px", display: "flex", flexDirection: "column", gap: 12 }}
    >
      <header style={{ display: "flex", alignItems: "baseline", gap: 10, flexWrap: "wrap" }}>
        <span style={{ fontSize: 12, letterSpacing: 1, color: GOLD, textTransform: "uppercase", fontWeight: 700 }}>
          Gravity · Value Center
        </span>
        <span style={{ fontSize: 10, letterSpacing: 0.6, color: MUTED, textTransform: "uppercase" }}>
          Canon Asset 02
        </span>
        <span style={{ fontSize: 11, color: MUTED, marginLeft: "auto" }}>
          {symbol ? `${symbol} · ` : ""}
          {timeframe ? `${timeframe} · ` : ""}
          loaded tape window
        </span>
      </header>

      {/* THE VERDICT, IN THE COMPILER'S OWN WORDS. `migration` is the state,
          `migrationDetail` is the one honest line — both carried verbatim so
          this surface can never tell a different story than the panel below
          or the on-glass band the chart draws from the same VM. */}
      <div
        style={{
          border: `1px solid ${HAIR}`,
          borderRadius: 10,
          padding: "10px 14px",
          background: "rgba(255,255,255,0.015)",
          display: "flex",
          alignItems: "baseline",
          gap: 10,
          flexWrap: "wrap",
        }}
      >
        <span
          style={{
            fontSize: 16,
            letterSpacing: 1.2,
            color: headlineTone,
            textTransform: "uppercase",
            fontWeight: 700,
          }}
        >
          {vm.migration}
        </span>
        <span style={{ fontSize: 12, color: MUTED, lineHeight: 1.5, flex: "1 1 260px" }}>
          {vm.migrationDetail}
        </span>
      </div>

      {/* The ONE renderer of the Value Candle. Mounting it here rather than
          redrawing is the point: one distribution, one band, one CoG — the
          Smart Money drawer and this view can never disagree about them. */}
      <ValueCandlePanel vm={vm} symbol={symbol} window="loaded tape window" />

      <footer style={{ fontSize: 10, color: MUTED, lineHeight: 1.5 }}>
        Compiled from the room&apos;s own per-trade tape by selectValueCandle — the same
        prints the candles above are drawn from. The band is measured (CoG ± 1
        volume-weighted σ), never a target percentage. This view has no opinion
        about who was buying; that question belongs to the aggressor-flow reading.
      </footer>
    </section>
  );
}

export default GravityValueView;
