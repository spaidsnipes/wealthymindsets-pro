"use client";

/**
 * RoomEquipmentLayer — the pixels for the ROOM → PREVIEW → DRAWER → ENTER →
 * RETURN grammar. `@/lib/workspace/equipmentJourney` owns the meaning; this
 * owns nothing but how much room the same intelligence gets.
 *
 * THE THREE DEPTHS, AND WHY THEY ARE DEPTHS AND NOT PAGES
 * ------------------------------------------------------
 *   PREVIEW  A widget docked at the edge of the room. Consequential
 *            information — the verdict, the headline, what is missing and what
 *            blocks — WITHOUT leaving the chart. The market is still there,
 *            still ticking, still the thing you are looking at.
 *
 *   DRAWER   The same widget given working space. More of the canvas, room to
 *            read it, and the market still above it. "A drawer creates
 *            additional working space while preserving market context."
 *
 *   FULL     The same projection at its complete professional depth, with the
 *            room's atmosphere rather than a white document. This is the only
 *            stage that takes the screen, and it is the only one with a RETURN.
 *
 * WHAT MAKES IT ONE ROOM
 * ----------------------
 * Every stage renders the SAME handed-down content — one compilation, three
 * depths. Nothing here fetches, computes, or re-derives. If FULL called a
 * compiler of its own
 * it could disagree with the widget the trader was looking at one click
 * earlier, and two disagreeing readings of one market is the "another semantic
 * brain" the grammar bans. The DECISION_ID is carried on every stage's DOM so
 * the identity is checkable from outside, not merely asserted here.
 *
 * NOTHING IS PERMANENT
 * --------------------
 * `closed` renders `null`. Not a collapsed bar, not a launcher chip, not a
 * "click to expand" stub. The chart is uncluttered because the equipment is
 * genuinely absent until asked for — the Workspace entry in the rail is the
 * one place it is asked for.
 */

import * as React from "react";

import type { EquipmentJourney } from "@/lib/workspace/equipmentJourney";

const FIELD = "#0b0c0f";
const PEARL = "#ede6d3";
const GOLD = "#c4a574";
const MUTED = "#8a8271";
const HAIR = "rgba(139,106,41,0.28)";

/**
 * WHICH MARKET THIS IS ABOUT — handed down, never derived.
 *
 * The full experience takes the whole screen, which means it takes the chart
 * away. Measured live on /command-deck, FULL then read "MARKET REALITY · WAIT"
 * over a canvas naming eight unresolved dimensions — with nothing anywhere on
 * that screen saying it was about NQ1! on a 15m. The trader left the subject
 * behind at exactly the depth where they can no longer see it for themselves.
 *
 * These two strings are the ROOM'S OWN bindings passed as props. Resolving a
 * symbol here would be a second brain: the full experience could then name a
 * different market than the chart the trader entered from.
 */
export interface EquipmentSubject {
  readonly symbol: string;
  readonly timeframe: string;
}

/**
 * WHAT THE EQUIPMENT IS ABOUT — a finished reading, handed down.
 *
 * The layer used to take a `MarketCanvasVM` directly and mount
 * `MarketCanvasPanel` itself, which meant exactly one invention could ever be
 * equipment. The directive's closing clause is "reuse that proven interaction
 * grammar across the remaining legitimate WM Pro inventions" — so the grammar
 * has to stop naming its first tenant.
 *
 * `renderDepth` is a CALLBACK the room supplies, not a view model the layer
 * interprets. That distinction is the whole safety property: the layer cannot
 * read this content, cannot re-derive it, and cannot disagree with it, because
 * it never holds the underlying object at all. It hands back one boolean —
 * "you have the whole screen now" — and renders whatever it is given.
 *
 * `title`, `verdict` and `headline` are the three strings the CHROME itself
 * has to draw (the gold label, the state word, the preview sentence). They are
 * strings, not objects, for the same reason: a string cannot be re-interpreted.
 */
