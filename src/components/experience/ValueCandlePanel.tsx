"use client";

/**
 * ValueCandlePanel — the WM Value Candle, drawn.
 *
 * The Founder's mockup for this surface carries one number in the largest type
 * on the panel — the Value Center of Gravity — and beneath it the formula that
 * produced it. That pairing is the design: a headline number is allowed to be
 * large exactly when the reader can see, without leaving the panel, how it was
 * computed. There is no model here to trust or distrust; there is an average
 * and its own arithmetic printed underneath it.
 *
 * WHAT IS DRAWN, AND WHAT EACH MARK OWNS
 *
 *   · the traded-volume distribution — one horizontal bar per price bin, length
 *     proportional to the volume that printed there. Bins inside the value band
 *     are gold; bins outside it are muted. Nothing is smoothed and no bin is
 *     invented: `selectValueCandle` emits only bins that actually traded.
 *   · the value band — a shaded region, Center of Gravity ± one volume-weighted
 *     standard deviation.
 *   · the Center of Gravity — one gold line across the band.
 *   · the last print — a separate marker, so the distance between price and
 *     value is a VISIBLE gap rather than a word.
 *
 * TWO NUMBERS, NOT ONE. `concentration` (how much volume is inside the band) is
 * rendered beside `bandCoverage` (how wide the band had to be) because either
 * alone can flatter. A hollow two-sided auction reports 100% concentration
 * truthfully; only the band width exposes that it has no value area worth the
 * name. See selectValueCandle.test.ts, "cannot let a hollow two-sided auction
 * LOOK tight".
 *
 * UNMEASURED IS A FIRST-CLASS RENDER. With no prints the panel draws no candle
 * and no zero — it says value cannot be located and names what is missing. A
 * drawn axis with an empty distribution would read as "value is everywhere",
 * which is a claim this module has no evidence for.
 *
 * Pure display: consumes a ValueCandleVM and derives no market truth.
 */

import * as React from "react";
import type { ValueCandleVM } from "@/lib/marketData/viewModels/selectValueCandle";

const GOLD = "#d4af37";
const GOLD_DIM = "#c9a55c";
const MUTED = "#8a8271";
const TEXT = "#d8cfb8";
const HAIR = "rgba(139,106,41,0.22)";
const BAND = "rgba(212,175,55,0.10)";
const PRICE = "#4FA3E0";

export interface ValueCandlePanelProps {
  readonly vm: ValueCandleVM;
  /** Instrument label for the header. Optional — the panel is honest without it. */
  readonly symbol?: string;
  /** What window these prints came from, e.g. "session tape". */
  readonly window?: string;
  /**
   * Set by a SURFACE that has already declared the missing input above this
   * panel and listed this reading among the ones it blocks.
   *
   * Observed live 2026-09-17: the Smart Money drawer grew a MISSING INPUT
   * banner naming the absent feed once and listing the five readings that
   * depend on it — and this panel went on printing its own paragraph about
   * the same absence directly underneath, so the trader still read the bad
   * news twice. The paragraph is not wrong; it is redundant IN THAT CONTEXT
   * and nowhere else.
   *
   * So this is a prop and not a rewrite. Standing alone — on any surface with
   * no banner over it — the panel must still say what is missing in full, and
   * the default keeps that. It only shortens when a caller takes ownership of
   * the statement, which is the same discipline as `selectMissingTapeBanner`
   * passing the sentence through verbatim: one fact, one voice, and the voice
   * is whichever one is closest to the whole picture.
   */
  readonly absenceDeclaredAbove?: boolean;
}

function Reading({
  label,
  value,
  note,
  tone,
}: {
  label: string;
  value: string;
  note?: string;
  tone?: string;
}): React.ReactElement {
  return (
    <div style={{ minWidth: 104 }}>
      <div style={{ fontSize: 10, letterSpacing: 0.6, color: MUTED, textTransform: "uppercase" }}>
        {label}
      </div>
      <div style={{ fontSize: 15, color: tone ?? TEXT, fontVariantNumeric: "tabular-nums", lineHeight: 1.35 }}>
        {value}
      </div>
      {note ? (
        <div style={{ fontSize: 10, color: MUTED, lineHeight: 1.3 }}>{note}</div>
      ) : null}
    </div>
  );
}

