/**
 * READING THE GLASS — one short primer per tool (Supermax §9, 2026-10-09).
 *
 * A trader meeting an unfamiliar tool opens its ⓘ; the ⓘ's Academy door now
 * lands on a primer about THAT tool, not on an FVG lesson that mentions it.
 *
 * ONE DEFINITION. A primer writes no market claim of its own. Every sentence
 * about a tool is that tool's own ⓘ record (`educationFor`, the registry in
 * inventionEducation.ts): where it appears, how to read it, what it needs, and
 * what FULL / PARTIAL / DEGRADED mean for it. The only words written here are
 * the frame around them — the headings, what SILENCE means, and what no tool
 * can know — and those are the course's own sentences (lesson 13).
 *
 * In the existing education room: a seventh-day module would be a new room;
 * this is one more module in the same catalogue, published as written lessons
 * with a knowledge check on the evidence grades.
 */
import { educationFor } from "@/lib/chart/inventionEducation";

export interface ToolPrimerTool {
  /** ⓘ record id. */
  readonly id: string;
  /** The tool's name as the menus print it. */
  readonly label: string;
}

export interface ToolPrimerSection {
  readonly tool: string;
  readonly question: string;
  readonly appears: string;
  readonly grammar: string;
  readonly evidence: string;
  readonly full: string;
  readonly partial: string;
  readonly degraded: string;
}

export interface ToolPrimer {
  readonly n: number;
  readonly id: string;
  readonly title: string;
  readonly duration: string;
  readonly tools: readonly ToolPrimerTool[];
  readonly sections: readonly ToolPrimerSection[];
}

export const TOOL_PRIMER_MODULE = { id: 10, title: "Reading the glass — tool primers", level: "Beginner" as const, color: "#C9A55C" } as const;

/** What SILENCE means, for every tool. */
export const PRIMER_SILENCE = "SILENCE: the tool draws nothing and says why. Silence is not evidence either way." as const;
/** What no tool can know. */
export const PRIMER_CANNOT_KNOW = "What it cannot know: who traded, why they traded, or what price does next. It describes what has happened on the bars it read." as const;
export const PRIMER_GRADES_LEDE = "Every reading carries its evidence grade. Read the grade first, then the reading." as const;

const DEFS: readonly { slug: string; title: string; duration: string; tools: readonly ToolPrimerTool[] }[] = [
  { slug: "living-profile", title: "Living Profile", duration: "5m", tools: [{ id: "LIVING_PROFILE", label: "Living Profile" }] },
  { slug: "walls", title: "Brick Walls and Derivatives Pressure", duration: "7m", tools: [{ id: "BRICK_WALLS", label: "Brick Walls" }, { id: "DERIVATIVES_PRESSURE", label: "Derivatives Pressure" }] },
  { slug: "absorption", title: "Absorption", duration: "5m", tools: [{ id: "ABSORPTION", label: "Absorption Shelf" }] },
  { slug: "liquidity-weather", title: "Liquidity Weather", duration: "5m", tools: [{ id: "LIQUIDITY_WEATHER", label: "Liquidity Weather" }] },
  { slug: "effort-response", title: "Effort → Response", duration: "5m", tools: [{ id: "EFFORT_RESPONSE", label: "Effort → Response" }] },
  { slug: "footprint", title: "Footprint", duration: "8m", tools: [
    { id: "FP_bid-ask", label: "Bid × Ask" }, { id: "FP_delta", label: "Delta Bubbles" }, { id: "FP_volume-profile", label: "Vol Profile" },
    { id: "FP_imbalance", label: "Imbalance" }, { id: "FP_aggressive-passive", label: "Agg/Passive Proxy" }, { id: "FP_big-trades", label: "Big Trades" },
  ] },
];

function sectionFor(t: ToolPrimerTool): ToolPrimerSection {
  const r = educationFor(t.id);
  if (!r) throw new Error(`toolPrimers: no ⓘ record for ${t.id}`);
  return { tool: t.label, question: r.question, appears: r.appears, grammar: r.grammar, evidence: r.evidence, full: r.full, partial: r.partial, degraded: r.degraded };
}

export const TOOL_PRIMERS: readonly ToolPrimer[] = DEFS.map((d, i) => ({
  n: i + 1, id: `glass-${d.slug}`, title: d.title, duration: d.duration, tools: d.tools, sections: d.tools.map(sectionFor),
}));

export const toolPrimerHref = (id: string): string => `/education?lesson=${id}`;

/** Every sentence a primer shows, for the copy sweeps. */
export function toolPrimerText(): string[] {
  return TOOL_PRIMERS.flatMap(p => [p.title, ...p.sections.flatMap(s => [s.question, s.appears, s.grammar, s.evidence, s.full, s.partial, s.degraded])])
    .concat(PRIMER_SILENCE, PRIMER_CANNOT_KNOW, PRIMER_GRADES_LEDE);
}

// ── Knowledge check — on the evidence grades, the one thing every primer teaches ──

export interface ToolPrimerQuestion { readonly q: string; readonly choices: readonly string[]; readonly correct: number; readonly explain: string }

export const TOOL_PRIMER_QUIZ_BANK: readonly ToolPrimerQuestion[] = [
  { q: "A tool's reading is marked PARTIAL. What do you do first?", choices: ["Ignore the grade", "Read what is missing, then the reading", "Treat it as FULL", "Switch the tool off"], correct: 1, explain: "The grade says how much the reading rests on. Read it first." },
  { q: "A tool draws nothing and says why. That is…", choices: ["A bug", "A bearish sign", "SILENCE — not evidence either way", "A bullish sign"], correct: 2, explain: PRIMER_SILENCE },
  { q: "Which of these can a tool on the chart tell you?", choices: ["Who traded", "Why they traded", "What price does next", "What happened on the bars it read"], correct: 3, explain: PRIMER_CANNOT_KNOW },
  { q: "DEGRADED means…", choices: ["The reading is stronger", "Too little evidence for the reading — it says what is missing", "The market is weak", "The tool is broken"], correct: 1, explain: "DEGRADED names the missing evidence instead of guessing." },
  { q: "Options walls on the chart come from…", choices: ["Observed orders", "Open interest — inferred positioning", "The order book", "Candle colour"], correct: 1, explain: "Walls are read from open interest. They are inferred positioning, not orders." },
  { q: "A footprint with no sided tape…", choices: ["Guesses sides from candle colour", "Stays silent rather than guess", "Uses yesterday's sides", "Shows FULL"], correct: 1, explain: "No sided tape — it stays silent rather than guess sides from candle colour." },
  { q: "Where is the grade for a reading shown?", choices: ["Nowhere", "Only in the Academy", "With the reading — in the tool's ⓘ and in Inspect", "Only on desktop"], correct: 2, explain: "The grade travels with the reading." },
  { q: "Two tools agree at one price. That is…", choices: ["A guarantee", "Context — two facts side by side", "A signal to enter", "A stronger grade for both"], correct: 1, explain: "Agreement is context. Neither tool upgrades the other's evidence." },
  { q: "FULL means…", choices: ["The trade is safe", "The reading is measured from the evidence the tool needs", "Price continues", "The tool is switched on"], correct: 1, explain: "FULL is about the evidence, not about what price does." },
  { q: "Before switching on a tool you have not used, the first thing to open is…", choices: ["The ticket", "Its ⓘ", "The scanner", "Replay"], correct: 1, explain: "The ⓘ says what the tool is, what it needs, and whether it can draw here." },
];
