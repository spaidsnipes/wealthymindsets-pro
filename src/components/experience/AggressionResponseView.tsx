"use client";

/**
 * AggressionResponseView — the Founder's Asset 03, as a full symbol VIEW.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * WHAT THE PICTURE SAYS
 *
 * One dot per bar. Up the y-axis is the pressure applied; left and right on the
 * x-axis is what price actually did with it. Dots high and near the centre line
 * are bars where a great deal of effort bought almost no movement, which is the
 * shape of absorption. The reader is not asked to trust a verdict word — they
 * can see the cluster.
 *
 * It is Asset 06's measurement turned ninety degrees, so a whole window reads
 * at once instead of bar by bar. Both are fed from `selectAbsorptionAnatomy`,
 * so the two views can never disagree about which bars absorbed.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * THE AXIS LABEL IS PART OF THE DATA
 *
 * The mockup's y-axis is NET BUYER / SELLER INITIATED. Most feeds this product
 * can reach do not carry an aggressor side, so on those the axis shows EFFORT
 * instead — and the label says so, because a scatter that silently swaps its
 * own y term keeps its shape and loses its meaning. `aggressionAxisNote` comes
 * from the compiler; this file never writes that sentence itself.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * ANTI-FABRICATION
 *
 * The mockup prints `+0.62 BUYER DOMINANT`, `+2.1 TICKS`, `0.34`, and
 * `REGIME SIGNAL: ABSORPTION / HIGH PROBABILITY`. None of those literals appear
 * below. Absent figures render as an em dash, never a zero. The probability is
 * not rendered at all — no selector owns one, and the regime line is reduced to
 * the fact underneath it: whether a zone qualified in this window.
 */

import React from "react";
import type {
  AggressionResponseVM,
  AggressionPoint,
} from "@/lib/marketData/viewModels/selectAggressionResponse";
import type { EffortBasis } from "@/lib/marketData/selectAbsorptionAnatomy";

const GOLD = "#d4af37";
const GOLD_DIM = "#c9a55c";
const MUTED = "#8a8271";
const TEXT = "#d8cfb8";
const HAIR = "rgba(139,106,41,0.22)";
const PANEL = "rgba(18,16,12,0.72)";

/**
 * §9 applies. The mockup colours its three series blue / red / gold, where red
 * reads as SELLER PRESSURE — a direction, which is legitimate. But this view's
 * classes are not directions, they are RECENCY and a QUALIFYING FLAG, so a
 * red/blue split here would invent a directional meaning the dots do not carry.
 * They are separated by ivory, dim-ivory and gold instead — the absorbing dots
 * take the brightest tone because they are the reading the view exists for.
 */
const CLASS_TONE = {
  ABSORBING: GOLD,
  RECENT: TEXT,
  TYPICAL: "rgba(216,207,184,0.34)",
} as const;

const CLASS_LABEL = {
  ABSORBING: "ABSORBING (high effort / weak response)",
  RECENT: "RECENT",
  TYPICAL: "EARLIER IN WINDOW",
} as const;

const BASIS_LABEL: Record<EffortBasis, string> = {
  SIGNED_DELTA: "EFFORT · DELTA",
  INFERRED_DELTA: "EFFORT · DELTA (INFERRED)",
  VOLUME: "EFFORT · VOLUME",
  UNMEASURED: "EFFORT · UNMEASURED",
};

function num(v: number | null, digits = 2): string {
  return v == null ? "—" : v.toFixed(digits);
}

function signed(v: number | null, digits = 2): string {
  if (v == null) return "—";
  return `${v > 0 ? "+" : ""}${v.toFixed(digits)}`;
}

function vol(v: number | null): string {
  return v == null ? "—" : `${v > 0 ? "+" : ""}${Math.round(v).toLocaleString("en-US")}`;
}

/* ───────────────────────── the scatter ───────────────────────── */

const W = 720;
const H = 380;
const PAD_L = 46;
const PAD_R = 14;
const PAD_T = 16;
const PAD_B = 34;