export interface EquipmentContent {
  /** Must equal the journey's `equipmentId`. The layer refuses a mismatch. */
  readonly equipmentId: string;
  readonly title: string;
  readonly verdict: string;
  readonly headline: string;
  /** The small facts the preview shows instead of the full canvas. */
  readonly counts: ReadonlyArray<{ readonly testId: string; readonly label: string }>;
  /**
   * `unabridged` is TRUE only at full. The room decides what that buys; the
   * layer only promises the screen is no longer the constraint.
   */
  readonly renderDepth: (unabridged: boolean) => React.ReactElement;
}

export interface RoomEquipmentLayerProps {
  readonly journey: EquipmentJourney;
  readonly content: EquipmentContent;
  readonly subject: EquipmentSubject;
  readonly onExpand: () => void;
  /**
   * OPTIONAL, AND THAT IS THE WHOLE RULE.
   *
   * FULL is `position: fixed; inset: 0` over the field — it takes the screen,
   * which means it takes the chart. This file says so eleven lines above, in a
   * note written after measuring it live: at FULL the trader "left the subject
   * behind at exactly the depth where they can no longer see it for themselves."
   *
   * On the market canvas that is not a depth, it is an exit. The Last Mile
   * canon (2026-09-18 §2) lists `stage=full` in AUTOMATIC REJECT CHROME for the
   * default route, and §3's component law for these two buttons is "overlay
   * equipment wall, D≈0, CHART STAYS". A room whose whole job is to be a live
   * camera on a market cannot offer a door that closes the camera.
   *
   * So the capability is expressed by whether the ROOM hands it down, not by a
   * boolean the layer interprets. A `mayEnterFull={false}` flag would have put
   * the decision here, in the generic chrome, where the next room to be added
   * inherits whatever default we happened to pick. Absence has no default: a
   * room that cannot give up its market passes nothing, and the control it
   * cannot honour does not render.
   *
   * /command-deck still passes it. The deck is a document, not a camera —
   * nothing is lost by filling the screen with it.
   */
  readonly onEnter?: () => void;
  readonly onReturn: () => void;
  readonly onClose: () => void;
  /**
   * The market camera uses the blueprint's left equipment wall. Other rooms
   * retain the corner instrument until they deliberately adopt that scene.
   * This is placement only: journey, content, identity, and depth stay owned
   * by the same upstream grammar.
   */
  readonly placement?: "corner" | "market-dock";
}

/**
 * THE MEASURE OF THE FULL EXPERIENCE — ONE OBJECT, SPREAD TWICE.
 *
 * Measured live on wealthymindsetspro.com at FULL: the header ran edge to edge
 * (`MARKET REALITY · NQ1! · 15m` hard against the left margin, `RETURN TO ROOM`
 * hard against the right) while the canvas beneath it sat centred in a 1280
 * column starting a third of the way in. The chrome and the content disagreed
 * about where the page was, which reads as a toolbar bolted onto a document —
 * two things — at precisely the depth whose job is to feel like one.
 *
 * 1280, not 980: the canvas lays its ledgers out SIDEWAYS at this stage, and
 * 980 squeezed three columns to ~310px each — narrow enough that every evidence
 * line wrapped twice and the composition read as three cramped lists.
 *
 * Declared ONCE and spread into both. A header that carried its own copy of
 * these three properties is a second reading of one fact, and the way that
 * fails is silently: someone widens the body, the header stays, and nothing
 * breaks loudly enough to notice.
 */
const FULL_MEASURE: React.CSSProperties = {
  width: "100%",
  maxWidth: 1280,
  margin: "0 auto",
};

