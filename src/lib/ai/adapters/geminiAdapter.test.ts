import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  geminiAdapter,
  toGeminiBody,
  extractGeminiText,
} from "./geminiAdapter";
import type { AICompletionIntent } from "../AIAdapter";

const SECRET = "TEST_GEMINI_SECRET_do_not_leak_123";

function intent(over: Partial<AICompletionIntent> = {}): AICompletionIntent {
  return {
    clientRequestId: "req-1",
    messages: [{ role: "user", content: "hello" }],
    ...over,
  };
}

let saved: string | undefined;
beforeEach(() => { saved = process.env.GEMINI_API_KEY; });
afterEach(() => {
  if (saved === undefined) delete process.env.GEMINI_API_KEY;
  else process.env.GEMINI_API_KEY = saved;
});

describe("geminiAdapter.health", () => {
  it("reports envConfigured false when key absent, never leaks value", () => {
    delete process.env.GEMINI_API_KEY;
    const h = geminiAdapter.health();
    expect(h.implemented).toBe(true);
    expect(h.envConfigured).toBe(false);
    expect(h.connected).toBe(false);
    expect(JSON.stringify(h)).not.toContain(SECRET);
  });

  it("reports envConfigured true when key present, still no value leak", () => {
    process.env.GEMINI_API_KEY = SECRET;
    const h = geminiAdapter.health();
    expect(h.envConfigured).toBe(true);
    expect(JSON.stringify(h)).not.toContain(SECRET);
  });
});

describe("geminiAdapter.complete — honest states", () => {
  it("rejected when there is no non-empty user/assistant message", async () => {
    process.env.GEMINI_API_KEY = SECRET;
    const r = await geminiAdapter.complete(intent({ messages: [{ role: "system", content: "sys" }] }));
    expect(r.status).toBe("rejected");
    expect(r.text).toBeNull();
    expect(r.clientRequestId).toBe("req-1");
  });

  it("unconfigured (not error, not thrown) when key absent — no upstream call", async () => {
    delete process.env.GEMINI_API_KEY;
    let called = false;
    const fetchImpl = (async () => { called = true; return new Response("{}"); }) as unknown as typeof fetch;
    const r = await geminiAdapter.complete(intent(), { fetchImpl });
    expect(r.status).toBe("unconfigured");
    expect(called).toBe(false); // never contacted upstream
    expect(r.provider).toBe("gemini");
  });

  it("ok with extracted text when the provider returns a valid completion", async () => {
    process.env.GEMINI_API_KEY = SECRET;
    const fetchImpl = (async () =>
      new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text: "world" }] } }] }), { status: 200 })
    ) as unknown as typeof fetch;
    const r = await geminiAdapter.complete(intent(), { fetchImpl });
    expect(r.status).toBe("ok");
    expect(r.text).toBe("world");
    expect(r.model).toBe("gemini-2.0-flash");
  });

  it("never leaks the API key into the result on success", async () => {
    process.env.GEMINI_API_KEY = SECRET;
    const fetchImpl = (async () =>
      new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text: "ok" }] } }] }), { status: 200 })
    ) as unknown as typeof fetch;
    const r = await geminiAdapter.complete(intent(), { fetchImpl });
    expect(JSON.stringify(r)).not.toContain(SECRET);
  });

  it("error with the provider message on a non-ok response", async () => {
    process.env.GEMINI_API_KEY = SECRET;
    const fetchImpl = (async () =>
      new Response(JSON.stringify({ error: { message: "quota exceeded" } }), { status: 429 })
    ) as unknown as typeof fetch;
    const r = await geminiAdapter.complete(intent(), { fetchImpl });
    expect(r.status).toBe("error");
    expect(r.reason).toBe("quota exceeded");
  });

  it("error (not thrown) when the transport throws", async () => {
    process.env.GEMINI_API_KEY = SECRET;
    const fetchImpl = (async () => { throw new Error("network down"); }) as unknown as typeof fetch;
    const r = await geminiAdapter.complete(intent(), { fetchImpl });
    expect(r.status).toBe("error");
    expect(r.reason).toBe("network down");
  });

  it("error when the provider returns no usable text", async () => {
    process.env.GEMINI_API_KEY = SECRET;
    const fetchImpl = (async () =>
      new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text: "" }] } }] }), { status: 200 })
    ) as unknown as typeof fetch;
    const r = await geminiAdapter.complete(intent(), { fetchImpl });
    expect(r.status).toBe("error");
    expect(r.reason).toMatch(/no usable completion/i);
  });
});

describe("toGeminiBody", () => {
  it("splits system messages into system_instruction, maps assistant→model", () => {
    const body = toGeminiBody(intent({
      messages: [
        { role: "system", content: "be terse" },
        { role: "user", content: "hi" },
        { role: "assistant", content: "hello" },
        { role: "user", content: "more" },
      ],
    }));
    expect(body.system_instruction?.parts[0].text).toBe("be terse");
    expect(body.contents).toHaveLength(3);
    expect(body.contents[1].role).toBe("model"); // assistant mapped
    expect(body.contents.every((c) => c.role !== "system")).toBe(true);
  });

  it("omits system_instruction when there is no system message", () => {
    const body = toGeminiBody(intent());
    expect(body.system_instruction).toBeUndefined();
    expect(body.generationConfig.maxOutputTokens).toBe(1024);
  });

  it("honors explicit maxOutputTokens/temperature", () => {
    const body = toGeminiBody(intent({ maxOutputTokens: 256, temperature: 0.1 }));
    expect(body.generationConfig).toEqual({ maxOutputTokens: 256, temperature: 0.1 });
  });
});

describe("extractGeminiText", () => {
  it("returns joined non-empty text or null", () => {
    expect(extractGeminiText({ candidates: [{ content: { parts: [{ text: "a" }, { text: "b" }] } }] })).toBe("ab");
    expect(extractGeminiText({ candidates: [] })).toBeNull();
    expect(extractGeminiText(null)).toBeNull();
    expect(extractGeminiText({ candidates: [{ content: { parts: [{ text: "  " }] } }] })).toBeNull();
  });
});
