/**
 * Garden 18 §8 (2026-10-06) — server-side bounds on SpaidBot's upstream model
 * call. Fake fetch and fake streams only: no provider call, no key.
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  MODEL_DID_NOT_ANSWER, UPSTREAM_FIRST_BYTE_MS, UPSTREAM_IDLE_MS, UpstreamTimeout,
  fetchWithFirstByteTimeout, linkedController, relayModelStream,
} from "./upstreamBounds";
import { spaidbotFailureMessage } from "./spaidbotContext";

const enc = new TextEncoder();
const frame = (text: string) => enc.encode(`data: ${JSON.stringify({ candidates: [{ content: { parts: [{ text }] } }] })}\n`);

/** A fake fetch that never answers until its signal aborts. */
const hangingFetch = (_: string, init: RequestInit) => new Promise<Response>((_, reject) => {
  init.signal?.addEventListener("abort", () => reject(Object.assign(new Error("aborted"), { name: "AbortError" })));
});

/** A body whose chunks are pushed by the test. */
function manualBody() {
  let ctl!: ReadableStreamDefaultController<Uint8Array>;
  let cancelled = false;
  const body = new ReadableStream<Uint8Array>({ start(c) { ctl = c; }, cancel() { cancelled = true; } });
  return { body, push: (b: Uint8Array) => ctl.enqueue(b), end: () => ctl.close(), wasCancelled: () => cancelled };
}

async function drain(rs: ReadableStream<Uint8Array>): Promise<string> {
  const r = rs.getReader(); const dec = new TextDecoder(); let out = "";
  for (;;) { const { done, value } = await r.read(); if (done) return out; out += dec.decode(value); }
}

beforeEach(() => { vi.useFakeTimers(); });
afterEach(() => { vi.useRealTimers(); });

describe("(b) first-byte timeout", () => {
  it("no upstream headers within 30 s → named UpstreamTimeout, upstream aborted", async () => {
    const ctl = linkedController(null);
    const p = fetchWithFirstByteTimeout(hangingFetch, "https://fake", {}, ctl);
    const caught = p.catch(e => e);
    await vi.advanceTimersByTimeAsync(UPSTREAM_FIRST_BYTE_MS);
    const err = await caught;
    expect(err).toBeInstanceOf(UpstreamTimeout);
    expect((err as UpstreamTimeout).phase).toBe("FIRST_BYTE");
    expect((err as Error).message).toBe(`${MODEL_DID_NOT_ANSWER} within 30s.`);
    expect(ctl.signal.aborted).toBe(true);
  });
  it("headers that arrive in time clear the timer — the body is not under it", async () => {
    const ctl = linkedController(null);
    const res = await fetchWithFirstByteTimeout(async () => new Response("ok"), "https://fake", {}, ctl);
    await vi.advanceTimersByTimeAsync(UPSTREAM_FIRST_BYTE_MS * 3);
    expect(res.ok).toBe(true);
    expect(ctl.signal.aborted).toBe(false);
  });
});

describe("(c) idle-between-chunks, never a total cap", () => {
  it("a healthy long answer — a chunk every 40 s for 5 minutes — is never cut", async () => {
    const m = manualBody();
    const ctl = linkedController(null);
    const out = drain(relayModelStream(new Response(m.body), ctl));
    for (let i = 0; i < 8; i++) { m.push(frame(`part${i} `)); await vi.advanceTimersByTimeAsync(40_000); }
    m.end();
    const text = await out;
    expect(text).toContain("part0");
    expect(text).toContain("part7");
    expect(text).not.toContain("error");
    expect(text.trim().endsWith("data: [DONE]")).toBe(true);
    expect(ctl.signal.aborted).toBe(false);
  });
  it("45 s with no chunk ends the stream with a named error frame and aborts the upstream", async () => {
    const m = manualBody();
    const ctl = linkedController(null);
    const out = drain(relayModelStream(new Response(m.body), ctl));
    m.push(frame("first "));
    await vi.advanceTimersByTimeAsync(UPSTREAM_IDLE_MS + 1);
    const text = await out;
    expect(text).toContain("first");
    expect(text).toContain("SpaidBot's model stopped answering — no reply for 45s.");
    expect(ctl.signal.aborted).toBe(true);
    expect(spaidbotFailureMessage(text, false)).toMatch(/model did not answer in time/);
  });
});

describe("(a) client gone → upstream aborted", () => {
  it("the trader's request aborting aborts the linked upstream controller", () => {
    const req = new AbortController();
    const up = linkedController(req.signal);
    req.abort();
    expect(up.signal.aborted).toBe(true);
  });
  it("cancelling the relayed stream (client disconnect) aborts the upstream and cancels its body", async () => {
    const m = manualBody();
    const ctl = linkedController(null);
    const rs = relayModelStream(new Response(m.body), ctl);
    const r = rs.getReader();
    m.push(frame("x"));
    await r.read();
    await r.cancel();
    await vi.advanceTimersByTimeAsync(0);
    expect(ctl.signal.aborted).toBe(true);
  });
});

describe("the route is wired to the bounds", () => {
  const route = readFileSync(path.resolve(__dirname, "../../app/api/spaidbot/route.ts"), "utf8");
  it("links the upstream to req.signal, bounds first byte, relays under the idle bound, answers 504 by name", () => {
    expect(route).toContain("upstreamCtl = linkedController(req.signal);");
    expect(route).toContain("fetchWithFirstByteTimeout(fetch, streamUrl(model)");
    expect(route).toContain("relayModelStream(geminiRes, upstreamCtl)");
    expect(route).toContain("status: 504");
    expect(route).toContain("`${MODEL_DID_NOT_ANSWER}.`");
  });
  it("no total cap on the stream", () => {
    expect(route).not.toMatch(/AbortSignal\.timeout\(/);
  });
});
