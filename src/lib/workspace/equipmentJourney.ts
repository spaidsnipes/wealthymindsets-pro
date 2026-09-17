/**
 * equipmentJourney — the interaction grammar for opening equipment INSIDE a Room.
 *
 * THE DEFECT THIS ENDS
 * --------------------
 * Every invention this product grew got the same treatment: a new route, or a
 * new permanently-mounted card, or — most often — a `<details>` nested inside
 * another `<details>`. Three of those shapes are the same mistake wearing
 * different clothes:
 *
 *   · a new route    → the trader LEAVES the market to read about the market
 *   · a permanent card → the chart becomes a card farm and nothing ranks
 *   · a nested drawer → the intelligence exists but must be HUNTED for
 *
 * The Founder named the cure as a sequence, not a container:
 *
 *   ROOM → WORKSPACE → PREVIEW/WIDGET → DRAWER → ENTER FULL → RETURN TO ROOM
 *
 * and the acceptance question is behavioural, not visual: *"Does this feel
 * like I opened equipment inside the same Room — or did another app load?"*
 *
 * WHAT MAKES IT ONE ROOM AND NOT ANOTHER APP
 * ------------------------------------------
 * Three invariants, all enforced below and all testable without a browser:
 *
 *   1. ONE PIECE OF EQUIPMENT AT A TIME. Opening equipment B while A is open
 *      replaces A. There is no state in which two are open, which is what
 *      stops the room drifting back into a card farm.
 *
 *   2. THE SEMANTIC BRAIN IS CARRIED, NEVER RE-CREATED. `decisionId` is
 *      captured once at OPEN and is identical at every later stage. ENTER does
 *      not re-compile anything; it changes how much room the SAME projection
 *      gets. "Entering a drawer may change the scene. It may never create
 *      another semantic brain."
 *
 *   3. RETURN IS EXACT, NOT APPROXIMATE. ENTER records where it came from —
 *      both the stage and the scroll offset — and RETURN restores precisely
 *      that. A "return" that drops the trader at the top of the room, or at
 *      `preview` when they were in `drawer`, has lost their place, and losing
 *      their place is the whole failure the grammar exists to prevent.
 *
 * Pure and side-effect free: a reducer over a plain value. The room owns the
 * pixels; this owns the meaning of the journey.
 */

/**
 * PREVIEW  a widget: consequential information seen WITHOUT leaving the chart.
 * DRAWER   additional working space, market context still present.
 * FULL     the same intelligence at its complete professional depth.
 */
export type EquipmentStage = "closed" | "preview" | "drawer" | "full";

export interface EquipmentReturn {
  /** The stage to come back to — not "the beginning". */
  readonly stage: Exclude<EquipmentStage, "closed" | "full">;
  /** Where the Room was scrolled when FULL took over. */
  readonly scrollY: number;
}

export interface EquipmentJourney {
  readonly equipmentId: string | null;
  readonly stage: EquipmentStage;
  /**
   * The canonical object this journey is about. Captured at OPEN and never
   * recomputed — see invariant 2.
   */
  readonly decisionId: string | null;
  /** Non-null only while `stage === "full"`. */
  readonly returnTo: EquipmentReturn | null;
}

export type EquipmentAction =
  /** From the Workspace list. Also the "switch equipment" action. */
  | { readonly type: "OPEN"; readonly equipmentId: string; readonly decisionId: string | null }
  /** Preview → drawer: more working space, market still in view. */
  | { readonly type: "EXPAND" }
  /** → the full experience. `scrollY` is the Room's offset at this instant. */
  | { readonly type: "ENTER"; readonly scrollY: number }
  /** Full → exactly where ENTER was pressed. */
  | { readonly type: "RETURN" }
  /** Put the equipment away. */
  | { readonly type: "CLOSE" };

export const EQUIPMENT_CLOSED: EquipmentJourney = {
  equipmentId: null,
  stage: "closed",
  decisionId: null,
  returnTo: null,
};

export function equipmentJourneyReducer(
  state: EquipmentJourney,
  action: EquipmentAction,
): EquipmentJourney {
  switch (action.type) {
    case "OPEN":
      // Deliberately NOT a no-op when the same equipment is already open at a
      // deeper stage: the Workspace entry is a door, and a door returns you to
      // the threshold. Re-opening from FULL is how the trader gets the market
      // back without hunting for a close control.
      return {
        equipmentId: action.equipmentId,
        stage: "preview",
        decisionId: action.decisionId,
        returnTo: null,
      };

    case "EXPAND":
      // Only preview widens. EXPAND from `full` would be a demotion wearing an
      // expand label, and EXPAND from `closed` would open equipment that was
      // never chosen — there is no equipmentId to open.
      if (state.stage !== "preview") return state;
      return { ...state, stage: "drawer" };

    case "ENTER":
      if (state.stage !== "preview" && state.stage !== "drawer") return state;
      return {
        ...state,
        stage: "full",
        returnTo: {
          stage: state.stage,
          // A NaN or negative offset would restore to a position that does not
          // exist; the top of the room is the honest floor.
          scrollY: Number.isFinite(action.scrollY) && action.scrollY > 0 ? action.scrollY : 0,
        },
      };

    case "RETURN": {
      if (state.stage !== "full" || !state.returnTo) return state;
      return { ...state, stage: state.returnTo.stage, returnTo: null };
    }

    case "CLOSE":
      return EQUIPMENT_CLOSED;

    default:
      return state;
  }
}

/** The market must stay visible at these stages — this is the "same room" test. */
export function marketStaysVisible(stage: EquipmentStage): boolean {
  return stage !== "full";
}

/**
 * The scroll offset RETURN must restore, or `null` when nothing is owed.
 * Read by the Room in an effect; kept here so the rule is tested, not implied.
 */
export function pendingScrollRestore(
  before: EquipmentJourney,
  after: EquipmentJourney,
): number | null {
  if (before.stage !== "full") return null;
  if (after.stage === "full") return null;
  return before.returnTo ? before.returnTo.scrollY : null;
}
