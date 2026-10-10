/**
 * WM PRO TEACHES ITSELF — Garden 19 §9 / §10. THE ONE EDUCATION OWNER.
 *
 * "No trader should need to remember what every proprietary WM Pro invention
 * means." Before a tool is switched on, its ⓘ opens a preview; after it is on,
 * selecting its mark on the market opens a first-touch line, and the deeper
 * read is Inspect. All three read THIS registry, keyed by the ids the menus
 * already use (ProfileId from `selectProfileMenu`, and the Tool Finder's
 * instrument ids `SESSION_BANDS` / `FP_<footprint mode>`).
 *
 * WHAT IS NOT HERE, ON PURPOSE: the one-line "what it is". That sentence is
 * owned by the catalogue (`selectProfileMenu` → `entry.what`, and
 * `FOOTPRINT_TYPES[].desc`), so the preview quotes it rather than keeping a
 * second copy that could drift. Availability on THIS symbol is not here
 * either — it is the menu compiler's `availabilityNote` (spot FX, no sided
 * tape, refused by data) or the order-flow capability compiler's reason,
 * passed through verbatim by `educationTruthLines`.
 *
 * Meanings follow the Drive canon — CURRENT Invention Registry & Surface Map
 * (1pC82nUdffKbfr60RTwbbXjNErRgj0gZKAqbPhEzvCvY) and the Invention-to-Canvas
 * Manifestation Map (1pC6M1oktBGpcD5uVQW0ryW86i8eyBQHUeSAGLzWaX_s): the
 * FULL / PARTIAL / DEGRADED / SILENCE evidence ladder, ABSORPTION ≠
 * EXHAUSTION, COMPOSITE ≠ FUSION, the eleven profile children, Memory Ghost
 * "no second past, no lookahead", Contradiction "never averaged".
 * A test pins: every menu row has a record, every record names a real id.
 */
import { academyDoorForTool } from "@/lib/academy/academyDoorForTool";
import type { ProfileId, ProfileMenuEntry } from "@/lib/marketData/viewModels/selectProfileMenu";
import type { MarketQualityState } from "@/lib/marketData/canonicalMarketState";
import { hasNoCentralVolume } from "@/lib/chart/volumeTruth";
import { indicatorEducationFor } from "@/lib/chart/indicatorEducation";
import { surfaceEducationFor } from "@/lib/chart/surfaceEducation";
import { chainScopeGrade, chainScopeWithheldWords, chainScopeWords, type ChainScope } from "@/lib/marketData/viewModels/selectDerivativesPressure";

/** The weakest thing the tool cannot draw without. */
export type EvidenceNeed =
  | "PRICE"          // bars alone — OHLC and time
  | "VOLUME"         // traded volume on the bars
  | "PRINTS"         // per-trade prints, side not required
  | "SIDED_TAPE"     // prints that state who crossed the spread
  | "OPTIONS"        // an options chain (open interest / greeks)
  | "YOUR_PLAN"      // something the trader draws or holds
  | "OTHER_LAYERS";  // reads other switched-on tools

export interface InventionEducation {
  /** The question a trader asks that this tool answers — in their words. */
  readonly question: string;
  readonly needs: EvidenceNeed;
  /** What evidence it needs, in a sentence. */
  readonly evidence: string;
  /** Where and how it physically appears on the market. */
  readonly appears: string;
  /** How to read its marks — its physical grammar. */
  readonly grammar: string;
  /** What FULL / PARTIAL / DEGRADED mean for THIS tool (canon evidence ladder). */
  readonly full: string;
  readonly partial: string;
  readonly degraded: string;
  /**
   * SILENCE — what the tool does when the evidence it needs is absent (Supermax §5, 2026-10-09).
   * Every record states it. It is the record's own no-evidence sentence (its DEGRADED line),
   * written once more under its own name — no new claim. A tool with no silence case says why.
   */
  readonly silence?: string;
  /** One sentence for the moment its mark is selected on the market (§10). */
  readonly firstTouch: string;
  /** The canon it answers to (registry family / hard plate). */
  readonly canon: string;
}

/** Shared ladder words for the sided order-flow readings (canon: ORDER-FLOW / DELTA EVIDENCE LADDER). */
const SIDED_FULL = "Every print carries a stated aggressor side — the marks are measured, not estimated.";
const SIDED_PARTIAL = "Sides are inferred (quote test or tick rule) — the read is labelled inferred and only covers bars since the tape arrived.";
const SIDED_DEGRADED = "No sided tape — it stays silent rather than guess sides from candle colour.";
/** Shared ladder words for the volume-by-price profiles (canon: SHARED VOLUME-PROFILE ENGINE). */
const VP_FULL = "Volume is allocated to price from real per-trade prints.";
const VP_PARTIAL = "Volume is spread across each bar's range from the bars' own totals — the shape is honest, single rows are approximate.";
const VP_DEGRADED = "No traded volume (spot FX, spot metals) or none loaded — it does not draw rather than invent a histogram.";
const PRICE_FULL = "Built from the loaded bars — nothing more is needed.";
const PRICE_PARTIAL = "Too few bars loaded or in view — it draws what the bars support and says what is short.";
const PRICE_DEGRADED = "No bars — nothing to read yet.";

