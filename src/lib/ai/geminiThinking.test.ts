/**
 * SpaidBot answers in time and in full (serving dae44b0, FVG Ask proof): the
 * thinking flash model reached first byte at 29.85 s against the 30 s bound and
 * the 1024-token budget cut the answer after one sentence.
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

import { geminiGenerationConfig, modelThinksByDefault, SPAIDBOT_MAX_OUTPUT_TOKENS } from "./geminiModel";
import { ANSWER_CUT_NOTE, answerStoppedNote, linkUntilHeaders, relayModelStream } from "./upstreamBounds";

describe("SpaidBot generation config — thinking off, room to answer", () => {
  it("gemini-2.5+ flash thinks by default; 2.0 flash does not", () => {
    expect(modelThinksByDefault("gemini-2.5-flash")).toBe(true);
    expect(modelThinksByDefault("models/gemini-3.0-flash")).toBe(true);
    expect(modelThinksByDefault("gemini-2.0-flash")).toBe(false);
    expect(modelThinksByDefault("gemini-2.5-pro")).toBe(false);
  });

  it("thinking budget 0 where it thinks by default; never sent to a model without the switch", () => {
    expect(geminiGenerationConfig("gemini-2.5-flash")).toEqual({ maxOutputTokens: SPAIDBOT_MAX_OUTPUT_TOKENS, temperature: 0.7, thinkingConfig: { thinkingBudget: 0 } });
    expect(geminiGenerationConfig("gemini-2.0-flash")).toEqual({ maxOutputTokens: SPAIDBOT_MAX_OUTPUT_TOKENS, temperature: 0.7 });
    expect(SPAIDBOT_MAX_OUTPUT_TOKENS).toBe(2048);
  });

  it("the route builds its config per resolved model", () => {
    const route = readFileSync(path.resolve(__dirname, "../../app/api/spaidbot/route.ts"), "utf8");
    expect(route.length).toBeGreaterThan(1000);
    expect(route).toContain("generationConfig: geminiGenerationConfig(model)");
    expect(route).toContain("body: payloadFor(model)");
    expect(route).not.toMatch(/maxOutputTokens: 1024/);
  });

  it("an answer cut at the length limit says so (never silently)", async () => {
    const upstream = new Response(
      'data: {"candidates":[{"content":{"parts":[{"text":"Here is the breakdown"}]}}]}\n\n'
      + 'data: {"candidates":[{"content":{"parts":[{"text":" of the gap"}]},"finishReason":"MAX_TOKENS"}]}\n\n',
      { status: 200 },
    );
    const out = await new Response(relayModelStream(upstream, new AbortController())).text();
    expect(out).toContain('"text":"Here is the breakdown"');
    expect(out).toContain(JSON.stringify({ text: ANSWER_CUT_NOTE }).slice(1, -1));
    expect(out.trim().endsWith("data: [DONE]")).toBe(true);
  });

  it("an answer stopped for any other reason names the model's reason; every text part is relayed", async () => {
    const upstream = new Response(
      'data: {"candidates":[{"content":{"parts":[{"text":"Here is"},{"text":" the breakdown"}]}}]}\n\n'
      + 'data: {"candidates":[{"content":{"parts":[{"text":" of the gap"}]},"finishReason":"RECITATION"}]}\n\n',
      { status: 200 },
    );
    const out = await new Response(relayModelStream(upstream, new AbortController())).text();
    expect(out).toContain('"text":"Here is the breakdown"');
    expect(out).toContain("the model's reason: RECITATION");
    expect(answerStoppedNote("SAFETY<script>")).toContain("reason: SAFETYscript.");
    const clean = new Response('data: {"candidates":[{"content":{"parts":[{"text":"Done."}]},"finishReason":"STOP"}]}\n\n', { status: 200 });
    expect(await new Response(relayModelStream(clean, new AbortController())).text()).not.toContain("stopped early");
  });

  it("the relay closes with a meta receipt (finish reason, chunks, chars, tokens) the panel ignores; a last event without a newline is read", async () => {
    const upstream = new Response(
      'data: {"candidates":[{"content":{"parts":[{"text":"Part one"}]}}]}\n\n'
      + 'data: {"candidates":[{"content":{"parts":[{"text":" and two."}]},"finishReason":"STOP"}],"usageMetadata":{"candidatesTokenCount":7}}',
      { status: 200 },
    );
    const out = await new Response(relayModelStream(upstream, new AbortController())).text();
    expect(out).toContain('"text":" and two."');
    const meta = JSON.parse(out.split("\n").find(l => l.startsWith('data: {"meta"'))!.slice(6)).meta;
    expect(meta).toEqual({ finishReason: "STOP", blockReason: null, chunks: 2, chars: 17, candidatesTokens: 7, endedWithoutFinish: false, upstreamAborted: false });
    const cut = new Response('data: {"candidates":[{"content":{"parts":[{"text":"Half"}]}}]}\n\n', { status: 200 });
    const m2 = JSON.parse((await new Response(relayModelStream(cut, new AbortController())).text()).split("\n").find(l => l.startsWith('data: {"meta"'))!.slice(6)).meta;
    expect(m2.endedWithoutFinish).toBe(true);
    // The panel reads only text / error — a meta frame adds nothing to the chat.
    const bot = readFileSync(path.resolve(__dirname, "../../components/layout/SpaidBotButton.tsx"), "utf8");
    expect(bot).toContain("const { text: t, error } = frame;");
  });

  it("the client's abort reaches the upstream only until the headers arrive", () => {
    const client = new AbortController();
    const a = linkUntilHeaders(client.signal);
    a.release(); // headers arrived
    client.abort();
    expect(a.controller.signal.aborted).toBe(false);
    const client2 = new AbortController();
    const b = linkUntilHeaders(client2.signal);
    client2.abort(); // trader left while waiting
    expect(b.controller.signal.aborted).toBe(true);
    const route = readFileSync(path.resolve(__dirname, "../../app/api/spaidbot/route.ts"), "utf8");
    expect(route).toContain("const link = linkUntilHeaders(req.signal);");
    expect(route).toContain("link.release();");
    expect(route).not.toMatch(/linkedController\(req\.signal\)/);
  });

  it("a stream OUR controller cut is said, never read as a finished answer", async () => {
    const ctl = new AbortController();
    const body = new ReadableStream<Uint8Array>({
      start(c) {
        c.enqueue(new TextEncoder().encode('data: {"candidates":[{"content":{"parts":[{"text":"Here is"}]}}]}\n\n'));
        ctl.abort();
        c.close();
      },
    });
    const out = await new Response(relayModelStream(new Response(body), ctl)).text();
    expect(out).toContain("CUT_BY_SERVER");
    expect(out).toContain('"upstreamAborted":true');
  });
});
