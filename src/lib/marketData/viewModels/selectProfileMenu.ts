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
export type ProfileId =
  | "FIXED_RANGE"
  | "SESSION"
  | "DELTA_VP"
  | "ABSORPTION"
  | "IMBALANCE_STACK"
  | "VALUE_CANDLE"
  | "DELTA_DIVERGENCE"
  | "LIQUIDITY_WEATHER"
  | "EFFORT_MARK"
  | "DELTA_LEVELS"
  | "LIVING_PROFILE"
  | "TPO_PROFILE"
  | "STRUCTURE_PROFILE"
  | "PROFILE_DNA"
  | "VALUE_MIGRATION"
  | "PROFILE_MEMORY"
  | "PROFILE_FUSION"
  | "COMPOSITE_PROFILE"
  | "VISIBLE_RANGE_PROFILE"
  | "ANCHORED_RANGE"
  | "REGIME_LIGHTING"
  | "QUESTION_LENS"
  | "SCAFFOLDING"
  | "ANATOMY_CARDS"
  | "MEMORY_GHOST"
  | "MARKET_STRUCTURE";

/**
 * READY — it can draw now.
 * WAITING_FOR_BARS — it will draw as soon as the bar window fills. Wait.
 * WAITING_FOR_PRINTS — it needs per-trade prints, but not aggressor side. Wait.
 * NEEDS_SIDED_TAPE — this feed never states an aggressor. Do not wait.
 */
export type ProfileAvailability =
  | "READY"
  | "WAITING_FOR_BARS"
  | "WAITING_FOR_PRINTS"
  | "NEEDS_SIDED_TAPE";

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

/**
 * WHICH DOOR A TOOL LIVES BEHIND (Founder, 2026-09-24 08:13: "when you click
 * on order flow you should see order flow tools … stop smushing everything
 * together — the mockups are actual chart tools, not separate screens").
 *
 *   PROFILE    — where trade happened at price: the volume/time profiles.
 *                Door: Tools › Chart tools › Profiles.
 *   ORDER_FLOW — who pressed and what it paid for: absorption vs exhaustion,
 *                imbalance, divergence, effort, delta levels, weather.
 *                Door: Tools › Order flow.
 *   READING    — lenses that re-read the SAME camera: structure, regime
 *                lighting, the question lens, scaffolding.
 *                Door: Tools › Chart tools › Reading lenses.
 *
 * Every id has exactly one family; a sentinel pins that no row is homeless
 * and none is listed twice.
 */
export type ProfileFamily = "PROFILE" | "ORDER_FLOW" | "READING";

/**
 * P-110 PROFILE ORGANISM — the blueprint's eleven types, in its own order.
 * The Profiles door lists them numbered 1–11, then the family's other
 * members (Value Candle, Value Migration, Anchored Range) unnumbered.
 * #11 BID/ASK "two-sided market profile" is Delta + VP.
 */
export const P110_ORGANISM: Readonly<Partial<Record<ProfileId, number>>> = {
  LIVING_PROFILE: 1,
  STRUCTURE_PROFILE: 2,
  PROFILE_FUSION: 3,
  PROFILE_MEMORY: 4,
  PROFILE_DNA: 5,
  SESSION: 6,
  VISIBLE_RANGE_PROFILE: 7,
  FIXED_RANGE: 8,
  COMPOSITE_PROFILE: 9,
  TPO_PROFILE: 10,
  DELTA_VP: 11,
};

