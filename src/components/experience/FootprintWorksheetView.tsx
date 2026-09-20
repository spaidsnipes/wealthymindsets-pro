"use client";

/**
 * FootprintWorksheetView — Asset 18, ORDER FLOW LONG DIVISION.
 *
 * WHAT THIS COMPONENT IS, AND WHAT IT DELIBERATELY IS NOT.
 *
 * It is NOT a second worksheet renderer. The seven steps are drawn by
 * `DivisionWorksheetView`, unchanged, because Asset 18's steps ARE Asset 01's
 * steps — same labels, same order, same arithmetic — pointed at a smaller
 * dividend. Forking the renderer would give the OS two long-division surfaces
 * free to drift apart, which is the exact failure a worksheet exists to expose.
 *
 * What this component adds is the ONE thing Asset 18 has that Asset 01 does not:
 * THE LADDER, and the account of which rung of it was divided. The mockup draws
 * a selected footprint with no explanation of how it was selected — a picture
 * can do that, a running surface cannot. So the ladder is drawn beside the
 * worksheet with the divided level marked, and the rule that marked it is
 * printed underneath in words.
 *
 * ── NO HUE CARRIES MEANING ──────────────────────────────────────────────────
 *
 * Build Order §9: nothing may be graded in hue. The bid and ask bars here are
 * drawn in ONE colour at different LENGTHS. Length is the measurement; a red bar
 * and a green bar would be a verdict painted onto volume, and this room has
 * repeatedly paid for surfaces that let a colour say what no owner computed.
 * The selected rung is marked by a rule and a text marker — not by a fill.
 */

import React from "react";

import DivisionWorksheetView from "@/components/experience/DivisionWorksheetView";
import type {
  FootprintLadderLevel,
  FootprintWorksheetVM,
} from "@/lib/marketData/viewModels/selectFootprintWorksheet";

const GOLD = "#c9a227";
const TEXT = "rgba(240,235,222,0.92)";
const MUTED = "rgba(240,235,222,0.55)";
const HAIR = "rgba(139,106,41,0.22)";
const PANEL = "rgba(18,16,12,0.72)";
/** One ink for both sides. Length measures; colour must not. */
const INK = "rgba(201,162,39,0.58)";

export interface FootprintWorksheetViewProps {
  readonly vm: FootprintWorksheetVM;
  readonly symbol: string;
  readonly timeframe?: string;
}

const money = (n: number): string =>
  n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const qty = (n: number): string =>
  Number.isInteger(n) ? n.toLocaleString("en-US") : n.toLocaleString("en-US", { maximumFractionDigits: 2 });

function LadderRow({
  level,
  widest,
  selected,
}: {
  readonly level: FootprintLadderLevel;
  readonly widest: number;
  readonly selected: boolean;
}): React.ReactElement {
  // Both sides scale against the SAME widest single-side value across the whole
  // ladder. Scaling each row to its own maximum would make every row look
  // equally busy and quietly destroy the comparison the ladder exists for.
  const bidPct = widest > 0 ? (level.bid / widest) * 100 : 0;
  const askPct = widest > 0 ? (level.ask / widest) * 100 : 0;

  return (
    <li
      data-testid="footprint-ladder-row"
      data-selected={selected ? "true" : "false"}
      style={{
        listStyle: "none",
        display: "grid",
        gridTemplateColumns: "1fr 78px 1fr",
        alignItems: "center",
        gap: 8,
        padding: "3px 6px",
        borderRadius: 4,
        // The selected rung is marked structurally, never by a fill colour.
        border: selected ? `1px solid ${GOLD}` : "1px solid transparent",
      }}
    >
      {/* SELL SIDE — seller-initiated, drawn growing leftward from the price. */}
      <div style={{ display: "flex", justifyContent: "flex-end", alignItems: "center", gap: 6 }}>
        <span style={{ fontSize: 10, color: MUTED, fontFamily: "ui-monospace, monospace" }}>
          {level.bid > 0 ? qty(level.bid) : ""}
        </span>
        <div style={{ width: `${bidPct}%`, height: 9, background: INK, borderRadius: 2 }} />
      </div>

      <span
        style={{
          fontSize: 11,
          textAlign: "center",
          color: selected ? GOLD : TEXT,
          fontFamily: "ui-monospace, monospace",
        }}
      >
        {money(level.priceLevel)}
      </span>

      {/* BUY SIDE — buyer-initiated, growing rightward. */}
      <div style={{ display: "flex", justifyContent: "flex-start", alignItems: "center", gap: 6 }}>
        <div style={{ width: `${askPct}%`, height: 9, background: INK, borderRadius: 2 }} />
        <span style={{ fontSize: 10, color: MUTED, fontFamily: "ui-monospace, monospace" }}>
          {level.ask > 0 ? qty(level.ask) : ""}
        </span>
      </div>
    </li>
  );
}