export function ValueCandlePanel({
  vm,
  symbol,
  window: windowLabel,
  absenceDeclaredAbove = false,
}: ValueCandlePanelProps): React.ReactElement {
  const header = (
    <div style={{ display: "flex", alignItems: "baseline", gap: 10, marginBottom: 10, flexWrap: "wrap" }}>
      <span style={{ fontSize: 11, letterSpacing: 0.6, color: GOLD_DIM, textTransform: "uppercase" }}>
        WM Value Candle · Center of Gravity
      </span>
      <span style={{ fontSize: 11, color: MUTED, marginLeft: "auto" }}>
        {symbol ? `${symbol} · ` : ""}
        {windowLabel ?? "observed prints"}
      </span>
    </div>
  );

  if (!vm.measured) {
    return (
      <section
        aria-label="WM Value Candle"
        data-testid="value-candle-panel"
        style={{
          border: `1px solid ${HAIR}`,
          borderRadius: 10,
          padding: "12px 14px",
          background: "rgba(255,255,255,0.015)",
        }}
      >
        {header}
        <div style={{ fontSize: 12, color: MUTED, fontStyle: "italic", lineHeight: 1.5 }}>
          {absenceDeclaredAbove
            ? "Blocked by the missing input named at the top of this drawer."
            : `${vm.migrationDetail}. A Center of Gravity needs prints that carry both a price and a size; none have been observed in this window.`}
        </div>
      </section>
    );
  }

  // Geometry. The chart is drawn top = high, bottom = low, so the price axis
  // reads the way a chart does.
  const H = 190;
  const W = 260;
  const lo = vm.low!;
  const hi = vm.high!;
  const span = hi - lo || 1;
  const y = (price: number) => H - ((price - lo) / span) * H;

  const maxShare = vm.bins.reduce((m, b) => (b.share > m ? b.share : m), 0) || 1;
  const binH = Math.max(2, H / Math.max(1, vm.bins.length) - 1);

  const bandTop = y(Math.min(hi, vm.valueHigh!));
  const bandBottom = y(Math.max(lo, vm.valueLow!));
  const cogY = y(vm.centerOfGravity!);
  const lastY = y(vm.last!);

  const migrationTone = vm.migration === "LAGGED" ? PRICE : GOLD_DIM;

  return (
    <section
      aria-label="WM Value Candle"
      data-testid="value-candle-panel"
      style={{
        border: `1px solid ${HAIR}`,
        borderRadius: 10,
        padding: "12px 14px",
        background: "rgba(255,255,255,0.015)",
      }}
    >
      {header}

      <div style={{ display: "flex", gap: 18, flexWrap: "wrap", alignItems: "flex-start" }}>
        <svg
          width={W}
          height={H}
          viewBox={`0 0 ${W} ${H}`}
          role="img"
          aria-label={`Traded volume distribution between ${lo} and ${hi}, center of gravity ${vm.centerOfGravity}`}
          style={{ flex: "0 0 auto" }}
        >
          {/* the value band — drawn first so every bar sits on top of it */}
          <rect
            x={0}
            y={bandTop}
            width={W}
            height={Math.max(1, bandBottom - bandTop)}
            fill={BAND}
          />
          {/* Inset 4px so the bars read as a profile growing from an axis
              rather than as a slab welded to the panel border — observed on
              the first render, which had them starting at x=0. Gold sits at
              0.6 for the same reason the /tv idiom keeps solid fills small:
              a hand-sized block of saturated gold stops looking like data. */}
          {vm.bins.map((b) => (
            <rect
              key={`${b.loPrice}-${b.hiPrice}`}
              x={4}
              y={y(b.hiPrice)}
              width={Math.max(1, (b.share / maxShare) * (W - 60))}
              height={binH}
              fill={b.inValue ? GOLD : MUTED}
              opacity={b.inValue ? 0.6 : 0.3}
            />
          ))}
          {/* Center of Gravity */}
          <line x1={0} y1={cogY} x2={W - 4} y2={cogY} stroke={GOLD} strokeWidth={1.5} />
          <text x={W - 2} y={cogY - 3} fill={GOLD} fontSize={10} textAnchor="end">
            CoG {vm.centerOfGravity}
          </text>
          {/* last print — the gap between this and the CoG IS the migration */}
          <line
            x1={0}
            y1={lastY}
            x2={W - 4}
            y2={lastY}
            stroke={PRICE}
            strokeWidth={1}
            strokeDasharray="3 3"
          />
          <text x={W - 2} y={lastY + 11} fill={PRICE} fontSize={10} textAnchor="end">
            last {vm.last}
          </text>
        </svg>

        <div style={{ flex: "1 1 220px", minWidth: 200 }}>
          <div style={{ fontSize: 10, letterSpacing: 0.6, color: MUTED, textTransform: "uppercase" }}>
            Value Center of Gravity
          </div>
          <div
            style={{
              fontSize: 30,
              color: GOLD,
              fontVariantNumeric: "tabular-nums",
              lineHeight: 1.15,
              letterSpacing: 0.5,
            }}
          >
            {vm.centerOfGravity}
          </div>
          <div style={{ fontSize: 11, color: MUTED, marginBottom: 12, fontStyle: "italic" }}>
            Σ(Price × Volume) ÷ Σ(Volume) · {vm.prints} prints ·{" "}
            {vm.volume.toLocaleString("en-US")} volume
          </div>

          <div style={{ display: "flex", gap: 16, flexWrap: "wrap", marginBottom: 10 }}>
            <Reading
              label="Volume in band"
              value={`${vm.concentration}%`}
              note={`band ±${vm.spread}`}
            />
            <Reading
              label="Band width"
              value={`${Math.round(vm.bandCoverage! * 100)}%`}
              note="of the candle's range"
            />
            <Reading
              label="Value area"
              value={`${vm.valueLow} – ${vm.valueHigh}`}
              note={`range ${vm.low} – ${vm.high}`}
            />
          </div>

          <div
            style={{
              borderTop: `1px solid ${HAIR}`,
              paddingTop: 8,
              display: "flex",
              alignItems: "baseline",
              gap: 8,
              flexWrap: "wrap",
            }}
          >
            <span style={{ fontSize: 10, letterSpacing: 0.6, color: MUTED, textTransform: "uppercase" }}>
              Value migration
            </span>
            <span style={{ fontSize: 12, letterSpacing: 0.8, color: migrationTone, textTransform: "uppercase" }}>
              {vm.migration}
            </span>
            <span style={{ fontSize: 11, color: MUTED, flex: "1 1 100%", lineHeight: 1.4 }}>
              {vm.migrationDetail}
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}

export default ValueCandlePanel;
