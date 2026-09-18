"use client";

/**
 * BigTradeIntelligenceView — the Founder's Asset 05, as a full symbol VIEW.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * WHAT THE PANEL SAYS
 *
 * Which prints in this window were large, how large relative to everything else
 * that traded, and which way they leaned. The ledger is the view: one row per
 * qualifying print, with a bar showing where it sat in the window's own size
 * distribution. A trader can see the shape of the tape, not just a count.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * TWO BASES, SHOWN SIDE BY SIDE, NEVER AVERAGED
 *
 * The chart's bubbles fire on an ABSOLUTE floor (`minBigTradeLot`). This panel
 * cuts at a PERCENTILE of the window. They disagree often, and the disagreement
 * is the reading: a quiet tape where the biggest prints are still small, or a
 * busy one where large is ordinary. `basisDivergenceNote` comes from the
 * compiler and is printed verbatim — this file never writes that sentence.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * ANTI-FABRICATION
 *
 * The mockup prints dollar notionals, an institutional/retail split, and a
 * "SMART MONEY: ACCUMULATING" verdict. None of those appear below. No selector
 * in this repo classifies a counterparty, and a notional would need a currency
 * the feed never states. Absent figures render as an em dash, never a zero.
 *
 * The buy/sell column carries a provenance disclosure at the top of the panel
 * because on the only live US-equity tape this product can reach, the side is
 * reconstructed by a tick rule rather than asserted by the venue. A
 * reconstructed side may not wear the same chrome as a stated one.
 */

import React from "react";
import type {
  BigTradeIntelligenceVM,
  LargePrint,
} from "@/lib/marketData/viewModels/selectBigTradeIntelligence";
import type { AggressorProvenance } from "@/lib/marketData/selectAggressorFlow";

const GOLD = "#d4af37";
const GOLD_DIM = "#c9a55c";
const MUTED = "#8a8271";
const TEXT = "#d8cfb8";
const HAIR = "rgba(139,106,41,0.22)";
const PANEL = "rgba(18,16,12,0.72)";

/**
 * §9 applies, and here a directional colour IS legitimate: buy and sell are
 * literal directions the tape stated, the same statement a candle's up colour
 * makes. It grades nothing.
 *
 * These are the room's EXISTING buy/sell pair, taken from AbsorptionAnatomyView
 * rather than chosen afresh — a second green for "buyer-initiated" would teach
 * the eye that the two surfaces were measuring two different things. The §9
 * sentinel beside this file already carries a signed allowance for this exact
 * shade on exactly that reasoning.
 *
 * An UNSIDED print is deliberately given the muted tone rather than a third
 * bright colour: it is an absence, and an absence should not compete for
 * attention with the two real readings.
 */
const SIDE_TONE = {
  buy: "#00D4AA",
  sell: "#FF4D6A",
  unsided: MUTED,
} as const;

const PROVENANCE_CHIP: Record<AggressorProvenance, string> = {
  PROVIDER: "SIDE · VENUE-STATED",
  INFERRED: "SIDE · RECONSTRUCTED",
  MIXED: "SIDE · MIXED BASIS",
  UNDISCLOSED: "SIDE · UNDISCLOSED",
};

function qty(v: number | null): string {
  if (v == null) return "—";
  const abs = Math.abs(v);
  const digits = abs >= 1000 ? 0 : abs >= 1 ? 2 : 4;
  return v.toLocaleString("en-US", { minimumFractionDigits: digits, maximumFractionDigits: digits });
}

function signedQty(v: number | null): string {
  if (v == null) return "—";
  return `${v > 0 ? "+" : ""}${qty(v)}`;
}

function pct(v: number | null): string {
  return v == null ? "—" : `${(v * 100).toFixed(1)}%`;
}

/** Price as printed, with only the DISPLAY rounded — never the datum. */
function px(v: number): string {
  return v >= 100 ? v.toFixed(2) : v.toFixed(4);
}

function clockOf(time: number | null): string {
  if (time == null) return "—";
  const d = new Date(time);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toISOString().slice(11, 19);
}

