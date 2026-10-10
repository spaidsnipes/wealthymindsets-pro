"use client";

/**
 * The trade ticket's body in the order `ticketLayout` gives it. ONE set of section elements is
 * passed in and each is rendered exactly once. Tablet / desktop: the flowing order. Phone (≤ 430 px):
 *   PEEK   — quote, a waiting proposal, side buttons, the order line;
 *   BUILD  — closing, quantity, price, stop / target, risk line, "Review & preview ▸";
 *   REVIEW — the live-order block alone, "◂ Edit";
 * then one "Details" disclosure whose summary states the book. Hiding is CSS only: every section
 * stays mounted in every state, so nothing a trader typed and no live order's state is ever lost.
 * Pure view — it owns no state and no gate.
 */

import React from "react";

import { wideColumns, COMPACT_BUILD_SECTIONS, COMPACT_PEEK_SECTIONS, COMPACT_REVIEW_SECTIONS, ticketSections, type TicketSection, type TicketStep } from "@/lib/execution/ticketLayout";

const GOLD = "#C9A55C", MUTED = "#8a8271", LINE = "rgba(139,106,41,0.35)";
const show = (on: boolean): React.CSSProperties => ({ display: on ? "contents" : "none" });
const stepBtn = (on: boolean): React.CSSProperties => ({ minHeight: 36, padding: "0 12px", borderRadius: 6, border: `1px solid ${on ? GOLD : LINE}`, background: on ? `${GOLD}22` : "transparent", color: on ? GOLD : MUTED, fontSize: 12, fontWeight: 700, cursor: on ? "pointer" : "not-allowed", justifySelf: "start" });

export function TicketSections({ compact, bookActive = false, peek = false, step = null, review, inFlight = false, onReview, onEdit, sections, summary }: {
  readonly compact: boolean;
  /** Wide ticket: a position is held or an order is working, so the book block joins the entry path. */
  readonly bookActive?: boolean;
  /** Phone PEEK: everything past the side buttons is hidden with CSS — still mounted, state kept. */
  readonly peek?: boolean;
  /** Phone ACT step. */
  readonly step?: TicketStep | null;
  /** May "Review & preview ▸" be pressed; the reason is shown beside the button when it may not. */
  readonly review?: { readonly allowed: boolean; readonly reason: string | null };
  /** An order is in flight: "◂ Edit" is refused and says so. */
  readonly inFlight?: boolean;
  readonly onReview?: () => void;
  readonly onEdit?: () => void;
  readonly sections: Readonly<Record<TicketSection, React.ReactNode>>;
  /** "Details · FLAT · 0 working" */
  readonly summary: string;
}) {
  const layout = ticketSections(compact, bookActive);
  const each = (ids: readonly TicketSection[]) => ids.map(id => <React.Fragment key={id}>{sections[id]}</React.Fragment>);
  if (!compact) {
    const cols = wideColumns(bookActive);
    // Tablet / desktop ACT: the entry path, then ONE Details fold (the same disclosure the phone uses).
    return (
      <>
        {/* Two parts so a wide desk can stand them side by side (globals.css, ≥ 1100 px): what the trader sets,
            and the live-order block that previews and sends it. Measured on serving 52824b6 at 1440 × 900 in one
            column: the path ran 865 px in an 810 px panel (the live-order block alone is 314 px). */}
        <div data-testid="trade-entry-path" data-book={bookActive ? "active" : "flat"} className="wm-ticket-entry-path">
          <div data-testid="trade-entry-inputs" style={{ display: "grid", gap: 10, minWidth: 0, alignContent: "start" }}>{each(cols[0]!)}</div>
          {bookActive ? <div data-testid="trade-entry-book" style={{ display: "grid", gap: 10, minWidth: 0, alignContent: "start" }}>{each(cols[1]!)}</div> : null}
          <div data-testid="trade-entry-send" style={{ display: "grid", gap: 10, minWidth: 0, alignContent: "start" }}>{each(cols[cols.length - 1]!)}</div>
        </div>
        <details data-testid="trade-details" style={{ border: `1px solid ${LINE}`, borderRadius: 8, padding: "6px 8px" }}>
          <summary data-testid="trade-details-summary" style={{ cursor: "pointer", color: GOLD, fontWeight: 600, minHeight: 32 }}>{summary}</summary>
          <div style={{ display: "grid", gap: 10, marginTop: 8 }}>{each(layout.details)}</div>
        </details>
      </>
    );
  }
  const reviewing = step === "REVIEW";
  const canReview = review?.allowed ?? true;
  return (
    <>
      {each(COMPACT_PEEK_SECTIONS.filter(id => id === "QUOTE"))}
      <div data-testid="trade-pick-sections" hidden={reviewing} style={show(!reviewing)}>
        {each(COMPACT_PEEK_SECTIONS.filter(id => id !== "QUOTE"))}
      </div>
      <div data-testid="trade-act-sections" data-folded={peek ? "yes" : "no"} hidden={peek} style={show(!peek)}>
        <div data-testid="trade-build-sections" hidden={reviewing} style={show(!reviewing)}>
          {each(COMPACT_BUILD_SECTIONS)}
          <button type="button" data-testid="trade-review" disabled={!canReview} aria-describedby={!canReview ? "trade-review-refusal" : undefined}
            onClick={() => { if (canReview) onReview?.(); }} style={stepBtn(canReview)}>Review &amp; preview ▸</button>
          {!canReview ? <span id="trade-review-refusal" role="status" data-testid="trade-review-refusal" style={{ color: GOLD, fontSize: 11 }}>{review?.reason}</span> : null}
        </div>
        <div data-testid="trade-review-sections" hidden={!reviewing} style={show(reviewing)}>
          <button type="button" data-testid="trade-edit" disabled={inFlight} onClick={() => { if (!inFlight) onEdit?.(); }} style={stepBtn(!inFlight)}>
            {inFlight ? "IN FLIGHT · the order stays in view" : "◂ Edit"}
          </button>
          {each(COMPACT_REVIEW_SECTIONS)}
        </div>
      </div>
      {/* REVIEW is the live-order block alone: Details folds out of the way (CSS only — still mounted). Measured on
          serving b290eef at 390: with Details below it REVIEW ran 26 px past the sheet. */}
      <details data-testid="trade-details" hidden={reviewing} style={{ display: reviewing ? "none" : undefined, border: `1px solid ${LINE}`, borderRadius: 8, padding: "6px 8px" }}>
        <summary data-testid="trade-details-summary" style={{ cursor: "pointer", color: GOLD, fontWeight: 600, minHeight: 32 }}>{summary}</summary>
        <div style={{ display: "grid", gap: 10, marginTop: 8 }}>
          {each(layout.details)}
        </div>
      </details>
    </>
  );
}
