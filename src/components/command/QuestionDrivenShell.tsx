"use client";

/**
 * QuestionDrivenShell — the OS frame from the Founder's QUESTION-DRIVEN MODE
 * mockup.
 *
 *   "build whats in the visuals cannon ... this is what i should start seeing"
 *
 * The mockup is not a page. It is an OPERATING SYSTEM silhouette, and the deck
 * had none of it: no left rail, no persistent state readout, no footer bar. It
 * was a single scrolling column of numbered drawers. That silhouette is why
 * the SAME-APP REJECTION TEST kept failing — the content was canon, the SHAPE
 * was a dashboard.
 *
 * This component supplies the shape:
 *
 *   ┌────────┬──────────────────────────────────┐
 *   │  RAIL  │  the room (children)             │
 *   │  rooms │                                  │
 *   │  ────  │                                  │
 *   │  state │                                  │
 *   ├────────┴──────────────────────────────────┤
 *   │  EVIDENCE DEBT   ·   RIGHT OF WAY         │
 *   └───────────────────────────────────────────┘
 *
 * TRUTHFULNESS RULES THIS SHELL OBEYS
 *
 * 1. The rail lists ROOMS THAT EXIST. The mockup shows "Order Flow" and
 *    "Context Library" as separate rooms; this app does not have them as
 *    routes, and inventing a rail entry that 404s would be a painted door.
 *    The rail names only what the Founder can actually walk into.
 *
 * 2. The footer renders COUNTS, not severities. The mockup shows
 *    "EVIDENCE DEBT · HIGH · 3 Open Items". `HIGH` has no producer in this
 *    repo — there is no compiled severity band — so the shell renders the
 *    open-item count that `computeEvidenceDebt` genuinely owns and says
 *    nothing about severity. A painted "HIGH" would be the JPEG's $1.80.
 *
 * 3. Nothing here derives. Every value arrives as a prop already compiled by
 *    `selectOneStory` / `computeEvidenceDebt` / `computeRightOfWay`.
 *
 * TOKENS — Visual Implementation Pack §1: field #07080a, pearl #ede6d3,
 * antique gold #c4a574 for BRAND AND RULES ONLY. Risk wears independent amber.
 */

import * as React from "react";
// The instrument view has ONE owner. Retyping "/charts" here would make this
// rail a second definition of the Founder landing route — the founderLanding
// Sentinel caught exactly that on the first cut of this file.
import { INSTRUMENT_VIEW_ROUTE } from "@/lib/routing/founderLanding";

export interface ShellRoom {
  readonly label: string;
  readonly href: string;
}

export interface QuestionDrivenShellProps {
  /** Route of the room currently being rendered, for the active marker. */
  readonly activeHref: string;
  /**
   * Open evidence items. `null` when no ledger compiled — rendered as UNKNOWN,
   * never as zero, because "0 open" is a clean bill of health for a ledger
   * that was never opened.
   */
  readonly openEvidenceItems: number | null;
  /** Compiled Right-of-Way verdict. */
  readonly rightOfWay: string;
  /** Whether the verdict is a real reading (false ⇒ wears the UNKNOWN look). */
  readonly rightOfWayResolved: boolean;
  readonly children: React.ReactNode;
}

/**
 * The rooms the Founder can actually walk into today. Ordered by the canon's
 * FIVE ROOMS progression (desk → explore → review → pregame), not by the
 * mockup's panel order, because the mockup's entries are panels within one
 * room and these are rooms.
 */
export const SHELL_ROOMS: readonly ShellRoom[] = [
  { label: "Question-Driven", href: "/command-deck" },
  { label: "Chart", href: INSTRUMENT_VIEW_ROUTE },
  { label: "Heatmap", href: "/heatmaps" },
  { label: "Passport", href: "/nectar" },
  { label: "Journal", href: "/journal" },
  { label: "Proof Lane", href: "/proof-lane" },
  { label: "Morning Prep", href: "/morning-prep" },
];

const EYEBROW: React.CSSProperties = {
  fontSize: 9,
  letterSpacing: 1.5,
  textTransform: "uppercase",
  fontFamily: "Georgia, 'Times New Roman', serif",
  color: "#8a8271",
};

