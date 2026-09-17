"use client";

/**
 * DeltaDivergencePanel — two lines, and whether they point the same way.
 *
 * THE DRAWING IS THE EVIDENCE. A divergence is a claim about two paths, so the
 * two paths are drawn. A panel that printed "BEARISH DIVERGENCE" over a number
 * would be asking the reader to trust a pivot-finding rule they cannot see; the
 * whole reason this renders a chart at all is that the reader can check the
 * module's two chosen pivots against the shape with their own eyes.
 *
 * The two compared pivots are therefore marked ON both lines. That is the
 * costly part of the design and the honest part: if the module picked two
 * points that do not look like the swing the reader sees, the picture says so
 * immediately, which is exactly what a headline-only panel would hide.
 *
 * WHAT EACH MARK OWNS
 *
 *   · the price path — one point per segment close, the shape the module
 *     actually read. Not a candle chart, not a smoothed line.
 *   · the delta path — cumulative aggressive delta at the end of each segment,
 *     on its OWN vertical scale, because it is measured in shares and price is
 *     measured in dollars. Two scales on one frame is the standard way this
 *     reading is drawn and the standard way it misleads, so the axis each line
 *     belongs to is named in the legend rather than inferred from colour alone.
 *   · the pivot pair — a ring on each line at each compared segment. Four rings
 *     total, and the divergence IS the difference between the two pairs.
 *
 * THE HORIZONTAL AXIS IS PRINT COUNT, NOT TIME. `selectDeltaDivergence` cuts
 * the tape into equal-COUNT segments because it has no clock. A busy minute and
 * a quiet ten minutes occupy the same width here. The axis is labelled so that
 * is visible rather than assumed.
 *
 * PROVENANCE IS RENDERED, NEVER HOVERED — same rule as the absorption panel.
 * Cumulative delta is a claim about who initiated, and on live US equities the
 * side is usually a tick-rule guess.
 *
 * Pure display: consumes a DeltaDivergenceVM and derives no market truth.
 */

import * as React from "react";
import type {
  DeltaDivergenceVM,
  DivergenceVerdict,
} from "@/lib/marketData/viewModels/selectDeltaDivergence";

const GOLD = "#d4af37";
const GOLD_DIM = "#c9a55c";
const MUTED = "#8a8271";
const TEXT = "#d8cfb8";
const HAIR = "rgba(139,106,41,0.22)";
const PRICE = "#4FA3E0";
const DELTA = "#8B5CF6";
const BULL = "#00D4AA";
const BEAR = "#FF4D6A";

export interface DeltaDivergencePanelProps {
  readonly vm: DeltaDivergenceVM;
  readonly symbol?: string;
  readonly window?: string;
}

const VERDICT_TONE: Record<DivergenceVerdict, string> = {
  BEARISH: BEAR,
  BULLISH: BULL,
  CONFIRMED: GOLD,
  NO_SWING: MUTED,
  UNMEASURED: MUTED,
};

/** Map a series onto a band of the SVG, with its own min/max. A flat series
 *  sits on the centre line rather than collapsing onto an edge. */
function scaler(values: readonly number[], top: number, bottom: number) {
  let lo = Infinity;
  let hi = -Infinity;
  for (const v of values) {
    if (v < lo) lo = v;
    if (v > hi) hi = v;
  }
  const span = hi - lo;
  if (!Number.isFinite(span) || span === 0) {
    const mid = (top + bottom) / 2;
    return () => mid;
  }
  return (v: number) => bottom - ((v - lo) / span) * (bottom - top);
}

function Legend({ colour, label, axis }: { colour: string; label: string; axis: string }) {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 10 }}>
      <span style={{ width: 14, height: 2, background: colour, borderRadius: 1 }} />
      <span style={{ color: TEXT }}>{label}</span>
      <span style={{ color: MUTED }}>({axis})</span>
    </span>
  );
}

