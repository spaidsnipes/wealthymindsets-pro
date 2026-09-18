/**
 * THE PROFILES MENU — one door in front of every profile this repo owns.
 *
 * Founder directive: "there should also have a profiles drop down for all the
 * different vps and the profiles i created, the inventions."
 *
 * Before this, the profile inventions were scattered across three different
 * kinds of control in three different places on the chart toolbar: two
 * standalone toggle buttons (WM Fixed VP, WM Session VP), a third for
 * Absorption, and Delta+VP living as a drawing tool in the drawing rail. A
 * trader who had not built the toolbar could not have listed what the product
 * owns — which means the inventions were, in practice, not shipped.
 *
 * (The Session VP window picker still lives inside its own panel. That is a
 * separate lift: the window is panel-local state, and moving it here would mean
 * hoisting it through the dashboard. Named rather than quietly left out.)
 *
 * ── WHY THIS IS A COMPILER AND NOT JUST A `<select>` ────────────────────────
 *
 * Every entry names its OWNER — the module that actually computes the levels it
 * claims. That is not decoration: a menu is the place where a product is most
 * tempted to advertise something it does not have, and a hardcoded list of
 * pretty names in JSX is exactly how an orphaned feature survives for months.
 * The owner string is asserted by a sentinel, so an entry cannot be added here
 * without a real module behind it.
 *
 * ── AVAILABILITY IS MEASURED, NEVER ASSUMED ─────────────────────────────────
 *
 * The three profiles built from bars are ready as soon as bars exist. Delta+VP
 * is NOT: it splits volume by aggressor, and most feeds this product can reach
 * never state a side. Showing it as ready and drawing nothing would be the same
 * defect Asset 03 was built to avoid — a shape that keeps its look and loses its
 * meaning. So the menu publishes a reason, and the reason distinguishes "no
 * bars yet" from "this tape cannot answer", because those ask different things
 * of the trader: wait, versus do not wait.
 *
 * Nothing here selects anything or touches React. It maps facts to a list.
 */

export const PROFILE_MENU_VERSION = 1;

/** Each id is one real invention with one real owner module. */
export type ProfileId = "FIXED_RANGE" | "SESSION" | "DELTA_VP" | "ABSORPTION";

/**
 * READY — it can draw now.
 * WAITING_FOR_BARS — it will draw as soon as the window fills. Wait.
 * NEEDS_SIDED_TAPE — this feed never states an aggressor. Do not wait.
 */
export type ProfileAvailability = "READY" | "WAITING_FOR_BARS" | "NEEDS_SIDED_TAPE";

/**
 * NOT ALL FOUR ARE THE SAME GESTURE, AND THE MENU MAY NOT PRETEND THEY ARE.
 *
 * Three of these profiles switch on and immediately draw themselves over the
 * whole visible range. Delta + VP does not: it is a BOX the trader drags around
 * a region, because "split by aggressor" only means something over a range the
 * trader chose. Rendering it as a fourth checkbox would promise that one click
 * puts something on the chart, and one click puts a CURSOR on the chart.
 *
 * That gap — control says done, chart says nothing — is the same defect class
 * as a shape that keeps its look and loses its meaning, so the gesture is a
 * published field and the menu prints it.
 */
export type ProfileGesture = "TOGGLE" | "DRAW";

export interface ProfileMenuEntry {
  readonly id: ProfileId;
  readonly label: string;
  /** One line naming what it draws, in the trader's words. */
  readonly what: string;
  /** Does clicking it draw immediately, or arm a tool the trader must drag? */
  readonly gesture: ProfileGesture;
  /** The verb the menu prints for that gesture. Never invented at the call site. */
  readonly gestureNote: string;
  /** The module that computes it. A breadcrumb a sentinel can follow. */
  readonly owner: string;
  /** The named levels it publishes, so the menu never implies more than it has. */
  readonly levels: readonly string[];
  readonly active: boolean;
  readonly availability: ProfileAvailability;
  /** Why it is in that state, in a sentence the panel prints verbatim. */
  readonly availabilityNote: string;
}

