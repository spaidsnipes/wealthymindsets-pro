/**
 * SpaidBot first-byte resilience (2026-10-07: 1 in 6 Sends waited past 30 s),
 * end to end through the real route with fake timers. The main model gets
 * PRIMARY_FIRST_BYTE_MS; ONE retry on the lighter configured Gemini model gets
 * what is left of the same 30 s; no lighter model → the main model keeps the
 * whole 30 s; a trader's cancel aborts and is never retried for. The prompt and
 * fact block are the same bytes on both attempts. Model never called.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { pickGeminiLightModel } from "@/lib/ai/geminiModel";
import { MIN_RETRY_FIRST_BYTE_MS, PRIMARY_FIRST_BYTE_MS, UPSTREAM_FIRST_BYTE_MS } from "@/lib/ai/upstreamBounds";

vi.mock("@/lib/requireAuth", () => ({ requireAuth: async () => ({ ok: true, user: { sub: "test-user" } }) }));
vi.mock("@/lib/rateLimit", () => ({ checkRateLimit: () => ({ ok: true }) }));
vi.mock("@/lib/edgeRateLimit", () => ({ edgeAllows: async () => true, tooManyRequests: () => new Response("", { status: 429 }), SPAIDBOT_LIMITER_BINDING: "X" }));
vi.mock("@/lib/ai/geminiModel", async (orig) => ({ ...(await orig<typeof import("@/lib/ai/geminiModel")>()), resolveGeminiModel: async () => "gemini-2.5-flash", forgetGeminiModel: () => {} }));

const SSE = 'data: {"candidates":[{"content":{"parts":[{"text":"ok"}]},"finishReason":"STOP"}]}\n\n';
type Call = { url: string; body: string; signal: AbortSignal; at: number };
let calls: Call[] = [];
/** Per model: how the upstream behaves. "hang" = no headers until aborted. */
let behaviour: Record<string, "hang" | "answer"> = {};

beforeEach(() => {
  vi.useFakeTimers();
  calls = [];
  behaviour = {};
  process.env.GEMINI_API_KEY = "test-key";
  vi.stubGlobal("fetch", vi.fn((url: string, init?: RequestInit) => {
    const signal = init!.signal as AbortSignal;
    calls.push({ url, body: String(init?.body ?? ""), signal, at: Date.now() });
    const model = /models\/([^:]+):/.exec(url)?.[1] ?? "";
    if (behaviour[model] === "answer") return Promise.resolve(new Response(SSE, { status: 200 }));
    return new Promise<Response>((_, reject) => signal.addEventListener("abort", () => reject(new DOMException("aborted", "AbortError")), { once: true }));
  }));
});
afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); vi.resetModules(); delete process.env.GEMINI_LIGHT_MODEL; });

function post(signal?: AbortSignal) {
  return import("./route").then(({ POST }) => POST(new Request("https://wm.test/api/spaidbot", {
    method: "POST", headers: { "Content-Type": "application/json" }, signal,
    body: JSON.stringify({ messages: [{ role: "user", content: "What am I looking at?" }], context: { symbol: "NQ1!", timeframe: "5m" } }),
  }) as never));
}

describe("the lighter model is read from the same list — Gemini only", () => {
  it("newest stable gemini-X-flash-lite that can stream; never a preview, a pro, or another provider", () => {
    expect(pickGeminiLightModel([
      { name: "models/gemini-2.0-flash-lite", supportedGenerationMethods: ["generateContent"] },
      { name: "models/gemini-2.5-flash-lite", supportedGenerationMethods: ["streamGenerateContent"] },
      { name: "models/gemini-3.0-flash-lite-preview", supportedGenerationMethods: ["streamGenerateContent"] },
      { name: "models/gemini-2.5-flash", supportedGenerationMethods: ["streamGenerateContent"] },
      { name: "models/gemini-9-pro", supportedGenerationMethods: ["streamGenerateContent"] },
    ])).toBe("gemini-2.5-flash-lite");
    expect(pickGeminiLightModel([{ name: "models/gemini-2.5-flash", supportedGenerationMethods: ["streamGenerateContent"] }])).toBeNull();
  });
});