export const INVENTION_EDUCATION: Readonly<Record<ProfileId, InventionEducation>> = {
  FIXED_RANGE: {
    question: "Where did the most business happen across everything loaded?",
    needs: "VOLUME", evidence: "Traded volume on the loaded bars.",
    appears: "A volume histogram against the price axis, with POC, VAH and VAL lines across the chart.",
    grammar: "The longest row (POC) is the price the market accepted most. VAH–VAL holds about 70% of volume — inside is fair value, outside is the market testing for acceptance.",
    full: VP_FULL, partial: VP_PARTIAL, degraded: VP_DEGRADED, silence: VP_DEGRADED,
    firstTouch: "Classic volume profile — the longest row is where most volume traded.",
    canon: "Profile family · shared VP engine",
  },
  SESSION: {
    question: "Where did this session trade the most?",
    needs: "VOLUME", evidence: "Traded volume on the bars inside the chosen session window.",
    appears: "A histogram clipped to the session, with POC, VAH, VAL and high/low volume nodes.",
    grammar: "Fat rows (HVN) are prices the session accepted; thin rows (LVN) are prices it passed through quickly.",
    full: VP_FULL, partial: VP_PARTIAL, degraded: VP_DEGRADED, silence: VP_DEGRADED,
    firstTouch: "This session's volume profile — fat rows accepted, thin rows rejected.",
    canon: "P-110 #6 Session Profile",
  },
  DELTA_VP: {
    question: "At each price in a range I choose, who was the aggressor — buyers or sellers?",
    needs: "SIDED_TAPE", evidence: "Prints that state which side crossed the spread.",
    appears: "A box you drag across bars; inside it, each price row splits into a buy side and a sell side.",
    grammar: "A row leaning to one side shows who pressed at that price. Heavy selling into a row that held is absorption; one side owning a run of rows is initiative.",
    full: SIDED_FULL, partial: SIDED_PARTIAL, degraded: SIDED_DEGRADED, silence: SIDED_DEGRADED,
    firstTouch: "Bid/ask split — each row shows who was the aggressor at that price.",
    canon: "P-110 #11 Bid/Ask Split Profile · only where evidence supports side",
  },
  ABSORPTION: {
    question: "Is heavy effort hitting a price and failing to move it?",
    needs: "VOLUME", evidence: "Bar volume (sided prints sharpen it) measured against how far price actually moved.",
    appears: "A shelf on the bars where effort was high and displacement near zero, at the real high and low it covered.",
    grammar: "Thicker shelf = more effort absorbed. A shelf that holds when tested again is a defended level; a clean break through it means the wall gave way.",
    full: "Sided prints and volume both measured — a confirmed absorption once its evidence floor passes.",
    partial: "Bar volume only — shown as an absorption candidate, not confirmed.",
    degraded: "No traded volume — no shelf is drawn (effort cannot be measured).", silence: "No traded volume — no shelf is drawn (effort cannot be measured).",
    firstTouch: "Absorption shelf — heavy effort met here and price barely moved.",
    canon: "F06 · H-701A Absorption (effort high, displacement near zero)",
  },
  EXHAUSTION: {
    question: "Is each step of this push moving price less for the volume it takes?",
    needs: "VOLUME", evidence: "Bar volume along a push, measured against how far each step moved price.",
    appears: "A mark at the push's extreme bar — where effort faded as price stretched.",
    grammar: "The mark sits where the last push failed to follow through. It is not a defended wall — exhaustion needs no defender, just fading fuel.",
    full: "Volume and sided prints measured along the whole push.",
    partial: "Bar volume only — an exhaustion candidate, labelled as such.",
    degraded: "No traded volume — no mark is drawn.", silence: "No traded volume — no mark is drawn.",
    firstTouch: "Exhaustion — effort faded along this push; the mark sits at its last extreme.",
    canon: "F06 · H-701A Exhaustion (aggression drying, no defender required)",
  },
  IMBALANCE_STACK: {
    question: "Did one side keep out-trading the other for several prices in a row?",
    needs: "SIDED_TAPE", evidence: "Sided prints at each price level.",
    appears: "A run of rungs on consecutive prices, with the stack's high and low.",
    grammar: "Three or more rungs stacked is initiative — one side out-traded the other at consecutive prices. Whether price comes back to them is not implied.",
    full: SIDED_FULL, partial: SIDED_PARTIAL, degraded: SIDED_DEGRADED, silence: SIDED_DEGRADED,
    firstTouch: "Stacked imbalance — one side out-traded the other at consecutive prices.",
    canon: "F06 Stacked Imbalance",
  },
  FLOW_CURRENT: {
    question: "Who is pressing on each bar?",
    needs: "SIDED_TAPE", evidence: "Sided prints inside each bar.",
    appears: "A small current on each bar with tape — up for net buying, down for net selling.",
    grammar: "Length is how one-sided the bar was. Long currents against the candle's direction are a warning: price moved one way while aggression pushed the other.",
    full: SIDED_FULL, partial: SIDED_PARTIAL, degraded: SIDED_DEGRADED, silence: SIDED_DEGRADED,
    firstTouch: "Flow current — net aggression on this bar, up for buying, down for selling.",
    canon: "F06A Order flow lives on price",
  },
  VALUE_CANDLE: {
    question: "Where inside each window did volume actually concentrate?",
    needs: "SIDED_TAPE", evidence: "Prints inside the window, binned by price.",
    appears: "On the candle: a centre of gravity with its value high and low.",
    grammar: "A centre of gravity near the close means the move was accepted; near the far wick means most business happened at prices the bar left behind.",
    full: SIDED_FULL, partial: SIDED_PARTIAL, degraded: SIDED_DEGRADED, silence: SIDED_DEGRADED,
    firstTouch: "Value candle — where this window's volume concentrated.",
    canon: "Clarity / auction language",
  },
  CLARITY_CANDLE: {
    question: "How much of each candle was decision and how much was indecision?",
    needs: "PRICE", evidence: "The bars' open, high, low and close.",
    appears: "Re-inked candles: the real high and low kept, body strength drawn by body efficiency, dominant wick named, open gaps marked.",
    grammar: "Solid body = most of the range was decision. Hollow = indecision. A long named wick shows where one side was rejected. Clarity never rewrites the real OHLC.",
    full: PRICE_FULL, partial: PRICE_PARTIAL, degraded: PRICE_DEGRADED, silence: PRICE_DEGRADED,
    firstTouch: "Clarity candle — solid is decision, hollow is indecision; real OHLC unchanged.",
    canon: "F05 Clarity · WM_NewMockup_72",
  },
  DELTA_DIVERGENCE: {
    question: "Did price and buying/selling pressure disagree at the last swings?",
    needs: "SIDED_TAPE", evidence: "Cumulative delta from sided prints, compared at swing pivots.",
    appears: "The two swing pivots marked where price made a new extreme and cumulative delta did not.",
    grammar: "Higher high in price with a lower delta high = buyers did not back the new high. The reverse at lows = sellers did not back the new low.",
    full: SIDED_FULL, partial: SIDED_PARTIAL, degraded: SIDED_DEGRADED, silence: SIDED_DEGRADED,
    firstTouch: "Delta divergence — price and aggression disagreed between these two swings.",
    canon: "F06 CVD / delta relationship",
  },
  LIQUIDITY_WEATHER: {
    question: "How much size does it cost to move price here?",
    needs: "VOLUME", evidence: "Prints (or traded bars when no tape window) — volume per unit of price travel; side not needed.",
    appears: "A restrained tint on price as heat bands; candles stay readable through it.",
    grammar: "Hot = dear: on these bars it took a lot of size to move price. Cool = cheap: price moved further for the size traded. It describes the bars, not what comes next.",
    full: "Measured from live prints.",
    partial: "Measured from the chart's traded bars because the tape window is short — coarser bands, labelled.",
    degraded: "No traded volume or too few traded bars — the lens says UNMEASURED instead of painting.", silence: "No traded volume or too few traded bars — the lens says UNMEASURED instead of painting.",
    firstTouch: "Liquidity weather — hot bands are expensive to move through, cool bands are cheap.",
    canon: "F08B Liquidity Weather (a lens, not a page)",
  },
  EFFORT_MARK: {
    question: "Did this bar spend a lot and move a little — or the reverse?",
    needs: "VOLUME", evidence: "The bar's volume against its range, compared with recent bars.",
    appears: "A mark at the high or low of the bar under your cursor when effort and result disagree.",
    grammar: "Big effort, small result = something absorbed it. Small effort, big result = nobody was in the way.",
    full: "Volume and range both measured on real traded bars.",
    partial: "Short history — compared against fewer bars, labelled.",
    degraded: "No traded volume — no mark.", silence: "No traded volume — no mark.",
    firstTouch: "Effort mark — this bar's effort and result disagreed.",
    canon: "F06 Effort → Response",
  },
  DELTA_LEVELS: {
    question: "At which real prices did one side cross the spread hardest?",
    needs: "SIDED_TAPE", evidence: "Sided prints at each traded level.",
    appears: "Rungs at the real traded prices, sized by net aggressor delta.",
    grammar: "The biggest rung shows where aggression concentrated. A big buy rung that price then fell through is aggression that failed.",
    full: SIDED_FULL, partial: SIDED_PARTIAL, degraded: SIDED_DEGRADED, silence: SIDED_DEGRADED,
    firstTouch: "Delta level — net aggression at this real price.",
    canon: "F06 delta evidence ladder",
  },
  LIVING_PROFILE: {
    question: "Where is the market accepting price right now, and where is value moving?",
    needs: "VOLUME", evidence: "Traded volume on the bars (prints when present).",
    appears: "A live histogram attached to the price scale; its POC migrates as value expands, contracts or shifts.",
    grammar: "Watch the POC move — value following price is acceptance; value staying behind is rejection. Click a row for its biography.",
    full: VP_FULL, partial: VP_PARTIAL, degraded: VP_DEGRADED, silence: VP_DEGRADED,
    firstTouch: "Living profile row — how much trade this price has taken this session.",
    canon: "P-110 #1 Living Profile · H-601",
  },
  TPO_PROFILE: {
    question: "How much TIME did the market spend at each price?",
    needs: "PRICE", evidence: "Bars alone — time and price, no volume needed.",
    appears: "Brass blocks against the price axis — one block per period that traded at each price — built over ALL loaded bars (not only the bars on screen), with TPO POC and value-area chips. Because it spans the whole history, its POC or value area can lie outside the prices on screen — a chip is shown only when its price is in view. No separate single-print mark is drawn.",
    grammar: "Wide rows = more periods spent at that price (acceptance). One-block rows are prices the market passed through in a single period.",
    full: PRICE_FULL, partial: "Too few periods on screen — it says so instead of lettering a thin profile.", degraded: PRICE_DEGRADED, silence: PRICE_DEGRADED,
    firstTouch: "TPO — blocks show how many periods the market spent at each price.",
    canon: "P-110 #10 TPO / auction distribution",
  },
  STRUCTURE_PROFILE: {
    question: "Where did trade build since the last confirmed swing?",
    needs: "PRICE", evidence: "A confirmed swing; volume makes the rows exact.",
    appears: "A histogram anchored to the last swing, with the leg's POC, VAH and VAL.",
    grammar: "It answers for this leg only — a POC near the swing means the leg is still auctioning at its start; far from it means the leg moved value.",
    full: "Swing confirmed and traded volume present.",
    partial: "Swing confirmed but volume is bar-spread — shape honest, rows approximate.",
    degraded: "No lawful swing to anchor on — it says so and does not float.", silence: "No lawful swing to anchor on — it says so and does not float.",
    firstTouch: "Structure profile — volume for the leg since the last swing.",
    canon: "P-110 #2 Structure Profile (market-anchored)",
  },
  PROFILE_DNA: {
    question: "What shape is the profile — balanced, skewed, thin?",
    needs: "VOLUME", evidence: "The Living Profile it describes.",
    appears: "A spine beside the Living Profile: range, value bracket, POC notch and mass-centre diamond. Numbers in Inspect.",
    grammar: "A diamond away from the POC means the volume is skewed to one side. It describes; it never forecasts.",
    full: "Living Profile drawn from real volume.",
    partial: "Living Profile drawn from bar-spread volume — statistics labelled approximate.",
    degraded: "No Living Profile on the glass — DNA has nothing to describe.", silence: "No Living Profile on the glass — DNA has nothing to describe.",
    firstTouch: "Profile DNA — the shape of the profile, described not predicted.",
    canon: "P-110 #5 Profile DNA (never prophecy)",
  },
  VALUE_MIGRATION: {
    question: "Where did value stand after every bar — and which way is it moving?",
    needs: "VOLUME", evidence: "Traded volume, rebuilt bar by bar.",
    appears: "Developing POC, VAH and VAL drawn across the candles.",
    grammar: "Rising POC = value moving up with price (accepted). Price rising while POC stays flat = the move is not yet accepted.",
    full: VP_FULL, partial: VP_PARTIAL, degraded: VP_DEGRADED, silence: VP_DEGRADED,
    firstTouch: "Value migration — where value stood as each bar closed.",
    canon: "Living Profile's auction movie",
  },
  PROFILE_MEMORY: {
    question: "Where did earlier sessions find value — and has price been back?",
    needs: "VOLUME", evidence: "At least one completed prior session in the loaded bars.",
    appears: "Earlier sessions' POC and value carried forward as lines — naked until the market returns.",
    grammar: "A naked POC is one the market has not traded back to yet. Once touched, its biography records the test and the response.",
    full: "Completed prior sessions with traded volume.",
    partial: "Fewer prior sessions loaded — fewer memories, said plainly.",
    degraded: "A 24/7 feed with no session gap, or no volume — nothing to remember.", silence: "A 24/7 feed with no session gap, or no volume — nothing to remember.",
    firstTouch: "Profile memory — an earlier session's value, carried forward.",
    canon: "P-110 #4 Profile Memory",
  },
  PROFILE_FUSION: {
    question: "Where do two or more of my profiles agree?",
    needs: "OTHER_LAYERS", evidence: "Two or more switched-on profiles that genuinely overlap.",
    appears: "A fused zone where profiles overlap; the originals stay visible and each source is named.",
    grammar: "A fused zone is recomputed from the combined rows — never an average of two POCs. No real overlap, no zone.",
    full: "Two or more profiles from real volume overlap.",
    partial: "Sources are bar-spread profiles — the zone inherits their approximation.",
    degraded: "Fewer than two profiles on, or no real overlap — it refuses and says why.", silence: "Fewer than two profiles on, or no real overlap — it refuses and says why.",
    firstTouch: "Profile fusion — profiles agree here; each source stays inspectable.",
    canon: "P-110 #3 Profile Fusion (COMPOSITE ≠ FUSION)",
  },
  COMPOSITE_PROFILE: {
    question: "Across the last few completed sessions, where was value?",
    needs: "VOLUME", evidence: "Completed sessions with volume; today is excluded.",
    appears: "One histogram aggregated over recent sessions, with composite POC, VAH and VAL.",
    grammar: "The composite value area is the multi-day fair price — today trading inside it is balance, outside it is a test of new value.",
    full: VP_FULL, partial: VP_PARTIAL,
    degraded: "No completed session (a 24/7 feed never closes one) or no volume — it refuses.", silence: "No completed session (a 24/7 feed never closes one) or no volume — it refuses.",
    firstTouch: "Composite profile — value across recent completed sessions.",
    canon: "P-110 #9 Composite Profile",
  },
  VISIBLE_RANGE_PROFILE: {
    question: "Where did trade happen in exactly what I am looking at?",
    needs: "VOLUME", evidence: "Traded volume on the bars in view.",
    appears: "A histogram for the bars on screen — it rebuilds when you scroll or zoom.",
    grammar: "Same reading as any profile, but its levels move with your camera — do not treat them as fixed.",
    full: VP_FULL, partial: VP_PARTIAL, degraded: VP_DEGRADED, silence: VP_DEGRADED,
    firstTouch: "Visible range profile — volume for the bars in view.",
    canon: "P-110 #7 Visible Range Profile",
  },
  ANCHORED_RANGE: {
    question: "Where did trade happen across a stretch I pick?",
    needs: "VOLUME", evidence: "Traded volume on the bars you drag across.",
    appears: "Drag across bars; a profile builds only inside that range, with its POC, VAH and VAL.",
    grammar: "Pick a move (a rally, a range) and read where it did its business.",
    full: VP_FULL, partial: VP_PARTIAL, degraded: VP_DEGRADED, silence: VP_DEGRADED,
    firstTouch: "Fixed range profile — volume for the range you chose.",
    canon: "P-110 #8 Fixed Range Profile (user-anchored)",
  },
  REGIME_LIGHTING: {
    question: "Is this market trending or balancing — and which fixtures does that light?",
    needs: "PRICE", evidence: "Closes of the bars in view.",
    appears: "Lights the fitting fixtures: a trend channel in trend, mean/σ levels in balance. When the verdict is UNKNOWN (no regime breaker yet), both sets are lit.",
    grammar: "It is a dimmer, not a room — it changes which geometry speaks: the channel in trend, the mean/σ levels in balance. UNKNOWN lights both, because neither regime is confirmed.",
    full: PRICE_FULL, partial: PRICE_PARTIAL, degraded: PRICE_DEGRADED, silence: PRICE_DEGRADED,
    firstTouch: "Regime lighting — the regime decides which fixtures are lit.",
    canon: "F15 Regime · H-901",
  },
  QUESTION_LENS: {
    question: "Is the newest absorption or exhaustion holding up — what is it still owed?",
    needs: "OTHER_LAYERS", evidence: "An absorption or exhaustion reading on the chart.",
    appears: "Asks the newest event one question, lists what evidence is still owed, quiets the rest. The band carries one ivory mark naming the question asked: ■ absorption · ▽ exhaustion · » continuation · ✕ trap · ⊢⊣ hold · ◇ what changed · ○ permission.",
    grammar: "Owed items are evidence debt — until paid, the answer stays unresolved. The mark names the question, never the answer.",
    full: "The event has full evidence behind it.",
    partial: "The event is a candidate — the lens lists exactly what is missing.",
    degraded: "No event to ask — it says so.", silence: "No event to ask — it says so.",
    firstTouch: "Question lens — one question, and what the answer still owes.",
    canon: "F13 Question lenses",
  },
  SCAFFOLDING: {
    question: "Show me the same read with more or less help.",
    needs: "PRICE", evidence: "The nearest confirmed swings.",
    appears: "The same read at three depths — six steps, three dynamics, then geometry only.",
    grammar: "Click again to go deeper. The truth never changes, only how much is explained.",
    full: PRICE_FULL, partial: PRICE_PARTIAL, degraded: PRICE_DEGRADED, silence: PRICE_DEGRADED,
    firstTouch: "Scaffolding — the same read, with more or less teaching.",
    canon: "F21 Learning genome · scaffolding",
  },
  ANATOMY_CARDS: {
    question: "What exactly measured the latest absorption and exhaustion?",
    needs: "VOLUME", evidence: "The absorption and exhaustion readings.",
    appears: "Key metrics side by side, each tied to the candles it measured.",
    grammar: "Compare effort and displacement for each — the card points at the bars it is about.",
    full: "Both readings measured from real volume and prints.",
    partial: "Bar volume only — candidate metrics, labelled.",
    degraded: "No traded volume — no cards.", silence: "No traded volume — no cards.",
    firstTouch: "Anatomy card — the metrics behind this event.",
    canon: "F06 · H-701A (market anatomy, never bodies)",
  },
  MEMORY_GHOST: {
    question: "When did this market last make this same shape?",
    needs: "PRICE", evidence: "Enough history to find a close analogue.",
    appears: "The earlier stretch ghosted faintly under the live bars on the same axes — never projected forward.",
    grammar: "It shows what the past shape looked like, not what will happen. Sample size and mismatch are in Inspect.",
    full: "A close analogue with enough history.",
    partial: "A weaker match — mismatch shown in Inspect.",
    degraded: "No adequate analogue — silence, not a guess.", silence: "No adequate analogue — silence, not a guess.",
    firstTouch: "Memory ghost — an earlier stretch with the same shape. Not a forecast.",
    canon: "F03 Memory Ghost · H-201 (no second past, no lookahead)",
  },
  EXPECTED_ENVELOPE: {
    question: "How far does this market usually travel from the open — and is today unusual?",
    needs: "PRICE", evidence: "Recent completed sessions.",
    appears: "A dotted envelope from the session open: the HISTORICAL reach above and below the open BY TIME OF DAY, taken from recent completed sessions, with the count of sessions that went as far as today beside it. It is drawn a few bars past the newest candle because the time-of-day reach continues through the session — that part is history for that clock time, not a forecast.",
    grammar: "Each point of the envelope is how far recent sessions had travelled from their open by that time of day. Price at the edge with few sessions having reached further = an unusual day so far. Inside = ordinary. It never says where price goes next.",
    full: "Enough completed sessions to count.",
    partial: "Few sessions — counts shown, read with care.",
    degraded: "No completed sessions — no envelope.", silence: "No completed sessions — no envelope.",
    firstTouch: "Expected envelope — historical reach from the open by time of day, not a forecast.",
    canon: "H-801 Expected Envelope + Analogue Surprise",
  },
  CONTRADICTION: {
    question: "Do the market's own readings lean opposite ways at this price?",
    needs: "PRICE", evidence: "The loaded bars. It asks four families itself — swing structure, defended zones, exhaustion (needs volume) and effort (needs sided tape). No other tool has to be switched on.",
    appears: "When at least one family leans up and one leans down, a box over the price band reads UNRESOLVED with each lean drawn as an arrow. Agreement, or fewer than two leaning families, draws nothing.",
    grammar: "Unresolved means the readings disagree at this price — both cases are shown, never averaged into one score.",
    full: "All four families could be asked — volume and sided tape present.",
    partial: "Without sided tape the effort family is silent; without volume, exhaustion is silent — each named in Inspect.",
    degraded: "Fewer than two families lean — NOT ENOUGH, nothing is drawn.", silence: "Fewer than two families lean — NOT ENOUGH, nothing is drawn.",
    firstTouch: "Contradiction — two readings disagree here; both shown, never averaged.",
    canon: "H-401 Contradiction Not Averaged",
  },
  RISK_ON_PRICE: {
    question: "Where is my stop, entry and target — and how far is price from my stop?",
    needs: "YOUR_PLAN", evidence: "A position you draw on the chart.",
    appears: "Your plan bracketed on the price axis: stop, entry, target, R, and live price against the stop.",
    grammar: "Distance to stop in R is your live risk. Nothing here places an order.",
    full: "Your drawn plan and a live price.",
    partial: "Price is delayed — the distance to stop trails the market.",
    degraded: "No plan drawn — nothing to bracket.", silence: "No plan drawn — nothing to bracket.",
    firstTouch: "Risk on price — your stop, entry and target on the axis.",
    canon: "F17 Risk on Price · H-1001",
  },
  LIQUIDITY_LIFECYCLE: {
    question: "Where did volume pool — and what happened to each pool since?",
    needs: "VOLUME", evidence: "Traded volume at price over time.",
    appears: "Pool bands at price with stage markers: appeared, grew, persisted, touched, refilled, consumed.",
    grammar: "A pool that refills after a touch is being defended; a consumed pool is gone. It never claims spoofing from volume alone.",
    full: "Built from prints at price.",
    partial: "Built from bar volume — stages coarser, labelled. No resting-book depth is claimed.",
    degraded: "No traded volume — no pools.", silence: "No traded volume — no pools.",
    firstTouch: "Liquidity pool — where volume collected, and its life since.",
    canon: "F08 Liquidity Lifecycle",
  },
  MARKET_STRUCTURE: {
    question: "Where are the confirmed swing highs and lows?",
    needs: "PRICE", evidence: "Bars alone.",
    appears: "Swing highs and lows, the latest of each drawn loudest.",
    grammar: "Higher highs and higher lows = up-structure. A close beyond the last swing is a break of structure. Click a swing for its passport.",
    full: PRICE_FULL, partial: PRICE_PARTIAL, degraded: PRICE_DEGRADED, silence: PRICE_DEGRADED,
    firstTouch: "Swing level — a confirmed high or low; its passport shows tests and age.",
    canon: "F11 Market Object Passport · structure",
  },
  MTF_ANCESTRY: {
    question: "What do the higher timeframes say about where price came from?",
    needs: "PRICE", evidence: "This chart's bars, resampled to 4H, 1H and daily.",
    appears: "On this chart: the 4H body price grew from, the last hour's volume node, the prior day's nearest high or low.",
    grammar: "Price above its 4H band is building on it; a return into it is a test of the parent. PDH/PDL are the day's shelves.",
    full: "Enough bars loaded to resample every timeframe.",
    partial: "Too few bars for one timeframe — that one is named silent.",
    degraded: "No bars — nothing to resample.", silence: "No bars — nothing to resample.",
    firstTouch: "Higher-timeframe ancestry — the parent structure under this price.",
    canon: "T-210 / F10 MTF ancestry (same camera)",
  },
  DERIVATIVES_PRESSURE: {
    question: "Where does options positioning put the zero-gamma level and the walls for this underlying?",
    needs: "OPTIONS", evidence: "An options chain with open interest (Cboe delayed; BTC/ETH from Deribit public).",
    appears: "A pressure field, the zero-gamma front, walls with observed tests, and the implied expected move.",
    grammar: "Above zero-gamma the modelled dealer book is long gamma (its hedges lean against the move); below it, short gamma (its hedges go with the move). It is INFERRED from open interest, not observed orders.",
    full: "Fresh chain for this underlying.",
    partial: "Chain is delayed — positioning trails the market, said in the label.",
    degraded: "No chain for this market — unavailable on this feed.", silence: "No chain for this market — unavailable on this feed.",
    firstTouch: "Derivatives pressure — modelled dealer gamma from open interest; inferred, not observed orders.",
    canon: "Garden 15/16 Market Sense · Derivatives Pressure",
  },
  BRICK_WALLS: {
    question: "Which strikes near price hold the most open interest, and has price tested them?",
    needs: "OPTIONS", evidence: "Options open interest for this underlying — delayed where the venue delays it, and on futures only the contracts nearest price.",
    appears: "Masonry walls at strike prices — bricks, a crack at each observed test, breach and scar.",
    grammar: "More bricks = more open interest. Each crack is a test that held; a breach leaves a scar. Inferred positioning, not orders.",
    full: "Fresh chain and observed tests on this chart.",
    partial: "Chain delayed or mapped from an index (NDX/SPX onto NQ/ES) — labelled.",
    degraded: "No chain for this market — no walls. While the chain loads it is silent (no chain yet); with a chain but no wall event at the current strikes it stays silent too.", silence: "No chain for this market — no walls. While the chain loads it is silent (no chain yet); with a chain but no wall event at the current strikes it stays silent too.",
    firstTouch: "Brick wall — a strike with large open interest (inferred positioning); cracks are observed tests.",
    canon: "Garden 16 §20 Brick Walls",
  },
};

