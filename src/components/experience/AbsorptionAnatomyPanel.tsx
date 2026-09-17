"use client";

/**
 * AbsorptionAnatomyPanel — the Founder's Absorption vs Exhaustion anatomy, drawn.
 *
 * THE DESIGN IS THE ARGUMENT. The mockup puts two columns side by side and asks
 * the reader to COMPARE them: EFFORT on the left, RESPONSE on the right. That
 * facing layout is not decoration — it is the teaching. A single headline
 * ("ABSORBED") with the evidence folded away would be the same sentence with the
 * reasoning deleted, and this product's whole claim is that the reader can see
 * how a verdict was reached without leaving the panel.
 *
 * So the verdict is rendered LAST and SMALLEST in visual weight relative to the
 * two columns that produced it. The effort bar and the displacement bar are the
 * largest marks here.
 *
 * WHAT EACH MARK OWNS
 *
 *   · the effort bar — aggressive buy volume against aggressive sell volume, at
 *     true proportion. Its asymmetry IS `imbalance`; the reader does not have to
 *     take the number on faith.
 *   · the displacement reading — price travel in the window's OWN spread, beside
 *     the raw price travel. Both, because the raw number is what a trader
 *     recognises and the spread-relative number is the one that can be compared
 *     to any other window.
 *   · the Efficiency Ratio — price travelled per unit of net aggressive volume.
 *     Instrument-specific by construction, and labelled as such.
 *
 * PROVENANCE IS RENDERED, NEVER HOVERED. `selectAbsorption` documents that on
 * live US equities the aggressor side is usually a TICK-RULE GUESS. A surface
 * that prints "Buyers pressed and price held" in confident type over inferred
 * sides is making a claim the tape did not make. When `requiresDisclosure` is
 * true the disclosure is a visible row in the panel body — not a tooltip, not a
 * details element, not a legend elsewhere on the page.
 *
 * REFUSAL IS A FIRST-CLASS RENDER. UNMEASURED and BALANCED will be the common
 * answers most of the day. They draw the same panel furniture and say what is
 * missing, because a surface that only looks finished when it has drama teaches
 * the reader to wait for drama.
 *
 * Pure display: consumes an AbsorptionVM and derives no market truth.
 */

import * as React from "react";
import type { AbsorptionVM } from "@/lib/marketData/viewModels/selectAbsorption";

const GOLD = "#d4af37";
const GOLD_DIM = "#c9a55c";
const MUTED = "#8a8271";
const TEXT = "#d8cfb8";
const HAIR = "rgba(139,106,41,0.22)";
const BUY = "#00D4AA";
const SELL = "#FF4D6A";

export interface AbsorptionAnatomyPanelProps {
  readonly vm: AbsorptionVM;
  readonly symbol?: string;
  readonly window?: string;
}

const VERDICT_TONE: Record<AbsorptionVM["verdict"], string> = {
  ABSORBED: GOLD,
  EFFICIENT: BUY,
  BALANCED: MUTED,
  UNMEASURED: MUTED,
};

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
    <div style={{ minWidth: 96 }}>
      <div style={{ fontSize: 10, letterSpacing: 0.6, color: MUTED, textTransform: "uppercase" }}>
        {label}
      </div>
      <div
        style={{
          fontSize: 15,
          color: tone ?? TEXT,
          fontVariantNumeric: "tabular-nums",
          lineHeight: 1.35,
        }}
      >
        {value}
      </div>
      {note ? <div style={{ fontSize: 10, color: MUTED, lineHeight: 1.3 }}>{note}</div> : null}
    </div>
  );
}

/** A number that is absent renders as an em dash, never as zero. */
function num(v: number | null, digits = 2, suffix = ""): string {
  return v == null ? "—" : `${v.toFixed(digits)}${suffix}`;
}

function vol(v: number): string {
  return v.toLocaleString("en-US");
}