export const PROFILE_FAMILY: Readonly<Record<ProfileId, ProfileFamily>> = {
  FIXED_RANGE: "PROFILE",
  SESSION: "PROFILE",
  DELTA_VP: "PROFILE",
  VALUE_CANDLE: "PROFILE",
  LIVING_PROFILE: "PROFILE",
  TPO_PROFILE: "PROFILE",
  STRUCTURE_PROFILE: "PROFILE",
  PROFILE_DNA: "PROFILE",
  VALUE_MIGRATION: "PROFILE",
  PROFILE_MEMORY: "PROFILE",
  PROFILE_FUSION: "PROFILE",
  COMPOSITE_PROFILE: "PROFILE",
  VISIBLE_RANGE_PROFILE: "PROFILE",
  ANCHORED_RANGE: "PROFILE",
  ABSORPTION: "ORDER_FLOW",
  ANATOMY_CARDS: "ORDER_FLOW",
  IMBALANCE_STACK: "ORDER_FLOW",
  DELTA_DIVERGENCE: "ORDER_FLOW",
  LIQUIDITY_WEATHER: "ORDER_FLOW",
  EFFORT_MARK: "ORDER_FLOW",
  DELTA_LEVELS: "ORDER_FLOW",
  MARKET_STRUCTURE: "READING",
  REGIME_LIGHTING: "READING",
  QUESTION_LENS: "READING",
  SCAFFOLDING: "READING",
  MEMORY_GHOST: "READING",
};

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
  /** P-110 organism number (1–11), when this row is one of the eleven. */
  readonly organism: number | null;
  readonly availability: ProfileAvailability;
  /** Why it is in that state, in a sentence the panel prints verbatim. */
  readonly availabilityNote: string;
}

export interface ProfileMenuInput {
  /** Has the chart actually loaded bars? Not "did we ask" — did we receive. */
  readonly barsPresent: boolean;
  /** Has at least one real per-trade print reached the chart room? */
  readonly printsPresent: boolean;
  /**
   * Has a SIDED print actually been observed on this symbol? A connected feed
   * is not the same fact: a socket can be open for an hour and never state an
   * aggressor, and Delta+VP needs the print, not the connection.
   */
  readonly observedAggressorFlow: boolean;
  /** Which profiles the trader currently has switched on. */
  readonly active: Readonly<Partial<Record<ProfileId, boolean>>>;
  /** Only these families' rows (one door each). Omitted → the whole catalogue. */
  readonly families?: readonly ProfileFamily[];
}

export interface ProfileMenuVM {
  readonly version: number;
  readonly entries: readonly ProfileMenuEntry[];
  readonly activeCount: number;
  readonly readyCount: number;
  /**
   * SWITCHED ON AND UNABLE TO DRAW — the lit switch over the empty chart.
   *
   * This is the one fact the menu needed and did not have. `activeCount` and
   * `readyCount` are each true and each incomplete: a chart can report six
   * active and eight ready-capable while four of those six are silent, because
   * the two counts are measured over different sets and never intersected.
   *
   * The intersection is what the trader actually experiences. Three default-on
   * order-flow readings require aggressor side. Liquidity Weather also defaults
   * on but is independently deliverable from raw prints, so the compiler must
   * never count it silent merely because side classification is missing.
   *
   * Each withheld reading publishes its refusal into a `data-` attribute and
   * nowhere else. Absorption is the only reading that puts its refusal on the
   * glass ("EFFORT UNMEASURED"). A refusal legible only to someone inspecting
   * the DOM is not a refusal the trader was given, so this count exists to put
   * the same fact where the switch is.
   */
  readonly silentCount: number;
  /**
   * The closed-chip label. Carries the ACTIVE count, never the available one —
   * a badge reading "4" over a chart with nothing drawn on it is a claim the
   * chart contradicts the moment the trader looks up.
   *
   * When some of those active readings cannot draw, the badge says so in the
   * same breath. It does NOT quietly shrink to the drawing count: the trader
   * switched six things on and six things are on, and a badge that answered "2"
   * would be hiding their own choice from them to make itself look right.
   */
  readonly summary: string;
  /**
   * One sentence naming which readings are lit and silent, and why — printed
   * verbatim by the chip's tooltip and accessible name. Empty when nothing is
   * being withheld, so a caller can use emptiness as the test.
   */
  readonly silentNote: string;
  /** Compact visible cause for the panel footer, compiled from the same facts. */
  readonly silentSummary: string;
}

/**
 * The catalogue. Order is the reading order on screen: the two price-volume
 * profiles first (they answer "where did trade happen"), then the two that need
 * more than volume to speak.
 */
type ProfileSpec = Omit<
  ProfileMenuEntry,
  "active" | "availability" | "availabilityNote" | "gestureNote" | "organism"
>;

