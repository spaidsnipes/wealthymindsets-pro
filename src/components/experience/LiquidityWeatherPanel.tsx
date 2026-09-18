"use client";

/**
 * LIQUIDITY WEATHER — the cost of moving this market, drawn.
 *
 * THE BARS ARE THE AUDIT. The stage word at the top is one of seven, and a
 * single word is exactly the kind of claim a reader has no way to check. So
 * the bars beneath it show every segment's cost at true proportion, with the
 * window's median drawn straight across them. Whatever the headline says —
 * thinning, thickening, a vacuum, incoherent — the reader can see it in the
 * bars or catch the panel lying. That is the point: a headline nobody can
 * check is indistinguishable from one that was made up.
 *
 * Two things are drawn that a prettier panel would omit:
 *
 *   · STALLED segments get a hatched bar at full height rather than nothing.
 *     A segment that traded without moving price has no cost to plot, and
 *     drawing it as zero would say the exact opposite of what happened.
 *
 *   · The LAST bar is marked, because on this module the last segment is
 *     judged differently from the rest — against its neighbours rather than
 *     against the window. A reader comparing the bars deserves to know which
 *     one the verdict is about.
 *
 * This panel renders no aggressor disclosure, and that is deliberate rather
 * than an omission: `selectLiquidityWeather` never reads `side`, so there is
 * no inferred evidence here to disclose. It shows the provenance it observed
 * as plain context instead, clearly marked as unused.
 */

import * as React from "react";
import {
  formatCost,
  formatRatio,
  type LiquidityWeatherVM,
  type WeatherStage,
} from "@/lib/marketData/viewModels/selectLiquidityWeather";

const GOLD = "#d4af37";
const GOLD_DIM = "#c9a55c";
const MUTED = "#8a8271";
const TEXT = "#d8cfb8";
const HAIR = "rgba(139,106,41,0.22)";
const THIN = "#00D4AA";
const THICK = "#FF4D6A";
const NEUTRAL = "#4FA3E0";

/**
 * Colour carries the DIRECTION of the cost, not "good" and "bad". A thinning
 * market is cheap to move and dangerous to size into; a heavy one is expensive
 * to move and safe to lean on. Neither is the good one, so neither gets green.
 */
const STAGE_TONE: Record<WeatherStage, string> = {
  AIRLESS: THIN,
  THINNING: THIN,
  STEADY: NEUTRAL,
  THICKENING: THICK,
  HEAVY: THICK,
  ERRATIC: GOLD,
  UNMEASURED: MUTED,
};

const STAGE_GLOSS: Record<WeatherStage, string> = {
  AIRLESS: "price is travelling on almost nothing",
  THINNING: "it is getting cheaper to push",
  STEADY: "cost to travel is holding",
  THICKENING: "it is costing more to go the same distance",
  HEAVY: "size is going in and getting little back",
  ERRATIC: "the window is not coherent enough to call",
  UNMEASURED: "not enough tape to price the move",
};

/* This file used to carry its own fixed-decimal `num` helper. It is GONE, not
   merely unused: every number this panel prints is a cost or a ratio, both of
   which the selector already owns a formatter for, and leaving a second
   formatter lying in the file is how the median came to be printed as "0" in
   the first place. A tool left on the bench gets picked up. */

function Reading({
  label,
  value,
  note,
}: {
  label: string;
  value: string;
  note?: string;
}) {
  return (
    <div style={{ minWidth: 0 }}>
      <div style={{ fontSize: 9, letterSpacing: 0.6, color: MUTED, textTransform: "uppercase" }}>
        {label}
      </div>
      <div style={{ fontSize: 15, color: TEXT, fontVariantNumeric: "tabular-nums" }}>{value}</div>
      {note ? <div style={{ fontSize: 9, color: MUTED, marginTop: 1 }}>{note}</div> : null}
    </div>
  );
}