function Metric({
  label,
  value,
  note,
  tone = TEXT,
  testId,
}: {
  label: string;
  value: string;
  note: string;
  tone?: string;
  testId?: string;
}) {
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ fontSize: 9, letterSpacing: "0.1em", color: MUTED }}>{label}</div>
      <div data-testid={testId} style={{ fontSize: 19, color: tone, lineHeight: 1.25 }}>
        {value}
      </div>
      <div style={{ fontSize: 9.5, color: MUTED, lineHeight: 1.45, marginTop: 2 }}>{note}</div>
    </div>
  );
}

function PrintRow({ p }: { p: LargePrint }) {
  const tone = p.side == null ? SIDE_TONE.unsided : SIDE_TONE[p.side];
  return (
    <tr>
      <td style={{ padding: "5px 8px 5px 0", fontSize: 10, color: MUTED, whiteSpace: "nowrap" }}>
        {clockOf(p.time)}
      </td>
      <td style={{ padding: "5px 8px", fontSize: 11.5, color: TEXT, textAlign: "right" }}>
        {px(p.price)}
      </td>
      <td style={{ padding: "5px 8px", fontSize: 11.5, color: TEXT, textAlign: "right" }}>
        {qty(p.size)}
      </td>
      <td style={{ padding: "5px 8px", fontSize: 10, color: tone, letterSpacing: "0.06em" }}>
        {/* An absent side prints the word, not a guess and not a blank cell —
            a blank would read as an oversight rather than as a fact. */}
        {p.side == null ? "NO SIDE" : p.side === "buy" ? "BUY" : "SELL"}
      </td>
      <td style={{ padding: "5px 0 5px 8px", width: "38%" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
          <div
            style={{
              flex: 1,
              height: 5,
              borderRadius: 3,
              background: "rgba(139,106,41,0.16)",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                width: `${Math.max(2, p.sizePercentile * 100)}%`,
                height: "100%",
                background: p.clearsLotFloor ? GOLD : GOLD_DIM,
                opacity: p.clearsLotFloor ? 0.9 : 0.5,
              }}
            />
          </div>
          <span style={{ fontSize: 9.5, color: MUTED, minWidth: 34, textAlign: "right" }}>
            {(p.sizePercentile * 100).toFixed(0)}%
          </span>
        </div>
      </td>
    </tr>
  );
}

export interface BigTradeIntelligenceViewProps {
  readonly vm: BigTradeIntelligenceVM;
  readonly symbol: string;
  readonly timeframe?: string;
}

export default function BigTradeIntelligenceView({
  vm,
  symbol,
  timeframe,
}: BigTradeIntelligenceViewProps) {
  return (
    <div
      data-testid="big-trade-intelligence-view"
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
            BIG TRADE INTELLIGENCE
          </span>
          <span style={{ fontSize: 10.5, color: MUTED }}>
            {symbol}
            {timeframe ? ` · ${timeframe}` : ""} · {vm.windowPrints} prints observed
          </span>
        </div>
        <span
          data-testid="big-trade-provenance"
          style={{
            fontSize: 9.5,
            letterSpacing: "0.1em",
            color: vm.provenance === "PROVIDER" ? GOLD_DIM : MUTED,
            border: `1px solid ${HAIR}`,
            borderRadius: 3,
            padding: "3px 7px",
          }}
        >
          {PROVENANCE_CHIP[vm.provenance]}
        </span>
      </div>

      {/* The basis is printed at the top, not in a footnote, because it decides
          what the word LARGE means on every row below it. */}
      <p data-testid="big-trade-basis-note" style={{ fontSize: 10.5, color: MUTED, margin: "8px 0 0" }}>
        {vm.percentileBasisNote}
      </p>

      {!vm.measured ? (
        <p data-testid="big-trade-missing" style={{ fontSize: 11, color: MUTED, marginTop: 14 }}>
          {vm.missingInputNote}
        </p>
      ) : (
        <div className="wm-bt-grid">
          <div style={{ background: PANEL, border: `1px solid ${HAIR}`, borderRadius: 6, padding: 12 }}>
            <div style={{ fontSize: 9.5, letterSpacing: "0.1em", color: MUTED, marginBottom: 8 }}>
              LARGE PRINTS · {vm.largeCount} cleared the cut
              {vm.largeCount > vm.largePrints.length
                ? ` · showing the heaviest ${vm.largePrints.length}`
                : ""}
            </div>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr>
                  {["TIME (UTC)", "PRICE", "SIZE", "SIDE", "RANK IN WINDOW"].map((h, i) => (
                    <th
                      key={h}
                      style={{
                        fontSize: 8.5,
                        letterSpacing: "0.1em",
                        color: MUTED,
                        fontWeight: 400,
                        textAlign: i === 1 || i === 2 ? "right" : "left",
                        padding: "0 8px 6px",
                        borderBottom: `1px solid ${HAIR}`,
                      }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody data-testid="big-trade-ledger">
                {vm.largePrints.map((p) => (
                  <PrintRow key={`${p.time ?? "t"}-${p.price}-${p.size}`} p={p} />
                ))}
              </tbody>
            </table>
            <p style={{ fontSize: 9.5, color: MUTED, marginTop: 8, lineHeight: 1.5 }}>
              A bright bar is a print that would also have fired the chart&apos;s bubble at its
              absolute floor of {qty(vm.lotFloor)}. A dim bar stood out in this window only.
            </p>
          </div>

          <div style={{ background: PANEL, border: `1px solid ${HAIR}`, borderRadius: 6, padding: 12 }}>
            <div style={{ fontSize: 9.5, letterSpacing: "0.1em", color: MUTED, marginBottom: 10 }}>
              WINDOW SUMMARY
            </div>

            <Metric
              testId="big-trade-cut"
              label="LARGE PRINT CUT"
              value={qty(vm.thresholdSize)}
              note={`the ${Math.round(vm.thresholdPercentile * 100)}th percentile size in this window — a size the tape actually printed, not an interpolated one`}
              tone={GOLD}
            />

            <Metric
              testId="big-trade-net"
              label="NET LARGE FLOW"
              value={signedQty(vm.largeNet)}
              note={
                vm.largeNet == null
                  ? `${vm.largeUnsidedCount} of the large prints carried no side — a net over the rest would read as a verdict the tape did not support`
                  : "buyer-initiated minus seller-initiated, across the large prints only"
              }
              tone={
                vm.largeNet == null ? MUTED : vm.largeNet > 0 ? SIDE_TONE.buy : SIDE_TONE.sell
              }
            />

            <Metric
              testId="big-trade-share"
              label="SHARE OF WINDOW VOLUME"
              value={pct(vm.largeShareOfVolume)}
              note={`${qty(vm.largeVolume)} of ${qty(vm.windowVolume)} traded in this window went through the large prints`}
            />

            <div style={{ borderTop: `1px solid ${HAIR}`, paddingTop: 10, marginTop: 2 }}>
              <div style={{ fontSize: 9, letterSpacing: "0.1em", color: MUTED }}>
                AGAINST THE CHART&apos;S ABSOLUTE FLOOR
              </div>
              <div style={{ fontSize: 13, color: TEXT, marginTop: 3 }}>
                {vm.lotFloorCount} print{vm.lotFloorCount === 1 ? "" : "s"} ≥ {qty(vm.lotFloor)}
              </div>
              {/* Two bases, never averaged. The divergence sentence is the
                  compiler's, printed verbatim. */}
              <div
                data-testid="big-trade-divergence"
                style={{ fontSize: 9.5, color: MUTED, marginTop: 3, lineHeight: 1.45 }}
              >
                {vm.basisDivergenceNote ??
                  "both bases agree on this window — the same prints are large by either measure"}
              </div>
            </div>

            <div style={{ borderTop: `1px solid ${HAIR}`, paddingTop: 10, marginTop: 12 }}>
              <div style={{ fontSize: 9, letterSpacing: "0.1em", color: MUTED }}>HOW THE SIDE IS KNOWN</div>
              <div
                data-testid="big-trade-provenance-note"
                style={{ fontSize: 9.5, color: MUTED, marginTop: 3, lineHeight: 1.5 }}
              >
                {vm.provenanceNote}
              </div>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        .wm-bt-grid {
          display: grid;
          grid-template-columns: minmax(0, 1fr) minmax(0, 290px);
          gap: 12px;
          margin-top: 12px;
          align-items: start;
        }
        @media (max-width: 1100px) {
          .wm-bt-grid {
            grid-template-columns: minmax(0, 1fr);
          }
        }
      `}</style>
    </div>
  );
}