const CATALOGUE: readonly ProfileSpec[] = [
  {
    id: "FIXED_RANGE",
    label: "Fixed Range VP",
    /*
      NOT "the bars on screen". The renderer sources every bar loaded for the
      chart (MainChart runWMVP → barsRef.current) precisely so POC/VAH/VAL do
      not jump when the trader scrolls. The sentence describes the code.
    */
    what: "volume by price across every bar loaded for this chart — it holds still when you scroll",
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
    label: "Absorption vs Exhaustion",
    what: "effort against displacement: absorption zones and exhaustion marks, pinned at price",
    gesture: "TOGGLE",
    owner: "src/lib/marketData/selectAbsorptionAnatomy.ts",
    levels: ["Zone high", "Zone low", "Exhaustion extreme"],
  },

  /*
    ── THE FOUR ORDER-FLOW READINGS THAT NOW DRAW ON THE PRICE AXIS ──────────

    These four spent their whole existence complete, tested, and confined to a
    drawer panel while the prices they computed never reached the chart. They
    now paint, and the moment a layer paints it owes the trader a way to stop
    it painting — a chart the trader cannot quiet is not a chart the trader
    owns.

    Three are side-dependent and receive the same gated tick array from
    `useOrderFlowReadings`. Liquidity Weather is not: it measures volume per
    price travel and receives raw observed prints because it never reads side.

    `levels` is the honest part. It names ONLY what each reading publishes as a
    coordinate. Liquidity weather's row says "Stall shelves" and nothing about
    its stage, trend or cost, because a cost has no level and the menu would be
    the easiest place in the product to imply that it does.
  */
  {
    id: "IMBALANCE_STACK",
    label: "Stacked Imbalance",
    what: "consecutive price levels where one side kept out-trading the other",
    gesture: "TOGGLE",
    owner: "src/lib/marketData/viewModels/selectStackedImbalance.ts",
    levels: ["Stack high", "Stack low", "Rung prices"],
  },
  {
    id: "VALUE_CANDLE",
    label: "WM Value Candle",
    what: "where the window's volume actually concentrated, bin by bin",
    gesture: "TOGGLE",
    owner: "src/lib/marketData/viewModels/selectValueCandle.ts",
    levels: ["Centre of gravity", "Value high", "Value low"],
  },
  {
    id: "DELTA_DIVERGENCE",
    label: "Delta Divergence",
    what: "the two swing pivots where price and cumulative delta disagreed",
    gesture: "TOGGLE",
    owner: "src/lib/marketData/viewModels/selectDeltaDivergence.ts",
    // The cumulative delta itself is NOT listed, and must never be: it is
    // counted in contracts and this axis is denominated in dollars.
    levels: ["Prior pivot price", "Recent pivot price"],
  },
  {
    id: "LIQUIDITY_WEATHER",
    // Carries the P-601 HEAT LENS: the same switch pipes the weather onto
    // price as heat bands, so the heatmap invention is reachable on the
    // candles from Tools › Order flow and never needs a room of its own.
    label: "Liquidity Weather · Heat Lens",
    what: "how much size it costs to move price, painted on price as heat bands — dear is hot, cheap is cool",
    gesture: "TOGGLE",
    owner: "src/lib/marketData/viewModels/selectLiquidityWeather.ts",
    // A cost has no price. The shelves are the ONLY thing this reading puts on
    // the axis; the stage and its statistics are words in the chrome.
    levels: ["Stall shelves"],
  },
  {
    id: "EFFORT_MARK",
    label: "Effort Mark",
    /*
      SAYS WHAT IT DRAWS AND, BY OMISSION, WHAT IT DOES NOT.
      "the bar under your cursor" is load-bearing. The other TOGGLE rows draw
      over the whole visible range, and a trader who reads this row as another
      of those will switch it on, see nothing, and conclude the layer is
      broken — the control-says-done/chart-says-nothing gap this menu's own
      `ProfileGesture` note exists to close.
    */
    what: "when the bar under your cursor spent much and moved little, or the reverse",
    gesture: "TOGGLE",
    owner: "src/lib/marketData/effortMarkGeometry.ts",
    // A ratio has no price. The bar's own extreme is the ONLY thing this
    // reading puts on the axis, and it puts it there because the bar traded
    // it — `effortRatio` and `resultRatio` never reach a coordinate function.
    levels: ["The subject bar's own high or low"],
  },
  {
    id: "DELTA_LEVELS",
    label: "Delta Levels",
    /*
      WHAT IT DRAWS, ON THE TAPE'S OWN GRID.
      Not where PRICE went — that is the candles' job, and delta and price
      disagree constantly in a thin tape. What this draws is which side
      crossed the spread hardest, at each real level.
    */
    what: "which side crossed the spread hardest at each real level",
    gesture: "TOGGLE",
    owner: "src/lib/marketData/viewModels/selectDeltaLevels.ts",
    /*
      A LEVEL IS A PRICE. Size is a lane length; it never reaches the axis.
      The single named level is the price of the group — the low edge of it,
      not a bucket centre invented by an average.
    */
    levels: ["Aggressor-delta rungs"],
  },
  {
    id: "LIVING_PROFILE",
    label: "Living Profile",
    /*
      HVN and LVN together. A trader who wants to see one usually wants to
      see the other by contrast — one names the levels the market lingered
      at, the other the levels it avoided.
    */
    what: "the levels the market lingered at and the ones it avoided",
    gesture: "TOGGLE",
    owner: "src/lib/marketData/viewModels/selectLivingProfile.ts",
    /*
      Every mark is a real bucket-low price. Untraded prices are counted, not
      rendered — a lane of any length would read as "size traded here" and
      none did.
    */
    levels: ["HVN and LVN price nodes"],
  },
  {
    id: "TPO_PROFILE",
    label: "TPO Profile",
    /*
      TIME, NOT SIZE. Sits next to the Living Profile in reading order because
      the two answer sibling questions — where size traded, and where the
      market spent time — and their disagreement is the reading.
    */
    what: "how many bars spent time at each price, on the left edge",
    gesture: "TOGGLE",
    owner: "src/lib/marketData/viewModels/selectTpoProfile.ts",
    // Counts have no price. POC/VAH/VAL and single-print rows are bucket
    // low edges on the grid; nothing else reaches the axis.
    levels: ["TPO POC", "TPO VAH", "TPO VAL", "Single prints"],
  },
  {
    id: "STRUCTURE_PROFILE",
    label: "Structure Profile",
    /*
      Anchored to a MARKET EVENT, not the clock or the camera: the last
      confirmed swing, read from the same structure compiler that paints the
      swing marks, so the anchor and the marks cannot disagree.
    */
    what: "volume by price since the last confirmed swing, drawn from that swing",
    gesture: "TOGGLE",
    owner: "src/lib/marketData/viewModels/selectStructureProfile.ts",
    levels: ["Leg POC", "Leg VAH", "Leg VAL", "Anchor swing"],
  },
  {
    id: "PROFILE_DNA",
    label: "Profile DNA",
    /*
      Describes the Living Profile's SHAPE in stated numbers, printed on the
      glass above the histogram it describes. Description, never prophecy.
    */
    what: "the Living Profile's shape and sample, printed above it — never a forecast",
    gesture: "TOGGLE",
    owner: "src/lib/marketData/viewModels/selectProfileDna.ts",
    // A ratio has no price. The only coordinate is the Living Profile's VAH,
    // which it borrows as an anchor for the strip.
    levels: ["Anchored to the Living Profile's VAH"],
  },
  {
    id: "VALUE_MIGRATION",
    label: "Value Migration",
    /*
      The Living Profile's movie: where POC and value stood after each bar,
      drawn at the time it was true. No lookahead — a later bar can never move
      an earlier point.
    */
    what: "where POC and value stood after every bar, drawn across the candles",
    gesture: "TOGGLE",
    owner: "src/lib/marketData/viewModels/selectValueMigration.ts",
    levels: ["Developing POC", "Developing VAH", "Developing VAL"],
  },
  {
    id: "PROFILE_MEMORY",
    label: "Profile Memory",
    /*
      Prior sessions' final value, carried forward onto today's candles with
      its age and how often the market has been back. Reads the Value
      Migration engine's own final points — one engine, two readings.
    */
    what: "earlier sessions' POC and value, carried forward — naked until the market returns",
    gesture: "TOGGLE",
    owner: "src/lib/marketData/viewModels/selectProfileMemory.ts",
    levels: ["Prior-session POC", "Prior-session VAH", "Prior-session VAL"],
  },
  {
    id: "PROFILE_FUSION",
    label: "Profile Fusion",
    /*
      Reads ONLY the species switched on above it. A zone appears where two
      or more DIFFERENT species put a level within tolerance, and it names
      every source. A count, never a score.
    */
    what: "zones where two or more switched-on profiles agree, each source named",
    gesture: "TOGGLE",
    owner: "src/lib/marketData/viewModels/selectProfileFusion.ts",
    levels: ["Fused zone low", "Fused zone high"],
  },
  {
    id: "COMPOSITE_PROFILE",
    label: "Composite Profile",
    /*
      Completed sessions only. Today's developing auction is excluded — that
      exclusion is what makes it a composite and not a Fixed Range VP.
    */
    what: "volume by price across the last completed sessions — today excluded",
    gesture: "TOGGLE",
    owner: "src/lib/marketData/viewModels/selectCompositeProfile.ts",
    levels: ["Composite POC", "Composite VAH", "Composite VAL"],
  },
  {
    id: "VISIBLE_RANGE_PROFILE",
    label: "Visible Range Profile",
    /*
      The one profile that is SUPPOSED to move on scroll: it describes the
      bars in view. Fixed Range VP is the one that holds still.
    */
    what: "volume by price for exactly the bars in view — it moves when you scroll",
    gesture: "TOGGLE",
    owner: "src/lib/marketData/viewModels/selectVisibleRangeProfile.ts",
    levels: ["VRP POC", "VRP VAH", "VRP VAL"],
  },
  {
    id: "ANCHORED_RANGE",
    label: "Anchored Range VP",
    /*
      P-110 #8 FIXED · anchored / static. A DRAW gesture: the trader drags
      across the bars they choose, and the profile stays anchored to those
      times on scroll. Built from bars, so unlike Delta + VP it draws on a
      feed that never states an aggressor.
    */
    what: "volume by price for a span of bars you drag across — anchored, from bars alone",
    gesture: "DRAW",
    owner: "src/lib/marketData/viewModels/selectVisibleRangeProfile.ts",
    levels: ["Range POC", "Range VAH", "Range VAL"],
  },
  {
    id: "REGIME_LIGHTING",
    label: "Regime Lighting",
    /*
      H-901. A dimmer over the geometry above, not a reading of its own:
      TREND dims value magnets, RANGE caps trend fixtures, TRANSITION dims
      both. Reads the one regime owner; UNKNOWN leaves every light on.
    */
    what: "dims the geometry the current regime says should stay quiet — a dimmer, not a room",
    gesture: "TOGGLE",
    owner: "src/lib/marketData/viewModels/selectRegimeLighting.ts",
    // A dimmer has no price. It borrows none.
    levels: ["No level of its own — relights the profiles above"],
  },
  {
    id: "QUESTION_LENS",
    label: "Question Lens",
    /*
      The Founder's question-driven mode, on the SAME camera: one active
      question asked of the newest absorption or exhaustion reading, its
      evidence debt measured item by item, and everything else quieted.
    */
    what: "asks the newest absorption or exhaustion one question, lists what it is still owed, quiets the rest",
    gesture: "TOGGLE",
    owner: "src/lib/marketData/viewModels/selectQuestionLens.ts",
    levels: ["The question's own price band"],
  },
  {
    id: "SCAFFOLDING",
    label: "Scaffolding",
    /*
      The Founder's "SAME SKILL. DEEPER MASTERY. LESS HAND-HOLDING." plate on
      the SAME camera: one read of structure, effort, result, location and
      order flow, shown at FOUNDATION (six steps) → INTERMEDIATE (three
      dynamics) → PRO (geometry only). Each click goes one depth deeper; the
      click after PRO switches it off. The truth never changes — only the
      scaffolding does.
    */
    what: "the same read at three depths — six steps, three dynamics, then geometry only; click again to go deeper",
    gesture: "TOGGLE",
    owner: "src/lib/marketData/viewModels/selectScaffoldingRead.ts",
    // A teaching lens has no price of its own; it names the swings it reads.
    levels: ["No level of its own — reads the nearest confirmed swings"],
  },
  {
    id: "ANATOMY_CARDS",
    label: "Anatomy Cards",
    /*
      The Founder's "ABSORPTION vs EXHAUSTION — The Anatomy of Impact" plate's
      two KEY METRICS columns, side by side on the camera, each tied by a
      leader to the reading it describes. Numbers come from the absorption
      and exhaustion owners already drawn on the candles.
    */
    what: "the absorption and exhaustion key metrics side by side, each tied to the candles it measured",
    gesture: "TOGGLE",
    owner: "src/lib/marketData/viewModels/selectAnatomyCards.ts",
    levels: ["Newest absorption zone", "Newest push extreme"],
  },
  {
    id: "MEMORY_GHOST",
    label: "Memory Ghost",
    /*
      H-201 / F03. The earlier stretch of this chart that made the same shape,
      laid faintly under the live bars it matched (opacity ≤ 0.18). A
      comparison, never a forecast: nothing is drawn right of the newest bar.
      A weak fit is silence with a reason.
    */
    what: "the earlier stretch that made this same shape, ghosted under the live bars — never projected forward",
    gesture: "TOGGLE",
    owner: "src/lib/marketData/viewModels/selectMemoryGhost.ts",
    levels: ["No level of its own — a re-based path under the live bars"],
  },
  {
    id: "MARKET_STRUCTURE",
    label: "Market Structure",
    what: "confirmed swing highs and lows, with the last of each drawn loudest",
    gesture: "TOGGLE",
    owner: "src/lib/marketData/viewModels/selectMarketStructure.ts",
    levels: ["Swing highs", "Swing lows"],
  },
];

