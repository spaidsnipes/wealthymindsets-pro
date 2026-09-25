/**
 * ARRANGEMENTS — "WORKSPACE IS A CHART STATE, NOT AN APP."
 *
 * ── THE CANON THIS IS BUILT FROM ──────────────────────────────────────────
 *
 * Two plates in the Living Market Visual Systems Canon state the same law from
 * two directions.
 *
 *   FL-02 SPLIT_BRAIN_VS_ONE_OS:
 *     "LAW — WORKSPACE IS A CHART STATE NOT AN APP."
 *     "THREE APPS. THREE CONTEXTS. ONE MENTAL LOAD.  ✗"
 *     "ONE OS. ONE SHELL. ONE TRUTH.                 ✓"
 *
 *   FL-08 WORKSPACE_IS_SURFACE:
 *     "WORKSPACE = HOW THE BOOK IS ARRANGED."
 *     "TOOLS     = WHAT GETS PAINTED."
 *   and, along the bottom of the chart, the declaration:
 *     "WORKSPACE: ORDER FLOW ● LIVE"
 *
 * The plate's chart header carries three named arrangements — ORDER FLOW,
 * REGIME, REVIEW — and the strip underneath says which one you are in.
 *
 * ── WHAT THE PRODUCT SHIPPED INSTEAD ──────────────────────────────────────
 *
 * WORKSPACE is a button that opens a directory of equipment. A directory is a
 * list of things you could go and get; an arrangement is the position the desk
 * is already in. They are not the same object, and the product owned only the
 * first. Nothing anywhere declared how the chart was currently arranged,
 * because there was no such thing as an arrangement to declare.
 *
 * ── WHY THIS IS A COMPILER AND NOT THREE BUTTONS ──────────────────────────
 *
 * Three buttons that flip a bundle of switches would be easy and would be a
 * lie by omission on most of the feeds this product can reach.
 *
 * Five of the eight profile inventions cannot draw at all unless the tape
 * states an aggressor side, and `selectProfileMenu` already measures that per
 * reading. ORDER FLOW is built almost entirely out of those five. So on a
 * futures chart outside a live tape session, pressing ORDER FLOW arms five
 * switches and paints one thing — and the trader, having pressed a button
 * named after the very thing they wanted to see, would reasonably conclude
 * the market was quiet rather than that the feed was mute.
 *
 * That is the exact defect shape the profiles chip was repaired for: a lit
 * switch that draws nothing and says so only in a `data-` attribute.
 *
 * So an arrangement here is never presented as a promise. Every one of them
 * reports, BEFORE it is pressed, how many of its own readings can draw on the
 * tape in front of the trader right now. An arrangement that can deliver none
 * of what its name claims says so in its own label.
 *
 * ── DELTA + VP IS DELIBERATELY IN NO ARRANGEMENT ──────────────────────────
 *
 * `Delta + VP` is the one profile whose gesture is DRAW, not TOGGLE: it needs
 * the trader to drag a range across the chart before it means anything. An
 * arrangement is a set of switch positions, and there is no switch position
 * that constitutes "a box has been dragged". Including it would mean the
 * arrangement reported an armed reading that no amount of pressing could
 * actually arm. `everyArmedProfileIsToggleable` in the test file asserts this
 * against the live catalogue rather than against a copy, so adding a DRAW
 * profile to an arrangement fails rather than silently overclaims.
 *
 * ── CUSTOM IS A REAL ANSWER ───────────────────────────────────────────────
 *
 * The trader can set any combination of switches by hand, and most will match
 * no arrangement. The honest report is CUSTOM — not "ORDER FLOW" because it is
 * the closest, and not a silent blank. Snapping the label to the nearest named
 * arrangement would mean the declaration strip described a desk the trader was
 * not sitting at.
 *
 * Nothing here selects anything or touches React. It maps facts to a list.
 */

import type {
  ProfileId,
  ProfileMenuVM,
  ProfileMenuEntry,
} from "./selectProfileMenu";

export const CHART_ARRANGEMENT_VERSION = 1;

