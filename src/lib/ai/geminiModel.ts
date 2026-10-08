/**
 * Which Gemini model SpaidBot talks to — chosen from what the key can USE.
 *
 * Measured 2026-10-03: the route hard-coded "gemini-2.0-flash", Google retired
 * it, and every SpaidBot message came back as "model … is no longer
 * available". A typed model name is a date on which the assistant breaks, so
 * the route asks Google's own model list (once per isolate) and takes the
 * newest stable Flash model that streams; GEMINI_MODEL overrides when set.
 */
export interface GeminiModelInfo {
  readonly name: string; // "models/gemini-2.5-flash"
  readonly supportedGenerationMethods?: readonly string[];
}

const versionOf = (id: string): number[] =>
  (id.match(/gemini-(\d+(?:\.\d+)*)/)?.[1] ?? "0").split(".").map(Number);

const newer = (a: number[], b: number[]) => {
  for (let i = 0; i < Math.max(a.length, b.length); i++) {
    const d = (a[i] ?? 0) - (b[i] ?? 0);
    if (d) return d > 0;
  }
  return false;
};

/** The newest stable "gemini-X-flash" that can stream; null when none qualifies. */
export function pickGeminiModel(models: readonly GeminiModelInfo[]): string | null {
  let best: { id: string; v: number[] } | null = null;
  for (const m of models) {
    const id = m.name.replace(/^models\//, "");
    if (!/^gemini-\d+(\.\d+)*-flash$/.test(id)) continue; // no -lite / -preview / -exp / dated pins
    const methods = m.supportedGenerationMethods ?? [];
    if (!methods.includes("streamGenerateContent") && !methods.includes("generateContent")) continue;
    const v = versionOf(id);
    if (!best || newer(v, best.v)) best = { id, v };
  }
  return best?.id ?? null;
}

/**
 * The generation config for a model (serving 02e593e / dae44b0, FVG Ask proof):
 * gemini-2.5+ flash THINKS by default. Its thinking ran ~30 s before the first
 * byte (headers at 29.85 s against the route's 30 s bound; the first try timed
 * out) and spent the 1024-token output budget, so the visible answer stopped
 * after one sentence ("…last observed 2026"). SpaidBot explains evidence; it
 * does not need hidden reasoning tokens: thinking is switched off where the
 * model supports the switch, and the visible budget is 2048 tokens.
 */
export const SPAIDBOT_MAX_OUTPUT_TOKENS = 2048;
export function modelThinksByDefault(model: string): boolean {
  const id = model.replace(/^models\//, "");
  if (!/^gemini-\d+(\.\d+)*-flash/.test(id)) return false;
  const v = versionOf(id);
  return newer(v, [2, 4]) || (v[0] === 2 && (v[1] ?? 0) >= 5);
}
export function geminiGenerationConfig(model: string): Record<string, unknown> {
  return {
    maxOutputTokens: SPAIDBOT_MAX_OUTPUT_TOKENS,
    temperature: 0.7,
    ...(modelThinksByDefault(model) ? { thinkingConfig: { thinkingBudget: 0 } } : {}),
  };
}

let memo: { at: number; id: string } | null = null;
const TTL_MS = 6 * 3600_000;

export function forgetGeminiModel(): void {
  memo = null;
}

export async function resolveGeminiModel(key: string, fetchImpl: typeof fetch = fetch): Promise<string | null> {
  const pinned = process.env.GEMINI_MODEL?.trim();
  if (pinned) return pinned;
  if (memo && Date.now() - memo.at < TTL_MS) return memo.id;
  try {
    const res = await fetchImpl(`https://generativelanguage.googleapis.com/v1beta/models?pageSize=200&key=${encodeURIComponent(key)}`, { cache: "no-store" });
    if (!res.ok) return null;
    const body = (await res.json()) as { models?: GeminiModelInfo[] };
    const id = pickGeminiModel(body.models ?? []);
    if (id) memo = { at: Date.now(), id };
    return id;
  } catch {
    return null;
  }
}
