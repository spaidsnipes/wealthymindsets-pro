"use client";

/**
 * useEquipmentJourney — the ROOM-SIDE half of the interaction grammar, owned once.
 *
 * WHY THIS IS A HOOK AND NOT A PARAGRAPH OF THE DECK
 * -------------------------------------------------
 * `equipmentJourney.ts` owns what the stages MEAN. `RoomEquipmentLayer` owns
 * what they LOOK like. Between those two there was a third thing nobody owned:
 * roughly fifty lines of wiring that every room must get exactly right —
 * subscribe to the rail, refuse ids this room does not have, cold-open from the
 * URL, reflect the journey back into the URL, announce the stage so the rail can
 * mark the entry, and restore the room's scroll when FULL hands the screen back.
 *
 * That lived inline in `/command-deck` because there was only one room with
 * equipment. The directive's closing clause — *"then reuse that proven
 * interaction grammar across the remaining legitimate WM Pro inventions"* —
 * makes a second room inevitable, and a second room would have meant a second
 * copy of the wiring.
 *
 * A COPY OF THIS WIRING IS A SECOND SEMANTIC BRAIN, JUST A QUIETER ONE.
 * The reducer would still be shared, so the STAGES could not disagree. What
 * could disagree is everything around them: one room announcing its stage and
 * the other not (the rail marks equipment open in one room and dead in the
 * other), one room restoring `os-room.scrollTop` and the other `window` (the
 * "return to the exact room" promise silently becomes "return to the top" on
 * whichever room got it wrong). Those are not hypotheticals — the deck's own
 * comments record BOTH mistakes being made and measured before they were fixed.
 * Copying the fixed version does not copy the reasoning, and the next person to
 * touch one copy has no way to know the other exists.
 *
 * So the wiring gets one owner, and `roomHref` becomes the only thing that
 * varies. Everything the deck learned the hard way now arrives with the hook.
 *
 * WHAT THIS DELIBERATELY DOES NOT DO
 * ----------------------------------
 * It does not know what equipment exists (that is `roomEquipment.ts`, keyed by
 * room), does not build descriptors, and does not render. A room still has to
 * hand down its own readings — because the room is the only place that already
 * holds the compilation, and fetching one here would be exactly the second brain
 * the grammar bans.
 */

import * as React from "react";

import {
  EQUIPMENT_CLOSED,
  equipmentJourneyReducer,
  pendingScrollRestore,
  type EquipmentJourney,
} from "./equipmentJourney";
import {
  announceEquipmentStage,
  readJourneyFromUrl,
  reflectJourneyInUrl,
  subscribeEquipment,
} from "./equipmentChannel";
import { isRoomEquipment } from "./roomEquipment";

export interface EquipmentJourneyHandles {
  /** The current journey — hand straight to `RoomEquipmentLayer`. */
  readonly journey: EquipmentJourney;
  /** Preview → drawer. */
  readonly onExpand: () => void;
  /** → the full experience, recording where the room was. */
  readonly onEnter: () => void;
  /** Full → exactly where ENTER was pressed. */
  readonly onReturn: () => void;
  /** Put the equipment away. */
  readonly onClose: () => void;
}

/**
 * THE ROOM'S SCROLLER, NAMED ONCE.
 *
 * The OS scrolls a ROOM element, not the document — see the note on `os-room`
 * in WMOperatingSystem. Reading/writing `window.scrollY` here would compile, run
 * without error, and silently do nothing: the trader would press RETURN and land
 * at the top of the room. A promise that fails this quietly is worse than one
 * that throws, so the fallback to `window` is kept for surfaces genuinely
 * outside the OS frame rather than being the primary path.
 */
function roomScroller(): Element | null {
  if (typeof document === "undefined") return null;
  return document.querySelector('[data-testid="os-room"]');
}

/** How far the room is scrolled right now — the offset RETURN must restore. */
export function readRoomScroll(): number {
  const room = roomScroller();
  if (room) return room.scrollTop;
  return typeof window === "undefined" ? 0 : window.scrollY;
}

/**
 * @param roomHref  The room this journey belongs to, e.g. `"/command-deck"`.
 *                  Ids the rail asks for are checked against THIS room's
 *                  equipment, so a stale request from another room is refused
 *                  rather than rendered.
 * @param decisionId The canonical object the journey is about, captured at OPEN
 *                  and never recomputed (grammar invariant 2). Rooms without a
 *                  decision identity pass `null` honestly.
 */
export function useEquipmentJourney(
  roomHref: string,
  decisionId: string | null,
): EquipmentJourneyHandles {
  const [journey, dispatch] = React.useReducer(equipmentJourneyReducer, EQUIPMENT_CLOSED);

  // The rail's Workspace entry is an EVENT, not a link. A link would remount the
  // chart and blank a frame — the exact "another app loaded" sensation the
  // grammar exists to disprove.
  React.useEffect(() => {
    return subscribeEquipment((req) => {
      if (!isRoomEquipment(roomHref, req.equipmentId)) return;
      dispatch({ type: "OPEN", equipmentId: req.equipmentId, decisionId });
    });
  }, [roomHref, decisionId]);

  // A shared link opens where it says it does. `full` is deliberately not
  // cold-openable — see readJourneyFromUrl.
  React.useEffect(() => {
    const fromUrl = readJourneyFromUrl(window.location.search);
    if (!fromUrl.equipmentId || !isRoomEquipment(roomHref, fromUrl.equipmentId)) return;
    dispatch({ type: "OPEN", equipmentId: fromUrl.equipmentId, decisionId });
    if (fromUrl.stage === "drawer") dispatch({ type: "EXPAND" });
    // Mount only. Re-running this whenever the decision id changed would drag
    // the trader back to the threshold every time the market compiled a new
    // decision — which on a live tape is constantly.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const prior = React.useRef(journey);
  React.useEffect(() => {
    reflectJourneyInUrl(journey.equipmentId, journey.stage);
    // Deliberately the SAME effect as the URL reflection: the address bar and
    // the rail's Workspace entry are two readings of ONE fact, and computing
    // them in separate places is how they come to disagree about whether the
    // drawer is open.
    announceEquipmentStage(journey.equipmentId, journey.stage);
    const owed = pendingScrollRestore(prior.current, journey);
    prior.current = journey;
    if (owed !== null) {
      const room = roomScroller();
      if (room) room.scrollTop = owed;
      else window.scrollTo({ top: owed });
    }
  }, [journey]);

  const onExpand = React.useCallback(() => dispatch({ type: "EXPAND" }), []);
  const onEnter = React.useCallback(
    () => dispatch({ type: "ENTER", scrollY: readRoomScroll() }),
    [],
  );
  const onReturn = React.useCallback(() => dispatch({ type: "RETURN" }), []);
  const onClose = React.useCallback(() => dispatch({ type: "CLOSE" }), []);

  return { journey, onExpand, onEnter, onReturn, onClose };
}

export default useEquipmentJourney;
