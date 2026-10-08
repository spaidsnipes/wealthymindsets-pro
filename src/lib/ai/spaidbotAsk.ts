/**
 * "ASK SPAIDBOT" — the one door from a surface into the EXISTING SpaidBot
 * panel (Garden 19 §30). Not a new mode: the panel opens with the question
 * PRE-FILLED in its input (the trader presses Send — nothing is sent for
 * them) and, for that next question only, a small context patch rides with
 * the chart context the panel already reads (`#wm-chart-context`).
 *
 * The patch may only carry fields the server already validates
 * (formatChartContextNote): `fvg` (structured FVG facts, re-validated and
 * worded server-side), `symbol`, `timeframe`, `decisionId`, `plan`. Anything
 * else is dropped here.
 *
 * PURE apart from `askSpaidbot`, which dispatches one window event.
 */

import { fvgFactsForSpaidbot } from "./spaidbotFvgFacts";
import type { FvgObject } from "@/lib/marketData/fvg/fvgEngine";

export const SPAIDBOT_ASK_EVENT = "wm:spaidbot-ask" as const;
export const SPAIDBOT_ASK_MAX = 600;

export const FVG_ASK_PROMPT = "What am I looking at?" as const;

export interface SpaidbotAsk {
  readonly prompt: string;
  readonly context: Readonly<Record<string, unknown>>;
}

const PATCH_KEYS = new Set(["fvg", "symbol", "timeframe", "decisionId", "plan"]);

/** Validate an ask (from an event detail). Null when there is no usable prompt. */
export function readSpaidbotAsk(raw: unknown): SpaidbotAsk | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  const prompt = typeof r.prompt === "string" ? r.prompt.replace(/\s+/g, " ").trim().slice(0, SPAIDBOT_ASK_MAX) : "";
  if (!prompt) return null;
  const ctxIn = r.context && typeof r.context === "object" ? (r.context as Record<string, unknown>) : {};
  const context: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(ctxIn)) if (PATCH_KEYS.has(k) && v !== undefined) context[k] = v;
  return { prompt, context };
}

/** The panel's context for the next question: the chart's own context, then the ask's patch over it. */
export function contextWithAsk(base: Record<string, unknown>, ask: SpaidbotAsk | null): Record<string, unknown> {
  return ask ? { ...base, ...ask.context } : base;
}

/**
 * Inspect → SpaidBot: the selected gap's facts lead, from the one object.
 *
 * Only `fvg` is patched: the chart's own context already names the symbol the
 * trader reads ("NQ1!"). The object's `symbolId` can be a feed's streamer id
 * ("TASTYTRADE:/NQZ26:XCME" — serving 02e593e put that in the question and
 * overrode the chart's symbol), so it is never spoken or patched.
 */
export function fvgInspectAsk(o: FvgObject, priceDp: number | null): SpaidbotAsk {
  return {
    prompt: `${FVG_ASK_PROMPT} (the selected ${o.direction.toLowerCase()} FVG on this chart, ${o.timeframe})`,
    context: { fvg: [fvgFactsForSpaidbot(o, true, priceDp)] },
  };
}

/**
 * Review → SpaidBot: the plan question (spaidbotPlanReview.formatPlanReviewQuestion,
 * passed in) plus the trader's own FVG reference sentence, labelled as THEIR record.
 */
export function reviewDecisionAsk(input: {
  readonly question: string;
  readonly fvgReferenceSentence?: string | null;
  readonly symbol?: string | null;
  readonly decisionId?: string | null;
  readonly planLine?: string | null;
}): SpaidbotAsk {
  const ref = input.fvgReferenceSentence ? ` My journal referenced this FVG at decision time: ${input.fvgReferenceSentence}` : "";
  return {
    prompt: `${input.question}${ref}`.slice(0, SPAIDBOT_ASK_MAX),
    context: {
      ...(input.symbol ? { symbol: input.symbol } : {}),
      ...(input.decisionId ? { decisionId: input.decisionId } : {}),
      ...(input.planLine ? { plan: input.planLine } : {}),
    },
  };
}

/* ── WHO IS LISTENING (no dead doors) ──────────────────────────────────────
   An Ask button with nobody listening is a dead door (serving, chart lane,
   2026-10-07: /charts had no SpaidBot panel in the Founder shell). Every
   listener registers; the button asks `spaidbotAskListened()` and hides
   itself when nothing would answer. */
let listeners = 0;
let pending: SpaidbotAsk | null = null;

/** Register a listener (the panel, or the Founder shell's ask host). Returns the unregister. */
export function registerSpaidbotAskListener(): () => void {
  listeners += 1;
  let done = false;
  return () => { if (!done) { done = true; listeners -= 1; } };
}

export function spaidbotAskListened(): boolean {
  return listeners > 0;
}

/** The ask host keeps the ask that mounted the panel; the panel takes it once on mount. */
export function rememberPendingAsk(ask: SpaidbotAsk | null): void { pending = ask; }
export function takePendingAsk(): SpaidbotAsk | null { const p = pending; pending = null; return p; }

/** Open the existing SpaidBot panel with this ask (browser only). False when nothing listens. */
export function askSpaidbot(ask: SpaidbotAsk): boolean {
  if (typeof window === "undefined" || !spaidbotAskListened()) return false;
  window.dispatchEvent(new CustomEvent(SPAIDBOT_ASK_EVENT, { detail: ask }));
  return true;
}