/** The Tool Finder's instruments outside the catalogue (Session Bands, footprint modes). */
export const INSTRUMENT_EDUCATION: Readonly<Record<string, InventionEducation>> = {
  SESSION_BANDS: {
    question: "Which of the world's sessions is open right now?",
    needs: "PRICE", evidence: "The clock alone — no volume needed.",
    appears: "Asia, London and New York business hours on the time axis, the London/New York overlap marked.",
    grammar: "Each band is a session's business hours on the clock; the London / New York overlap is marked. It is a clock fact, not a reading of the market.",
    full: "Always full — a clock fact.", partial: "Not applicable — a clock fact.", degraded: "Not applicable — a clock fact.", silence: "No silence case — a clock fact: the session clock always has an answer.",
    firstTouch: "Session band — the trading session these bars belong to.",
    canon: "F10 One clock",
  },
  EFFORT_RESPONSE: {
    question: "Bar by bar, did the volume spent actually move price?",
    needs: "VOLUME", evidence: "Real traded volume on each closed bar, and its open-to-close move.",
    appears: "Inside every finished volume bar, a narrow column — how far that bar moved, in ATR units.",
    grammar: "Tall volume bar, short column: effort spent, little moved (absorbed). Full column: the effort bought movement (initiative). A column climbing out of a short bar: movement with no fuel (vacuum).",
    full: "Real traded volume on every bar in view.",
    partial: "Few closed bars in view — the medians it compares against are thin.",
    degraded: "No traded volume (spot FX, placeholder feeds) — it stays silent and says why.", silence: "No traded volume (spot FX, placeholder feeds) — it stays silent and says why.",
    firstTouch: "Effort → response — the column shows how far this bar's volume moved price.",
    canon: "F06 Effort → Response · Garden 19 §7",
  },
  DELTA_KEEL: {
    question: "Bar by bar, who won — and did winning move price?",
    needs: "SIDED_TAPE", evidence: "Signed prints captured for the bar, or the provider's own bid / ask volume per bar.",
    appears: "A short keel on each finished candle's close edge, in buy or sell ink; its length is the winning side's share of the bar's sided volume.",
    grammar: "Keels lengthening in one ink: aggression increasing. Shortening: fading. A hollow keel: strong aggression that failed to move price its way.",
    full: "Signed prints or provider bar sides on the bars in view.",
    partial: "Only some bars carry sides — the rest stay silent, never guessed.",
    degraded: "No signed evidence (spot FX, unsided feeds) — no keel is drawn.", silence: "No signed evidence (spot FX, unsided feeds) — no keel is drawn.",
    firstTouch: "Delta keel — who won this bar, and whether it moved.",
    canon: "F06 Order flow across candles · Garden 19 §6 · C-02",
  },
  WISDOM_LINE: {
    question: "Across the last candles, what is the one thing the evidence says?",
    needs: "OTHER_LAYERS", evidence: "Only readings already switched on and drawn: Delta Keel, Effort → Response, Value Migration.",
    appears: "One quiet line near the top of the chart, tied by a hairline to the bar it is about.",
    grammar: "SELL AGGRESSION FAILED TO DISPLACE, EFFORT INCREASING — RESPONSE WEAKENING, VALUE MIGRATING HIGHER. No line means no reading proved one.",
    full: "Its source readings are on and drawn.",
    partial: "Some sources are off — the line speaks only from the ones that are on.",
    degraded: "No source reading on this market (spot FX has no volume or sides) — it stays silent.", silence: "No source reading on this market (spot FX has no volume or sides) — it stays silent.",
    firstTouch: "Wisdom line — the one sentence the drawn evidence supports.",
    canon: "F17 Cross-candle wisdom · Garden 19 §17",
  },
  BREATH_RIBBON: {
    question: "Are this market's ranges drawing in or breathing out — and since when?",
    needs: "PRICE", evidence: "Each finished bar's Wilder ATR(14) against the median ATR of the last 120 bars — the same reading as the Market Breathing card. No volume needed.",
    appears: "A thin ivory ribbon on the volume well's top edge: low and flat while ranges are compressed, tall while they are expanded, a short notch where the state changed.",
    grammar: "Read the shape, not a signal: a long flat stretch is compression, a rising stretch is ranges widening. It describes the past bars and never forecasts a breakout. PROPOSED — no Founder plate for Breathing yet.",
    full: "40+ bars carry ATR on the camera's window.",
    partial: "Fewer bars in the window — the ribbon waits rather than reading a short median.",
    degraded: "Under 40 bars with ATR — silent (SILENT:WARMUP).", silence: "Under 40 bars with ATR — silent (SILENT:WARMUP).",
    firstTouch: "Breath ribbon — each bar's range against its own normal; low = compressed, tall = expanded.",
    canon: "F15 Market Breathing (rail card) · panel-erasure carrier, PROPOSED",
  },
  CVD_NOTCH: {
    question: "Across the last few candles, is the aggression agreeing with the price move?",
    needs: "SIDED_TAPE", evidence: "The Delta Keel's signed rows for the last 5 finished bars: captured signed prints, else the provider's bar sides. Their summed delta (the CVD slope) against the price move across the same bars.",
    appears: "A small hollow ivory notch on the wick tip of the window's last bar, in the direction price moved — only where the cumulative delta ran the other way. Dashed when the window used the provider's bar sides.",
    grammar: "Notch = price moved one way while the net aggression across those bars leaned the other. No notch = they agreed, or flow was balanced, or the move was under a quarter ATR. It describes finished bars and never forecasts a turn. PROPOSED — no Founder plate for the CVD relationship yet.",
    full: "Every bar in the window carries signed flow from captured prints.",
    partial: "A window used the provider's bar sides — its notch is dashed (inferred).",
    degraded: "A bar in the window has no sides — no claim is made for that window. Spot FX has no central sides — silent.", silence: "A bar in the window has no sides — no claim is made for that window. Spot FX has no central sides — silent.",
    firstTouch: "CVD notch — price moved one way while the last 5 bars' net aggression leaned the other.",
    canon: "G19.CVD_REL · C-06 CVD ⇄ price relationship notch (G19-P02), PROPOSED",
  },
  RVOL_TONE: {
    question: "Was this bar unusually busy for its time of day?",
    needs: "VOLUME", evidence: "Real traded volume, compared with the same time of day over 10+ earlier sessions (else the recent bars, labelled).",
    appears: "A brass tone inside the volume bar of each unusually busy bar — the rarer, the brighter. Ordinary bars stay plain.",
    grammar: "A run of toned volume bars is participation arriving; tone fading while price keeps going is a move running on less.",
    full: "10+ sessions of the same time slot loaded.",
    partial: "Fewer sessions loaded — the baseline is the recent bars and the receipt says ROLLING.",
    degraded: "No traded volume (spot FX, placeholder feeds) — no tone, and no quote count is relabelled as volume.", silence: "No traded volume (spot FX, placeholder feeds) — no tone, and no quote count is relabelled as volume.",
    firstTouch: "Relative volume — how busy this bar was for its time of day.",
    canon: "C-03 Relative volume · F05A (tone on the volume bar, never the body)",
  },
  "FP_bid-ask": {
    question: "Inside this candle, how much traded on the bid versus the ask at each price?",
    needs: "SIDED_TAPE", evidence: "Sided prints inside each bar.",
    appears: "Each candle split into price rows with bid and ask volume.",
    grammar: "Read bottom to top: heavy ask volume at a bar's low (that held) is absorption; one side owning several rows is initiative.",
    full: SIDED_FULL, partial: SIDED_PARTIAL, degraded: SIDED_DEGRADED, silence: SIDED_DEGRADED,
    firstTouch: "Footprint cell — bid vs ask volume at this price inside the bar.",
    canon: "F06A Order flow on price",
  },
  FP_delta: {
    question: "Where in this bar did net buying or selling concentrate?",
    needs: "SIDED_TAPE", evidence: "Sided prints.",
    appears: "Bubbles on the candle at the price zone, teal for net buying, purple for net selling.",
    grammar: "Bigger bubble = more net aggression. No sided print, no bubble.",
    full: SIDED_FULL, partial: SIDED_PARTIAL, degraded: SIDED_DEGRADED, silence: SIDED_DEGRADED,
    firstTouch: "Delta bubble — net aggression in this price zone.",
    canon: "H-701B Delta bubbles",
  },
  "FP_volume-profile": {
    question: "Where inside each candle did volume trade?",
    needs: "SIDED_TAPE", evidence: "Prints inside each bar.",
    appears: "Small horizontal volume bars inside each candle.",
    grammar: "The widest row is the bar's own POC — where its business was done.",
    full: SIDED_FULL, partial: SIDED_PARTIAL, degraded: SIDED_DEGRADED, silence: SIDED_DEGRADED,
    firstTouch: "Per-candle volume — where this bar did its business.",
    canon: "F06A footprint",
  },
  FP_imbalance: {
    question: "Where did one side overwhelm the other inside the bar?",
    needs: "SIDED_TAPE", evidence: "Sided prints at adjacent prices.",
    appears: "Highlighted cells where the bid/ask ratio passed the threshold.",
    grammar: "A highlighted cell is a price where one side traded at least 2.5× the other on the diagonal. Consecutive highlighted cells are a stacked imbalance. It measures the ratio; who is positioned, and whether anyone is caught offside, is not observed.",
    full: SIDED_FULL, partial: SIDED_PARTIAL, degraded: SIDED_DEGRADED, silence: SIDED_DEGRADED,
    firstTouch: "Imbalance cell — one side overwhelmed the other here.",
    canon: "F06 Imbalance",
  },
  "FP_aggressive-passive": {
    question: "Who was aggressive and who was passive here?",
    needs: "SIDED_TAPE", evidence: "Sided prints; passive roles are inferred from location.",
    appears: "Cells marked by aggressor side, with passive side as a labelled proxy.",
    grammar: "Aggressor side is observed; the passive role is an inference, never a resting-order observation.",
    full: SIDED_FULL, partial: SIDED_PARTIAL, degraded: SIDED_DEGRADED, silence: SIDED_DEGRADED,
    firstTouch: "Aggressive/passive — observed aggressor, inferred passive side.",
    canon: "F06 evidence ladder",
  },
  "FP_big-trades": {
    question: "Where did unusually large trades print?",
    needs: "PRINTS", evidence: "Per-trade prints.",
    appears: "Marks at the actual time and price of large prints, sized relative to this session.",
    grammar: "A print is marked when its notional size stands out against a rolling baseline of recent prints — size is relative, not absolute — and it carries the side that crossed the spread. Select one to see what price did after it. It does not say who traded or why.",
    full: "Every print observed with its side.",
    partial: "Prints observed, side inferred — labelled.",
    degraded: "No per-trade prints — no marks.", silence: "No per-trade prints — no marks.",
    firstTouch: "Big trade — an unusually large print; Inspect shows what price did next.",
    canon: "F07 Big Trades · H-701B",
  },
};

