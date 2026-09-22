"use client";

/**
 * LiquidityWeatherView — Canon Asset 08, LIQUIDITY WEATHER, as a full view.
 *
 * The visual-debt register's 2026-09-02 row called this "NOT STARTED (no
 * licensed Level 2 depth provider wired yet)". That claim is STALE and this
 * view is the correction: the owner (`selectLiquidityWeather`) measures
 * liquidity as COST OF TRAVEL — volume spent per spread of price movement —
 * from the room's own per-trade tape. It needs no order book, no depth feed,
 * no Level 2 subscription, because it reads what the market DID rather than
 * what resting orders claim they might do.
 *
 * This view is deliberately THIN, on the Gravity/Worksheet pattern: it gives
 * the reading its room (candles stay visible above, 42/58), states the stage
 * verdict as a headline, and mounts the ONE renderer. It derives no market
 * truth of its own.
 *
 * WHAT A "LIQUIDITY HEATMAP" MOCKUP MIGHT ASK FOR THAT THIS VIEW REFUSES
 *
 *   · a resting-order book heatmap — no depth provider is wired, and drawing
 *     imagined resting size from trades would be a fabricated book.
 *   · a per-price liquidity surface — the owner segments by TIME, because
 *     cost of travel is a rate; smearing it across price would invent a
 *     distribution the tape never stated.
 *   · buyer-vs-seller liquidity attribution — the module NEVER reads
 *     `side` (`requiresDisclosure: false` is structural, not situational).
 *     Who paid the cost belongs to `selectAggressorFlow`.
 *
 * ONE VOICE FOR THE VERDICT. The headline repeats `vm.stage` and `vm.detail`
 * VERBATIM from the compiler — this view composes no sentence of its own
 * about the market, so it can never disagree with the drawer panel or the
 * on-glass band reading the same VM.
 *
 * UNMEASURED IS A FIRST-CLASS RENDER: the headline carries the compiler's
 * own absence sentence and the panel explains what a reading needs. No zeros.
 */

import * as React from "react";
import type { LiquidityWeatherVM } from "@/lib/marketData/viewModels/selectLiquidityWeather";
import LiquidityWeatherPanel from "@/components/experience/LiquidityWeatherPanel";

const GOLD = "#d4af37";
const GOLD_DIM = "#c9a55c";
const MUTED = "#8a8271";
const HAIR = "rgba(139,106,41,0.22)";
const PRICE = "#4FA3E0";
const WARN = "#d08a4a";

export interface LiquidityWeatherViewProps {
  readonly vm: LiquidityWeatherVM;
  readonly symbol?: string;
  readonly timeframe?: string;
}

export function LiquidityWeatherView({
  vm,
  symbol,
  timeframe,
}: LiquidityWeatherViewProps): React.ReactElement {
  const headlineTone =
    vm.stage === "UNMEASURED"
      ? MUTED
      : vm.stage === "ERRATIC"
        ? WARN
        : vm.stage === "AIRLESS" || vm.stage === "THINNING"
          ? PRICE
          : GOLD_DIM;

  return (
    <section
      aria-label={`Liquidity weather for ${symbol ?? "the current symbol"}`}
      data-testid="liquidity-weather-view"
      style={{ padding: "12px 14px 16px", display: "flex", flexDirection: "column", gap: 12 }}
    >
      <header style={{ display: "flex", alignItems: "baseline", gap: 10, flexWrap: "wrap" }}>
        <span style={{ fontSize: 12, letterSpacing: 1, color: GOLD, textTransform: "uppercase", fontWeight: 700 }}>
          Liquidity · Cost of Travel
        </span>
        <span style={{ fontSize: 10, letterSpacing: 0.6, color: MUTED, textTransform: "uppercase" }}>
          Canon Asset 08
        </span>
        <span style={{ fontSize: 11, color: MUTED, marginLeft: "auto" }}>
          {symbol ? `${symbol} · ` : ""}
          {timeframe ? `${timeframe} · ` : ""}
          loaded tape window
        </span>
      </header>

      {/* THE VERDICT, IN THE COMPILER'S OWN WORDS. `stage` is the state,
          `detail` is the one honest line — both carried verbatim so this
          surface can never tell a different story than the drawer panel or
          the on-glass band drawn from the same VM. */}
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
          {vm.stage}
        </span>
        <span style={{ fontSize: 12, color: MUTED, lineHeight: 1.5, flex: "1 1 260px" }}>
          {vm.detail}
        </span>
      </div>

      {/* The ONE renderer of the Liquidity Weather reading. Mounting it here
          rather than redrawing is the point: one segmentation, one median,
          one stage — the order-flow drawer and this view can never disagree
          about them. */}
      <LiquidityWeatherPanel vm={vm} symbol={symbol} window="loaded tape window" />

      <footer style={{ fontSize: 10, color: MUTED, lineHeight: 1.5 }}>
        Compiled from the room&apos;s own per-trade tape by selectLiquidityWeather — the
        same prints the candles above are drawn from. Cost is measured as volume per
        spread of price travel; segments where price did not travel are shown stalled,
        never divided by zero. This reading never inspects the aggressor side; who paid
        the cost belongs to the aggressor-flow reading. No order-book depth is drawn,
        because none is measured.
      </footer>
    </section>
  );
}

export default LiquidityWeatherView;
