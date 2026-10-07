/**
 * SpaidBot × FVG, end to end through the real route (Garden 19 §23–§24, §30).
 *
 *   engine object → spaidbotFvgScene (what ChartsDashboard puts in #wm-chart-context)
 *   → the panel's context (contextWithAsk, as SpaidBotButton.getContext builds it)
 *   → POST /api/spaidbot → the request the route sends to the model
 *
 * The model is never called: auth, rate limits and the model resolver are
 * stubbed, and global fetch captures the upstream request body.
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { CanonicalBar } from "@/lib/marketData/canonicalBar";
import { detectFvgs } from "@/lib/marketData/fvg/fvgEngine";
import { spaidbotFvgScene } from "@/lib/ai/spaidbotFvgFacts";
import { contextWithAsk, fvgInspectAsk } from "@/lib/ai/spaidbotAsk";

vi.mock("@/lib/requireAuth", () => ({ requireAuth: async () => ({ ok: true, user: { sub: "test-user" } }) }));
vi.mock("@/lib/rateLimit", () => ({ checkRateLimit: () => ({ ok: true }) }));
vi.mock("@/lib/edgeRateLimit", () => ({ edgeAllows: async () => true, tooManyRequests: () => new Response("", { status: 429 }), SPAIDBOT_LIMITER_BINDING: "X" }));
vi.mock("@/lib/ai/geminiModel", () => ({ resolveGeminiModel: async () => "test-model", forgetGeminiModel: () => {} }));

type Row = readonly [number, number, number, number];
const MIN = 60_000;
const T0 = Date.UTC(2026, 9, 6, 10, 0, 0);
const SYM = "NQ1!";
const bars: CanonicalBar[] = ([...Array.from({ length: 15 }, () => [100, 101, 99, 100] as Row),
  [100, 101, 99, 100.5], [100.5, 104, 100.3, 103.8], [103.8, 105, 102, 104.5], [104.5, 105, 103.5, 104.5], [104, 104.2, 101.6, 102.6], [104.5, 105, 103.5, 104.5]] as Row[])
  .map(([o, h, l, c], i) => ({
    barId: `${SYM}|1m|${T0 + i * MIN}|e0`, symbolId: SYM, sessionId: "SESSION_CONTINUOUS", timeframe: "1m",
    open: o, high: h, low: l, close: c, volume: 1, asOf: T0 + i * MIN, receivedAt: 0,
    fidelity: "INDICATIVE", source: "f", provenance: "REST_BACKFILL", truthEpoch: 0,
  }));
const ledger = detectFvgs(bars, { symbolId: SYM, timeframe: "1m", tickSize: 0.25 });
const obj = ledger.objects[0];

let upstream: string[] = [];
beforeEach(() => {
  upstream = [];
  process.env.GEMINI_API_KEY = "test-key";
  vi.stubGlobal("fetch", vi.fn(async (_url: string, init?: RequestInit) => {
    upstream.push(String(init?.body ?? ""));
    return new Response('data: {"candidates":[{"content":{"parts":[{"text":"ok"}]}}]}\n\n', { status: 200, headers: { "Content-Type": "text/event-stream" } });
  }));
});
afterEach(() => { vi.unstubAllGlobals(); vi.resetModules(); });

async function postToRoute(context: Record<string, unknown>): Promise<string> {
  const { POST } = await import("./route");
  const req = new Request("https://wm.test/api/spaidbot", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ messages: [{ role: "user", content: "What am I looking at?" }], context }),
  });
  const res = await POST(req as never);
  await res.text().catch(() => "");
  expect(upstream).toHaveLength(1);
  const sent = JSON.parse(upstream[0]) as { system_instruction: { parts: { text: string }[] }; contents: { parts: { text: string }[] }[] };
  return `${sent.system_instruction.parts[0].text}\n----\n${sent.contents[sent.contents.length - 1].parts[0].text}`;
}

describe("SpaidBot × FVG — the request the model receives", () => {
  it("a SELECTED gap: fact block with as-of time, state, definition id/version — no fill or probability words", async () => {
    const chartCtx = { symbol: SYM, timeframe: "1m", fvg: spaidbotFvgScene({ objects: [obj], selectedObjectId: obj.objectId, priceDp: 2 }) };
    const sent = await postToRoute(contextWithAsk(chartCtx, null));
    const [system, turn] = sent.split("\n----\n");
    expect(system).toContain("Never say price has to fill an imbalance; distinguish observed fact, derived measurement, inference and hypothesis.");
    expect(turn.startsWith("What am I looking at?")).toBe(true);
    expect(turn).toContain(`SELECTED ${obj.objectId} — definition FVG_3C v1.`);
    expect(turn).toContain(`latest lifecycle state ${obj.state}`);
    expect(turn).toMatch(/LIMITATIONS: read as of 2026-10-06T\d\d:\d\dZ/);
    expect(turn).toContain(new Date(obj.asOf).toISOString().slice(0, 16) + "Z");
    expect(turn).toContain("OBSERVED FACT:");
    expect(turn).toContain("DERIVED MEASUREMENT:");
    expect(turn).toContain("boundaries 101.00–102.00");
    expect(turn).not.toMatch(/\bmust fill\b|\bwill fill\b|\bhas to fill\b|probabilit|\blikely\b|\bchance\b|\bscore\b/i);
  });

  it("the Inspect ask's patch rides the same path and leads with the selected gap", async () => {
    const sent = await postToRoute(contextWithAsk({ symbol: SYM, timeframe: "1m" }, fvgInspectAsk(obj, 2)));
    expect(sent).toContain(`SELECTED ${obj.objectId} — definition FVG_3C v1.`);
  });

  it("no selection and no gaps in the scene → no FVG block at all", async () => {
    const turn = (await postToRoute(contextWithAsk({ symbol: SYM, timeframe: "1m", fvg: spaidbotFvgScene({ objects: [], selectedObjectId: null }) }, null))).split("\n----\n")[1];
    expect(turn).toContain("[Current chart: NQ1! 1m");
    expect(turn).not.toContain("FVG facts");
    expect(turn).not.toContain("FVG|");
  });

  it("no selection with visible gaps → facts carry NO 'SELECTED' marker (the scene, not a pick)", async () => {
    const turn = (await postToRoute({ symbol: SYM, timeframe: "1m", fvg: spaidbotFvgScene({ objects: [obj], selectedObjectId: null }) })).split("\n----\n")[1];
    expect(turn).toContain("FVG facts");
    expect(turn).not.toContain("SELECTED FVG|");
  });

  it("the layer OFF sends no FVG at all (the room gates `fvg` on fvgOn && fvgScene)", () => {
    const dash = readFileSync(path.resolve(__dirname, "../../../components/chart/ChartsDashboard.tsx"), "utf8");
    expect(dash.length).toBeGreaterThan(10_000);
    expect(dash).toMatch(/\.\.\.\(fvgOn && fvgScene\s*\n?\s*\? \{ fvg: spaidbotFvgScene\(\{ objects: \[\.\.\.fvgScene\.visibility\.open, \.\.\.fvgScene\.visibility\.scars\], selectedObjectId: selectedMarketObjectId/);
  });

  it("the prefill event never auto-sends (the panel only opens and fills the input)", () => {
    const bot = readFileSync(path.resolve(__dirname, "../../../components/layout/SpaidBotButton.tsx"), "utf8");
    // The ask effect: `apply` (opens + pre-fills), `onAsk` (event), the waiting ask on mount.
    const at = bot.indexOf("const apply = (ask: SpaidbotAsk)");
    const handler = bot.slice(at, bot.indexOf("window.addEventListener(SPAIDBOT_ASK_EVENT, onAsk)", at));
    expect(handler.length).toBeGreaterThan(100);
    expect(handler).toContain("setInput(ask.prompt)");
    expect(handler).not.toMatch(/\bsend\(|sendToClaude\(|fetch\(/);
  });
});