/**
 * A CONCEPT record: a method WM Pro teaches whose "what it is" has no catalogue
 * row to quote yet, so the record carries it — plus the Academy lesson its
 * canon reference opens. When the concept's tool joins a menu, `what` moves to
 * that catalogue and this record keeps the rest.
 */
export interface ConceptEducation extends InventionEducation {
  readonly what: string;
  /** The Academy lesson that teaches it (deep link into /education), when one exists. */
  readonly academy?: { readonly lessonId: string; readonly href: string; readonly title: string };
}

/**
 * Garden 19 §32 — FAIR VALUE GAP / IMBALANCE. The law is
 * src/lib/marketData/fvg/fvgDefinition.ts (FVG_3C v1); the course
 * (src/lib/academy/fvgCourse.ts) teaches the same words.
 */
export const CONCEPT_EDUCATION = {
  FVG_IMBALANCE: {
    what: "Fair value gap — a price territory left between two candles' wicks when the middle candle displaced so fast that the market barely traded there.",
    question: "Where did price move so fast that one side barely traded — and what has happened at that territory since?",
    needs: "PRICE",
    evidence: "Three closed bars (wick highs and lows), b2's body pointing the gap's way, and ATR14 at b2 for the size floor — max(1 tick, 0.10 × ATR14). No volume is needed to draw it.",
    appears: "A hatched territory from the third bar's close, extending right until it is traded through: bullish [high(b1), low(b3)], bearish [high(b3), low(b1)].",
    grammar: "Touch = the first wick to reach the near edge. Under 50% penetration is partial, 50% or more deep, the far boundary is full. A close back outside on the origin side without full mitigation is rejection; 2+ consecutive closes inside is acceptance (rejection counts within the visit's first 5 bars); a close beyond the far boundary is traded through. No guaranteed return should be assumed. WM Pro tracks what actually happens.",
    full: "Every closed bar since creation is loaded — touch, depth, rejection or acceptance are measured, not estimated.",
    partial: "The territory's later bars are not all loaded — it is drawn, and its history covers only the bars in hand.",
    degraded: "Fewer than 14 closed bars (no ATR yet) or no bars — nothing is detected; a forming bar never creates or erases a territory.", silence: "Fewer than 14 closed bars (no ATR yet) or no bars — nothing is detected; a forming bar never creates or erases a territory.",
    firstTouch: "Fair value gap — a defined territory; its history shows touch, depth and what the closes did. No guaranteed return should be assumed.",
    canon: "Garden 19 §32 · FVG_3C v1 · Academy: FVG / Imbalance & Patience, lesson 1",
    academy: { lessonId: "fvg-1", href: "/education?lesson=fvg-1", title: "What is an imbalance?" },
  },
  // ── §34 inventory audit (2026-10-08): built candle-field inventions reached by
  // a CONTEXT door (select / rail / pane) had no ⓘ. Keyed by their census ids.
  // Words read from the owners named in each `canon`; nothing here is new grammar.
  F04A: {
    what: "Causal marks — the selected print is the FORCE; what price did in the next bars, with and against it, is the RESPONSE.",
    question: "Did this big print actually move the market its way?",
    needs: "PRINTS",
    evidence: "One selected per-trade print (Big Trades on) and the closed bars after it; the yardstick is the median bar range of the bars BEFORE the print.",
    appears: "On the selected print only: a force mark at its time and price, then the response bars marked FOLLOWED / FADED / MUTED, with the evidence debt counting closed response bars (0/3 … 3/3).",
    grammar: "FOLLOWED = moved at least one median range with the force, more than against it. FADED = the same against it. MUTED = neither. PENDING until the response bars have closed — a forming bar is never graded.",
    full: "The print's side is stated by the venue and every response bar has closed.",
    partial: "Response bars still forming — the verdict reads PENDING and shows what has printed so far.",
    degraded: "No per-trade prints on this market — there is no print to select, so nothing is marked.", silence: "No per-trade prints on this market — there is no print to select, so nothing is marked.",
    firstTouch: "Force → response — what price did after this print, with and against it.",
    canon: "F04A Causal marks · H-701 Force → Response (the print-response owner)",
  },
  F11A: {
    what: "Market object — a supply or demand zone drawn on the full range of the bar a confirmed swing was born on.",
    question: "Where did price leave fast from a confirmed swing, and is that zone still standing?",
    needs: "PRICE",
    evidence: "Confirmed swing pivots from the one structure owner and the closed bars since; no volume is needed.",
    appears: "A zone band on price: swing low → DEMAND zone over that bar's low–high, swing high → SUPPLY zone; its name and state sit beside it in a clear slot.",
    grammar: "A zone is tested when price trades into it, defended when it holds, and invalid on a close through it (below a demand zone, above a supply zone). SWEPT · STILL VALID means a wick ran it without a closing break.",
    full: "Built from the loaded closed bars — nothing more is needed.",
    partial: "Too few bars to confirm a swing — no zone is drawn until the pivot is confirmed.",
    degraded: "No bars — nothing to read.", silence: "No bars — nothing to read.",
    firstTouch: "Supply / demand zone — where price left fast; its passport shows tests, defence and whether it is consumed.",
    canon: "F11A Market object on chart (the swing-origin zone owner + the zone lifecycle owner)",
  },
  F11B: {
    what: "Object Passport — the biography of a selected market object: birth, lifecycle, evidence, contradictions and what is still unknown.",
    question: "What is this object, where did it come from, and what would make it invalid?",
    needs: "OTHER_LAYERS",
    evidence: "Only what the engine actually resolved for the object; every field traces back to a canonical evidence ref.",
    appears: "A passport drawer beside the chart when an object is selected — never paint on price.",
    grammar: "Lifecycle RESOLVED / FORMING / UNRESOLVED, value and confidence, source and fidelity, evidence lineage, contradictions, and unknowns (what is missing or would invalidate it).",
    full: "The object's dimensions are resolved from canonical evidence.",
    partial: "Some dimensions are still forming — they say so.",
    degraded: "Unknown dimensions read UNRESOLVED and state exactly what is missing — nothing is invented.", silence: "Unknown dimensions read UNRESOLVED and state exactly what is missing — nothing is invented.",
    firstTouch: "Passport — this object's birth, lifecycle, evidence and what would make it invalid.",
    canon: "F11B Object Passport (the market-object passport owner)",
  },
  "G19.CVD_REL": {
    what: "CVD relationship — cumulative signed volume read against price, in its own pane under the chart.",
    question: "Is the aggression agreeing with price, or is price moving without it?",
    needs: "SIDED_TAPE",
    evidence: "Prints with a stated or inferred aggressor side; the pane says which (cvdSides INFERRED or LABELLED).",
    appears: "A cumulative line in the Tape CVD pane under the chart; Delta Divergence marks two pivots on price where they disagree.",
    grammar: "Price and CVD rising together = aggression agreeing. Price higher while CVD lower (or the reverse) = disagreement worth inspecting. The per-bar relationship is not yet drawn on the candles (census PARTIAL).",
    full: "Every print carries a venue-stated side.",
    partial: "Sides are inferred (quote test / tick rule) — labelled inferred.",
    degraded: "No sided tape — no CVD is drawn rather than guess sides from candle colour.", silence: "No sided tape — no CVD is drawn rather than guess sides from candle colour.",
    firstTouch: "CVD — the running balance of who crossed the spread, beside price.",
    canon: "Registry §C aggression · tape CVD pane + the Delta Divergence reader (Garden 19 C-06 proposes the on-candle notch)",
  },
  "G19.CROSS": {
    what: "Related-market evidence — for a spot FX pair, the CME future's exchange-signed flow, named as the future's, never as spot volume.",
    question: "What is the related futures market doing while this spot pair has no central volume?",
    needs: "SIDED_TAPE",
    evidence: "The CME future's (6E / 6B / 6J) prints whose exchange aggressor side is BUY or SELL over the last few minutes; unsided prints are counted apart, never guessed.",
    appears: "A line of words beside the spot price — \"CME 6E flow · related, not spot\" — never a bar, histogram or profile on the spot chart.",
    grammar: "Net buying or selling on the related future, with its window and print count. It is related-market evidence, not this pair's volume.",
    full: "The related future's stream is live with signed prints.",
    partial: "Few signed prints in the window — the count says so.",
    degraded: "No related future for this market, or the stream is owner-only — the plain unsupported line instead.", silence: "No related future for this market, or the stream is owner-only — the plain unsupported line instead.",
    firstTouch: "Related market — the CME future's signed flow, not spot volume.",
    canon: "Garden 19 C23 cross-market · FX lane related-flow owner; index / sector benchmark alignment not built",
  },
  "G19.VWAP": {
    what: "Session-anchored VWAP — the volume-weighted average price, reset at each session open on the one session clock.",
    question: "Where is the session's volume-weighted fair price, and is price above or below it?",
    needs: "VOLUME",
    evidence: "Traded volume on the session's bars; sessions come from the one session owner (RTH / ETH, the Globex day, the 17:00 ET FX roll).",
    appears: "A line across the session's bars with optional ±σ bands (Indicators › VWAP).",
    grammar: "Above VWAP = trading above the session's average fill; the bands are volume-weighted deviation. A bar outside any session gets no value.",
    full: "Real traded volume on every session bar.",
    partial: "The session has only just traded — the line starts at its first volume.",
    degraded: "No traded volume (spot FX) — no VWAP rather than a typical price dressed up as one.", silence: "No traded volume (spot FX) — no VWAP rather than a typical price dressed up as one.",
    firstTouch: "VWAP — the session's volume-weighted average price.",
    canon: "Registry §I value sense · indicators.ts session-anchored VWAP (no user-dragged anchor yet — census PARTIAL)",
  },
  "F10.TED": {
    what: "Temporal Evidence Density — how unevenly the traded volume is spread across the window's clock time. DEFINITION PENDING FOUNDER: this is WM's reading of the name.",
    question: "Was this stretch of the chart long on the clock but thin on actual trading?",
    needs: "VOLUME",
    evidence: "Traded volume on the camera's closed bars.",
    appears: "One TED line in the WAIT rail — no mark on the candles until the Founder confirms the definition (proposed plate G19-P06 asks the question).",
    grammar: "The share of all volume sitting in the densest fifth of bars, and how dense the newest closed bar is against the window's median bar.",
    full: "Real traded volume on the bars in view.",
    partial: "Few closed bars in view — the medians are thin.",
    degraded: "No traded volume — no reading.", silence: "No traded volume — no reading.",
    firstTouch: "TED — how much of the window's trading is packed into a few bars. Definition pending the Founder.",
    canon: "F10 Time · the effort-evidence owner's TED reading · Garden 19 C-13 (definition owed)",
  },
} as const satisfies Readonly<Record<string, ConceptEducation>>;

