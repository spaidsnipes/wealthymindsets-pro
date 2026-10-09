/**
 * FVG / IMBALANCE + PATIENCE — an Academy COURSE, not a second Academy
 * (Garden 19 Founder order 2026-10-07, §32–36).
 *
 * The one Academy is /education; its catalogue (`MODULES` in
 * src/app/education/page.tsx) registers this course once, as a module, from
 * `FVG_ACADEMY_MODULE` below. Progress rides the Academy's own browser-local
 * persistence (`wm_edu_progress` via persistAcademyProgress) — nothing here
 * stores anything.
 *
 * WHAT IS TAUGHT IS THE CODED DEFINITION. src/lib/marketData/fvg/fvgDefinition.ts
 * (DEFINITION_ID "FVG_3C" v1) is the law; every number a lesson says is read
 * from it via `FVG_DEFINITION` below, never typed into a sentence twice. The
 * human copy is docs/operations/FVG-METHODOLOGY.md — lesson wording follows
 * it (aligned 2026-10-07, §1–§13); where the doc and the code disagree, the
 * code wins (the doc says so itself).
 *
 * HONESTY RULES (§34): an FVG is a defined territory, not a promise. No lesson
 * claims a gap has to be revisited; the only place that idea is written is the
 * MYTH card, framed as a myth. A test sweeps the course text for it.
 *
 * PURE: no React, no storage, no clock.
 */
import { REPLAY_START_PARAM, REPLAY_START_VALUE } from "@/lib/chart/replayWindow";
import { INSTRUMENT_VIEW_ROUTE } from "@/lib/routing/founderLanding";
import { parseProofScene } from "@/lib/chart/proofScene";
import { readStoredText } from "@/lib/storedShape";
import { readJournalFvgReference } from "@/lib/journal/fvgDecisionReference";
import { fvgStudyGroupsOf } from "@/lib/journal/planFvgStudy";
import {
  FVG_ACCEPT_CLOSES, FVG_ATR_PERIOD, FVG_DEEP_FRACTION, FVG_DEFINITION_ID, FVG_DEFINITION_VERSION,
  FVG_IDLE_MEMORY_BARS, FVG_IMMEDIATE_BARS, FVG_LATER_SESSION_MAX, FVG_MIN_ATR_FRACTION,
  FVG_REJECTION_WINDOW_BARS, FVG_SCAR_MEMORY_BARS, FVG_VISIBLE_OPEN_BUDGET, FVG_VISIBLE_SCAR_BUDGET,
} from "@/lib/marketData/fvg/fvgDefinition";

/**
 * The numbers a lesson says — READ from the one published definition
 * (src/lib/marketData/fvg/fvgDefinition.ts, DEFINITION_ID "FVG_3C"), never
 * retyped. If the definition moves, the lessons move with it.
 */
export const FVG_DEFINITION = {
  id: FVG_DEFINITION_ID,
  version: FVG_DEFINITION_VERSION,
  /** Bars examined — all CLOSED. */
  bars: 3,
  /** Minimum territory height: max(minTicks × tick, minAtrFraction × ATR(atrPeriod) at b2). */
  minTicks: 1,
  minAtrFraction: FVG_MIN_ATR_FRACTION,
  atrPeriod: FVG_ATR_PERIOD,
  /** Penetration at or beyond this fraction of the territory is DEEP; above 0 and below it, PARTIAL. */
  deepPenetration: FVG_DEEP_FRACTION,
  /** Consecutive closes inside the territory that make ACCEPTANCE. */
  acceptanceCloses: FVG_ACCEPT_CLOSES,
  /** REJECTION counts only inside this many bars of an interaction's first bar. */
  rejectionWindowBars: FVG_REJECTION_WINDOW_BARS,
  immediateBars: FVG_IMMEDIATE_BARS,
  laterSessionMax: FVG_LATER_SESSION_MAX,
  scarMemoryBars: FVG_SCAR_MEMORY_BARS,
  idleMemoryBars: FVG_IDLE_MEMORY_BARS,
  visibleOpen: FVG_VISIBLE_OPEN_BUDGET,
  visibleScars: FVG_VISIBLE_SCAR_BUDGET,
} as const;

const PCT = `${Math.round(FVG_DEFINITION.deepPenetration * 100)}%`;
const MIN_SIZE = `max(${FVG_DEFINITION.minTicks} tick, ${FVG_DEFINITION.minAtrFraction.toFixed(2)} × ATR${FVG_DEFINITION.atrPeriod})`;
const D = FVG_DEFINITION;

/** The schematic each lesson draws (src/components/education/FvgDiagram.tsx). */
export type FvgDiagramKind =
  | "imbalance" | "three-candle" | "bullish" | "bearish" | "displacement"
  | "touch" | "partial" | "full" | "rejection-acceptance" | "time"
  | "structure" | "profile" | "evidence" | "trade-through" | "memory"
  | "statistics" | "risk" | "patience" | "management" | "psychology" | "edge";