/**
 * The named desks, plus the honest "none of these" (null → CUSTOM).
 *
 * REMODELLED 2026-09-22: CLEAN joins the vocabulary. The HOUSE PLAN +
 * EXECUTION BOLT-ON — CURRENT — 2026-09-22 names the Workspace's states as
 * "CLEAN / ORDER FLOW / REGIME / REVIEW" — FOUR, on the same camera. Before
 * this, every-toggle-off compiled to CUSTOM, so the one state the bolt-on
 * puts FIRST was the only named state the chart could never declare and the
 * rail's Clean tile could never light. All-off is not "none of these": it is
 * the desk called Clean, and a desk is a set of switch positions — the empty
 * set is a set.
 */
export type ArrangementId = "CLEAN" | "ORDER_FLOW" | "REGIME" | "REVIEW";

/**
 * FULL    — every reading this arrangement arms can draw right now.
 * PARTIAL — some can, some cannot. The trader should know which before pressing.
 * NONE    — this tape can answer none of what this arrangement is named for.
 */
export type ArrangementReadiness = "FULL" | "PARTIAL" | "NONE";

export interface ArrangementSpec {
  readonly id: ArrangementId;
  readonly label: string;
  /** What arranging the desk this way is FOR, in the trader's words. */
  readonly purpose: string;
  /** The profiles this arrangement switches ON. Every other profile goes OFF. */
  readonly arms: readonly ProfileId[];
}

export interface ArrangementEntry extends ArrangementSpec {
  /** True when the chart's current switch positions are exactly this set. */
  readonly active: boolean;
  /** How many of `arms` can draw on the tape in front of the trader now. */
  readonly deliverableCount: number;
  /** How many readings this arrangement arms in total. */
  readonly armedCount: number;
  readonly readiness: ArrangementReadiness;
  /**
   * One sentence, safe to render as a tooltip or an accessible name. It states
   * the purpose, and — when the tape cannot carry the arrangement — what will
   * be missing and whether waiting would help.
   */
  readonly note: string;
  /**
   * The same fact in one line, for the rail tile (Founder: no paragraphs on
   * the glass). The full `note` rides the tile's title for whoever asks.
   */
  readonly shortNote: string;
}

export interface ChartArrangementVM {
  readonly version: number;
  readonly entries: readonly ArrangementEntry[];
  /**
   * The arrangement the chart is actually in, or null when the switches match
   * none of them. Null means CUSTOM; it does not mean "unknown".
   */
  readonly activeId: ArrangementId | null;
  /**
   * The canon's declaration line — FL-08 renders this beneath the chart as
   * "WORKSPACE: ORDER FLOW ● LIVE". Always a complete phrase, never a fragment,
   * because it is printed verbatim into chrome and into an accessible name.
   */
  readonly declaration: string;
}

/**
 * THE FOUR DESKS — the HOUSE PLAN bolt-on's "CLEAN / ORDER FLOW / REGIME /
 * REVIEW", in its order (FIRST CURRENT BUILD ORDER #4, 2026-09-22).
 *
 * Each `arms` list is derived from what the readings SAY they do, in
 * `selectProfileMenu`'s catalogue — not from a preference about which layers
 * look good together.
 */