function Scatter({ vm }: { vm: AggressionResponseVM }) {
  const pts = vm.points;

  // Both axes are scaled to the window's own extremes rather than to a fixed
  // range. A fixed ±10 would be the mockup's art direction, and on an
  // instrument that moves in cents every dot would pile onto the centre line.
  const maxResp = pts.reduce((m, p) => Math.max(m, Math.abs(p.response)), 0);
  const maxAgg = pts.reduce((m, p) => Math.max(m, Math.abs(p.aggression)), 0);
  const respSpan = maxResp > 0 ? maxResp : 1;
  const aggSpan = maxAgg > 0 ? maxAgg : 1;

  const x = (resp: number) => PAD_L + ((resp / respSpan + 1) / 2) * (W - PAD_L - PAD_R);
  // Under EFFORT the axis is 0..1 and has no negative half, so the baseline
  // sits on the floor. Under NET_AGGRESSION zero is the middle — a sign change
  // is the whole point of that axis.
  const signedY = vm.aggressionAxis === "NET_AGGRESSION";
  const y = (agg: number) => {
    const t = signedY ? (agg / aggSpan + 1) / 2 : agg / aggSpan;
    return H - PAD_B - t * (H - PAD_T - PAD_B);
  };

  const zeroX = x(0);
  const zeroY = signedY ? y(0) : H - PAD_B;

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      width="100%"
      role="img"
      aria-label="Aggression against price response, one point per bar"
      style={{ display: "block" }}
    >
      {/* axes */}
      <line x1={PAD_L} y1={H - PAD_B} x2={W - PAD_R} y2={H - PAD_B} stroke={HAIR} />
      <line x1={PAD_L} y1={PAD_T} x2={PAD_L} y2={H - PAD_B} stroke={HAIR} />
      {/* the two lines that make the picture readable: no-response and, when
          the axis is signed, no-net-aggression */}
      <line
        x1={zeroX}
        y1={PAD_T}
        x2={zeroX}
        y2={H - PAD_B}
        stroke="rgba(212,175,55,0.30)"
        strokeDasharray="3 4"
      />
      {signedY && (
        <line
          x1={PAD_L}
          y1={zeroY}
          x2={W - PAD_R}
          y2={zeroY}
          stroke="rgba(212,175,55,0.30)"
          strokeDasharray="3 4"
        />
      )}

      {/* TYPICAL first, ABSORBING last, so the reading the view exists for is
          never painted under an earlier bar. */}
      {(["TYPICAL", "RECENT", "ABSORBING"] as const).map((cls) =>
        pts
          .filter((p) => p.cls === cls)
          .map((p) => (
            <circle
              key={`${cls}-${p.time}`}
              cx={x(p.response)}
              cy={y(p.aggression)}
              // Radius carries effort so the picture still separates a heavy bar
              // from a light one when the y-axis is showing net aggression.
              r={3 + p.effortNorm * 5}
              fill={CLASS_TONE[cls]}
              fillOpacity={cls === "TYPICAL" ? 0.5 : 0.75}
              stroke={cls === "ABSORBING" ? GOLD : "none"}
              strokeOpacity={0.9}
            />
          )),
      )}

      <text x={W / 2} y={H - 8} textAnchor="middle" fontSize={10} fill={MUTED}>
        RESPONSE · signed price displacement (close − open), price units
      </text>
      <text
        x={-(H / 2)}
        y={13}
        transform="rotate(-90)"
        textAnchor="middle"
        fontSize={10}
        fill={MUTED}
      >
        {vm.aggressionAxis === "NET_AGGRESSION" ? "AGGRESSION · net initiated" : "EFFORT · normalised"}
      </text>
    </svg>
  );
}

/* ───────────────────────── the efficiency rail ───────────────────────── */

