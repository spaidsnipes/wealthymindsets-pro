"use client";

/**
 * The trade ticket's body in the order `ticketLayout` gives it. ONE set of section elements is
 * passed in and each is rendered exactly once: on tablet / desktop in the flowing order; on a phone
 * (≤ 430 px) the action path first and the rest behind one "Details" disclosure whose summary
 * states the book. Pure view — it owns no state and no gate.
 */

import React from "react";

import { ticketSections, type TicketSection } from "@/lib/execution/ticketLayout";

const GOLD = "#C9A55C", LINE = "rgba(139,106,41,0.35)";

export function TicketSections({ compact, sections, summary }: {
  readonly compact: boolean;
  readonly sections: Readonly<Record<TicketSection, React.ReactNode>>;
  /** "Details · FLAT · 0 working" */
  readonly summary: string;
}) {
  const layout = ticketSections(compact);
  return (
    <>
      {layout.action.map(id => <React.Fragment key={id}>{sections[id]}</React.Fragment>)}
      {layout.details.length ? (
        <details data-testid="trade-details" style={{ border: `1px solid ${LINE}`, borderRadius: 8, padding: "6px 8px" }}>
          <summary data-testid="trade-details-summary" style={{ cursor: "pointer", color: GOLD, fontWeight: 600, minHeight: 32 }}>{summary}</summary>
          <div style={{ display: "grid", gap: 10, marginTop: 8 }}>
            {layout.details.map(id => <React.Fragment key={id}>{sections[id]}</React.Fragment>)}
          </div>
        </details>
      ) : null}
    </>
  );
}