const ARRANGEMENTS: readonly ArrangementSpec[] = [
  {
    id: "CLEAN",
    label: "Clean",
    purpose: "just the market — no reading armed over the candles",
    /*
      The empty desk, and it is NOT a placeholder. `matches` with an empty
      `arms` list demands every TOGGLE be OFF — exactly the state the rail's
      Clean command drives the chart into. Arming nothing means nothing can be
      mute, so this is the one desk that is deliverable on every tape the
      product can draw, including a chart with no bars at all: an empty chart
      showing just the market is precisely what Clean promises.
    */
    arms: [],
  },
  {
    id: "ORDER_FLOW",
    label: "Order Flow",
    purpose: "who is doing the trading, and where they are being stopped",
    /*
      The microstructure readings. Absorption leads deliberately: its effort
      basis tiers down to plain traded volume, so it is the only member of this
      desk that draws on a chart with no aggressor prints. On a mute tape it is
      the entire arrangement, which is precisely why the readiness count below
      must be shown rather than implied.
    */
    // The Founder's mockups ARE this desk's picture (2026-09-24): the
    // absorption-vs-exhaustion anatomy cards and the question-driven lens are
    // armed with the readings they measure, so choosing ORDER FLOW shows them.
    arms: [
      "ABSORPTION",
      "ANATOMY_CARDS",
      "QUESTION_LENS",
      "IMBALANCE_STACK",
      "VALUE_CANDLE",
      "DELTA_DIVERGENCE",
      "LIQUIDITY_WEATHER",
    ],
  },
  {
    id: "REGIME",
    label: "Regime",
    purpose: "where price has been accepted, and where it has not",
    /*
      Both volume profiles, and nothing else. These are built from bars alone,
      so this desk is deliverable in full on every chart the product can draw —
      including every feed on which ORDER FLOW is mute. That is not a happy
      accident; it is the reason a trader on a quiet tape has somewhere to go.
    */
    arms: ["FIXED_RANGE", "SESSION"],
  },
  {
    id: "REVIEW",
    label: "Review",
    purpose: "what the session actually did, after it has done it",
    /*
      The session's volume distribution, plus effort-against-result. Both are
      bar-derived and therefore still true after the tape has gone quiet, which
      is the state a review is always conducted in. Live-flow readings are
      excluded on purpose: a review of a finished session has no live flow to
      read, and arming four readings that will be mute by definition would make
      this desk lie every single time it was used.
    */
    // Scaffolding (Foundation → Intermediate → Pro) reads the finished session.
    arms: ["SESSION", "ABSORPTION", "SCAFFOLDING", "LIQUIDITY_LIFECYCLE"],
  },
];

/** Public, so chrome can render the desks without importing the whole VM. */
export const ARRANGEMENT_SPECS: readonly ArrangementSpec[] = ARRANGEMENTS;

export interface ChartArrangementInput {
  /**
   * The compiled profile menu. This module asks it which readings can draw
   * rather than re-deriving the tape rules, because two modules that each
   * decide what a mute tape means will eventually disagree in front of a
   * trader.
   */
  readonly menu: ProfileMenuVM;
}

/**
 * Switch positions, as the arrangement would leave them: every profile it arms
 * ON, every other TOGGLE profile OFF. Exported so the chart can apply a desk
 * without the press handler re-deriving the set from the spec.
 *
 * DRAW-gesture profiles are omitted entirely rather than set to `false`. A
 * dragged box is not a switch, and writing `false` into it would imply this
 * module had the standing to un-draw the trader's own range selection.
 */
export function arrangementSwitches(
  id: ArrangementId,
  menu: ProfileMenuVM,
): Readonly<Partial<Record<ProfileId, boolean>>> {
  const spec = ARRANGEMENTS.find(a => a.id === id);
  if (!spec) return {};
  const out: Partial<Record<ProfileId, boolean>> = {};
  for (const entry of menu.entries) {
    if (entry.gesture !== "TOGGLE") continue;
    out[entry.id] = spec.arms.includes(entry.id);
  }
  return out;
}

/** Does the chart's current TOGGLE state match this desk exactly? */
function matches(spec: ArrangementSpec, toggles: readonly ProfileMenuEntry[]): boolean {
  for (const entry of toggles) {
    const shouldBeOn = spec.arms.includes(entry.id);
    if (entry.active !== shouldBeOn) return false;
  }
  return true;
}