/** Controls, not decoration: 44px, real focus, and a name a screen reader reads. */
function Control({
  label,
  onClick,
  emphasis = false,
  testId,
}: {
  label: string;
  onClick: () => void;
  emphasis?: boolean;
  testId: string;
}): React.ReactElement {
  return (
    <button
      type="button"
      onClick={onClick}
      data-testid={testId}
      style={{
        minHeight: 44,
        padding: "0 14px",
        border: `1px solid ${emphasis ? GOLD : HAIR}`,
        background: emphasis ? "rgba(196,165,116,0.12)" : "transparent",
        color: emphasis ? PEARL : MUTED,
        fontSize: 11,
        letterSpacing: 0.6,
        textTransform: "uppercase",
        fontFamily: "inherit",
        cursor: "pointer",
      }}
    >
      {label}
    </button>
  );
}

export function RoomEquipmentLayer({
  journey,
  content,
  subject,
  onExpand,
  onEnter,
  onReturn,
  onClose,
  placement = "corner",
}: RoomEquipmentLayerProps): React.ReactElement | null {
  const { stage, decisionId, equipmentId } = journey;

  // Escape is the same gesture at every depth, and it always means "one step
  // back towards the market" — never "throw the journey away". From FULL it
  // RETURNS (the trader keeps their place); anywhere else it closes.
  React.useEffect(() => {
    if (stage === "closed") return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      if (stage === "full") onReturn();
      else onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [stage, onReturn, onClose]);

  // The id is compared against the CONTENT the room handed down, never against
  // a literal. A hardcoded name here was the thing that made this layer the
  // market canvas's private chrome; a mismatch is still refused, because the
  // rail asking for equipment B while the room hands equipment A's reading is
  // exactly the disagreement the grammar exists to prevent.
  if (stage === "closed" || equipmentId !== content.equipmentId) return null;

  const marketDock = placement === "market-dock" && stage !== "full";
  const shell: React.CSSProperties =
    stage === "full"
      ? {
          position: "fixed",
          inset: 0,
          zIndex: 70,
          background: FIELD,
          display: "flex",
          flexDirection: "column",
          padding: "20px 24px",
          overflowY: "auto",
        }
      : marketDock
        ? {
            position: "fixed",
            left: 18,
            top: 92,
            // PREVIEW is a glanceable instrument, not a blank full-height
            // drawer. FL-06 keeps the inspect ticket subordinate to price;
            // only DRAWER earns the full left-wall working depth.
            ...(stage === "drawer" ? { bottom: 18 } : { maxHeight: 220 }),
            zIndex: 60,
            width: "clamp(280px, 22vw, 340px)",
            display: "flex",
            flexDirection: "column",
            // An instrument replaces the Tools rail while held. Keep its wall
            // fully opaque so the retired tile stack cannot ghost through.
            background: FIELD,
            border: `1px solid ${HAIR}`,
            borderLeftColor: "rgba(196,165,116,0.42)",
            boxShadow: "18px 0 46px rgba(0,0,0,0.42)",
            overflow: "hidden",
          }
        : {
          position: "fixed",
          right: 18,
          bottom: 18,
          zIndex: 60,
          width: "min(420px, calc(100vw - 36px))",
          // The drawer is taller, not wider, and never full-height: the market
          // above it has to stay visible or this stops being the same room.
          maxHeight: stage === "drawer" ? "min(58vh, 560px)" : 220,
          display: "flex",
          flexDirection: "column",
          background: FIELD,
          border: `1px solid ${HAIR}`,
          boxShadow: "0 18px 46px rgba(0,0,0,0.55)",
          overflow: "hidden",
          };

  return (
    <>
      {marketDock ? (
        <style>{`
          @media (max-width: 1023px) {
            .wm-room-equipment--market-dock {
              left: 18px !important;
              right: 18px !important;
              top: auto !important;
              bottom: 18px !important;
              width: auto !important;
              max-height: min(58vh, 560px) !important;
              box-shadow: 0 18px 46px rgba(0,0,0,0.55) !important;
            }
          }
        `}</style>
      ) : null}
      <aside
        aria-label={`${content.title} — room equipment`}
        className={marketDock ? "wm-room-equipment--market-dock" : undefined}
        data-testid="room-equipment"
        data-equipment={equipmentId}
        data-equipment-stage={stage}
        data-equipment-placement={placement}
        data-decision-id={decisionId ?? undefined}
        style={shell}
      >
      <header
        data-testid="room-equipment-header"
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          padding: stage === "full" ? "0 0 14px" : "10px 12px",
          borderBottom: `1px solid ${HAIR}`,
          flex: "0 0 auto",
          ...(stage === "full" ? FULL_MEASURE : null),
        }}
      >
        <span
          style={{
            fontSize: 10,
            letterSpacing: 1.1,
            textTransform: "uppercase",
            color: GOLD,
          }}
        >
          {content.title}
        </span>
        {/* The subject, at every depth. It matters MOST at full — that stage
            takes the chart away, so this line is the only thing left saying
            which market the canvas is about. Handed in; never resolved here. */}
        <span
          data-testid="equipment-subject"
          style={{ fontSize: 11, letterSpacing: 0.4, color: PEARL }}
        >
          {subject.symbol}
          <span style={{ color: MUTED }}> · {subject.timeframe}</span>
        </span>
        <span style={{ fontSize: 10, letterSpacing: 0.5, color: MUTED, textTransform: "uppercase" }}>
          {content.verdict}
        </span>
        <span style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
          {stage === "full" ? (
            // RETURN is the promise the whole grammar rests on, so it is the
            // emphasised control in the full experience — not a back-arrow
            // the trader has to find.
            <Control label="Return to room" onClick={onReturn} emphasis testId="equipment-return" />
          ) : (
            <>
              {stage === "preview" && (
                <Control label="Open drawer" onClick={onExpand} testId="equipment-expand" />
              )}
              {/* No handler, no door. Not disabled — a disabled ENTER still
                  advertises a depth this room does not have, and the trader
                  spends a click finding that out. */}
              {onEnter && (
                <Control label="Enter" onClick={onEnter} emphasis testId="equipment-enter" />
              )}
              <Control label="Close" onClick={onClose} testId="equipment-close" />
            </>
          )}
        </span>
      </header>

      <div
        data-testid="room-equipment-body"
        style={{
          flex: "1 1 auto",
          minHeight: 0,
          overflowY: "auto",
          padding: stage === "full" ? "14px 0 0" : "0 12px 12px",
          width: "100%",
          // The SAME object the header spreads — see FULL_MEASURE. A column
          // pinned to the left edge of a 1568px screen is not a full
          // experience, it is a drawer that lost its dock; centring is what
          // makes the extra width read as composition rather than stretch.
          ...(stage === "full" ? FULL_MEASURE : null),
        }}
      >
        {stage === "preview" ? (
          // The widget says the consequential thing and stops. Everything it
          // shows is also in the full experience — it is a shallower read of
          // ONE compilation, never a summary computed somewhere else.
          <div style={{ paddingTop: 10, display: "flex", flexDirection: "column", gap: 8 }}>
            <div style={{ fontSize: 12, color: "#d8cfb8", lineHeight: 1.4 }}>{content.headline}</div>
            <div style={{ display: "flex", gap: 14, fontSize: 10, color: MUTED, letterSpacing: 0.5 }}>
              {content.counts.map((c) => (
                <span key={c.testId} data-testid={c.testId}>
                  {c.label}
                </span>
              ))}
            </div>
          </div>
        ) : (
          // ONE compilation, and at FULL it is finally allowed to say all of
          // itself. The drawer caps its lists because it is a drawer;
          // withholding those same rows on a full screen would make ENTER a
          // change of size rather than a change of depth. WHAT gets uncapped is
          // the room's business — the layer only reports that the screen is no
          // longer the constraint.
          content.renderDepth(stage === "full")
        )}
      </div>
      </aside>
    </>
  );
}

export default RoomEquipmentLayer;