export type EducationKey = ProfileId | keyof typeof INSTRUMENT_EDUCATION | keyof typeof CONCEPT_EDUCATION | "BAR_SELECTION";

/** The one lookup — a catalogue id, a Tool Finder instrument id, or a taught concept. */
const DOORED = new Map<string, InventionEducation>();

export function educationFor(id: string): InventionEducation | null {
  const base = (INVENTION_EDUCATION as Record<string, InventionEducation>)[id] ?? INSTRUMENT_EDUCATION[id]
    ?? (CONCEPT_EDUCATION as Record<string, ConceptEducation>)[id]
    // Indicators-menu rows (`IND:<catalogue name>`, Sheriff P1-C).
    ?? indicatorEducationFor(id)
    // Smart Money cards, drawing tools, views, loadouts, Replay, bar selection (`SM:` `DRAW:` `VIEW:` `LOADOUT:` …).
    ?? surfaceEducationFor(id) ?? null;
  // Supermax §9 — the lesson that teaches this tool, readable from its ⓘ before it is switched on.
  // One stable object per id (callers may compare by reference); a record's own door wins.
  const door = base && !("academy" in base) ? academyDoorForTool(id) : null;
  if (!base || !door) return base;
  let withDoor = DOORED.get(id);
  if (!withDoor) { withDoor = { ...base, academy: door } as InventionEducation; DOORED.set(id, withDoor); }
  return withDoor;
}

