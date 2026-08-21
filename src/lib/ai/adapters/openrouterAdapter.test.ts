import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  openrouterAdapter,
  toOpenRouterBody,
  extractOpenRouterText,
} from "./openrouterAdapter";
import type { AICompletionIntent } from "../AIAdapter";

const SECRET = "OPENROUTER_TEST_SECRET_do_not_leak";

function intent(over: Partial<AICompletionIntent> = {}): AICompletionIntent {
  return { clientRequestId: "or-1", messages: [{ role: "user", content: "hi" }], ...over };
}

let saved: string | undefined;
beforeEach(() => { saved = process.env.OPENROUTER_API_KEY; });
afterEach(() => {
  if (saved === undefined) delete process.env.OPENROUTER_API_KEY;
  else process.env.OPENROUTER_API_KEY = saved;
});

describe("openrouterAdapter.health", () => {
  it("envConfigured false when key absent, no value leak", () => {
    delete process.env.OPENROUTER_API_KEY;
    const h = openrouterAdapter.health();
    expect(h.implemented).toBe(true);
    expect(h.envConfigured).toBe(false);
    expect(JSON.stringify(h)).not.toContain(SECRET);
  });
  it("envConfigured true when key present", () => {
    process.env.OPENROUTER_API_KEY = SECRET;
    expect(openrouterAdapter.health().envConfigured).toBe(true);
  });
});

describe("openrouterAdapter.complete — honest states", () => {
  it("rejected when no non-empty user/assistant message", async () => {
    process.env.OPENROUTER_API_KEY = SECRET;
    const r = await openrouterAdapter.complete(intent({ messages: [{ role: "system", content: "s" }] }));
    expect(r.status).toBe("rejected");
  });

  it("unconfigured (no upstream call) when key absent", async () => {
    delete process.env.OPENROUTER_API_KEY;
    let called = false;
    const fetchImpl = (async () => { called = true; return new Response("{}"); }) as unknown as typeof fetch;
    const r = await openrouterAdapter.complete(intent(), { fetchImpl });
    expect(r.status).toBe("unconfigured");
    expect(called).toBe(false);
    expect(r.provider).toBe("openrouter");
  });

  it("ok with extracted text; never leaks the bearer key", async () => {
    process.env.OPENROUTER_API_KEY = SECRET;
    let sentAuth = "";
    const fetchImpl = (async (_url: string, init: RequestInit) => {
      sentAuth = (init.headers as Record<string, string>).Authorization;
      return new Response(JSON.stringify({ choices: [{ message: { content: "hey" } }] }), { status: 200 });
    }) as unknown as typeof fetch;
    const r = await openrouterAdapter.complete(intent(), { fetchImpl });
    expect(r.status).toBe("ok");
    expect(r.text).toBe("hey");
    expect(sentAuth).toContain(SECRET);            // key used in request
    expect(JSON.stringify(r)).not.toContain(SECRET); // never in the result
  });

  it("error with provider message on non-ok", async () => {
    process.env.OPENROUTER_API_KEY = SECRET;
    const fetchImpl = (async () =>
      new Response(JSON.stringify({ error: { message: "no credits" } }), { status: 402 })
    ) as unknown as typeof fetch;
    const r = await openrouterAdapter.complete(intent(), { fetchImpl });
    expect(r.status).toBe("error");
    expect(r.reason).toBe("no credits");
  });

  it("error (not thrown) on transport failure", async () => {
    process.env.OPENROUTER_API_KEY = SECRET;
    const fetchImpl = (async () => { throw new Error("dns fail"); }) as unknown as typeof fetch;
    const r = await openrouterAdapter.complete(intent(), { fetchImpl });
    expect(r.status).toBe("error");
    expect(r.reason).toBe("dns fail");
  });
});

describe("toOpenRouterBody / extractOpenRouterText", () => {
  it("keeps system as a role (OpenAI-compatible) and honors overrides", () => {
    const body = toOpenRouterBody(intent({
      messages: [{ role: "system", content: "s" }, { role: "user", content: "u" }],
      model: "anthropic/claude-3.5-sonnet",
      maxOutputTokens: 42,
      temperature: 0.2,
    }));
    expect(body.model).toBe("anthropic/claude-3.5-sonnet");
    expect(body.messages[0]).toEqual({ role: "system", content: "s" });
    expect(body.max_tokens).toBe(42);
    expect(body.temperature).toBe(0.2);
  });

  it("extracts choices[0].message.content or null", () => {
    expect(extractOpenRouterText({ choices: [{ message: { content: "x" } }] })).toBe("x");
    expect(extractOpenRouterText({ choices: [] })).toBeNull();
    expect(extractOpenRouterText(null)).toBeNull();
    expect(extractOpenRouterText({ choices: [{ message: { content: "  " } }] })).toBeNull();
  });
});