export function AbsorptionAnatomyPanel({
  vm,
  symbol,
  window: windowLabel,
}: AbsorptionAnatomyPanelProps): React.ReactElement {
  const total = vm.buyEffort + vm.sellEffort;
  // The bar is drawn at true proportion. When there is no effort at all both
  // halves are zero-width and the track shows through — that emptiness is the
  // honest picture of an unmeasured window.
  const buyPct = total > 0 ? (vm.buyEffort / total) * 100 : 0;
  const sellPct = total > 0 ? (vm.sellEffort / total) * 100 : 0;

  const tone = VERDICT_TONE[vm.verdict];

  return (
    <section
      aria-label="Absorption anatomy"
      data-testid="absorption-anatomy-panel"
      style={{
        border: `1px solid ${HAIR}`,
        borderRadius: 10,
        padding: "12px 14px",
        background: "rgba(255,255,255,0.015)",
      }}
    >
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
          Absorption Anatomy · Effort vs Response
        </span>
        <span style={{ fontSize: 11, color: MUTED, marginLeft: "auto" }}>
          {symbol ? `${symbol} · ` : ""}
          {windowLabel ?? "observed prints"}
        </span>
      </div>

      <div style={{ display: "flex", gap: 20, flexWrap: "wrap", alignItems: "flex-start" }}>
        {/* ── EFFORT ─────────────────────────────────────────────────────── */}
        <div style={{ flex: "1 1 220px", minWidth: 200 }}>
          <div
            style={{
              fontSize: 10,
              letterSpacing: 0.8,
              color: MUTED,
              textTransform: "uppercase",
              marginBottom: 6,
            }}
          >
            Effort · who was pressing
          </div>

          {/* the true-proportion bar. Low-alpha fills with a hairline top edge,
              per the /tv idiom: saturated blocks this size stop reading as data. */}
          <div
            style={{
              display: "flex",
              height: 14,
              borderRadius: 3,
              overflow: "hidden",
              background: "rgba(255,255,255,0.04)",
              marginBottom: 8,
            }}
            role="img"
            aria-label={`Aggressive buy volume ${vm.buyEffort}, aggressive sell volume ${vm.sellEffort}`}
          >
            <div
              style={{
                width: `${buyPct}%`,
                background: BUY,
                opacity: 0.55,
                borderTop: `1px solid ${BUY}`,
              }}
            />
            <div
              style={{
                width: `${sellPct}%`,
                background: SELL,
                opacity: 0.55,
                borderTop: `1px solid ${SELL}`,
              }}
            />
          </div>

          <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
            <Reading label="Aggressive buys" value={vol(vm.buyEffort)} tone={BUY} />
            <Reading label="Aggressive sells" value={vol(vm.sellEffort)} tone={SELL} />
            <Reading
              label="Imbalance"
              value={`${Math.round(vm.imbalance * 100)}%`}
              note={vm.pressingSide ? `${vm.pressingSide.toLowerCase()} pressing` : "neither side"}
              tone={vm.pressingSide ? GOLD : MUTED}
            />
          </div>
        </div>

        {/* ── RESPONSE ───────────────────────────────────────────────────── */}
        <div
          style={{
            flex: "1 1 220px",
            minWidth: 200,
            borderLeft: `1px solid ${HAIR}`,
            paddingLeft: 18,
          }}
        >
          <div
            style={{
              fontSize: 10,
              letterSpacing: 0.8,
              color: MUTED,
              textTransform: "uppercase",
              marginBottom: 6,
            }}
          >
            Response · what price did about it
          </div>

          <div style={{ display: "flex", gap: 16, flexWrap: "wrap", marginBottom: 6 }}>
            <Reading
              label="Displacement"
              value={num(vm.displacement, 2)}
              note="price travelled"
              tone={
                vm.displacement == null ? MUTED : vm.displacement >= 0 ? BUY : SELL
              }
            />
            <Reading
              label="In spreads"
              value={num(vm.displacementInSpread, 2, "×")}
              note="of this window's own spread"
            />
            <Reading
              label="Efficiency ratio"
              value={vm.efficiency == null ? "—" : vm.efficiency.toExponential(2)}
              note="price per unit of net effort"
            />
          </div>
          <div style={{ fontSize: 10, color: MUTED, lineHeight: 1.4 }}>
            The ratio is instrument-specific. Read it against its own history, never
            against another symbol.
          </div>
        </div>
      </div>

      {/* ── VERDICT + DISCLOSURE ─────────────────────────────────────────── */}
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
          Verdict
        </span>
        <span
          data-testid="absorption-verdict"
          style={{ fontSize: 13, letterSpacing: 0.9, color: tone, textTransform: "uppercase" }}
        >
          {vm.verdict}
        </span>
        <span style={{ fontSize: 11, color: MUTED, flex: "1 1 100%", lineHeight: 1.4 }}>
          {vm.detail}
        </span>

        {vm.requiresDisclosure ? (
          <div
            data-testid="absorption-disclosure"
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
              ? "Aggressor side: not disclosed by the feed. Every number above rests on sides this tape never stated."
              : vm.provenance === "MIXED"
                ? "Aggressor side: MIXED — some prints venue-stamped, some inferred by tick rule. The weakest evidence in the window sets this label."
                : "Aggressor side: INFERRED by tick rule, not stamped by the venue. Who initiated is a guess, so who absorbed is a guess about a guess."}
          </div>
        ) : null}
      </div>
    </section>
  );
}

export default AbsorptionAnatomyPanel;
