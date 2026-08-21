/**
 * geminiAdapter — canonical AIAdapter #001 (reference implementation).
 *
 * Wraps Google Generative Language (Gemini) behind the AIAdapter contract.
 * The existing streaming chat path stays at /api/spaidbot (SSE); THIS adapter
 * provides the canonical NON-streaming completion the ATHOS gateway routes for
 * every internal AI use, so no new feature re-implements a direct Gemini call.
 *
 * NEVER returns the API key. health()/capabilities() check env NAME presence
 * only. complete() returns an honest `unconfigured` result when no key is set
 * (it does not throw and does not fabricate text).
 */

import type {
  AIAdapter,
  AICapabilities,
  AICompleteOptions,
  AICompletionIntent,
  AICompletionResult,
  AIHealth,
} from "../AIAdapter";

const DEFAULT_MODEL = "gemini-2.0-flash";
const GEN_ENDPOINT = (model: string, key: string) =>
  `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(key)}`;

function keyPresent(): boolean {
  const v = process.env.GEMINI_API_KEY;
  return typeof v === "string" && v.length > 0;
}

function nowIso(): string {
  return new Date().toISOString();
}

function result(partial: Omit<AICompletionResult, "provider" | "finishedAt">): AICompletionResult {
  return { provider: "gemini", finishedAt: nowIso(), ...partial };
}

/** Map canonical messages → Gemini request body (system_instruction + contents). */
export function toGeminiBody(intent: AICompletionIntent): {
  system_instruction?: { parts: { text: string }[] };
  contents: { role: string; parts: { text: string }[] }[];
  generationConfig: { maxOutputTokens: number; temperature: number };
} {
  const systemText = intent.messages
    .filter((m) => m.role === "system")
    .map((m) => m.content)
    .join("\n\n")
    .trim();
  const contents = intent.messages
    .filter((m) => m.role !== "system")
    .map((m) => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text: m.content }],
    }));
  return {
    ...(systemText ? { system_instruction: { parts: [{ text: systemText }] } } : {}),
    contents,
    generationConfig: {
      maxOutputTokens: intent.maxOutputTokens ?? 1024,
      temperature: intent.temperature ?? 0.7,
    },
  };
}

/** Extract the completion text from a Gemini generateContent response. */
export function extractGeminiText(json: unknown): string | null {
  const j = json as { candidates?: { content?: { parts?: { text?: string }[] } }[] } | null;
  const parts = j?.candidates?.[0]?.content?.parts;
  if (!Array.isArray(parts)) return null;
  const text = parts.map((p) => p?.text ?? "").join("").trim();
  return text.length > 0 ? text : null;
}

export const geminiAdapter: AIAdapter = {
  id: "gemini",

  health(): AIHealth {
    const configured = keyPresent();
    return {
      implemented: true,
      envConfigured: configured,
      connected: false, // handshake happens per-request
      note: configured
        ? "Gemini adapter wired. GEMINI_API_KEY present; non-streaming complete() active. Streaming chat remains at /api/spaidbot."
        : "Gemini adapter wired but GEMINI_API_KEY is absent — completions return unconfigured until the key is set.",
    };
  },

  async capabilities(): Promise<AICapabilities> {
    return {
      models: [DEFAULT_MODEL],
      supportsStreaming: true, // via /api/spaidbot SSE path
      supportsSystemPrompt: true,
      supportsTools: false,
      notes: [
        "Non-streaming completion wrapped behind the ATHOS gateway.",
        "Streaming lives at /api/spaidbot; tool-use not yet wrapped.",
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

    const key = process.env.GEMINI_API_KEY;
    if (!key) {
      return result({
        clientRequestId: intent.clientRequestId,
        status: "unconfigured",
        text: null,
        model: null,
        reason: "GEMINI_API_KEY is not set; no upstream call was made.",
      });
    }

    const model = intent.model ?? DEFAULT_MODEL;
    const doFetch = opts?.fetchImpl ?? fetch;
    try {
      const res = await doFetch(GEN_ENDPOINT(model, key), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(toGeminiBody(intent)),
      });
      if (!res.ok) {
        let reason = `Gemini error ${res.status}`;
        try {
          const errText = await res.text();
          const parsed = JSON.parse(errText) as { error?: { message?: string } };
          if (parsed?.error?.message) reason = parsed.error.message;
        } catch {
          // keep the status-code reason
        }
        return result({ clientRequestId: intent.clientRequestId, status: "error", text: null, model, reason });
      }
      const json = await res.json();
      const text = extractGeminiText(json);
      if (text == null) {
        return result({
          clientRequestId: intent.clientRequestId,
          status: "error",
          text: null,
          model,
          reason: "Gemini returned no usable completion text.",
        });
      }
      return result({ clientRequestId: intent.clientRequestId, status: "ok", text, model });
    } catch (err) {
      return result({
        clientRequestId: intent.clientRequestId,
        status: "error",
        text: null,
        model,
        reason: err instanceof Error ? err.message : "Unknown Gemini transport error.",
      });
    }
  },
};

export default geminiAdapter;