export interface FvgLesson {
  /** 1-based position in the course. */
  readonly n: number;
  /** Academy lesson id — `/education?lesson=<id>` opens it. */
  readonly id: string;
  readonly title: string;
  readonly duration: string;
  /** The one-sentence point of the lesson. */
  readonly lede: string;
  readonly body: readonly string[];
  /** What to look for on the market. */
  readonly look: readonly string[];
  readonly diagram: FvgDiagramKind;
  /** Extra proof-scene layer tokens beside the FVG tool (proofScene.ts grammar). */
  readonly alsoOn: readonly string[];
  /** What this lesson corresponds to ON THE CHART — the mark, row or door a trader will actually see. */
  readonly glass: string;
}

/** §34 — the one place the fill idea is written, and only as a myth. */
export const FVG_MYTH_CARD = {
  myth: "MYTH: Every FVG must fill.",
  better: "BETTER QUESTION: What happened to this defined territory under this instrument, timeframe, session, regime and observation horizon?",
} as const;

/** Lessons that carry the MYTH card: the definition, return timing, trade-through, memory, statistics. */
export const FVG_MYTH_LESSONS: readonly number[] = [1, 10, 14, 15, 16];

/** §32 — the sentence every FVG surface carries. */
export const FVG_NO_GUARANTEE = "No guaranteed return should be assumed. WM Pro tracks what actually happens.";

/**
 * The plain sentence (Supermax §9): said outright, in the negative, in the
 * lessons where a trader is most likely to assume the opposite. The claim that
 * a gap has to be revisited appears nowhere in the course except the MYTH card.
 */
export const FVG_DOES_NOT_HAVE_TO_FILL = "A gap does not have to fill. Some are revisited, some never are — WM Pro records which." as const;

/**
 * ON THE CHART — what each lesson corresponds to on the glass (Supermax §9:
 * "each lesson states what on the glass it corresponds to"). The words follow
 * the layer's own grammar (fvgGlass.ts) and Inspect's own rows; nothing here
 * describes a mark the chart does not draw.
 */
export const FVG_ON_THE_GLASS: Readonly<Record<number, string>> = {
  1: "With FVG / Imbalance switched on in Tools, each gap is a shaded band behind the candles, running right from the bar that completed it. No word or number is painted on it.",
  2: "Tap a band: its gold frame marks the gap, and Inspect names the three bars' rule under DEFINITION and the gap's top and bottom under BOUNDARIES.",
  3: "A bullish gap is drawn in the buy ink, below where price went. Inspect's DIRECTION row says the territory sits below the displacement and names its near edge.",
  4: "A bearish gap is drawn in the sell ink, above where price went. Inspect's DIRECTION row says the territory sits above the displacement and names its near edge.",
  5: "Inspect's SIZE and DISPLACEMENT rows give the gap's height in ticks and against ATR, and the middle bar's body share. Under Relationships, the effort → response row reads that same bar.",
  6: "Before the touch the band is one even shade. When price comes close, the near edge glows toward price. At the touch the visited part turns to hatching.",
  7: "The hatched part of the band is what price has visited; the solid part is what remains. Inspect's rows give the deepest reach and the territory left.",
  8: "A fully mitigated gap is hatched edge to edge, and both edges are still solid — a wick reached the far side but no bar closed beyond it.",
  9: "A rejection is a short tick on the bar that closed back outside. Acceptance is a filled interior with a quiet line through its middle. Inspect lists each visit and how it ended.",
  10: "The band keeps running right until price touches it; Inspect says how many bars passed before the first touch. In Backtesting, the FVG Study counts returns by horizon.",
  11: "Switch on Market Structure beside the gap: swing marks and the leg the displacement broke. Inspect's Relationships list the swings inside or near the gap.",
  12: "Switch on a profile beside the gap: its POC and value-area lines cross or sit near the band. Inspect's Relationships name each level, how far away it is, and the profile's own evidence grade.",
  13: "Inspect's EVIDENCE rows print one grade per sense — price, order flow, derivatives. Under Relationships, order flow, options walls and liquidity each speak in their own owner's words, or say they are silent.",
  14: "A traded-through gap is drawn as a scar whose far edge is dashed. Inspect says a bar closed beyond the far edge and the lifecycle stopped.",
  15: "Old gaps leave the live view and are counted as hidden, never deleted. Open one from the FVG Study or a scanner row and it is drawn again, faint, with a gold frame; Inspect says it aged into memory.",
  16: "Nothing on the chart shows a percentage. The counts live in Backtesting → FVG Study, every one printed as n of m with its sample.",
  17: "On the ticket, the stop / invalidation field and the risk line; with Risk on Price on, the plan's risk is drawn on the chart beside the gap.",
  18: "The WAIT plate on the chart, and a band price has not reached. In the Journal, a decision on a gap is read as taken before the touch, at the touch, or after the closes that answered it.",
  19: "The ticket's plan card before the trade; in the Journal's Review, what the market did, what you planned and what you did, side by side for that gap.",
  20: "Review prints the action — exited before the plan's condition, entered before the touch — and leaves the reason blank for you to label. No emotion word is ever drawn on the chart.",
  21: "\"Reference an FVG\" on a Journal entry, \"Show me my examples\" below this lesson, and the gap study on your profile.",
};

