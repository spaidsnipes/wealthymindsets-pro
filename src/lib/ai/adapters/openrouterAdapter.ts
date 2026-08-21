/**
 * openrouterAdapter — canonical AIAdapter #002.
 *
 * Founder P0: "Finish ATHOS AI Gateway for Gemini/OpenRouter." OpenRouter is an
 * OpenAI-compatible aggregator (many models behind one API). This adapter
 * readies the gateway for it: the moment OPENROUTER_API_KEY is set in Vercel,
 * athosComplete(intent, "openrouter") works and it auto-appears in
 * /api/broker/status — no gateway or aggregate edit (organism proof: adding a
 * provider is one file + one registry line).
 *
 * NEVER returns the API key. health()/capabilities() check env NAME presence
 * only. complete() returns honest `unconfigured` when no key is set.
 */

import type {
  AIAdapter,
  AICapabilities,
  AICompleteOptions,
  AICompletionIntent,
  AICompletionResult,
  AIHealth,
} from "../AIAdapter";

const DEFAULT_MODEL = "openrouter/auto";
const CHAT_ENDPOINT = "https://openrouter.ai/api/v1/chat/completions";

function keyPresent(): boolean {
  const v = process.env.OPENROUTER_API_KEY;
  return typeof v === "string" && v.length > 0;
}

function result(partial: Omit<AICompletionResult, "provider" | "finishedAt">): AICompletionResult {
  return { provider: "openrouter", finishedAt: new Date().toISOString(), ...partial };
}

/** Map canonical messages → OpenAI/OpenRouter chat body (system stays a role). */
export function toOpenRouterBody(intent: AICompletionIntent): {
  model: string;
  messages: { role: string; content: string }[];
  max_tokens: number;
  temperature: number;
} {
  return {
    model: intent.model ?? DEFAULT_MODEL,
    messages: intent.messages.map((m) => ({ role: m.role, content: m.content })),
    max_tokens: intent.maxOutputTokens ?? 1024,
    temperature: intent.temperature ?? 0.7,
  };
}

/** Extract the completion text from an OpenRouter chat/completions response. */
export function extractOpenRouterText(json: unknown): string | null {
  const j = json as { choices?: { message?: { content?: string } }[] } | null;
  const text = j?.choices?.[0]?.message?.content;
  if (typeof text !== "string") return null;
  const trimmed = text.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export const openrouterAdapter: AIAdapter = {
  id: "openrouter",

  health(): AIHealth {
    const configured = keyPresent();
    return {
      implemented: true,
      envConfigured: configured,
      connected: false,
      note: configured
        ? "OpenRouter adapter wired. OPENROUTER_API_KEY present; non-streaming complete() active."
        : "OpenRouter adapter wired but OPENROUTER_API_KEY is absent — completions return unconfigured until the key is set.",
    };
  },

  async capabilities(): Promise<AICapabilities> {
    return {
      models: [DEFAULT_MODEL],
      supportsStreaming: false, // gateway wraps non-streaming only for now
      supportsSystemPrompt: true,
      supportsTools: false,
      notes: [
        "OpenAI-compatible aggregator; per-model capabilities discovered at call time.",
        "Set OPENROUTER_API_KEY in Vercel to activate.",
      ],
    };
  },

  async complete(intent: AICompletionIntent, opts?: AICompleteOptions): Promise<AICompletionResult> {
    const nonSystem = intent.messages.filter((m) => m.role !== "system");
    if (nonSystem.length === 0 || nonSystem.every((m) => m.content.trim() === "")) {
      return result({
        clientRequestId: intent.clientRequestId,
        status: "rejected",
        text: null,
        model: null,
        reason: "No non-empty user/assistant message to complete.",
      });
    }

    const key = process.env.OPENROUTER_API_KEY;
    if (!key) {
      return result({
        clientRequestId: intent.clientRequestId,
        status: "unconfigured",
        text: null,
        model: null,
        reason: "OPENROUTER_API_KEY is not set; no upstream call was made.",
      });
    }

    const model = intent.model ?? DEFAULT_MODEL;
    const doFetch = opts?.fetchImpl ?? fetch;
    try {
      const res = await doFetch(CHAT_ENDPOINT, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${key}`,
        },
        body: JSON.stringify(toOpenRouterBody(intent)),
      });
      if (!res.ok) {
        let reason = `OpenRouter error ${res.status}`;
        try {
          const errText = await res.text();
          const parsed = JSON.parse(errText) as { error?: { message?: string } };
          if (parsed?.error?.message) reason = parsed.error.message;
        } catch {
          // keep status-code reason
        }
        return result({ clientRequestId: intent.clientRequestId, status: "error", text: null, model, reason });
      }
      const json = await res.json();
      const text = extractOpenRouterText(json);
      if (text == null) {
        return result({
          clientRequestId: intent.clientRequestId,
          status: "error",
          text: null,
          model,
          reason: "OpenRouter returned no usable completion text.",
        });
      }
      return result({ clientRequestId: intent.clientRequestId, status: "ok", text, model });
    } catch (err) {
      return result({
        clientRequestId: intent.clientRequestId,
        status: "error",
        text: null,
        model,
        reason: err instanceof Error ? err.message : "Unknown OpenRouter transport error.",
      });
    }
  },
};

export default openrouterAdapter;