function EfficiencyRail({ vm }: { vm: AggressionResponseVM }) {
  // The scale runs 0 → 1.0+, and a reading above 1 is real rather than an
  // overflow, so the marker is clamped for DRAWING only while the printed
  // number stays exact. A clamped number would be a fabricated ceiling.
  const fill = vm.efficiency == null ? null : Math.min(1, Math.max(0, vm.efficiency));

  return (
    <div>
      <div style={{ fontSize: 9.5, letterSpacing: "0.1em", color: MUTED }}>
        EFFICIENCY RATIO (CALCULATED)
      </div>
      <div
        data-testid="aggression-efficiency"
        style={{ fontSize: 30, color: vm.efficiency == null ? MUTED : GOLD, lineHeight: 1.1 }}
      >
        {num(vm.efficiency)}
      </div>
      <div
        style={{
          position: "relative",
          height: 8,
          borderRadius: 4,
          marginTop: 8,
          background: "linear-gradient(90deg, rgba(212,175,55,0.16), rgba(212,175,55,0.75))",
        }}
      >
        {fill != null && (
          <div
            style={{
              position: "absolute",
              left: `${fill * 100}%`,
              top: -3,
              width: 2,
              height: 14,
              background: TEXT,
            }}
          />
        )}
      </div>
      <div style={{ fontSize: 9.5, color: MUTED, marginTop: 6, lineHeight: 1.5 }}>
        {vm.efficiencyScaleNote}
      </div>
    </div>
  );
}

/* ───────────────────────── the view ───────────────────────── */

export interface AggressionResponseViewProps {
  readonly vm: AggressionResponseVM;
  readonly symbol: string;
  readonly timeframe?: string;
}

function Metric({
  label,
  value,
  note,
  tone = TEXT,
}: {
  label: string;
  value: string;
  note: string;
  tone?: string;
}) {
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ fontSize: 9, letterSpacing: "0.1em", color: MUTED }}>{label}</div>
      <div style={{ fontSize: 19, color: tone, lineHeight: 1.25 }}>{value}</div>
      <div style={{ fontSize: 9.5, color: MUTED, lineHeight: 1.45, marginTop: 2 }}>{note}</div>
    </div>
  );
}

