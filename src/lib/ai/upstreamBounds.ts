/**
 * SERVER-SIDE BOUNDS ON THE UPSTREAM MODEL CALL — Garden 18 §8 (2026-10-06).
 *
 * /api/spaidbot's fetch to the model had no bound of its own; only the
 * browser's 45 s idle cut-off ended a hung answer, and the server kept
 * reading (and paying for) a stream nobody was listening to. Three bounds,
 * none of which can cut a HEALTHY long answer:
 *
 *   (a) CLIENT GONE  — the upstream is aborted when the trader's request is
 *                      aborted (request.signal) or the response stream is
 *                      cancelled.
 *   (b) FIRST BYTE   — no upstream response headers within FIRST_BYTE_MS →
 *                      a named failure (504, "SpaidBot's model did not answer").
 *   (c) IDLE         — no chunk for IDLE_MS between chunks → a named failure.
 *                      Each chunk re-arms it; there is NO total cap.
 *
 * Pure apart from timers; `fetchImpl` is injected so tests never call a
 * provider.
 */

export const UPSTREAM_FIRST_BYTE_MS = 30_000;
export const UPSTREAM_IDLE_MS = 45_000;

export const MODEL_DID_NOT_ANSWER = "SpaidBot's model did not answer";
export const MODEL_STOPPED_ANSWERING = "SpaidBot's model stopped answering";

export class UpstreamTimeout extends Error {
  constructor(readonly phase: "FIRST_BYTE" | "IDLE", message: string) {
    super(message);
    this.name = "UpstreamTimeout";
  }
}

/** An AbortController that also aborts when `parent` does. */
export function linkedController(parent?: AbortSignal | null): AbortController {
  const c = new AbortController();
  if (parent) {
    if (parent.aborted) c.abort(parent.reason);
    else parent.addEventListener("abort", () => c.abort(parent.reason), { once: true });
  }
  return c;
}

type FetchLike = (url: string, init: RequestInit) => Promise<Response>;

/**
 * Fetch whose HEADERS must arrive within `firstByteMs`. The body is not
 * covered by this timer — a long healthy stream keeps going; the idle bound
 * below watches it instead. Rejects with UpstreamTimeout("FIRST_BYTE").
 */
export async function fetchWithFirstByteTimeout(
  fetchImpl: FetchLike,
  url: string,
  init: RequestInit,
  controller: AbortController,
  firstByteMs: number = UPSTREAM_FIRST_BYTE_MS,
): Promise<Response> {
  let timedOut = false;
  const timer = setTimeout(() => { timedOut = true; controller.abort(); }, firstByteMs);
  try {
    return await fetchImpl(url, { ...init, signal: controller.signal });
  } catch (err) {
    if (timedOut) throw new UpstreamTimeout("FIRST_BYTE", `${MODEL_DID_NOT_ANSWER} within ${Math.round(firstByteMs / 1000)}s.`);
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Read one chunk, or reject with UpstreamTimeout("IDLE") when none arrives
 * within `idleMs`. On timeout the reader is cancelled and the upstream aborted.
 */
export async function readWithIdleTimeout<T>(
  reader: ReadableStreamDefaultReader<T>,
  controller: AbortController,
  idleMs: number = UPSTREAM_IDLE_MS,
): Promise<ReadableStreamReadResult<T>> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const idle = new Promise<never>((_, reject) => {
    timer = setTimeout(() => {
      // Reject FIRST: cancelling the reader resolves the pending read as
      // `done`, and the race must report the timeout, not a clean end.
      reject(new UpstreamTimeout("IDLE", `${MODEL_STOPPED_ANSWERING} — no reply for ${Math.round(idleMs / 1000)}s.`));
      controller.abort();
      void reader.cancel().catch(() => {});
    }, idleMs);
  });
  try {
    return await Promise.race([reader.read(), idle]);
  } finally {
    clearTimeout(timer);
  }
}

type GeminiChunk = { candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }> };

/**
 * Relay the model's SSE stream to the client as `data: {text}` frames, under
 * the idle bound. A named error frame ends the stream on idle or failure; a
 * client that cancels (disconnects) aborts the upstream.
 */
export function relayModelStream(
  upstream: Response,
  upstreamCtl: AbortController,
  idleMs: number = UPSTREAM_IDLE_MS,
): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();
  let reader: ReadableStreamDefaultReader<Uint8Array> | null = null;
  return new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        reader = upstream.body!.getReader();
        const decoder = new TextDecoder();
        let buf = "";
        while (true) {
          const { done, value } = await readWithIdleTimeout(reader, upstreamCtl, idleMs);
          if (done) break;
          buf += decoder.decode(value, { stream: true });
          const lines = buf.split("\n");
          buf = lines.pop() ?? "";
          for (const line of lines) {
            const t = line.trim();
            if (!t || t === "data: [DONE]" || !t.startsWith("data: ")) continue;
            try {
              const chunk = JSON.parse(t.slice(6)) as GeminiChunk;
              const text = chunk.candidates?.[0]?.content?.parts?.[0]?.text;
              if (text) controller.enqueue(encoder.encode(`data: ${JSON.stringify({ text })}\n\n`));
            } catch { /* a malformed frame is skipped */ }
          }
        }
        controller.enqueue(encoder.encode("data: [DONE]\n\n"));
        controller.close();
      } catch (err) {
        if (upstreamCtl.signal.aborted && !(err instanceof UpstreamTimeout)) {
          // The client went away: there is nobody to tell.
          try { controller.close(); } catch { /* already closed */ }
          return;
        }
        const msg = err instanceof UpstreamTimeout ? err.message : String(err);
        try {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: msg })}\n\n`));
          controller.enqueue(encoder.encode("data: [DONE]\n\n"));
          controller.close();
        } catch { /* stream already cancelled */ }
      }
    },
    cancel() {
      // (a) The trader closed the panel / navigated away: stop the upstream.
      upstreamCtl.abort();
      void reader?.cancel().catch(() => {});
    },
  });
}
