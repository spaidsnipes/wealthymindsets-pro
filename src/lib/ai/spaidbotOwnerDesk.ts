/**
 * SPAIDBOT · the owner's prop-evaluation arithmetic and the Academy doors
 * (Supermax §8 / §10, 2026-10-09). PURE — strings in, strings out.
 *
 * ONE ENGINE. SpaidBot does no rule arithmetic of its own: the numbers in the
 * block below are computed by the desk's own pure engine
 * (`src/lib/journal/propEvaluation.ts`) from what the owner typed on the desk,
 * and the model is told to use that block and nothing else. Numbers typed in
 * the conversation are handled by the rule STATED here, read from the engine's
 * own constant — there is no second copy of the rule.
 *
 * OWNER ONLY. The route adds these words and this block only for the owner of
 * the deployment; a member's request never carries them, and a member's
 * `context.prop` is ignored. NOTHING IS STORED: the record rides one request
 * and is dropped with it.
 *
 * NO PROMISE. The words say arithmetic, never an outcome: no "you will pass",
 * no target to trade toward, no sizing.
 */
import { ACADEMY_DOOR_FOR_TOOL } from "@/lib/academy/academyDoorForTool";
import {
  DEFAULT_CONSISTENCY_LIMIT, PROP_SCENARIO_LABEL, PROP_UNVERIFIED, formatCents, pct, planDaysVerdict, readPropEvaluation,
  readPropStored, type Known, type PropInputs,
} from "@/lib/journal/propEvaluation";

/** Said to every user: what SpaidBot may never promise. */
export const SPAIDBOT_NO_PROMISE_RULES = `No promises:
- Never promise profit, a win, a fill, or that a prop-firm evaluation, challenge or funded account will be passed, kept or paid.
- Never tell a trader to take a trade, a size or a number of trades in order to reach a target.`;

/** Added to the instructions for the OWNER only. */
export const SPAIDBOT_PROP_RULES = `Prop-evaluation arithmetic (owner only):
- When a block headed "PROP EVALUATION — OWNER'S OWN NUMBERS" is supplied, use only the figures in it. They were computed by the desk's rule engine from numbers the owner typed; they are ${PROP_UNVERIFIED} unless the block says they were read back from the firm's dashboard. Never restate them as the firm's own record.
- If the owner types evaluation numbers in the conversation instead, apply exactly this rule and show each step: required net profit = the larger of (the profit target) and (the largest profitable day ÷ ${DEFAULT_CONSISTENCY_LIMIT}); remaining = required − net profit so far. If a figure is missing, say which one — do not assume it.
- A plan of N days is arithmetically impossible when the block says so; say it plainly. A scenario is ${PROP_SCENARIO_LABEL} — never a target to trade toward.
- You do not know the firm's current rules. Tell the owner to check the figures against the firm's own dashboard.
- Never say an evaluation will be passed, and never suggest trades, size or risk to reach a number.`;

const known = <T,>(k: Known<T>, f: (v: T) => string): string => (k.known ? f(k.value) : `cannot be said — ${k.why}`);

/** The fact block for the owner's desk numbers, or "" when there is nothing lawful to say. */
export function formatPropEvaluationBlock(inputs: PropInputs): string {
  const r = readPropEvaluation(inputs);
  const two = planDaysVerdict(inputs, 2);
  const lines = [
    `[PROP EVALUATION — OWNER'S OWN NUMBERS · ${r.verified ? "stamped by the owner as read back from the firm's dashboard" : `${PROP_UNVERIFIED} (typed by the owner, not read from the firm)`} · computed by the desk's rule engine · ILLUSTRATIVE ARITHMETIC, NOT A PROMISE]`,
    `- Consistency rule used: largest profitable day ÷ net profit at most ${pct(inputs.consistencyLimit)}.`,
    `- Net profit so far: ${known(r.netProfitCents, formatCents)}${r.netBasis === "NONE" ? "" : ` (from ${r.netBasis === "BALANCES" ? "the balances" : "the daily results"})`}.`,
    `- Days traded: ${r.daysTraded}. Largest profitable day: ${r.largestDayCents > 0 ? `${formatCents(r.largestDayCents)}${r.largestDayDate ? ` on ${r.largestDayDate}` : ""}` : "none"}.`,
    `- Best-day share of net profit: ${known(r.bestDayShare, pct)}.`,
    `- Required net profit: ${known(r.requiredNetProfitCents, formatCents)}${r.targetRaisedByBestDay ? " — set by the consistency rule, above the original target" : ""}.`,
    `- Remaining: ${known(r.remainingCents, formatCents)}.`,
    `- Drawdown headroom: ${known(r.drawdownHeadroomCents, formatCents)}. Minimum trading days still to complete: ${known(r.minDaysRemaining, String)}.`,
    `- Fewest further days under any plan: ${known(r.minimumFurtherDaysAnyPlan, String)}. A two-day plan: ${two.words}`,
    "- These are the owner's figures run through the rule. They are not the firm's record and promise nothing.]",
  ];
  return `\n\n${lines.join("\n")}`;
}

/**
 * The owner's desk record as it arrives on a request (`context.prop`, the
 * desk's own stored shape) → the block. Anything malformed says nothing.
 */
export function spaidbotPropNote(rawProp: unknown, ownerAllowed: boolean): string {
  if (!ownerAllowed) return "";
  const stored = readPropStored(rawProp);
  return stored ? formatPropEvaluationBlock(stored.inputs) : "";
}

/** Tool names a trader would say, for the lessons the ⓘ doors already point at. */
const TOOL_WORDS: Readonly<Record<string, string>> = {
  LIVING_PROFILE: "Living Profile / volume profile", ABSORPTION: "Absorption", BRICK_WALLS: "Brick Walls (options walls)",
  DERIVATIVES_PRESSURE: "Derivatives Pressure", LIQUIDITY_WEATHER: "Liquidity Weather",
  "FP_bid-ask": "Footprint", EFFORT_RESPONSE: "Effort → Response",
};

/** The lessons SpaidBot may recommend — the SAME table the chart's ⓘ doors read. */
export function spaidbotAcademyBlock(): string {
  const rows = Object.entries(TOOL_WORDS).map(([id, words]) => {
    const d = ACADEMY_DOOR_FOR_TOOL[id];
    return `- ${words}: "${d.title}" — ${d.href}`;
  });
  return [
    "Academy lessons you may recommend (these are the only tool lessons that exist — never name another):",
    `- FVG / Imbalance: "What is an imbalance?" — /education?lesson=fvg-1`,
    ...rows,
    "Recommend a lesson only when it fits the question, by its exact title and address. Do not describe a lesson's content beyond its title.",
  ].join("\n");
}
