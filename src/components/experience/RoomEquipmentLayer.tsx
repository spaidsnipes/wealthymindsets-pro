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
 * Every stage renders the SAME `vm` — one compilation, handed down. Nothing
 * here fetches, computes, or re-derives. If FULL called a compiler of its own
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

import type { MarketCanvasVM } from "@/lib/marketData/viewModels/selectMarketCanvas";
import type { EquipmentJourney } from "@/lib/workspace/equipmentJourney";
import { MarketCanvasPanel } from "./MarketCanvasPanel";

const FIELD = "#0b0c0f";
const PEARL = "#ede6d3";
const GOLD = "#c4a574";
const MUTED = "#8a8271";
const HAIR = "rgba(139,106,41,0.28)";

export interface RoomEquipmentLayerProps {
  readonly journey: EquipmentJourney;
  readonly vm: MarketCanvasVM;
  readonly onExpand: () => void;
  readonly onEnter: () => void;
  readonly onReturn: () => void;
  readonly onClose: () => void;
}

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
  vm,
  onExpand,
  onEnter,
  onReturn,
  onClose,
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

  if (stage === "closed" || equipmentId !== "market-reality") return null;

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
    <aside
      aria-label="Market reality — room equipment"
      data-testid="room-equipment"
      data-equipment={equipmentId}
      data-equipment-stage={stage}
      data-decision-id={decisionId ?? undefined}
      style={shell}
    >
      <header
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          padding: stage === "full" ? "0 0 14px" : "10px 12px",
          borderBottom: `1px solid ${HAIR}`,
          flex: "0 0 auto",
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
          Market reality
        </span>
        <span style={{ fontSize: 10, letterSpacing: 0.5, color: MUTED, textTransform: "uppercase" }}>
          {vm.verdict}
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
              <Control label="Enter" onClick={onEnter} emphasis testId="equipment-enter" />
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
          maxWidth: stage === "full" ? 980 : undefined,
          width: "100%",
        }}
      >
        {stage === "preview" ? (
          // The widget says the consequential thing and stops. Everything it
          // shows is also in the full experience — it is a shallower read of
          // ONE compilation, never a summary computed somewhere else.
          <div style={{ paddingTop: 10, display: "flex", flexDirection: "column", gap: 8 }}>
            <div style={{ fontSize: 12, color: "#d8cfb8", lineHeight: 1.4 }}>{vm.headline}</div>
            <div style={{ display: "flex", gap: 14, fontSize: 10, color: MUTED, letterSpacing: 0.5 }}>
              <span data-testid="equipment-count-resolved">{vm.resolved.length} resolved</span>
              <span data-testid="equipment-count-missing">{vm.missing.length} missing</span>
              <span data-testid="equipment-count-blockers">{vm.blockerCount} blocking</span>
            </div>
          </div>
        ) : (
          // ONE compilation, and at FULL it is finally allowed to say all of
          // itself. The drawer caps each list at six because it is a drawer;
          // withholding those same rows on a full screen would make ENTER a
          // change of size rather than a change of depth.
          <MarketCanvasPanel vm={vm} unabridged={stage === "full"} />
        )}
      </div>
    </aside>
  );
}

export default RoomEquipmentLayer;