describe("first-byte resilience through the route", () => {
  it("normal path: the main model answers → one call, labelled PRIMARY", async () => {
    process.env.GEMINI_LIGHT_MODEL = "gemini-2.5-flash-lite";
    behaviour["gemini-2.5-flash"] = "answer";
    const res = await post();
    const out = await res.text();
    expect(res.status).toBe(200);
    expect(calls).toHaveLength(1);
    expect(out).toContain('"answeredBy":"PRIMARY"');
    expect(out).toContain('"model":"gemini-2.5-flash"');
  });

  it("main model silent past its share → ONE retry on the lighter model, same request bytes, within the same 30 s; labelled LIGHTER", async () => {
    process.env.GEMINI_LIGHT_MODEL = "gemini-2.5-flash-lite";
    behaviour["gemini-2.5-flash"] = "hang";
    behaviour["gemini-2.5-flash-lite"] = "answer";
    const pending = post();
    await vi.advanceTimersByTimeAsync(PRIMARY_FIRST_BYTE_MS + 10);
    const res = await pending;
    const out = await res.text();
    expect(res.status).toBe(200);
    expect(calls).toHaveLength(2);
    expect(calls[0].url).toContain("models/gemini-2.5-flash:");
    expect(calls[1].url).toContain("models/gemini-2.5-flash-lite:");
    expect(calls[0].signal.aborted).toBe(true);
    expect(calls[1].body).toBe(calls[0].body); // no change to the system prompt or fact block
    expect(calls[1].at - calls[0].at).toBeGreaterThanOrEqual(PRIMARY_FIRST_BYTE_MS);
    expect(out).toContain('"answeredBy":"LIGHTER"');
    expect(out).toContain('"model":"gemini-2.5-flash-lite"');
  });

  it("both silent → 504 at the same 30 s total, never later, and only two calls", async () => {
    process.env.GEMINI_LIGHT_MODEL = "gemini-2.5-flash-lite";
    let settled = false;
    const pending = post().then(r => { settled = true; return r; });
    await vi.advanceTimersByTimeAsync(UPSTREAM_FIRST_BYTE_MS - 50);
    expect(settled).toBe(false);
    await vi.advanceTimersByTimeAsync(100);
    const res = await pending;
    expect(res.status).toBe(504);
    expect(calls).toHaveLength(2);
    expect(calls.every(c => c.signal.aborted)).toBe(true);
  });

  it("no lighter model configured → no retry; the main model keeps the whole 30 s", async () => {
    let settled = false;
    const pending = post().then(r => { settled = true; return r; });
    await vi.advanceTimersByTimeAsync(PRIMARY_FIRST_BYTE_MS + 1000);
    expect(settled).toBe(false);
    expect(calls).toHaveLength(1);
    await vi.advanceTimersByTimeAsync(UPSTREAM_FIRST_BYTE_MS);
    const res = await pending;
    expect(res.status).toBe(504);
    expect(calls).toHaveLength(1);
  });

  it("a pinned lighter model that is not Gemini (or is the main model) is never used", async () => {
    process.env.GEMINI_LIGHT_MODEL = "gpt-4o-mini";
    const { lightGeminiModelFor } = await import("@/lib/ai/geminiModel");
    expect(lightGeminiModelFor("gemini-2.5-flash")).toBeNull();
    process.env.GEMINI_LIGHT_MODEL = "gemini-2.5-flash";
    expect(lightGeminiModelFor("gemini-2.5-flash")).toBeNull();
  });

  it("a trader's cancel during the first attempt aborts the upstream and is never retried", async () => {
    process.env.GEMINI_LIGHT_MODEL = "gemini-2.5-flash-lite";
    behaviour["gemini-2.5-flash-lite"] = "answer";
    const cancel = new AbortController();
    const pending = post(cancel.signal).catch(e => e);
    await vi.advanceTimersByTimeAsync(2_000);
    cancel.abort();
    await vi.advanceTimersByTimeAsync(UPSTREAM_FIRST_BYTE_MS);
    await pending;
    expect(calls).toHaveLength(1);
    expect(calls[0].signal.aborted).toBe(true);
  });

  it("the retry is skipped when less than MIN_RETRY_FIRST_BYTE_MS would be left", () => {
    expect(UPSTREAM_FIRST_BYTE_MS - PRIMARY_FIRST_BYTE_MS).toBeGreaterThanOrEqual(MIN_RETRY_FIRST_BYTE_MS);
    expect(PRIMARY_FIRST_BYTE_MS).toBeLessThan(UPSTREAM_FIRST_BYTE_MS);
  });
});