export function FootprintWorksheetView({
  vm,
  symbol,
  timeframe,
}: FootprintWorksheetViewProps): React.ReactElement {
  const widest = vm.ladder.reduce((m, l) => Math.max(m, l.bid, l.ask), 0);

  return (
    <div
      data-testid="footprint-worksheet-view"
      data-levels={vm.ladder.length}
      data-selected-index={vm.selectedIndex === null ? "none" : String(vm.selectedIndex)}
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 14,
        padding: "14px 16px 4px",
        color: TEXT,
        fontFamily: "Georgia, 'Times New Roman', serif",
      }}
    >
      <section
        aria-label={`Order flow ladder for ${symbol}`}
        data-testid="footprint-ladder"
        style={{
          background: PANEL,
          border: `1px solid ${HAIR}`,
          borderRadius: 6,
          padding: "12px 12px 10px",
          display: "flex",
          flexDirection: "column",
          gap: 8,
        }}
      >
        <header style={{ display: "flex", alignItems: "baseline", gap: 10, flexWrap: "wrap" }}>
          <span style={{ fontSize: 13, letterSpacing: 1.4, color: GOLD, textTransform: "uppercase" }}>
            Order Flow Ladder
          </span>
          <span style={{ fontSize: 11, color: MUTED }}>
            {symbol}
            {timeframe ? ` · ${timeframe}` : ""}
          </span>
        </header>

        {vm.ladder.length > 0 ? (
          <>
            {/* The axis is named in words. A trader must never have to infer
                which side of the centre line means what. */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 78px 1fr",
                gap: 8,
                fontSize: 9.5,
                letterSpacing: 0.8,
                color: MUTED,
                textTransform: "uppercase",
              }}
            >
              <span style={{ textAlign: "right" }}>Seller crossed (bid)</span>
              <span style={{ textAlign: "center" }}>Price</span>
              <span>Buyer crossed (ask)</span>
            </div>

            <ul style={{ margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 2 }}>
              {vm.ladder.map((level, i) => (
                <LadderRow
                  key={level.priceLevel}
                  level={level}
                  widest={widest}
                  selected={i === vm.selectedIndex}
                />
              ))}
            </ul>

            <p
              data-testid="footprint-selection-basis"
              style={{ margin: 0, fontSize: 11, lineHeight: 1.6, color: MUTED }}
            >
              {vm.selectionBasis}
            </p>
          </>
        ) : (
          <p
            data-testid="footprint-ladder-absent"
            style={{ margin: 0, fontSize: 11.5, lineHeight: 1.65, color: MUTED }}
          >
            {vm.reason}
          </p>
        )}
      </section>

      {/* THE SEVEN STEPS — the shared renderer, retitled so the two divisions on
          this screen can never be mistaken for one disagreeing with itself. */}
      <DivisionWorksheetView
        vm={vm}
        symbol={symbol}
        timeframe={timeframe}
        instanceId="level"
        title="Order Flow Long Division"
        dividendNote={
          vm.selectedIndex === null
            ? "This division has no dividend yet — the ladder above says why."
            : `The same seven steps as the window worksheet, divided over ONE price level: ${money(
                vm.ladder[vm.selectedIndex].priceLevel,
              )}.`
        }
      />
    </div>
  );
}

export default FootprintWorksheetView;