/** Paragraphs added by the Supermax §9 audit (2026-10-09), appended so earlier paragraphs keep their positions. */
const AUDIT_BODY: Readonly<Record<number, readonly string[]>> = {
  1: [FVG_DOES_NOT_HAVE_TO_FILL],
  5: [
    "Momentum is read from that middle bar, as two separate facts: effort (its volume against the bars before it) and response (its range against what is normal). Effort → response says which the bar was — large effort with large response, large effort with little progress, or an ordinary bar. It describes the bar; it does not rate the gap.",
    "Session is context too. The same three bars carry different weight in a thin overnight hour than at the cash open. WM Pro records the session a gap formed in and flags one that spans a session boundary; Session Bands draw the sessions on the chart.",
  ],
  10: [FVG_DOES_NOT_HAVE_TO_FILL],
  13: [
    "Other senses work the same way. Absorption (large effort, little progress, at a price) belongs to the order-flow owner. Options walls come from open interest on a delayed chain. Resting liquidity comes from the order book, where one is read. Each is attached to a gap by reference, with its own grade — a gap near a wall is two facts side by side, not a stronger trade.",
    "What WM Pro cannot know: who traded, why they traded, or what price does next. On spot FX there is no central exchange, so there is no traded volume — the gap is still drawn, from price alone, and a reading that needs volume says so, or names the related futures market it is reading instead.",
  ],
  18: [
    "Waiting is a position. Flat, with a plan and a condition you are watching for, is a decision you are holding — not time lost.",
  ],
  19: [
    "Around a gap the plan's conditions are the gap's own events: the touch, a close back outside (rejection), closes inside (acceptance), a close beyond the far edge (trade-through). Decide before entry what each one does to the position — hold, reduce, move the stop by rule, or exit — so the gap's next event is answered by the plan.",
  ],
};

const L = (
  n: number, title: string, duration: string, diagram: FvgDiagramKind, lede: string,
  body: readonly string[], look: readonly string[], alsoOn: readonly string[] = [],
): FvgLesson => ({ n, id: `fvg-${n}`, title, duration, diagram, lede, body: [...body, ...(AUDIT_BODY[n] ?? [])], look, alsoOn, glass: FVG_ON_THE_GLASS[n] });