const GESTURE_NOTE: Readonly<Record<ProfileGesture, string>> = {
  TOGGLE: "draws over the visible range",
  DRAW: "drag a box on the chart to choose the range",
};

/**
 * Everything that requires an aggressor side rather than bars or raw prints.
 *
 * A row here reports NEEDS_SIDED_TAPE rather than WAITING_FOR_BARS, and the
 * difference is the whole point: one says wait, the other says do not.
 */
const NEEDS_SIDED_TAPE: ReadonlySet<ProfileId> = new Set<ProfileId>([
  "DELTA_VP",
  "IMBALANCE_STACK",
  "VALUE_CANDLE",
  "DELTA_DIVERGENCE",
  // Delta by definition asks WHICH SIDE crossed the spread. A tape that never
  // states an aggressor cannot answer, and this row must NEEDS_SIDED_TAPE.
  "DELTA_LEVELS",
]);

/** Readings that need real prints but deliberately do not need aggressor side. */
const NEEDS_PRINTS: ReadonlySet<ProfileId> = new Set<ProfileId>([
  "LIQUIDITY_WEATHER",
  // Living Profile can survive on bar volume alone (`buildLivingProfileSnapshot`
  // falls back to bar-level distribution), so it does NOT need side. It does
  // need SOMETHING to bucket, and bars-only is the minimum.
]);