export function selectChartArrangement(
  input: ChartArrangementInput,
): ChartArrangementVM {
  const { menu } = input;
  const toggles = menu.entries.filter(e => e.gesture === "TOGGLE");
  const byId = new Map(menu.entries.map(e => [e.id, e] as const));

  const entries: ArrangementEntry[] = ARRANGEMENTS.map(spec => {
    /*
      Count over the catalogue's OWN verdicts. An arm naming a profile the menu
      does not publish contributes nothing rather than being counted as ready —
      an unknown reading is not a working one.
    */
    const armed = spec.arms
      .map(id => byId.get(id))
      .filter((e): e is ProfileMenuEntry => e !== undefined);

    const armedCount = armed.length;
    const drawable = armed.filter(e => e.availability === "READY");
    const deliverableCount = drawable.length;

    /*
      AN EMPTY DESK IS ALWAYS FULL, BY NAME. The `armedCount > 0` guard exists
      so a desk whose arms all name unknown profiles cannot count 0-of-0 as
      ready — that stays true for every desk that CLAIMS readings. CLEAN claims
      none: it promises "just the market", and every chart the product can
      draw, including one with no bars yet, can deliver just the market. NONE
      ("this tape can answer none of what this arrangement is named for")
      would be the lie here — Clean is not asking the tape anything.
    */
    const readiness: ArrangementReadiness =
      spec.arms.length === 0
        ? "FULL"
        : deliverableCount === armedCount && armedCount > 0
          ? "FULL"
          : deliverableCount === 0
            ? "NONE"
            : "PARTIAL";

    const mute = armed.filter(e => e.availability !== "READY");

    let note: string;
    if (spec.arms.length === 0) {
      // "All 0 readings can draw" is grammatically true and humanly absurd.
      note = `${spec.label}: ${spec.purpose}. Arms no readings, so every tape can carry it.`;
    } else if (readiness === "FULL") {
      note = `${spec.label}: ${spec.purpose}. All ${armedCount} readings can draw on this tape.`;
    } else {
      const names = mute.map(e => e.label).join(", ");
      /*
        WAITING states and NEEDS_SIDED_TAPE ask opposite things of the trader
        — wait, versus do not wait. A note that lumps them together sends a
        trader to stare at a chart that is never going to fill in. Same
        distinction `selectProfileMenu` draws, made here for the same reason.
      */
      const waiting = mute.some(e => e.availability === "WAITING_FOR_BARS");
      const waitingForPrints = mute.some(e => e.availability === "WAITING_FOR_PRINTS");
      const untaped = mute.some(e => e.availability === "NEEDS_SIDED_TAPE");
      const refused = mute.some(e => e.availability === "REFUSED_BY_DATA");
      const causes = [waiting, waitingForPrints, untaped, refused].filter(Boolean).length;
      const why = causes > 1
        ? "Some are waiting for market observations; the rest need a sided tape or data this chart does not hold"
        : waiting
          ? "No bars have loaded for this symbol yet — these will draw when they do"
          : waitingForPrints
            ? "No per-trade prints have reached this chart yet — these will draw when they do"
            : refused
              ? "The bars on screen cannot build them — each row in the menu says why"
              : "This tape has not stated an aggressor side, so these cannot be drawn from volume alone";
      note =
        `${spec.label}: ${spec.purpose}. ` +
        `${deliverableCount} of ${armedCount} readings can draw here — ${names} cannot. ` +
        `${why}.`;
    }

    const shortNote = readiness === "FULL" || spec.arms.length === 0
      ? ""
      : mute.some(e => e.availability === "NEEDS_SIDED_TAPE")
        ? `${deliverableCount} of ${armedCount} draw here · rest need a sided tape`
        : `${deliverableCount} of ${armedCount} draw here · rest waiting for data`;
    return {
      ...spec,
      active: matches(spec, toggles),
      deliverableCount,
      armedCount,
      readiness,
      note,
      shortNote,
    };
  });

  /*
    At most one desk can match, because the desks differ in at least one switch
    — asserted in the test file against the specs themselves, so a future desk
    that duplicates an existing one fails rather than making `find` arbitrary.
  */
  const activeId = entries.find(e => e.active)?.id ?? null;
  const activeEntry = entries.find(e => e.id === activeId);

  let declaration: string;
  if (!activeEntry) {
    declaration = "WORKSPACE: CUSTOM";
  } else if (activeEntry.readiness === "FULL") {
    declaration = `WORKSPACE: ${activeEntry.label.toUpperCase()}`;
  } else {
    /*
      The count travels with the name. FL-08's strip reads "ORDER FLOW ● LIVE"
      on a plate drawn against a live sided tape; on a mute one the same strip
      saying only "ORDER FLOW" would be the beautiful lie. So the honest form of
      that declaration carries what the desk can actually deliver.
    */
    declaration =
      `WORKSPACE: ${activeEntry.label.toUpperCase()} · ` +
      `${activeEntry.deliverableCount} OF ${activeEntry.armedCount} DRAWING`;
  }

  return {
    version: CHART_ARRANGEMENT_VERSION,
    entries,
    activeId,
    declaration,
  };
}