/** What "now" means on this chart, for the preview's truth block. */
export interface EducationTruth {
  /** CAN DRAW · WAITING · UNAVAILABLE HERE — the headline word. */
  readonly verdict:
    | "CAN DRAW HERE" | "WAITING" | "UNAVAILABLE HERE" | "STATE NOT REPORTED"
    // P3-K (Sheriff 2026-10-08): the header was "CAN DRAW HERE" for every READY
    // row, even tools that need a drawn range, other layers or an options
    // chain, and even above "feed is STALE". These name the real dependency.
    | "NEEDS YOUR INPUT" | "NEEDS OTHER LAYERS" | "NEEDS AN OPTIONS CHAIN"
    | "DRAWS FROM STALE DATA" | "NO LIVE FEED"
    // §20 futures-options scope: only the contracts nearest price were heard.
    | "PARTIAL · NEAR-PRICE CHAIN ONLY";
  /** The highest evidence grade this tool can reach on this chart now (the pressure owner's `chainScopeGrade`). Absent = no cap. */
  readonly gradeCap?: "PARTIAL";
  /** The owner's sentence for THIS symbol, verbatim. */
  readonly lines: readonly string[];
}

const FEED_WORDS: Partial<Record<MarketQualityState, string>> = {
  DELAYED: "This chart's feed is DELAYED — what it draws trails the live market by the provider's delay.",
  STALE: "This chart's feed is STALE — no fresh data; what it draws is as of the last update.",
  PROXY: "This chart's price is a PROXY from another venue — read levels as approximate.",
  REPLAY: "This chart is in REPLAY — it draws the frozen past, not the live market.",
  PARTIAL: "Some senses on this feed are missing — only those readings degrade; the rest stay full.",
  UNAVAILABLE: "This chart has no live feed right now.",
};