export default function LiquidityWeatherPanel({
  vm,
  symbol,
  window: windowLabel,
}: {
  vm: LiquidityWeatherVM;
  symbol?: string;
  window?: string;
}) {
  const tone = STAGE_TONE[vm.stage];
  const hatchId = React.useId();

  const costs = vm.segments.map((s) => s.cost).filter((c): c is number => c != null);
  const peak = costs.length > 0 ? Math.max(...costs) : 0;
  const medianY =
    vm.medianCost != null && peak > 0 ? 100 - (vm.medianCost / peak) * 100 : null;

  return (
    <div
      data-testid="liquidity-weather-panel"
      aria-label="Liquidity weather"
      style={{
        border: `1px solid ${HAIR}`,
        borderRadius: 8,
        background: "linear-gradient(180deg, rgba(20,17,10,0.92), rgba(10,9,6,0.92))",
        padding: "10px 12px 11px",
      }}
    >
      <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginBottom: 8 }}>
        <span style={{ fontSize: 10, letterSpacing: 1.2, color: GOLD, textTransform: "uppercase" }}>
          Liquidity weather
        </span>
        <span style={{ fontSize: 9, color: MUTED, marginLeft: "auto" }}>
          {symbol ?? "—"}
          {windowLabel ? ` · ${windowLabel}` : ""}
        </span>
      </div>

      {/* ── THE BARS ────────────────────────────────────────────────────────
          Cost per segment at true proportion, tallest bar = dearest segment.
          The median line crosses them so "above usual" and "below usual" are
          a visual fact rather than a sentence the reader has to trust. */}
      <div
        style={{
          position: "relative",
          height: 76,
          display: "flex",
          alignItems: "flex-end",
          gap: 2,
          borderBottom: `1px solid ${HAIR}`,
          paddingBottom: 1,
        }}
      >
        <svg width="0" height="0" style={{ position: "absolute" }} aria-hidden>
          <defs>
            <pattern id={hatchId} width="4" height="4" patternUnits="userSpaceOnUse">
              <path d="M0,4 L4,0" stroke={tone} strokeWidth="1" opacity="0.55" />
            </pattern>
          </defs>
        </svg>

        {vm.segments.length === 0 ? (
          <div style={{ fontSize: 10, color: MUTED, alignSelf: "center" }}>
            No priced segments in this window.
          </div>
        ) : null}

        {vm.segments.map((s, i) => {
          const isLast = i === vm.segments.length - 1;
          const h = s.stalled ? 100 : peak > 0 && s.cost != null ? (s.cost / peak) * 100 : 0;
          return (
            <div
              key={s.index}
              title={
                s.stalled
                  ? `Segment ${s.index + 1}: ${s.prints} prints, no travel at all`
                  : `Segment ${s.index + 1}: ${formatCost(s.cost)} per spread over ${s.prints} prints`
              }
              style={{
                flex: 1,
                minWidth: 0,
                height: `${Math.max(h, 2)}%`,
                background: s.stalled ? `url(#${hatchId})` : tone,
                border: s.stalled ? `1px dashed ${tone}` : "none",
                opacity: isLast ? 1 : 0.42,
                borderRadius: "2px 2px 0 0",
              }}
            />
          );
        })}

        {medianY != null ? (
          <div
            aria-hidden
            style={{
              position: "absolute",
              left: 0,
              right: 0,
              top: `${medianY}%`,
              borderTop: `1px dashed ${GOLD_DIM}`,
              opacity: 0.5,
            }}
          />
        ) : null}
      </div>

      <div style={{ display: "flex", gap: 8, marginTop: 4, marginBottom: 8 }}>
        <span style={{ fontSize: 9, color: GOLD_DIM }}>— — median cost</span>
        <span style={{ fontSize: 9, color: MUTED }}>solid bar = the segment being judged</span>
        <span style={{ fontSize: 9, color: MUTED, marginLeft: "auto" }}>
          {vm.segments.length} equal-count segments — width is PRINTS, not time
        </span>
      </div>

      {/* ── THE READINGS ───────────────────────────────────────────────────
          `latestVsPeers` is given the prominent slot, not `latestVsMedian`,
          because it is the one the verdict is actually computed from. Showing
          the decorative number larger than the deciding one is how a panel
          ends up technically honest and practically misleading. */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(84px, 1fr))",
          gap: 10,
          paddingBottom: 8,
          borderBottom: `1px solid ${HAIR}`,
        }}
      >
        {/* COSTS ARE FORMATTED BY THE SELECTOR'S OWN HELPER too, for the same
            reason the ratios below are — and this one shipped broken. It read
            `num(vm.medianCost, 0)`: ZERO decimals on a quantity denominated in
            whatever the instrument's volume happens to be. MEASURED on
            production 2026-09-18, BTCUSD: `MEDIAN COST 0 size per spread`
            beside `LATEST VS PEERS 5.38×`. A ratio against a true zero is
            Infinity, so the non-zero ratios proved the median was non-zero and
            the formatter was the liar — the headline number of this invention
            telling a trader it costs NOTHING to move this market.
            `selectLiquidityWeather`'s own prose already formats this same
            number with `formatCost`; the panel formatting it differently is
            precisely the disagreement the note below forbids. */}
        <Reading
          label="Median cost"
          value={formatCost(vm.medianCost)}
          note="size per spread"
        />
        {/* RATIOS ARE FORMATTED BY THE SELECTOR'S OWN HELPER, not by a
            fixed-decimal one. Two decimals is fine for a ratio near one and lies
            about one near zero: a genuine vacuum measured at 0.002× rendered
            as "0.00×", which reads as free rather than as very cheap. The
            headline and its explanation must not format the same number two
            different ways, so both callers share one formatter. */}
        <Reading
          label="Latest vs peers"
          value={vm.latestVsPeers == null ? "—" : `${formatRatio(vm.latestVsPeers)}×`}
          note="vs its neighbours"
        />
        <Reading
          label="Half over half"
          value={vm.trendRatio == null ? "—" : `${formatRatio(vm.trendRatio)}×`}
          note="late ÷ early"
        />
        <Reading
          label="Disagreeing"
          value={vm.dispersion == null ? "—" : `${Math.round(vm.dispersion * 100)}%`}
          note="segments off their half"
        />
      </div>

      <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginTop: 8 }}>
        <span
          style={{
            fontSize: 13,
            letterSpacing: 1.4,
            color: tone,
            textTransform: "uppercase",
            fontWeight: 600,
          }}
        >
          {vm.stage}
        </span>
        <span style={{ fontSize: 10, color: MUTED }}>{STAGE_GLOSS[vm.stage]}</span>
      </div>

      <p style={{ fontSize: 10.5, lineHeight: 1.45, color: TEXT, margin: "5px 0 0" }}>
        {vm.detail}
      </p>

      {/* ── THE LIMIT, STATED WHERE IT IS READ ─────────────────────────────
          A panel called "liquidity" invites a reader to think it can see the
          book. It cannot. Saying so in a tooltip would be saying it to nobody,
          so it is a rendered row. */}
      <div
        data-testid="liquidity-scope"
        style={{
          marginTop: 8,
          paddingTop: 7,
          borderTop: `1px solid ${HAIR}`,
          fontSize: 9.5,
          lineHeight: 1.45,
          color: MUTED,
        }}
      >
        Measured from executed prints only — this reads what size actually PAID to
        travel, not resting depth. No order book is in evidence here.
        {vm.provenance !== "PROVIDER" ? (
          <>
            {" "}
            Aggressor side on this tape is{" "}
            <span style={{ color: GOLD_DIM }}>{vm.provenance.toLowerCase()}</span>, and this
            reading never used it.
          </>
        ) : null}
      </div>
    </div>
  );
}