export function selectProfileMenu(input: ProfileMenuInput): ProfileMenuVM {
  const fams = input.families;
  // The door's own name on its badge: a single-family door says what it holds.
  const noun =
    fams && fams.length === 1
      ? fams[0] === "ORDER_FLOW" ? "ORDER FLOW" : fams[0] === "READING" ? "READING LENSES" : "PROFILES"
      : "PROFILES";
  const entries: ProfileMenuEntry[] = CATALOGUE.filter(spec => !fams || fams.includes(PROFILE_FAMILY[spec.id])).map(spec => {
    // Ordering matters. "No bars" is the wider absence and is checked first:
    // reporting "this tape states no side" on an empty chart would name the
    // narrower gap while the bigger one goes unmentioned.
    let availability: ProfileAvailability;
    let availabilityNote: string;

    if (!input.barsPresent) {
      availability = "WAITING_FOR_BARS";
      availabilityNote = "no bars loaded for this symbol yet";
    } else if (NEEDS_PRINTS.has(spec.id) && !input.printsPresent) {
      availability = "WAITING_FOR_PRINTS";
      availabilityNote =
        "no per-trade prints have reached this chart yet — aggressor side is not required";
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
      organism: P110_ORGANISM[spec.id] ?? null,
      gestureNote: GESTURE_NOTE[spec.gesture],
      active: input.active[spec.id] === true,
      availability,
      availabilityNote,
    };
  });

  // The Profiles door reads in P-110 order: organisms 1–11, then the rest.
  if (fams && fams.length === 1 && fams[0] === "PROFILE") {
    entries.sort((a, b) => (a.organism ?? 99) - (b.organism ?? 99));
  }

  const activeCount = entries.reduce((n, e) => (e.active ? n + 1 : n), 0);
  const readyCount = entries.reduce((n, e) => (e.availability === "READY" ? n + 1 : n), 0);

  // Switched on AND unable to draw. Neither count above can express this: one
  // is measured over what the trader chose, the other over what the tape
  // allows, and the gap between them is the empty chart.
  const silent = entries.filter(e => e.active && e.availability !== "READY");
  const silentCount = silent.length;

  /*
    THE NOTE NAMES NAMES.

    "4 silent" alone would be a new riddle rather than an answer — the trader
    would have to open the menu and compare eight rows to find out which four.
    So the note lists them, and states the reason ONCE rather than four times,
    because it is one fact about one tape (see NEEDS_SIDED_TAPE above), and
    repeating it per row would make one gap read as four unrelated failures.

    Every reason is carried because bars/prints say wait while an absent sided
    tape says this feed cannot answer the question.
  */
  let silentNote = "";
  if (silentCount > 0) {
    const names = silent.map(e => e.label).join(", ");
    const waiting = silent.some(e => e.availability === "WAITING_FOR_BARS");
    const waitingForPrints = silent.some(e => e.availability === "WAITING_FOR_PRINTS");
    const untaped = silent.some(e => e.availability === "NEEDS_SIDED_TAPE");
    /*
      CAUGHT ON THE SERVING CHART, NOT BY A TEST.

      These three read as fragments because they were written to be joined —
      and then they were joined after a FULL STOP, so the live chip said
      "…Delta Divergence. this tape has not stated…". Every test here asserted
      `toContain`, which is true of a sentence that begins mid-word, so the
      suite was green while the product spoke badly.

      They are capitalised at the source rather than being run through a
      capitalise() helper at the joint, because each one IS a sentence and the
      only reason it did not look like one was the joint.
    */
    const causes = [waiting, waitingForPrints, untaped].filter(Boolean).length;
    const why = causes > 1
      ? "Some are waiting for market observations; the rest need a tape that states an aggressor side"
      : waiting
        ? "No bars have loaded for this symbol yet — these will draw when they do"
        : waitingForPrints
          ? "No per-trade prints have reached this chart yet — these will draw when they do"
          : "This tape has not stated an aggressor side, so these cannot be drawn from volume alone";
    silentNote =
      `${silentCount} of ${activeCount} switched on but drawing nothing: ${names}. ${why}.`;
  }

  return {
    version: PROFILE_MENU_VERSION,
    entries,
    activeCount,
    readyCount,
    silentCount,
    silentNote,
    silentSummary: silentCount === 0
      ? ""
      : silent.every(e => e.availability === "WAITING_FOR_BARS")
        ? `${silentCount} silent · waiting for bars`
        : silent.every(e => e.availability === "WAITING_FOR_PRINTS")
          ? `${silentCount} silent · waiting for prints`
          : silent.every(e => e.availability === "NEEDS_SIDED_TAPE")
            ? `${silentCount} silent · aggressor tape required`
            : `${silentCount} silent · mixed missing inputs`,
    summary:
      activeCount === 0
        ? noun
        : silentCount > 0
          ? `${noun} · ${activeCount} · ${silentCount} SILENT`
          : `${noun} · ${activeCount}`,
  };
}