export default function AggressionResponseView({
  vm,
  symbol,
  timeframe,
}: AggressionResponseViewProps) {
  const absorbing = vm.points.filter((p: AggressionPoint) => p.cls === "ABSORBING").length;

  return (
    <div
      data-testid="aggression-response-view"
      style={{ padding: 14, color: TEXT, fontFamily: "inherit" }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "baseline",
          justifyContent: "space-between",
          gap: 12,
          flexWrap: "wrap",
        }}
      >
        <div style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
          <span style={{ fontSize: 13, letterSpacing: "0.12em", color: GOLD }}>
            AGGRESSION vs RESPONSE
          </span>
          <span style={{ fontSize: 10.5, color: MUTED }}>
            {symbol}
            {timeframe ? ` · ${timeframe}` : ""} · last {vm.windowBars} bars
          </span>
        </div>
        <span
          data-testid="aggression-basis"
          style={{
            fontSize: 9.5,
            letterSpacing: "0.1em",
            color: MUTED,
            border: `1px solid ${HAIR}`,
            borderRadius: 3,
            padding: "3px 7px",
          }}
        >
          {BASIS_LABEL[vm.basis]}
        </span>
      </div>

      {/* The axis disclosure is printed at the top, not in a footnote, because
          it changes what every dot below it means. */}
      <p data-testid="aggression-axis-note" style={{ fontSize: 10.5, color: MUTED, margin: "8px 0 0" }}>
        {vm.aggressionAxisNote}
      </p>

      {!vm.measured ? (
        <p data-testid="aggression-unmeasured" style={{ fontSize: 11, color: MUTED, marginTop: 14 }}>
          No bar in this window carried enough to measure — there is nothing to plot, and a
          scatter drawn from nothing would still look like a finding.
        </p>
      ) : (
        <div className="wm-ar-grid">
          <div style={{ background: PANEL, border: `1px solid ${HAIR}`, borderRadius: 6, padding: 12 }}>
            <div style={{ fontSize: 9.5, letterSpacing: "0.1em", color: MUTED, marginBottom: 10 }}>
              LAYERED MEASUREMENT · PRESSURE → DISPLACEMENT
            </div>
            <Scatter vm={vm} />
            <div style={{ display: "flex", gap: 16, flexWrap: "wrap", marginTop: 6 }}>
              {(["ABSORBING", "RECENT", "TYPICAL"] as const).map((cls) => (
                <span key={cls} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 9.5, color: MUTED }}>
                  <span
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: 4,
                      background: CLASS_TONE[cls],
                      display: "inline-block",
                    }}
                  />
                  {CLASS_LABEL[cls]}
                </span>
              ))}
            </div>
          </div>

          <div style={{ background: PANEL, border: `1px solid ${HAIR}`, borderRadius: 6, padding: 12 }}>
            <div style={{ fontSize: 9.5, letterSpacing: "0.1em", color: MUTED, marginBottom: 10 }}>
              MICROSTRUCTURE SUMMARY
            </div>

            <Metric
              label="NET AGGRESSION"
              value={vol(vm.netAggression)}
              note={
                vm.netAggression == null
                  ? "not carried on this tape — no side was stated on every bar"
                  : "buyer-initiated minus seller-initiated across the window"
              }
              tone={vm.netAggression == null ? MUTED : TEXT}
            />

            <Metric
              label="MEAN RESPONSE"
              value={signed(vm.meanResponse, 3)}
              note="average signed displacement per bar, in price units — the feed states no tick size"
            />

            <Metric
              label="ABSORBING BARS"
              value={`${absorbing} of ${vm.points.length}`}
              note="high effort paired with weak displacement, by this window's own thresholds"
              tone={absorbing > 0 ? GOLD_DIM : MUTED}
            />

            <div
              data-testid="aggression-regime"
              style={{ borderTop: `1px solid ${HAIR}`, paddingTop: 10, marginTop: 2 }}
            >
              <div style={{ fontSize: 9, letterSpacing: "0.1em", color: MUTED }}>REGIME SIGNAL</div>
              {/* THREE STATES, NOT TWO. "no zone qualified" is a reading of the
                  market and may only be printed when the window was CAPABLE of
                  producing one. When a single print holds nearly all the
                  window's effort, every other bar's effortNorm collapses toward
                  zero and no run can clear the gate — an empty `zones` there is
                  arithmetic, and saying otherwise is a lie by omission. */}
              <div
                style={{
                  fontSize: 13,
                  color: vm.zones.length > 0 ? GOLD : MUTED,
                  marginTop: 3,
                }}
              >
                {vm.zones.length > 0
                  ? "ABSORPTION ZONE PRESENT"
                  : vm.zoneQualificationPossible
                    ? "NO ZONE QUALIFIED"
                    : "NOT ANSWERABLE IN THIS WINDOW"}
              </div>
              {/* The mockup prints HIGH PROBABILITY here. Nothing in this repo
                  computes a probability, so the line states the count and
                  stops. */}
              <div style={{ fontSize: 9.5, color: MUTED, marginTop: 3, lineHeight: 1.45 }}>
                {vm.zones.length > 0
                  ? `${vm.zones.length} qualifying run${vm.zones.length === 1 ? "" : "s"} in this window · no probability is computed for this`
                  : vm.zoneQualificationPossible
                    ? "no run of bars held high effort against weak displacement long enough"
                    : vm.effortSpreadNote}
              </div>
            </div>

            <div style={{ borderTop: `1px solid ${HAIR}`, paddingTop: 12, marginTop: 12 }}>
              <EfficiencyRail vm={vm} />
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        .wm-ar-grid {
          display: grid;
          grid-template-columns: minmax(0, 1fr) minmax(0, 290px);
          gap: 12px;
          margin-top: 12px;
          align-items: start;
        }
        @media (max-width: 1100px) {
          .wm-ar-grid {
            grid-template-columns: minmax(0, 1fr);
          }
        }
      `}</style>
    </div>
  );
}