export const FVG_LESSONS: readonly FvgLesson[] = [
  L(1, "What is an imbalance?", "8m", "imbalance",
    "An imbalance is a stretch of price the market crossed so fast that one side barely traded there.",
    [
      "Most of the time buyers and sellers trade back and forth across every price. Sometimes one side is so much more urgent that price jumps across a range and leaves it almost untraded.",
      "WM Pro calls the range left behind a territory. It is an observation about the past — where trade was thin — not a forecast about the future.",
      FVG_NO_GUARANTEE,
    ],
    ["A run of bars that moved one way with little overlap.", "A visible stretch of price no wick traded back into."]),
  L(2, "The three-candle model", "10m", "three-candle",
    `WM Pro finds a fair value gap with one exact rule: ${FVG_DEFINITION.bars} CLOSED bars, compared by their wicks.`,
    [
      "Call them b1, b2 and b3, oldest first. b2 is the bar in the middle — the displacement bar. The test compares b1 with b3 and ignores b2's own range.",
      "Wicks, not bodies: the high and low of each bar are what count. A body-only gap that the wicks cover is not an FVG under this definition. The inequality is strict — a zero-width gap is not a gap.",
      "b2's body must point the gap's direction — closed up for a bullish gap, down for a bearish one. A doji b2 is not an FVG under this version.",
      "The territory is created at the close of b3. Until b3 has closed nothing exists — no forming bar ever creates or erases one.",
      `It must also be big enough to matter: at least ${MIN_SIZE}, with ATR read at b2. Smaller gaps are not drawn — and until ${D.atrPeriod} bars exist for the ATR, nothing is detected at all.`,
    ],
    ["Three closed bars.", "Compare b1's wick with b3's wick — never the bodies.", "Nothing exists until b3 closes."]),
  L(3, "Bullish FVG", "8m", "bullish",
    "Bullish when the low of b3 is above the high of b1.",
    [
      "low(b3) > high(b1): the up move was so quick that b3 never traded back down to where b1 had been.",
      "The territory is [high(b1), low(b3)] — from the top of b1's wick to the bottom of b3's wick.",
      "The near edge is the one price returns to first — for a bullish territory, the top, low(b3). The far edge is high(b1).",
    ],
    ["b1's high and b3's low do not overlap.", "The gap between them is the territory."]),
  L(4, "Bearish FVG", "8m", "bearish",
    "Bearish when the high of b3 is below the low of b1.",
    [
      "high(b3) < low(b1): the down move was so quick that b3 never traded back up to where b1 had been.",
      "The territory is [high(b3), low(b1)] — from the top of b3's wick to the bottom of b1's wick.",
      "For a bearish territory the near edge is the bottom, high(b3); the far edge is low(b1).",
    ],
    ["b1's low and b3's high do not overlap.", "Same rule, mirrored."]),
  L(5, "Displacement", "9m", "displacement",
    "b2 is the displacement bar — the push that left the territory behind.",
    [
      "b2's body must point the way the gap points. Beyond that one rule, b2 is not graded: its body-to-range share and its range against ATR are recorded as displacement CONTEXT, never folded into a score.",
      `Size floor: a territory smaller than ${MIN_SIZE} is not drawn. ATR${D.atrPeriod} (Wilder's, read at b2) adapts the floor to how much this instrument normally moves on this timeframe; where no tick is on file, the ATR term stands alone.`,
      "There is no \"FVG strength\" number. A bigger displacement is a fact about the past, not a grade for the future.",
      "Displacement describes urgency, not intent. It says one side crossed fast — not who they were or why.",
    ],
    ["b2's body points the gap's direction.", "A b2 visibly larger than the bars before it — as context.", `A territory at least ${MIN_SIZE} tall.`]),
  L(6, "Touch", "7m", "touch",
    "The touch is the first bar, after creation, whose wick reaches the near edge — it trades into the territory.",
    [
      "Only the first one counts as the touch. Its wick reaching the near edge is enough — it does not need to close inside.",
      `Before that, a wick coming within max(50% of the size, 0.25 × ATR) of the near edge is APPROACHING — close, not yet a touch.`,
      "Before the touch the territory is untested. Everything after it — partial, deep, full, rejection, acceptance — is measured from that first touch.",
    ],
    ["The first wick to reach the near edge after b3 closed."]),
  L(7, "Partial mitigation", "8m", "partial",
    `Partial means price traded into the territory but less than ${PCT} of the way through it.`,
    [
      `Penetration is how far the deepest wick went past the near edge, as a share of the territory. Above 0 and under ${PCT} is PARTIAL; ${PCT} up to (not including) the far edge is DEEP.`,
      "Depth is cumulative: a shallow second touch never \"un-mitigates\" a deeper first one.",
      "The midline is a measuring line, not a magic level. It separates a shallow probe from a deep one.",
    ],
    [`How far the deepest wick reached, as a share of the territory.`, `Less than ${PCT}: partial.`]),
  L(8, "Full mitigation", "7m", "full",
    "Full means price traded all the way to the far boundary.",
    [
      "A bullish territory is fully mitigated when a wick trades down to high(b1); a bearish one when a wick trades up to low(b1) — without a close beyond it.",
      "Full mitigation is about where price traded, not where it closed. A wick that reaches the far boundary and closes back out is still full; a CLOSE beyond it is lesson 14.",
    ],
    ["A wick reaching the far boundary."]),
  L(9, "Rejection vs acceptance", "10m", "rejection-acceptance",
    "After the touch, the market either rejects the territory or accepts it.",
    [
      `REJECTION: after the touch, a bar closes back outside on the origin side, without full mitigation — within the first ${D.rejectionWindowBars} bars of that visit. The market visited and refused to stay.`,
      `ACCEPTANCE: ${D.acceptanceCloses} or more consecutive closes inside the territory, before any rejection. The market is now doing business there.`,
      "Both are read from closes, not wicks. A wick in and out is a touch; what the closes do afterwards is the verdict.",
    ],
    ["Where did the bars after the touch CLOSE?", `${FVG_DEFINITION.acceptanceCloses}+ closes inside: acceptance.`]),
  L(10, "Time-to-return", "8m", "time",
    "How many bars passed between creation and the first touch — and some territories are never touched at all.",
    [
      "Time-to-return is a measurement: bars (and sessions) from b3's close to the first touch.",
      `WM Pro sorts it into horizons: IMMEDIATE (within ${D.immediateBars} bars, same session), SAME SESSION, NEXT SESSION, LATER SESSION (2–${D.laterSessionMax} sessions), MULTI-DAY (5 or more), STILL OPEN, or SESSION UNKNOWN on a series with no session clock.`,
      "An untouched territory is a valid outcome, not a pending one. Recording it as such is what keeps the statistics honest.",
      "Gaps that span a session boundary (an opening gap) are flagged, so the counts can keep them apart.",
    ],
    ["Count bars from creation to touch.", "Note the territories that were never revisited."]),
  L(11, "FVG + structure", "10m", "structure",
    "A territory means more or less depending on where it sits in market structure.",
    [
      "A gap left by the leg that broke a swing high is a different object from a gap inside a sideways range.",
      "Read the structure first, then the territory: which leg made it, and is that leg still intact?",
    ],
    ["Which swing did the displacement leg break?", "Is the territory inside a trend leg or inside a range?"],
    ["MarketStructure"]),
  L(12, "FVG + profile", "10m", "profile",
    "A territory can line up with thin volume — prices the auction passed through quickly.",
    [
      "A volume profile shows where business was done. A territory that sits in a low-volume area agrees with it; one inside a high-volume area is a weaker observation.",
      "Agreement between two independent readings is context. It is still not a promise about what price does next.",
    ],
    ["Thin profile rows across the territory.", "Value area above or below it."],
    ["sessionVP"]),
  L(13, "FVG + order flow", "11m", "evidence",
    "Order flow can describe what happened at the touch — only where the evidence exists.",
    [
      "Every order-flow reading carries its evidence class. FULL: every print states its aggressor side. PARTIAL: sides are inferred, and labelled so. DEGRADED: too little evidence for a reading — it says what is missing. SILENCE: no sided tape at all, so nothing is drawn.",
      "The territory itself is price geometry — FULL, read from OHLC. Order flow stays NOT ATTACHED until another owner's reading is attached by reference, with that owner's state word verbatim. The FVG never upgrades or re-grades it.",
      "On spot FX and other markets with no central tape there is no order-flow reading at the touch — and WM Pro does not guess one from candle colour.",
    ],
    ["The evidence class first, then the reading.", "No sided tape: no order-flow claim."],
    ["deltaKeel"]),
  L(14, "Failed FVG / trade-through", "9m", "trade-through",
    "A close beyond the far boundary invalidates the territory — it was traded through.",
    [
      "A bullish territory is traded through when a bar closes below high(b1); a bearish one when a bar closes above low(b1).",
      "A wick to the far boundary is full mitigation. A CLOSE beyond it is invalidation — and the territory's lifecycle stops there. Keep the two apart.",
      "A traded-through territory is not a failure of the tool. It is one of the outcomes the tool exists to record.",
    ],
    ["A close — not a wick — beyond the far boundary."]),
  L(15, "Market memory", "9m", "memory",
    "Territories age. An old, many-times-visited one carries a different weight from a fresh one.",
    [
      "WM Pro keeps each territory's history: created when, touched when, how deep, rejected or accepted, traded through or not.",
      `Age is part of the record. A traded-through or fully mitigated territory becomes MEMORY ${D.scarMemoryBars} bars later; an untouched one becomes MEMORY after ${D.idleMemoryBars} bars with no visit.`,
      "Memory is not deletion. The territory, its scars and its unvisited remainder stay addressable — a later visit brings it straight back.",
      `The chart shows at most ${D.visibleOpen} live territories and the ${D.visibleScars} most recent scars; the rest are counted as hidden, never erased.`,
    ],
    ["How old is it?", "How many times has it already been visited?"],
    ["MemoryGhost"]),
  L(16, "Statistics: descriptive vs predictive", "11m", "statistics",
    "Counting what happened is descriptive. Treating that count as what will happen is a different claim.",
    [
      "\"In this sample, X of N territories were touched within 20 bars\" is descriptive — true of that sample.",
      "It becomes predictive only if the future resembles the sample: same instrument, timeframe, session and regime, and a large enough N. Say which you mean.",
      "A small sample is a story, not a statistic. WM Pro writes every rate as a count of a denominator — never a bare percentage — and labels it DESCRIPTIVE: counts of what happened, not probabilities.",
      "Young territories that have not had time to be revisited are counted separately (right-censored), so \"still open\" is not mistaken for \"never revisited\".",
    ],
    ["What was the sample?", "How large is N?", "Same regime as now?"]),
  L(17, "Risk: context, not permission", "9m", "risk",
    "A territory is context for a decision. It never grants permission to trade.",
    [
      "Before any entry, the plan names where the idea is wrong. For a territory that is usually a close beyond its far boundary — decided in advance, not at the moment.",
      "Size comes from the plan's risk, not from how attractive the territory looks.",
    ],
    ["Invalidation written before entry.", "Size from risk, not from conviction."],
    ["RiskOnPrice"]),
  L(18, "Patience", "8m", "patience",
    "Patience is waiting for the conditions your plan names — not waiting for hope.",
    [
      "A territory far from price may take many bars to be touched, or never be. Waiting for the touch, and then for the closes that answer it, is the discipline.",
      "Patience has an end condition. If the plan's conditions do not occur within the plan's window, the patient action is to do nothing.",
    ],
    ["What exactly am I waiting for?", "When does the wait end?"]),
  L(19, "Management", "10m", "management",
    "Manage by the plan — never \"just hold\".",
    [
      "A position is managed against the conditions written before entry: the invalidation, the targets, the time limit.",
      "Holding an invalid thesis is not patience. When the territory is traded through, the thesis it supported is invalid — the plan says what happens next, not hope.",
      "Moving the invalidation to avoid being wrong turns a plan into a wish.",
    ],
    ["Is the thesis still valid by its own rule?", "Is the plan, not the P&L, deciding?"]),
  L(20, "Psychology: evidence before labels", "9m", "psychology",
    "Describe what the market did before naming who did it.",
    [
      "\"Smart money defended the gap\" is a story. \"Price touched the territory, closed back outside on the origin side, without full mitigation\" is evidence. Start with the evidence.",
      "No mind-reading: the tape shows prints and sides where they exist, never intent.",
      // §33 #20 (Founder order): "how fear, impatience, FOMO and interference may affect
      // execution while distinguishing evidence from interpretation". Each is named as an
      // ACTION a record can show, never as a diagnosis of the trader.
      "The same rule applies to you. Fear, impatience, fear of missing out and interference are interpretations; what a record can show is the action: an exit taken before the plan's condition, an entry before the touch, an entry after the move had already left, an order changed again and again.",
      "Review prints those actions as facts beside the plan — \"took profit before the condition\", \"changed orders repeatedly\" — and leaves the reason to you. A departure from the plan is evidence. Why it happened is yours to name, and only you can.",
    ],
    ["Can I say it without naming a participant?", "Which closes support the label?", "Which of my actions departed from the plan — stated as an action, not a feeling?"]),
  L(21, "Your personal edge", "12m", "edge",
    "Your edge with territories is what YOUR journal shows, on YOUR markets — not what a course claims.",
    [
      "When you write a Journal entry for a decision at a territory, use \"Reference an FVG\" to attach the gap as it stood at that moment. Those decisions then appear under \"Show me my examples\" in this course.",
      "Read them with lesson 16's rules: what was the sample, how large is N, which regime. Keep what the evidence supports; drop the rest.",
      FVG_NO_GUARANTEE,
    ],
    ["Reference the gap on your FVG trades in the Journal.", "Review them by instrument, timeframe and session."]),
];

