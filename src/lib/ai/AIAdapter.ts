/**
 * AIAdapter — canonical contract every AI provider adapter must satisfy.
 *
 * The AI-provider mirror of `BrokerAdapter` (src/lib/broker/BrokerAdapter.ts).
 * Founder P0: "Finish ATHOS AI Gateway for Gemini/OpenRouter and existing AI
 * providers." Same organism rule as the broker wall — new AI provider = new
 * adapter behind ONE gateway, never a new UI/domain path.
 *
 * Discovery finding (2026-08-21): the only AI provider wired in code is Gemini,
 * called directly inside `/api/spaidbot/route.ts` (streaming SSE) with
 * `GEMINI_API_KEY`. There is no shared AI contract, so a second provider
 * (OpenRouter/Anthropic/xAI) would repeat the divergence the broker wall just
 * eliminated. This interface is that shared contract.
 *
 * PURE TYPE MODULE — no runtime code. Adapters implement; consumers (ATHOS
 * gateway, SpaidBot, any future AI feature) depend on this shape, never on a
 * specific provider's raw request/response body.
 */

/** Canonical AI provider identifier. Never exposed as market/user truth. */
export type AIProviderId = "gemini" | "openrouter" | "anthropic" | "xai" | "openai";

export interface AIMessage {
  readonly role: "system" | "user" | "assistant";
  readonly content: string;
}

/**
 * Universal completion request. Consumers compose one of these; the adapter
 * translates to the provider's wire format. Unknown fields must not fabricate
 * provider defaults.
 */
export interface AICompletionIntent {
  readonly clientRequestId: string; // idempotency / trace key
  readonly messages: readonly AIMessage[];
  readonly model?: string;
  readonly maxOutputTokens?: number;
  readonly temperature?: number;
}

/** Canonical completion result — normalized across adapters. */
export interface AICompletionResult {
  readonly clientRequestId: string;
  readonly provider: AIProviderId;
  /**
   * ok         — provider returned a completion.
   * unconfigured — no API key present; nothing was called (honest, not an error).
   * rejected   — the request itself was invalid (empty messages, etc.).
   * error      — the provider was called and failed.
   */
  readonly status: "ok" | "unconfigured" | "rejected" | "error";
  readonly text: string | null;
  readonly model: string | null;
  readonly reason?: string;
  readonly finishedAt: string; // ISO 8601
}

/** Provider capability report — key/account-aware, never hard-coded by consumers. */
export interface AICapabilities {
  readonly models: readonly string[];
  readonly supportsStreaming: boolean;
  readonly supportsSystemPrompt: boolean;
  readonly supportsTools: boolean;
  readonly notes: readonly string[];
}

/** Health report — never returns tokens/secrets. Aggregated by the gateway. */
export interface AIHealth {
  readonly implemented: boolean;
  readonly envConfigured: boolean;
  readonly connected: boolean;
  readonly note: string;
}

/** Options for complete() — injectable fetch keeps adapters testable offline. */
export interface AICompleteOptions {
  readonly fetchImpl?: typeof fetch;
}

/**
 * The contract. Adapters implement these; consumers depend on this interface,
 * never on a raw provider return shape.
 */
export interface AIAdapter {
  readonly id: AIProviderId;

  /**
   * Cheap health snapshot. Must never call upstream; must never read/return
   * secret values (checks presence of env NAMES only).
   */
  health(): AIHealth;

  /** Declared capabilities. Honest under-claim until discovery is wrapped. */
  capabilities(): Promise<AICapabilities>;

  /**
   * Non-streaming canonical completion. MUST:
   *   · return `unconfigured` (not throw, not fabricate) when no key present;
   *   · return `rejected` for an invalid request (e.g. empty messages);
   *   · never include the API key anywhere in the result;
   *   · honor clientRequestId for tracing.
   */
  complete(intent: AICompletionIntent, opts?: AICompleteOptions): Promise<AICompletionResult>;
}
