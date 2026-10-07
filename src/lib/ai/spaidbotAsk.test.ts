/**
 * Garden 19 §30 / §42 — "Ask SpaidBot" from Inspect and Review, and the four
 * FVG truth layers. No provider calls: the ask is validated, merged and turned
 * into the server's chart note by the pure owners.
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import type { CanonicalBar } from "@/lib/marketData/canonicalBar";
import { detectFvgs } from "@/lib/marketData/fvg/fvgEngine";
import { formatChartContextNote } from "@/lib/marketData/formatChartContextNote";
import { FvgInspectTicket } from "@/components/chart/FvgInspectTicket";
import { fvgInspectLayerOf } from "@/lib/chart/fvgTruthLayers";
import { contextWithAsk, fvgInspectAsk, readSpaidbotAsk, reviewDecisionAsk, SPAIDBOT_ASK_EVENT } from "./spaidbotAsk";

type Row = readonly [number, number, number, number];
const MIN = 60_000;
const T0 = Date.UTC(2026, 9, 6, 10, 0, 0);
const SYM = "NQ1!";
const bars: CanonicalBar[] = ([...Array.from({ length: 15 }, () => [100, 101, 99, 100] as Row),
  [100, 101, 99, 100.5], [100.5, 104, 100.3, 103.8], [103.8, 105, 102, 104.5], [104.5, 105, 103.5, 104.5]] as Row[]).map(([o, h, l, c], i) => ({
  barId: `${SYM}|1m|${T0 + i * MIN}|e0`, symbolId: SYM, sessionId: "SESSION_CONTINUOUS", timeframe: "1m",
  open: o, high: h, low: l, close: c, volume: 1, asOf: T0 + i * MIN, receivedAt: 0,
  fidelity: "INDICATIVE", source: "f", provenance: "REST_BACKFILL", truthEpoch: 0,
}));
const obj = detectFvgs(bars, { symbolId: SYM, timeframe: "1m" }).objects[0];

describe("Ask SpaidBot — the existing panel, pre-filled, one question's context patch", () => {
  it("validates the ask: prompt trimmed and capped; only server-validated context keys pass", () => {
    const a = readSpaidbotAsk({ prompt: "  What  am I\nlooking at? ", context: { fvg: [1], symbol: "NQ1!", apiKey: "x", role: "LIVE" } })!;
    expect(a.prompt).toBe("What am I looking at?");
    expect(Object.keys(a.context).sort()).toEqual(["fvg", "symbol"]);
    expect(readSpaidbotAsk({ prompt: "   " })).toBeNull();
    expect(readSpaidbotAsk("x")).toBeNull();
  });

  it("Inspect: the selected gap's fact block leads, and the server note words it", () => {
    const ask = fvgInspectAsk(obj, 2);
    expect(ask.prompt).toMatch(/^What am I looking at\? \(the selected bullish FVG on NQ1! 1m\)$/);
    const ctx = contextWithAsk({ symbol: SYM, timeframe: "1m", fvg: [] }, ask);
    const note = formatChartContextNote(ctx, T0 + 3_600_000);
    expect(note).toContain(`SELECTED ${obj.objectId} — definition FVG_3C v1.`);
    expect(note).toContain("boundaries 101.00–102.00");
    expect(contextWithAsk({ symbol: SYM }, null)).toEqual({ symbol: SYM });
  });

  it("Review: the plan question + the trader's own reference; plan rides as TRADER TRUTH on the Decision_ID", () => {
    const ask = reviewDecisionAsk({ question: "Your original plan targeted 105. What caused you to change the plan?", fvgReferenceSentence: "bullish gap 101.00–102.00 …", symbol: SYM, decisionId: "DEC-123", planLine: "plan frozen at the ticket's send: target 105" });
    expect(ask.prompt).toBe("Your original plan targeted 105. What caused you to change the plan? My journal referenced this FVG at decision time: bullish gap 101.00–102.00 …");
    const note = formatChartContextNote(contextWithAsk({}, ask));
    expect(note).toContain("[Decision_ID DEC-123");
    expect(note).toContain("trader's recorded plan frozen at the ticket's send: target 105 — TRADER TRUTH");
  });

  it("the panel listens, opens, PRE-FILLS (never sends for the trader), and drops the patch after one question", () => {
    const src = readFileSync(path.resolve(__dirname, "../../components/layout/SpaidBotButton.tsx"), "utf8");
    expect(src.length).toBeGreaterThan(1000);
    const at = src.indexOf("const onAsk");
    const handler = src.slice(at, src.indexOf("};", at));
    expect(handler).toContain("setOpen(true)");
    expect(handler).toContain("setInput(ask.prompt)");
    expect(handler).not.toMatch(/\bsend\(|sendToClaude\(/);
    expect(src).toContain("window.addEventListener(SPAIDBOT_ASK_EVENT, onAsk)");
    expect(src).toMatch(/askRef\.current = null; \/\/ the ask's patch rides with ONE question only/);
    expect(SPAIDBOT_ASK_EVENT).toBe("wm:spaidbot-ask");
  });
});

describe("§42 — FVG truth layers stay visibly separate", () => {
  it("Inspect renders MARKET / CONTEXT / TRADER / EDUCATION as separate sections, plus the ask", () => {
    const html = renderToStaticMarkup(React.createElement(FvgInspectTicket, {
      o: obj, fmt: (p: number) => p.toFixed(2), clock: (ms: number) => new Date(ms).toISOString(), onClose: () => {},
      relationships: { rows: ["Living Profile POC 101.50 — inside · FULL (trade-based)"], silences: ["Options walls: SILENCE — none"] },
    }));
    const order = ["MARKET", "CONTEXT", "TRADER", "EDUCATION"].map(l => html.indexOf(`data-inspect-fvg-layer="${l}"`));
    expect(order.every(i => i > 0)).toBe(true);
    expect([...order].sort((a, b) => a - b)).toEqual(order);
    const section = (l: string) => html.slice(html.indexOf(`data-inspect-fvg-layer="${l}"`), html.indexOf("</section>", html.indexOf(`data-inspect-fvg-layer="${l}"`)));
    expect(section("MARKET")).toContain('data-inspect-fvg-row="boundaries"');
    expect(section("MARKET")).not.toContain('data-inspect-fvg-row="definition"');
    expect(section("CONTEXT")).toContain("Relationships (by reference)");
    expect(section("CONTEXT")).toContain('data-inspect-fvg-row="sense-flow"');
    expect(section("TRADER")).toContain("No decision of yours is recorded on this gap here.");
    expect(section("EDUCATION")).toContain('data-inspect-fvg-row="definition"');
    expect(section("EDUCATION")).toContain('data-inspect-fvg-row="honesty"');
    expect(html).toContain('data-testid="inspect-fvg-ask-spaidbot"');
    expect(html).toContain("Ask SpaidBot: what am I looking at?");
    expect(fvgInspectLayerOf("some-new-row")).toBe("MARKET");
  });

  it("Review's FVG block labels TRADER / MARKET / EDUCATION truth and carries the ask", () => {
    const src = readFileSync(path.resolve(__dirname, "../../components/journal/BrokerTruthToday.tsx"), "utf8");
    const at = src.indexOf("const fvgBlock");
    const block = src.slice(at, src.indexOf(") : null;", at));
    for (const l of ["TRADER TRUTH", "MARKET TRUTH", "EDUCATION TRUTH"]) expect(block).toContain(`data-layer="${l}"`);
    expect(src).toContain('testId="review-ask-spaidbot" label="Ask SpaidBot about this decision"');
    expect(src).toMatch(/question: composed\?\.question/);
  });
});