/** The course as the Academy catalogue registers it — once. */
export const FVG_ACADEMY_MODULE = {
  id: 9,
  title: "FVG / Imbalance & Patience",
  level: "Intermediate" as const,
  color: "#C9A55C",
} as const;

/** The FVG layer's proof-scene token the chart lane adds (proofScene.ts `on=`). */
export const FVG_SCENE_TOKEN = "fvg";

/** True once proofScene understands `on=fvg` — the chart release has shipped the layer. */
export function fvgLayerShipped(): boolean {
  return Object.keys(parseProofScene(`?on=${FVG_SCENE_TOKEN}`).overrides).length > 0;
}

export const FVG_LAYER_PENDING_NOTE = "The FVG layer arrives with the chart release — this opens the chart without it for now.";

/** §35 — "Show me on a chart" for a lesson: a clean proof scene with the FVG tool on, once it exists. */
export function fvgChartLink(lesson: Pick<FvgLesson, "alsoOn">, shipped = fvgLayerShipped()): { href: string; shipped: boolean; note: string | null } {
  if (!shipped) return { href: INSTRUMENT_VIEW_ROUTE, shipped: false, note: FVG_LAYER_PENDING_NOTE };
  const on = [FVG_SCENE_TOKEN, ...lesson.alsoOn].join(",");
  return { href: `${INSTRUMENT_VIEW_ROUTE}?scene=clean&on=${on}`, shipped: true, note: null };
}

