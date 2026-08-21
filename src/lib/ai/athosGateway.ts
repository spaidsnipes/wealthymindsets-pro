/**
 * ATHOS AI Gateway — the ONE entry point for internal AI completions.
 *
 * Founder P0: "ONE ATHOS AI GATEWAY." Every internal AI use routes a canonical
 * AICompletionIntent through here; the gateway resolves the provider adapter
 * from the registry and delegates. No feature calls a provider directly.
 *
 * The gateway itself performs NO provider I/O — it is pure routing + honest
 * fallback. When a provider has no adapter it returns a truthful `unconfigured`
 * result rather than throwing, so a caller (SpaidBot, a decision annotator, a
 * journal summarizer) always gets a canonical result to record.
 */

import type {
  AICompletionIntent,
  AICompletionResult,
  AICompleteOptions,
  AIHealth,
  AIProviderId,
} from "./AIAdapter";
import { getAIAdapter, listAIAdapters } from "./adapters";

/** The default provider the gateway routes to when none is specified. */
export const ATHOS_DEFAULT_PROVIDER: AIProviderId = "gemini";

/**
 * Route a completion through the canonical adapter for `provider`
 * (default gemini). Never throws for a missing provider — returns an
 * honest `unconfigured` result the caller can log.
 */
export async function athosComplete(
  intent: AICompletionIntent,
  provider: AIProviderId = ATHOS_DEFAULT_PROVIDER,
  opts?: AICompleteOptions,
): Promise<AICompletionResult> {
  const adapter = getAIAdapter(provider);
  if (!adapter) {
    return {
      clientRequestId: intent.clientRequestId,
      provider,
      status: "unconfigured",
      text: null,
      model: null,
      reason: `No ATHOS adapter registered for provider "${provider}".`,
      finishedAt: new Date().toISOString(),
    };
  }
  return adapter.complete(intent, opts);
}

/** Health of every registered AI provider — the AI mirror of /api/broker/status. */
export function athosHealth(): readonly (AIHealth & { readonly provider: AIProviderId })[] {
  return listAIAdapters().map((a) => ({ provider: a.id, ...a.health() }));
}

/** Count of registered providers with env configured — for "N of M AI providers wired". */
export function athosConfiguredCount(): { readonly configured: number; readonly total: number } {
  const all = athosHealth();
  return { configured: all.filter((h) => h.envConfigured).length, total: all.length };
}
