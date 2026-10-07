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
import { INSTRUMENT_VIEW_ROUTE } from "@/lib/routing/founderLanding";
import { parseProofScene } from "@/lib/chart/proofScene";
import { readStoredText } from "@/lib/storedShape";
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

const L = (
  n: number, title: string, duration: string, diagram: FvgDiagramKind, lede: string,
  body: readonly string[], look: readonly string[], alsoOn: readonly string[] = [],
): FvgLesson => ({ n, id: `fvg-${n}`, title, duration, diagram, lede, body, look, alsoOn });

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
    "A territory often lines up with thin volume — prices the auction passed through quickly.",
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
    ],
    ["Can I say it without naming a participant?", "Which closes support the label?"]),
  L(21, "Your personal edge", "12m", "edge",
    "Your edge with territories is what YOUR journal shows, on YOUR markets — not what a course claims.",
    [
      "Tag the trades you took at a territory as FVG in the Journal. Over time the Academy can show those trades beside this course.",
      "Read them with lesson 16's rules: what was the sample, how large is N, which regime. Keep what the evidence supports; drop the rest.",
      FVG_NO_GUARANTEE,
    ],
    ["Tag FVG trades in the Journal.", "Review them by instrument, timeframe and session."]),
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
 * territory never shows a touch that had not happened yet. Replay has no URL
 * door; it is started on the chart itself, so the practice opens the same FVG
 * scene and says how. Omitted until the FVG layer ships.
 */
export const FVG_REPLAY_LESSONS: readonly number[] = [6, 7, 8, 9, 10, 14, 15];

export const FVG_REPLAY_STEPS =
  "Opens the chart with the FVG layer. Press Replay, then step forward bar by bar: each territory shows only what was knowable at the replay cursor — the touch, the depth and the closes appear as they happened, never before.";

export function fvgReplayPractice(lesson: Pick<FvgLesson, "n" | "alsoOn">, shipped = fvgLayerShipped()): { href: string; steps: string } | null {
  if (!shipped || !FVG_REPLAY_LESSONS.includes(lesson.n)) return null;
  return { href: fvgChartLink(lesson, true).href, steps: FVG_REPLAY_STEPS };
}

/** The Academy deep link for a lesson. */
export function fvgLessonHref(n: number): string {
  return `/education?lesson=fvg-${n}`;
}

// ── §36 "Show me my examples" — FVG-tagged trades from the Journal ──────────

const FVG_TAG = /^(fvg|fair[\s_-]*value[\s_-]*gap)s?\b/i;

export interface FvgJournalExample {
  readonly id: string;
  readonly symbol: string;
  readonly date: string;
  readonly result: string | null;
}

/**
 * Journal records the trader tagged FVG (tag or setup "FVG" / "Fair Value
 * Gap"). Reads the canonical journal records as stored — unknown shapes are
 * skipped, never coerced. Footprint "imbalance" is a different object and does
 * not count.
 */
export function fvgTaggedExamples(records: readonly unknown[]): FvgJournalExample[] {
  const out: FvgJournalExample[] = [];
  for (const r of records) {
    if (!r || typeof r !== "object") continue;
    const rec = r as Record<string, unknown>;
    const tags = Array.isArray(rec.tags) ? rec.tags.filter((t): t is string => typeof t === "string") : [];
    const setup = readStoredText(rec.setup) ?? "";
    if (!tags.some(t => FVG_TAG.test(t.trim())) && !FVG_TAG.test(setup.trim())) continue;
    out.push({
      id: readStoredText(rec.id) ?? String(out.length),
      symbol: readStoredText(rec.symbol) ?? "—",
      date: readStoredText(rec.date) ?? "",
      result: readStoredText(rec.result) ?? null,
    });
  }
  return out;
}

export const FVG_EXAMPLES_EMPTY_LINE =
  "Your own examples appear here once your Journal holds trades tagged FVG.";

/** Every sentence the course shows a learner — for the honesty sweep. */
export function fvgCourseText(): string[] {
  return FVG_LESSONS.flatMap(l => [l.title, l.lede, ...l.body, ...l.look]).concat(FVG_LAYER_PENDING_NOTE, FVG_EXAMPLES_EMPTY_LINE);
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