/**
 * §56 LEARNING LOOP — "Practice in Replay" for the lessons that are about what
 * happens AFTER creation (touch → depth → response → time → trade-through →
 * memory). Replay's FVG owner is `fvgCamera.fvgSceneForCamera`, which folds
 * the ledger as of the replay cursor (`fvgStateAsOf`) — so a replayed
 * territory never shows a touch that had not happened yet.
 *
 * REPLAY HAS NO URL DOOR (checked 2026-10-07: proofScene.ts has no replay
 * token and ChartsDashboard reads none; Replay starts only from the chart's
 * Workspace → Replay control, `startReplay`). So this link does NOT claim to
 * start Replay — its label says what it does ("Open on the chart — then press
 * Replay") and the steps name the real control. When the chart lane adds a URL
 * entry, point `fvgReplayPractice` at it and change the label in one place.
 * Omitted until the FVG layer ships.
 */
export const FVG_REPLAY_LESSONS: readonly number[] = [6, 7, 8, 9, 10, 14, 15];

/** The link's own words — it opens the chart AND starts Replay there (`replay=start`, the Replay door in replayWindow.ts). */
export const FVG_REPLAY_LINK_LABEL = "Practice in Replay";

export const FVG_REPLAY_STEPS =
  "This opens the chart with the FVG layer on and starts Replay on the loaded bars — the live clock is off. If the chart has no bars yet it says so and offers a Start Replay button (Workspace → Replay does the same). Step forward bar by bar: each territory shows only what was knowable at the replay cursor — the touch, the depth and the closes appear as they happened, never before.";

