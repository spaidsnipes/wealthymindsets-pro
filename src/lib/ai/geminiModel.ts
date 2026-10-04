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
