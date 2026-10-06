/**
 * Garden 18 §8 (2026-10-06) — SpaidBot cites source + freshness, keeps its
 * uncertainty, ties a thesis to the ONE Decision_ID, and fails by name.
 * No provider call is made here.
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { formatChartContextNote } from "../marketData/formatChartContextNote";
import { SPAIDBOT_IDLE_TIMEOUT_MS, spaidbotFailureMessage, withSceneDecisionId } from "./spaidbotContext";

const NOW = Date.UTC(2026, 9, 6, 14, 32, 17);
const ROUTE = readFileSync(path.resolve(__dirname, "../../app/api/spaidbot/route.ts"), "utf8");
const BUTTON = readFileSync(path.resolve(__dirname, "../../components/layout/SpaidBotButton.tsx"), "utf8");

describe("the chart line carries source, as-of and Decision_ID", () => {
  it("names the source and the observation time with its age", () => {
    const n = formatChartContextNote({ symbol: "NQ1!", timeframe: "5m", price: 21000, role: "LIVE", source: "tastytrade", observedAt: NOW - 12_000, decisionId: "D-1842" }, NOW);
    expect(n).toContain("[source tastytrade]");
    expect(n).toContain("[last observed 2026-10-06T14:32:05Z, 12s before this question]");
    expect(n).toContain("[Decision_ID D-1842 — a thesis you propose belongs to this decision and is recorded only when the trader records it in the Journal]");
  });
  it("absence is said: unknown source, unknown as-of, no decision", () => {
    const n = formatChartContextNote({ symbol: "TSLA", price: 250 }, NOW);
    expect(n).toContain("[source UNKNOWN]");
    expect(n).toContain("[as-of time UNKNOWN — treat every chart figure as possibly stale]");
    expect(n).toContain("[no Decision_ID on this chart — a thesis you propose is not a decision until the trader records one]");
  });
  it("a future time or a hostile string is refused, never repeated", () => {
    const n = formatChartContextNote({ symbol: "TSLA", source: "<script>", observedAt: NOW + 3_600_000, decisionId: "x y z ]" }, NOW);
    expect(n).toContain("[source UNKNOWN]");
    expect(n).toContain("as-of time UNKNOWN");
    expect(n).toContain("no Decision_ID on this chart");
  });
  it("the route passes its own clock and the prompt demands citation + uncertainty + no second decision store", () => {
    expect(ROUTE).toContain("formatChartContextNote(context, Date.now())");
    expect(ROUTE).toMatch(/cited with its source and\s+its as-of time/);
    expect(ROUTE).toContain("State your uncertainty in words");
    expect(ROUTE).toContain("You keep no record of decisions.");
    expect(ROUTE).toContain("Never invent a Decision_ID.");
  });
  it("both context producers send source + observedAt", () => {
    const deck = readFileSync(path.resolve(__dirname, "../../app/command-deck/page.tsx"), "utf8");
    const dash = readFileSync(path.resolve(__dirname, "../../components/chart/ChartsDashboard.tsx"), "utf8");
    expect(deck).toContain("observedAt: wsFeed.lastObservedAtMs ?? null,");
    expect(dash).toContain("observedAt: lastObservedAtMs ?? null,");
  });
});

describe("the Decision_ID comes from the one decision store", () => {
  it("reads the scene decision for owner + chart symbol and invents nothing", () => {
    const read = (o: unknown, u: unknown) => (o === "u1" && u === "NQ1!" ? { owner: "u1", underlying: "NQ1!", identity: { decisionId: "D-7" } } as never : null);
    expect(withSceneDecisionId({ symbol: "NQ1!" }, "u1", read).decisionId).toBe("D-7");
    expect(withSceneDecisionId({ symbol: "ES1!" }, "u1", read).decisionId).toBeNull();
    expect(withSceneDecisionId({ symbol: "NQ1!" }, null, read).decisionId).toBeNull();
  });
  it("SpaidBot reads decisionContinuity and never writes or mints a decision", () => {
    expect(BUTTON).toContain("withSceneDecisionId(ctx, user?.id ?? null, readSceneDecision)");
    expect(BUTTON).not.toMatch(/writeSceneDecision|continueOrMint|mintDecision/);
  });
});

describe("it works or fails by name — never an endless Thinking…", () => {
  it("a silent stream is cut at a bounded idle timeout and said to have timed out", () => {
    expect(SPAIDBOT_IDLE_TIMEOUT_MS).toBe(45_000);
    expect(spaidbotFailureMessage("AbortError", true)).toBe("SpaidBot took too long to answer (no reply for 45s) — nothing was decided; ask again in a moment.");
    expect(BUTTON).toContain("controller.abort(); }, SPAIDBOT_IDLE_TIMEOUT_MS);");
  });
  it("every other failure has a named, plain sentence", () => {
    expect(spaidbotFailureMessage("GEMINI_API_KEY not set.", false)).toMatch(/not switched on/);
    expect(spaidbotFailureMessage("Error: EMPTY_ANSWER", false)).toMatch(/returned no answer/);
    expect(spaidbotFailureMessage("HTTP 429", false)).toMatch(/busy/);
    expect(spaidbotFailureMessage("TypeError: Failed to fetch", false)).toMatch(/could not answer just now/);
  });
});