export function fvgReplayPractice(lesson: Pick<FvgLesson, "n" | "alsoOn">, shipped = fvgLayerShipped()): { href: string; label: string; steps: string } | null {
  if (!shipped || !FVG_REPLAY_LESSONS.includes(lesson.n)) return null;
  return { href: `${fvgChartLink(lesson, true).href}&${REPLAY_START_PARAM}=${REPLAY_START_VALUE}`, label: FVG_REPLAY_LINK_LABEL, steps: FVG_REPLAY_STEPS };
}

/** The Academy deep link for a lesson. */
export function fvgLessonHref(n: number): string {
  return `/education?lesson=fvg-${n}`;
}

// ── §36 "Show me my examples" — the trader's own decisions on gaps ──────────

/**
 * One journal decision that REFERENCES a canonical FVG object (JournalEntry
 * .fvgRef, read through the journal's own validator) — never a tag string.
 * The state shown is the gap's state AS OF THE DECISION.
 */
export interface FvgJournalExample {
  readonly id: string;
  readonly symbol: string;
  readonly date: string;
  readonly decisionAtMs: number;
  readonly objectId: string;
  /** "First touch · partial · 12 bars old · bullish 5m" — as of the decision. */
  readonly stateLine: string;
  /** win / loss / be and R when the journal recorded them; null otherwise. */
  readonly result: string | null;
  /** Plan adherence words from the caller (plan-vs-actual), or null when unknown. */
  readonly adherence: string | null;
  /** Opens this entry in the Journal. */
  readonly href: string;
}

const MITIGATION_WORD: Readonly<Record<string, string>> = { NONE: "untouched", TOUCHED: "touched", PARTIAL: "partial mitigation", DEEP: "deep mitigation", FULL: "full mitigation" };

/**
 * The trader's journal decisions that reference an FVG, newest decision first.
 * Records without a valid reference are skipped — tags are not evidence of a
 * gap. Unknown shapes are skipped, never coerced.
 */
export function fvgReferencedExamples(records: readonly unknown[], adherenceOf?: (id: string) => string | null): FvgJournalExample[] {
  const out: FvgJournalExample[] = [];
  for (const r of records) {
    if (!r || typeof r !== "object") continue;
    const rec = r as Record<string, unknown>;
    const ref = readJournalFvgReference(rec.fvgRef);
    const id = readStoredText(rec.id);
    if (!ref || !id) continue;
    const s = ref.snapshot;
    const res = readStoredText(rec.result);
    const R = typeof rec.realizedR === "number" && Number.isFinite(rec.realizedR) ? `${rec.realizedR >= 0 ? "+" : ""}${rec.realizedR}R` : null;
    out.push({
      id,
      symbol: readStoredText(rec.symbol) ?? ref.symbol,
      date: readStoredText(rec.date) ?? "",
      decisionAtMs: ref.decisionAtMs,
      objectId: ref.objectId,
      stateLine: `${fvgStudyGroupsOf(ref).WHEN} · ${MITIGATION_WORD[s.mitigation] ?? s.mitigation.toLowerCase()} · ${s.ageBars} bars old · ${s.direction.toLowerCase()} ${ref.timeframe}`,
      result: [res, R].filter(Boolean).join(" · ") || null,
      adherence: adherenceOf ? adherenceOf(id) : null,
      href: `/journal?entry=${encodeURIComponent(id)}`,
    });
  }
  return out.sort((a, b) => b.decisionAtMs - a.decisionAtMs);
}

export const FVG_EXAMPLES_EMPTY_LINE =
  "Your own examples appear here once a Journal entry references an FVG (use \"Reference an FVG\" when you write the entry).";

