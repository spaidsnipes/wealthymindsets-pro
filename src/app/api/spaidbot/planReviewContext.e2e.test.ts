/**
 * SpaidBot × the frozen plan, end to end through the real route (Garden 19
 * §27/§31): journal decision → the plan frozen on its Decision_ID (the one
 * plan store) → the panel's context (withScenePlan on the chart; reviewDecisionAsk
 * from the Review) → POST /api/spaidbot → the request the model receives.
 * Model never called: auth, limits and the resolver are stubbed; fetch captures
 * the upstream body. No Send on anyone's account.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { freezePlanSnapshot } from "@/lib/journal/managementPlan";
import { freezePlanOnce, readPlanForDecision } from "@/lib/journal/managementPlanStore";
import { composePlanReview } from "@/lib/journal/planReview";
import type { TradeActuals } from "@/lib/journal/planVsActual";
import { withScenePlan } from "@/lib/ai/spaidbotContext";
import { formatPlanContextLine } from "@/lib/ai/spaidbotPlanReview";
import { contextWithAsk, reviewDecisionAsk } from "@/lib/ai/spaidbotAsk";

vi.mock("@/lib/requireAuth", () => ({ requireAuth: async () => ({ ok: true, user: { sub: "test-user" } }) }));
vi.mock("@/lib/rateLimit", () => ({ checkRateLimit: () => ({ ok: true }) }));
vi.mock("@/lib/edgeRateLimit", () => ({ edgeAllows: async () => true, tooManyRequests: () => new Response("", { status: 429 }), SPAIDBOT_LIMITER_BINDING: "X" }));
vi.mock("@/lib/ai/geminiModel", async (orig) => ({ ...(await orig<typeof import("@/lib/ai/geminiModel")>()), resolveGeminiModel: async () => "gemini-2.5-flash", forgetGeminiModel: () => {} }));

const T0 = Date.parse("2026-10-07T14:30:00Z");
const DEC = "wmd_plan_e2e";
const EMOTION = /\b(afraid|fear\w*|scared|panic\w*|greed\w*|impatien\w*|revenge|fomo|anxious|nervous|undisciplined|emotional|tilt\w*)\b|you were (?!at|in)\w+/i;

function mem(): Storage {
  const m = new Map<string, string>();
  return { getItem: k => m.get(k) ?? null, setItem: (k, v) => void m.set(k, String(v)), removeItem: k => void m.delete(k), clear: () => m.clear(), key: i => [...m.keys()][i] ?? null, get length() { return m.size; } } as Storage;
}

let upstream: string[] = [];
beforeEach(() => {
  upstream = [];
  process.env.GEMINI_API_KEY = "test-key";
  vi.stubGlobal("fetch", vi.fn(async (_u: string, init?: RequestInit) => {
    upstream.push(String(init?.body ?? ""));
    return new Response('data: {"candidates":[{"content":{"parts":[{"text":"ok"}]},"finishReason":"STOP"}]}\n\n', { status: 200 });
  }));
});
afterEach(() => { vi.unstubAllGlobals(); vi.resetModules(); });

async function turnFor(context: Record<string, unknown>, question: string): Promise<{ system: string; turn: string }> {
  const { POST } = await import("./route");
  const res = await POST(new Request("https://wm.test/api/spaidbot", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ messages: [{ role: "user", content: question }], context }) }) as never);
  await res.text();
  expect(upstream).toHaveLength(1);
  const sent = JSON.parse(upstream[0]) as { system_instruction: { parts: { text: string }[] }; contents: { parts: { text: string }[] }[] };
  return { system: sent.system_instruction.parts[0].text, turn: sent.contents[sent.contents.length - 1].parts[0].text };
}

describe("SpaidBot × frozen plan — the request the model receives", () => {
  const storage = mem();
  const snap = freezePlanSnapshot({
    decisionId: DEC, frozenAt: "TICKET_SEND", atMs: T0, source: "ticket at send",
    plan: { direction: "LONG", entryPx: 21400, stopPx: 21380, targetPx: 21450, thesis: "ORB long" },
  })!;
  freezePlanOnce(storage, snap);

  it("chart → the plan frozen on the scene's Decision_ID rides as TRADER TRUTH, never market data", async () => {
    const ctx = withScenePlan({ symbol: "NQ1!", timeframe: "5m", decisionId: DEC }, id => readPlanForDecision(storage, id));
    expect(ctx.plan).toBe(formatPlanContextLine(snap));
    const { turn } = await turnFor(ctx, "Did I follow my plan?");
    expect(turn).toContain(`[Decision_ID ${DEC}`);
    expect(turn).toMatch(/\[trader's recorded plan frozen at the ticket's send: thesis “ORB long” · [^\]]*— TRADER TRUTH, not market data: compare it with what happened as facts and ASK why it changed; never name an emotion the trader did not write\]/);
    expect(turn).not.toMatch(EMOTION);
  });

  it("Review → the plan question (no emotion label) + the plan line on the Decision_ID", async () => {
    const actuals: TradeActuals = {
      direction: "LONG", entry: { atMs: T0 + 1000, px: 21400, qty: 1 }, exits: [{ atMs: T0 + 3 * 60_000, px: 21410, qty: 1 }],
      adds: [], stopMoves: [], targetMoves: [], source: "tastytrade fills",
    };
    const question = composePlanReview({ plan: snap, actuals }).question;
    const ask = reviewDecisionAsk({ question, symbol: "NQ1!", decisionId: DEC, planLine: formatPlanContextLine(snap) });
    const { turn } = await turnFor(contextWithAsk({}, ask), ask.prompt);
    expect(turn.startsWith("Your original plan targeted 21,450 and invalidated at 21,380.")).toBe(true);
    // No price path in hand → WM does not claim which condition printed first; it ASKS.
    expect(turn).toContain("WM does not hold enough facts to say whether either condition printed first. What did you see at the exit?");
    expect(turn).toContain("TRADER TRUTH, not market data");
    expect(turn).not.toMatch(EMOTION);
  });

  it("no Decision_ID → no plan line (a plan is never attached to a chart without one)", async () => {
    const ctx = withScenePlan({ symbol: "NQ1!", timeframe: "5m", decisionId: null }, id => readPlanForDecision(storage, id));
    expect(ctx.plan).toBeNull();
    const { turn } = await turnFor(ctx, "Did I follow my plan?");
    expect(turn).toContain("[no Decision_ID on this chart");
    expect(turn).not.toContain("TRADER TRUTH");
  });

  it("the system prompt forbids naming an emotion the trader did not write", async () => {
    const { system } = await turnFor({ symbol: "NQ1!" }, "hi");
    expect(system.length).toBeGreaterThan(1000);
    expect(system).toMatch(/emotion/i);
  });
});