export function DeltaDivergencePanel({
  vm,
  symbol,
  window: windowLabel,
}: DeltaDivergencePanelProps): React.ReactElement {
  const header = (
    <div
      style={{
        display: "flex",
        alignItems: "baseline",
        gap: 10,
        marginBottom: 10,
        flexWrap: "wrap",
      }}
    >
      <span
        style={{ fontSize: 11, letterSpacing: 0.6, color: GOLD_DIM, textTransform: "uppercase" }}
      >
        Delta Divergence · did delta follow price
      </span>
      <span style={{ fontSize: 11, color: MUTED, marginLeft: "auto" }}>
        {symbol ? `${symbol} · ` : ""}
        {windowLabel ?? "observed prints"}
      </span>
    </div>
  );

  const shell = (children: React.ReactNode) => (
    <section
      aria-label="Delta divergence"
      data-testid="delta-divergence-panel"
      style={{
        border: `1px solid ${HAIR}`,
        borderRadius: 10,
        padding: "12px 14px",
        background: "rgba(255,255,255,0.015)",
      }}
    >
      {header}
      {children}
    </section>
  );

  // No path to draw. Say what is missing; draw no axis, because an empty frame
  // reads as "both lines are flat", which is a different sentence.
  if (vm.segments.length === 0) {
    return shell(
      <div style={{ fontSize: 12, color: MUTED, fontStyle: "italic", lineHeight: 1.5 }}>
        {vm.detail}. Two paths are needed to compare, and this window has not
        produced one yet.
      </div>,
    );
  }

  const W = 420;
  const H = 150;
  const PAD = 8;
  const n = vm.segments.length;
  const x = (i: number) => (n <= 1 ? W / 2 : (i / (n - 1)) * (W - 2 * PAD) + PAD);

  const closes = vm.segments.map((s) => s.close);
  const cvds = vm.segments.map((s) => s.cvd);
  const yPrice = scaler(closes, PAD, H - PAD);
  const yCvd = scaler(cvds, PAD, H - PAD);

  const pricePath = closes.map((v, i) => `${i === 0 ? "M" : "L"}${x(i)},${yPrice(v)}`).join(" ");
  const cvdPath = cvds.map((v, i) => `${i === 0 ? "M" : "L"}${x(i)},${yCvd(v)}`).join(" ");

  const tone = VERDICT_TONE[vm.verdict];
  const pivots = [vm.priorPivot, vm.recentPivot].filter(
    (p): p is NonNullable<typeof p> => p != null,
  );

  return shell(
    <>
      <svg
        width="100%"
        height={H}
        viewBox={`0 0 ${W} ${H}`}
        preserveAspectRatio="none"
        role="img"
        aria-label={`Price path and cumulative delta path across ${n} segments. ${vm.detail}`}
        style={{ display: "block" }}
      >
        {/* zero-delta reference, only when the delta path actually crosses it —
            a line drawn where no data sits invites the eye to read a level */}
        {Math.min(...cvds) < 0 && Math.max(...cvds) > 0 ? (
          <line
            x1={0}
            y1={yCvd(0)}
            x2={W}
            y2={yCvd(0)}
            stroke={DELTA}
            strokeWidth={1}
            strokeDasharray="2 4"
            opacity={0.35}
          />
        ) : null}

        <path d={cvdPath} fill="none" stroke={DELTA} strokeWidth={1.5} opacity={0.85} />
        <path d={pricePath} fill="none" stroke={PRICE} strokeWidth={1.5} />

        {/* the compared pivots, ringed on BOTH lines */}
        {pivots.map((p) => (
          <g key={`pv-${p.segment}`}>
            <line
              x1={x(p.segment)}
              y1={PAD}
              x2={x(p.segment)}
              y2={H - PAD}
              stroke={tone}
              strokeWidth={1}
              opacity={0.28}
            />
            <circle
              cx={x(p.segment)}
              cy={yPrice(vm.segments[p.segment].close)}
              r={3.5}
              fill="none"
              stroke={PRICE}
              strokeWidth={1.5}
            />
            <circle
              cx={x(p.segment)}
              cy={yCvd(vm.segments[p.segment].cvd)}
              r={3.5}
              fill="none"
              stroke={DELTA}
              strokeWidth={1.5}
            />
          </g>
        ))}
      </svg>

      <div
        style={{
          display: "flex",
          gap: 14,
          flexWrap: "wrap",
          alignItems: "center",
          marginTop: 4,
        }}
      >
        <Legend colour={PRICE} label="Price" axis="left scale" />
        <Legend colour={DELTA} label="Cumulative delta" axis="own scale" />
        <span style={{ fontSize: 10, color: MUTED, marginLeft: "auto" }}>
          {n} equal-count segments — width is PRINTS, not time
        </span>
      </div>

      {vm.priorPivot && vm.recentPivot ? (
        <div
          style={{
            display: "flex",
            gap: 18,
            flexWrap: "wrap",
            marginTop: 10,
            paddingTop: 8,
            borderTop: `1px solid ${HAIR}`,
          }}
        >
          <div style={{ minWidth: 96 }}>
            <div
              style={{
                fontSize: 10,
                letterSpacing: 0.6,
                color: MUTED,
                textTransform: "uppercase",
              }}
            >
              Price moved
            </div>
            <div
              style={{
                fontSize: 15,
                color: vm.priceChange! >= 0 ? BULL : BEAR,
                fontVariantNumeric: "tabular-nums",
              }}
            >
              {vm.priceChange! >= 0 ? "+" : ""}
              {vm.priceChange!.toFixed(2)}
            </div>
            <div style={{ fontSize: 10, color: MUTED }}>
              {Math.abs(vm.swingInSpread!).toFixed(1)}× the window&apos;s spread
            </div>
          </div>
          <div style={{ minWidth: 96 }}>
            <div
              style={{
                fontSize: 10,
                letterSpacing: 0.6,
                color: MUTED,
                textTransform: "uppercase",
              }}
            >
              Delta moved
            </div>
            <div
              style={{
                fontSize: 15,
                color: vm.cvdChange! >= 0 ? BULL : BEAR,
                fontVariantNumeric: "tabular-nums",
              }}
            >
              {vm.cvdChange! >= 0 ? "+" : ""}
              {vm.cvdChange!.toLocaleString("en-US")}
            </div>
            <div style={{ fontSize: 10, color: MUTED }}>between the same two pivots</div>
          </div>
          <div style={{ minWidth: 96 }}>
            <div
              style={{
                fontSize: 10,
                letterSpacing: 0.6,
                color: MUTED,
                textTransform: "uppercase",
              }}
            >
              Compared
            </div>
            <div style={{ fontSize: 15, color: TEXT, fontVariantNumeric: "tabular-nums" }}>
              seg {vm.priorPivot.segment} → {vm.recentPivot.segment}
            </div>
            <div style={{ fontSize: 10, color: MUTED }}>ringed on both lines</div>
          </div>
        </div>
      ) : null}

      <div
        style={{
          borderTop: `1px solid ${HAIR}`,
          marginTop: 10,
          paddingTop: 8,
          display: "flex",
          alignItems: "baseline",
          gap: 8,
          flexWrap: "wrap",
        }}
      >
        <span
          style={{ fontSize: 10, letterSpacing: 0.6, color: MUTED, textTransform: "uppercase" }}
        >
          Reading
        </span>
        <span
          data-testid="divergence-verdict"
          style={{ fontSize: 13, letterSpacing: 0.9, color: tone, textTransform: "uppercase" }}
        >
          {vm.verdict.replace("_", " ")}
        </span>
        <span style={{ fontSize: 11, color: MUTED, flex: "1 1 100%", lineHeight: 1.4 }}>
          {vm.detail}
        </span>

        {vm.requiresDisclosure ? (
          <div
            data-testid="divergence-disclosure"
            style={{
              flex: "1 1 100%",
              marginTop: 6,
              fontSize: 10,
              lineHeight: 1.45,
              color: GOLD_DIM,
              background: "rgba(212,175,55,0.06)",
              border: `1px solid ${HAIR}`,
              borderRadius: 6,
              padding: "5px 7px",
            }}
          >
            {vm.provenance === "UNDISCLOSED"
              ? "Aggressor side: not disclosed by the feed. The delta line above rests on sides this tape never stated."
              : vm.provenance === "MIXED"
                ? "Aggressor side: MIXED — some prints venue-stamped, some inferred by tick rule. The weakest evidence in the window sets this label."
                : "Aggressor side: INFERRED by tick rule, not stamped by the venue. The delta line is a running total of guesses about who initiated."}
          </div>
        ) : null}
      </div>
    </>,
  );
}

export default DeltaDivergencePanel;