/** Every sentence the course shows a learner — for the honesty sweep. */
export function fvgCourseText(): string[] {
  return FVG_LESSONS.flatMap(l => [l.title, l.lede, ...l.body, ...l.look, l.glass]).concat(FVG_LAYER_PENDING_NOTE, FVG_EXAMPLES_EMPTY_LINE);
}

// ── Knowledge check — questions on THIS definition, for the Academy's quiz ──

export interface FvgQuizQuestion { readonly q: string; readonly choices: readonly string[]; readonly correct: number; readonly explain: string }

export const FVG_QUIZ_BANK: readonly FvgQuizQuestion[] = [
  { q: "A bullish FVG exists when…", correct: 0, explain: "low(b3) > high(b1), compared on wicks, after b3 has closed.",
    choices: ["low(b3) is above high(b1)", "b2's body is larger than b1's", "close(b3) is above open(b1)", "b3 closes green"] },
  { q: "The territory of a bearish FVG is…", correct: 1, explain: "Bearish: high(b3) < low(b1); the territory is [high(b3), low(b1)].",
    choices: ["[low(b3), high(b1)]", "[high(b3), low(b1)]", "b2's body", "b2's full range"] },
  { q: "When is an FVG created?", correct: 2, explain: "At the close of b3 — a forming bar never creates one.",
    choices: ["When b2 opens", "While b3 is forming", "At the close of b3", "At the next session open"] },
  { q: "The FVG test compares…", correct: 3, explain: "Wicks, not bodies: highs and lows of b1 and b3.",
    choices: ["Bodies of b1 and b3", "b2's open and close", "Volume of b1 and b3", "Wicks of b1 and b3"] },
  { q: `The minimum territory size is…`, correct: 0, explain: `max(${FVG_DEFINITION.minTicks} tick, ${FVG_DEFINITION.minAtrFraction.toFixed(2)} × ATR${FVG_DEFINITION.atrPeriod}).`,
    choices: [`max(${FVG_DEFINITION.minTicks} tick, ${FVG_DEFINITION.minAtrFraction.toFixed(2)} × ATR${FVG_DEFINITION.atrPeriod})`, "Any size at all", "1% of price", "The size of b2's body"] },
  { q: "b1 high and b3 low leave a gap, but b2 closed DOWN. Under v1 that is…", correct: 2, explain: "b2's body must point the gap's direction; a b2 against the gap (or a doji) is not an FVG under v1.",
    choices: ["A bullish FVG", "A bearish FVG", "Not an FVG", "A deep mitigation"] },
  { q: "The touch is…", correct: 1, explain: "The first bar after creation that trades into the territory — a wick is enough.",
    choices: ["Any close inside the territory", "The first bar after creation that trades into the territory", "The bar that fully crosses it", "b3 itself"] },
  { q: `Price reached ${Math.round(FVG_DEFINITION.deepPenetration * 60)}% of the way into the territory. That is…`, correct: 0, explain: `Under ${PCT} penetration is partial; ${PCT} or more is deep.`,
    choices: ["Partial mitigation", "Deep mitigation", "Full mitigation", "A trade-through"] },
  { q: "Full mitigation means…", correct: 2, explain: "Price traded to the far boundary. A CLOSE beyond it is a different thing: invalidation.",
    choices: ["Two closes inside", "A close back outside", "Price traded to the far boundary", "The territory is older than a day"] },
  { q: "Acceptance is…", correct: 3, explain: `${FVG_DEFINITION.acceptanceCloses} or more consecutive closes inside the territory.`,
    choices: ["One wick inside", "A close beyond the far boundary", "A touch with high volume", `${FVG_DEFINITION.acceptanceCloses}+ consecutive closes inside the territory`] },
  { q: "Rejection is…", correct: 0, explain: "After the touch, a close back outside on the origin side, without full mitigation.",
    choices: ["After the touch, a close back outside on the origin side without full mitigation", "Any red candle at the territory", "A wick beyond the far boundary", "Price never touching it"] },
  { q: "A bullish territory is traded through (invalidated) when…", correct: 1, explain: "A close below high(b1) — the far boundary. A wick there is full mitigation, not invalidation.",
    choices: ["A wick touches low(b3)", "A bar closes below high(b1)", "Price touches the midline", "It is older than 20 bars"] },
  { q: "Which statement is honest?", correct: 2, explain: "A territory is a recorded observation. What happens to it is measured, not assumed.",
    choices: ["Every FVG gets revisited eventually", "A deep touch means price reverses", "What happens to a territory is measured case by case", "An FVG gives permission to enter"] },
  { q: "Holding a position after its territory was traded through, without a plan rule saying so, is…", correct: 3, explain: "Holding an invalid thesis is not patience — the plan decides.",
    choices: ["Patience", "Good risk management", "Required by the method", "Holding an invalid thesis"] },
];