export interface ProfileMenuInput {
  /** Has the chart actually loaded bars? Not "did we ask" — did we receive. */
  readonly barsPresent: boolean;
  /**
   * Has a SIDED print actually been observed on this symbol? A connected feed
   * is not the same fact: a socket can be open for an hour and never state an
   * aggressor, and Delta+VP needs the print, not the connection.
   */
  readonly observedAggressorFlow: boolean;
  /** Which profiles the trader currently has switched on. */
  readonly active: Readonly<Partial<Record<ProfileId, boolean>>>;
}

export interface ProfileMenuVM {
  readonly version: number;
  readonly entries: readonly ProfileMenuEntry[];
  readonly activeCount: number;
  readonly readyCount: number;
  /**
   * The closed-chip label. Carries the ACTIVE count, never the available one —
   * a badge reading "4" over a chart with nothing drawn on it is a claim the
   * chart contradicts the moment the trader looks up.
   */
  readonly summary: string;
}

/**
 * The catalogue. Order is the reading order on screen: the two price-volume
 * profiles first (they answer "where did trade happen"), then the two that need
 * more than volume to speak.
 */
type ProfileSpec = Omit<
  ProfileMenuEntry,
  "active" | "availability" | "availabilityNote" | "gestureNote"
>;

const CATALOGUE: readonly ProfileSpec[] = [
  {
    id: "FIXED_RANGE",
    label: "Fixed Range VP",
    what: "volume by price across the bars on screen",
    gesture: "TOGGLE",
    owner: "src/lib/vpEngine.ts",
    levels: ["POC", "VAH", "VAL"],
  },
  {
    id: "SESSION",
    label: "Session VP",
    what: "volume by price for the chosen session window",
    gesture: "TOGGLE",
    owner: "src/lib/sessionVP.ts",
    levels: ["POC", "VAH", "VAL", "HVN", "LVN"],
  },
  {
    id: "DELTA_VP",
    label: "Delta + VP",
    what: "the same profile split by which side was the aggressor",
    gesture: "DRAW",
    owner: "src/lib/deltaVP.ts",
    levels: ["POC", "Total delta"],
  },
  {
    id: "ABSORPTION",
    label: "Absorption",
    what: "effort against displacement, with absorption zones pinned at price",
    gesture: "TOGGLE",
    owner: "src/lib/marketData/selectAbsorptionAnatomy.ts",
    levels: ["Zone high", "Zone low", "Efficiency ratio"],
  },
];

const GESTURE_NOTE: Readonly<Record<ProfileGesture, string>> = {
  TOGGLE: "draws over the visible range",
  DRAW: "drag a box on the chart to choose the range",
};

const NEEDS_SIDED_TAPE: ReadonlySet<ProfileId> = new Set<ProfileId>(["DELTA_VP"]);

export function selectProfileMenu(input: ProfileMenuInput): ProfileMenuVM {
  const entries: ProfileMenuEntry[] = CATALOGUE.map(spec => {
    // Ordering matters. "No bars" is the wider absence and is checked first:
    // reporting "this tape states no side" on an empty chart would name the
    // narrower gap while the bigger one goes unmentioned.
    let availability: ProfileAvailability;
    let availabilityNote: string;

    if (!input.barsPresent) {
      availability = "WAITING_FOR_BARS";
      availabilityNote = "no bars loaded for this symbol yet";
    } else if (NEEDS_SIDED_TAPE.has(spec.id) && !input.observedAggressorFlow) {
      availability = "NEEDS_SIDED_TAPE";
      availabilityNote =
        "this tape has not stated an aggressor side — the split cannot be drawn from volume alone";
    } else {
      availability = "READY";
      availabilityNote = "ready to draw from the bars on screen";
    }

    return {
      ...spec,
      gestureNote: GESTURE_NOTE[spec.gesture],
      active: input.active[spec.id] === true,
      availability,
      availabilityNote,
    };
  });

  const activeCount = entries.reduce((n, e) => (e.active ? n + 1 : n), 0);
  const readyCount = entries.reduce((n, e) => (e.availability === "READY" ? n + 1 : n), 0);

  return {
    version: PROFILE_MENU_VERSION,
    entries,
    activeCount,
    readyCount,
    summary: activeCount > 0 ? `PROFILES · ${activeCount}` : "PROFILES",
  };
}