function StateReadout({
  label,
  value,
  detail,
  unresolved,
  alert,
}: {
  label: string;
  value: string;
  detail: string;
  unresolved: boolean;
  alert: boolean;
}): React.ReactElement {
  const ink = unresolved ? "#8a8271" : alert ? "#e07b5c" : "#ede6d3";
  return (
    <div style={{ display: "flex", alignItems: "baseline", gap: 10, minWidth: 0, flex: "1 1 220px" }}>
      <span style={{ ...EYEBROW, whiteSpace: "nowrap" }}>{label}</span>
      <span
        style={{
          fontFamily: "Georgia, 'Times New Roman', serif",
          fontSize: 15,
          fontWeight: 600,
          letterSpacing: 0.4,
          color: ink,
          fontStyle: unresolved ? "italic" : "normal",
          whiteSpace: "nowrap",
        }}
      >
        {value}
      </span>
      <span style={{ fontSize: 10, color: "#6f6a5e", minWidth: 0 }}>{detail}</span>
    </div>
  );
}

export function QuestionDrivenShell({
  activeHref,
  openEvidenceItems,
  rightOfWay,
  rightOfWayResolved,
  children,
}: QuestionDrivenShellProps): React.ReactElement {
  const debtUnknown = openEvidenceItems === null;
  const debtValue = debtUnknown
    ? "UNKNOWN"
    : openEvidenceItems === 0
      ? "PAID"
      : `${openEvidenceItems} OPEN`;

  return (
    <div
      data-testid="question-driven-shell"
      style={{ display: "flex", flexDirection: "column", gap: 12, minWidth: 0 }}
    >
      <div
        className="wm-qd-body"
        style={{ display: "flex", alignItems: "flex-start", gap: 14, minWidth: 0 }}
      >
        {/* LEFT RAIL — the OS silhouette. Hidden below 900px, where a rail
            would eat the room the chart needs; the shell's phone form is the
            existing bottom nav, which already owns that job. */}
        <nav
          className="wm-qd-rail"
          aria-label="Rooms"
          data-testid="question-driven-rail"
          style={{
            position: "sticky",
            top: 12,
            flex: "0 0 176px",
            display: "flex",
            flexDirection: "column",
            gap: 2,
            padding: "14px 0",
            borderRight: "1px solid rgba(196,165,116,0.20)",
          }}
        >
          <div style={{ ...EYEBROW, padding: "0 14px 10px", color: "#c4a574" }}>Rooms</div>

          {SHELL_ROOMS.map((room) => {
            const active = room.href === activeHref;
            return (
              <a
                key={room.href}
                href={room.href}
                aria-current={active ? "page" : undefined}
                style={{
                  position: "relative",
                  display: "block",
                  padding: "9px 14px",
                  fontSize: 12,
                  letterSpacing: 0.3,
                  textDecoration: "none",
                  color: active ? "#ede6d3" : "#8a8271",
                  fontWeight: active ? 600 : 400,
                  background: active ? "rgba(196,165,116,0.07)" : "transparent",
                  // 44px-class target for the tablet form factor.
                  minHeight: 36,
                }}
              >
                {active && (
                  <span
                    aria-hidden
                    style={{
                      position: "absolute",
                      left: 0,
                      top: 6,
                      bottom: 6,
                      width: 2,
                      background: "#c4a574",
                    }}
                  />
                )}
                {room.label}
              </a>
            );
          })}
        </nav>

        <div style={{ flex: "1 1 auto", minWidth: 0, display: "flex", flexDirection: "column", gap: 12 }}>
          {children}
        </div>
      </div>

      {/* FOOTER BAR — the mockup's persistent state strip. It repeats no
          sentence from the canvas above; it carries the two standing
          conditions the trader must never have to scroll to find. */}
      <footer
        aria-label="Standing conditions"
        data-testid="question-driven-footer"
        style={{
          display: "flex",
          flexWrap: "wrap",
          alignItems: "center",
          gap: 20,
          padding: "14px 18px",
          borderTop: "1px solid rgba(196,165,116,0.30)",
          background: "linear-gradient(0deg, rgba(196,165,116,0.05) 0%, rgba(7,8,10,0) 100%)",
        }}
      >
        <StateReadout
          label="Evidence Debt"
          value={debtValue}
          detail={debtUnknown ? "no ledger compiled" : "unpaid information"}
          unresolved={debtUnknown}
          alert={!debtUnknown && (openEvidenceItems ?? 0) > 0}
        />
        <StateReadout
          label="Right of Way"
          value={rightOfWay}
          detail={rightOfWayResolved ? "compiled from evidence" : "no permission reading"}
          unresolved={!rightOfWayResolved}
          alert={rightOfWayResolved && rightOfWay !== "ACTION"}
        />
      </footer>

      <style>{`
        @media (max-width: 900px) {
          .wm-qd-rail { display: none !important; }
        }
      `}</style>
    </div>
  );
}

export default QuestionDrivenShell;