/** The feed state's one sentence (Inspect's evidence line reads the same words as the ⓘ). */
export function feedWords(state: MarketQualityState): string | null {
  return FEED_WORDS[state] ?? null;
}

/**
 * THE PREVIEW'S TRUTH BLOCK — compiled from the menu compiler's own verdict
 * for this symbol (`entry`), or a caller-supplied owner sentence for an
 * instrument (`instrumentTruth`, e.g. the order-flow capability reason), plus
 * the feed's quality. Nothing here decides availability.
 */
export function educationTruthLines(input: {
  readonly entry?: Pick<ProfileMenuEntry, "availability" | "availabilityNote" | "stateWords"> & Partial<Pick<ProfileMenuEntry, "id" | "gesture">> | null;
  readonly instrumentTruth?: { readonly ok: boolean; readonly waiting?: boolean; readonly sentence: string } | null;
  readonly feed?: MarketQualityState | "UNKNOWN" | null;
  /** For a row with no owner verdict: the tool id + symbol, so the market's own fact (no central volume) still speaks. */
  readonly id?: string;
  readonly symbol?: string;
  /**
   * The options chain the pressure owner actually heard for this chart
   * (`DerivativesPressureVM.chainScope`); null / absent when no chain is drawn.
   * An options tool's truth line states a near-money subset and its grade is
   * capped below FULL — the same words the glass and Inspect print.
   */
  readonly chainScope?: ChainScope | null;
}): EducationTruth {
  const lines: string[] = [];
  let verdict: EducationTruth["verdict"] = "CAN DRAW HERE";
  let gradeCap: EducationTruth["gradeCap"];
  const e = input.entry;
  if (e) {
    if (e.availability === "WAITING_FOR_BARS" || e.availability === "WAITING_FOR_PRINTS") verdict = "WAITING";
    else if (e.availability !== "READY") verdict = "UNAVAILABLE HERE";
    const note = e.availabilityNote.charAt(0).toUpperCase() + e.availabilityNote.slice(1);
    // The state words are the chip's short form of the note; print them only
    // when the note does not already say the same thing (spot FX said
    // "needs traded volume" twice).
    const head = e.stateWords ? e.stateWords.split("·")[0].trim().toLowerCase() : "";
    const repeats = head.length > 0 && note.toLowerCase().includes(head);
    lines.push(e.stateWords && !repeats ? `${e.stateWords}. ${note}.` : `${note}.`);
  } else if (input.instrumentTruth) {
    verdict = input.instrumentTruth.ok ? "CAN DRAW HERE" : input.instrumentTruth.waiting ? "WAITING" : "UNAVAILABLE HERE";
    lines.push(input.instrumentTruth.sentence);
  } else {
    // No owner verdict for this row. Say the one market fact this module can
    // prove (spot FX / spot metals have no central traded volume) — never a
    // made-up "ready".
    const edu = input.id ? educationFor(input.id) : null;
    const noCentral = input.symbol ? hasNoCentralVolume(input.symbol) : null;
    if (edu && noCentral && (edu.needs === "VOLUME" || edu.needs === "PRINTS" || edu.needs === "SIDED_TAPE")) {
      verdict = "UNAVAILABLE HERE";
      lines.push(`Needs traded volume — ${noCentral} trades over the counter and has no central volume.`);
    } else if (edu && edu.needs === "PRICE") {
      // Price is all it needs, and every chart has price: a fact, not a guess.
      verdict = "CAN DRAW HERE";
      lines.push("Built from the bars on this chart — price is all it needs.");
    } else if (edu && edu.needs === "VOLUME" && input.symbol && input.id?.includes(":")) {
      // An indicator / panel / view record (`IND:` `SM:` `VIEW:`) that needs bar volume, on a
      // market that HAS central volume (the no-volume case returned above): a fact, not a guess.
      verdict = "CAN DRAW HERE";
      lines.push("Built from the bars' traded volume on this chart.");
    } else if (edu && (edu.needs === "YOUR_PLAN" || edu.needs === "OTHER_LAYERS" || edu.needs === "OPTIONS")) {
      // The dependency is the verdict (named by the block below), not an unreported state.
      verdict = "CAN DRAW HERE";
    } else {
      verdict = "STATE NOT REPORTED";
      lines.push("Its own readiness for this chart is shown on the chart once it is on.");
    }
  }
  // The tool's real needs refine a READY verdict (P3-K): a menu READY means the
  // bars are there, not that a chain loaded or that the trader drew a range.
  const eduN = educationFor(input.id ?? e?.id ?? "");
  if (verdict === "CAN DRAW HERE" && eduN) {
    if (eduN.needs === "YOUR_PLAN" || e?.gesture === "DRAW") {
      verdict = "NEEDS YOUR INPUT";
      lines.push("It draws only once you place it on the chart.");
    } else if (eduN.needs === "OTHER_LAYERS") {
      verdict = "NEEDS OTHER LAYERS";
      lines.push("It reads other switched-on tools and draws nothing on its own.");
    } else if (eduN.needs === "OPTIONS") {
      const scope = input.chainScope ?? null;
      const scopeW = scope ? chainScopeWords(scope) : null;
      if (scope && scopeW) {
        // A near-money subset: say it, say what is withheld, never the top grade.
        verdict = "PARTIAL · NEAR-PRICE CHAIN ONLY";
        lines.push(`${scopeW}.`);
        const withheld = chainScopeWithheldWords(scope);
        if (withheld) lines.push(`${withheld}.`);
        gradeCap = chainScopeGrade(scope) === "PARTIAL" ? "PARTIAL" : undefined;
      } else if (scope) {
        lines.push("A whole options chain is loaded for this underlying.");
      } else {
        verdict = "NEEDS AN OPTIONS CHAIN";
        lines.push("It draws only where an options chain loads for this symbol; the chart says when it does.");
      }
    }
  }
  if (verdict === "CAN DRAW HERE" && input.feed === "STALE") verdict = "DRAWS FROM STALE DATA";
  if (verdict === "CAN DRAW HERE" && input.feed === "UNAVAILABLE") verdict = "NO LIVE FEED";
  const fw = input.feed && input.feed !== "UNKNOWN" && input.feed !== "LIVE" ? FEED_WORDS[input.feed] : undefined;
  if (fw) lines.push(fw);
  return gradeCap ? { verdict, lines, gradeCap } : { verdict, lines };
}

