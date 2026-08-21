import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { athosComplete, athosHealth, athosConfiguredCount, ATHOS_DEFAULT_PROVIDER } from "./athosGateway";
import { getAIAdapter, hasAIAdapter, listAIAdapters } from "./adapters";
import type { AICompletionIntent, AIProviderId } from "./AIAdapter";

const SECRET = "GATEWAY_TEST_SECRET_xyz";

function intent(over: Partial<AICompletionIntent> = {}): AICompletionIntent {
  return { clientRequestId: "g-1", messages: [{ role: "user", content: "hi" }], ...over };
}

let saved: string | undefined;
beforeEach(() => { saved = process.env.GEMINI_API_KEY; });
afterEach(() => {
  if (saved === undefined) delete process.env.GEMINI_API_KEY;
  else process.env.GEMINI_API_KEY = saved;
});

describe("ai adapter registry", () => {
  it("resolves the shipped gemini adapter", () => {
    expect(hasAIAdapter("gemini")).toBe(true);
    expect(getAIAdapter("gemini")?.id).toBe("gemini");
    expect(listAIAdapters().length).toBeGreaterThan(0);
  });

  it("returns null (honest absence) for an unshipped provider — no fabricated default", () => {
    expect(getAIAdapter("openrouter" as AIProviderId)).toBeNull();
    expect(hasAIAdapter("openrouter" as AIProviderId)).toBe(false);
  });
});

describe("athosComplete", () => {
  it("defaults to gemini", () => {
    expect(ATHOS_DEFAULT_PROVIDER).toBe("gemini");
  });

  it("routes through the adapter and returns unconfigured when no key (no throw)", async () => {
    delete process.env.GEMINI_API_KEY;
    const r = await athosComplete(intent());
    expect(r.provider).toBe("gemini");
    expect(r.status).toBe("unconfigured");
  });

  it("routes with injected fetch and returns ok", async () => {
    process.env.GEMINI_API_KEY = SECRET;
    const fetchImpl = (async () =>
      new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text: "routed" }] } }] }), { status: 200 })
    ) as unknown as typeof fetch;
    const r = await athosComplete(intent(), "gemini", { fetchImpl });
    expect(r.status).toBe("ok");
    expect(r.text).toBe("routed");
  });

  it("unshipped provider → honest unconfigured result, never throws", async () => {
    const r = await athosComplete(intent(), "anthropic");
    expect(r.status).toBe("unconfigured");
    expect(r.provider).toBe("anthropic");
    expect(r.reason).toMatch(/no ATHOS adapter registered/i);
  });
});

describe("athosHealth / athosConfiguredCount", () => {
  it("reports one health row per registered provider, no secret leak", () => {
    process.env.GEMINI_API_KEY = SECRET;
    const rows = athosHealth();
    expect(rows.length).toBe(listAIAdapters().length);
    expect(rows.some((r) => r.provider === "gemini")).toBe(true);
    expect(JSON.stringify(rows)).not.toContain(SECRET);
  });

  it("configured count reflects env presence", () => {
    process.env.GEMINI_API_KEY = SECRET;
    expect(athosConfiguredCount().configured).toBeGreaterThanOrEqual(1);
    delete process.env.GEMINI_API_KEY;
    expect(athosConfiguredCount().configured).toBe(0);
  });
});
