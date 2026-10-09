/**
 * SpaidBot's chart context, completed with the scene's Decision_ID — Garden 18
 * §8 (2026-10-06). PURE apart from the injected reader.
 *
 * The id is READ from the one decision store (decisionContinuity) for the
 * chart's owner + symbol. Nothing here mints, writes or caches a decision:
 * SpaidBot is not a second decision store.
 */
import type { ScopedDecisionIdentity } from "@/lib/expressionShortlist";
import type { ManagementPlanSnapshot } from "@/lib/journal/managementPlan";
import { formatPlanContextLine } from "./spaidbotPlanReview";

export type SceneDecisionReader = (owner: string | null | undefined, underlying: string | null | undefined) => ScopedDecisionIdentity | null;

export function withSceneDecisionId(
  ctx: Record<string, unknown>,
  owner: string | null,
  read: SceneDecisionReader,
): Record<string, unknown> {
  const symbol = typeof ctx.symbol === "string" ? ctx.symbol.trim() : "";
  if (!owner || !symbol) return { ...ctx, decisionId: null };
  let scene: ScopedDecisionIdentity | null = null;
  try { scene = read(owner, symbol); } catch { scene = null; }
  return { ...ctx, decisionId: scene?.identity.decisionId ?? null };
}

export type DecisionPlanReader = (decisionId: string) => ManagementPlanSnapshot | null;

/**
 * Garden 19 §27/§31: the plan the trader FROZE on this Decision_ID rides with
 * the chart context as `plan` — read from the one plan store, never written
 * here. No Decision_ID, or no frozen plan → `plan: null` (the note then says
 * nothing about a plan rather than inventing one).
 */
export function withScenePlan(ctx: Record<string, unknown>, read: DecisionPlanReader): Record<string, unknown> {
  const id = typeof ctx.decisionId === "string" ? ctx.decisionId : null;
  if (!id) return { ...ctx, plan: null };
  let snap: ManagementPlanSnapshot | null = null;
  try { snap = read(id); } catch { snap = null; }
  return { ...ctx, plan: formatPlanContextLine(snap) };
}

/**
 * WHAT THE PANEL WOULD SEND, PUBLISHED (Garden 19 §31, coordinator order
 * 2026-10-09). The Decision_ID and the plan line are added to the context in
 * memory, so nothing on the page showed them — §31 could only be read by
 * making a provider call on the Founder's account. When the panel opens it now
 * writes these two fields of the SAME context object the send path would post
 * (one builder: `contextWithAsk(getChartContext(), ask)`), as data attributes.
 * No request is made. PURE.
 */
export const SPAIDBOT_NO_PLAN = "no plan" as const;
export interface SpaidbotContextPublish {
  /** Whether the context carries a Decision_ID. */
  readonly decision: "yes" | "no";
  /** The plan line exactly as it would be sent, or "no plan". */
  readonly plan: string;
}
export function spaidbotContextPublish(ctx: Readonly<Record<string, unknown>>): SpaidbotContextPublish {
  const id = typeof ctx.decisionId === "string" ? ctx.decisionId.trim() : "";
  const plan = typeof ctx.plan === "string" ? ctx.plan.trim() : "";
  return { decision: id ? "yes" : "no", plan: plan || SPAIDBOT_NO_PLAN };
}

/** A stream silent this long is ended and SAID to have timed out (§8). */
export const SPAIDBOT_IDLE_TIMEOUT_MS = 45_000;

/**
 * The named failure a trader reads instead of an endless "Thinking…". Plain
 * words; no HTTP codes or server variable names reach a guest.
 */
export function spaidbotFailureMessage(raw: string, timedOut: boolean): string {
  if (/API_KEY|not set|not configured/i.test(raw)) return "SpaidBot is not switched on for this deployment yet.";
  if (timedOut) return `SpaidBot took too long to answer (no reply for ${SPAIDBOT_IDLE_TIMEOUT_MS / 1000}s) — nothing was decided; ask again in a moment.`;
  if (/model did not answer|model stopped answering/i.test(raw)) return "SpaidBot's model did not answer in time — nothing was decided; ask again in a moment.";
  if (raw.includes("EMPTY_ANSWER")) return "SpaidBot returned no answer — ask again, or rephrase the question.";
  if (/429|rate|too many/i.test(raw)) return "SpaidBot is busy — give it a minute and ask again.";
  return "SpaidBot could not answer just now — try again in a moment.";
}
