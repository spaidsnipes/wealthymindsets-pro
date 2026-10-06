/**
 * SpaidBot's chart context, completed with the scene's Decision_ID — Garden 18
 * §8 (2026-10-06). PURE apart from the injected reader.
 *
 * The id is READ from the one decision store (decisionContinuity) for the
 * chart's owner + symbol. Nothing here mints, writes or caches a decision:
 * SpaidBot is not a second decision store.
 */
import type { ScopedDecisionIdentity } from "@/lib/expressionShortlist";

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