/**
 * §10 · WHICH INVENTION A SELECTION ON THE MARKET BELONGS TO — so its
 * first-touch line comes from the same record as its ⓘ preview. Structural
 * shape only (mirrors `ChartSelection`), so this module needs no view-model import.
 */
/**
 * §10 · the first-touch sentence for a selected mark. One structure record
 * covers swings AND supply/demand zones; a zone is not a "swing level", so a
 * ZONE:* object gets the zone's own noun (found on glass 2026-10-07, 390).
 */
export function firstTouchFor(id: string, objectId?: string | null): string | null {
  const edu = educationFor(id);
  if (!edu) return null;
  if (id === "MARKET_STRUCTURE" && objectId?.startsWith("ZONE:")) {
    return "Supply / demand zone — where price left fast; its passport shows tests, defence and whether it is consumed.";
  }
  return edu.firstTouch;
}

/**
 * DOES THE SENTENCE ALREADY OPEN WITH THE LABEL? (serving 7f2ca59, 2026-10-09:
 * "Supply / demand zone · Supply / demand zone — where price left fast…").
 * A first-touch line is `label · sentence`; when the record's sentence begins
 * with the label's own words the label is dropped and the sentence stands
 * alone. Decided HERE for the class, not per label: compared word by word,
 * ignoring case, punctuation and a plural "s" ("Brick Walls" vs "Brick wall —").
 */
export function firstTouchRepeatsLabel(label: string, sentence: string): boolean {
  const words = (t: string) => t.toLowerCase().replace(/[^a-z0-9\s]/g, " ").split(/\s+/).filter(Boolean).map(w => (w.length > 3 && w.endsWith("s") ? w.slice(0, -1) : w));
  const l = words(label), s = words(sentence);
  return l.length > 0 && l.every((w, i) => s[i] === w);
}
/** The composed line every carrier prints: the sentence alone when it already opens with the label. */
export function composeFirstTouch(label: string, sentence: string): { readonly label: string | null; readonly sentence: string; readonly text: string } {
  const drop = !label.trim() || firstTouchRepeatsLabel(label, sentence);
  return { label: drop ? null : label, sentence, text: drop ? sentence : `${label} · ${sentence}` };
}

export function educationIdForSelection(sel:
  | { readonly kind: "OBJECT"; readonly objectId: string }
  | { readonly kind: "PRINT"; readonly print: { readonly kind?: string } }
  | { readonly kind: "SLICE" }
  | { readonly kind: "ANATOMY"; readonly reading: { readonly target: { readonly reading: "ABSORPTION" | "EXHAUSTION" } } }
  | { readonly kind: "MEMORY_GHOST" | "PRESSURE_WALL" | "PRESSURE_FRONT" | "WEATHER" }
  // A bar selected by a WORD on the glass (Wisdom line, Delta keel, Effort → Response) — §15b gap.
  | { readonly kind: "BAR" }
  | null,
): EducationKey | null {
  if (!sel) return null;
  switch (sel.kind) {
    // FVG| — a GAP_FVG object (fvgDefinition.mintFvgObjectId; Garden 19 lane D, 2026-10-07).
    // ZONE:* — a supply / demand zone is its own market object (F11A, 2026-10-08),
    // not a swing level: its ⓘ and first touch open the zone's record.
    case "OBJECT": return sel.objectId.startsWith("FVG|") ? "FVG_IMBALANCE" : sel.objectId.startsWith("MEMORY:") ? "PROFILE_MEMORY" : sel.objectId.startsWith("ZONE:") ? "F11A" : "MARKET_STRUCTURE";
    case "PRINT": return sel.print.kind === "delta" ? "FP_delta" : "FP_big-trades";
    case "SLICE": return "LIVING_PROFILE";
    case "ANATOMY": return sel.reading.target.reading;
    case "MEMORY_GHOST": return "MEMORY_GHOST";
    case "PRESSURE_WALL": return "BRICK_WALLS";
    case "PRESSURE_FRONT": return "DERIVATIVES_PRESSURE";
    case "WEATHER": return "LIQUIDITY_WEATHER";
    case "BAR": return "BAR_SELECTION";
  }
}
