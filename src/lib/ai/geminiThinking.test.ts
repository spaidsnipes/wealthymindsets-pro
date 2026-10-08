/**
 * SpaidBot answers in time and in full (serving dae44b0, FVG Ask proof): the
 * thinking flash model reached first byte at 29.85 s against the 30 s bound and
 * the 1024-token budget cut the answer after one sentence.
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

import { geminiGenerationConfig, modelThinksByDefault, SPAIDBOT_MAX_OUTPUT_TOKENS } from "./geminiModel";
import { ANSWER_CUT_NOTE, answerStoppedNote, relayModelStream } from "./upstreamBounds";

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
});
