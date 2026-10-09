/**
 * API audit P1-5 (2026-10-09) — one failure owner: plain words + a stable code
 * for a guest or a member; the raw text to the server log. Readers branch on
 * the code and still accept the old text for one release.
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it, vi } from "vitest";

import { fetchFvgBars, clearFvgBarCache, readFvgBarBody, upstreamSaysMissing } from "@/lib/marketData/fvg/fvgBarSource";
import { spaidbotFailureMessage } from "@/lib/ai/spaidbotContext";
import { PUBLIC_FAILURE_CODES, PUBLIC_FAILURE_PLUMBING, PUBLIC_FAILURE_WORDS, classifyFailure, isPublicFailureCode, publicFailure } from "./publicFailure";

const read = (p: string) => readFileSync(path.join(process.cwd(), "src", p), "utf8");

describe("publicFailure — the body", () => {
  it.each([
    [new Error("Yahoo HTTP 404"), "UPSTREAM_NOT_FOUND"],
    [new Error("Yahoo HTTP 400"), "UPSTREAM_NOT_FOUND"],
    [new Error("Coinbase HTTP 429"), "UPSTREAM_BUSY"],
    [new Error("HTTP 429 RESOURCE_EXHAUSTED quota"), "UPSTREAM_BUSY"],
    [new Error("Yahoo HTTP 502"), "UPSTREAM_UNAVAILABLE"],
    [new Error("The operation was aborted due to timeout"), "UPSTREAM_UNAVAILABLE"],
    [new TypeError("fetch failed"), "UPSTREAM_UNAVAILABLE"],
    [new Error("ALPACA_API_KEY is not set on the host runtime"), "NOT_CONFIGURED"],
    [new SyntaxError("Unexpected token < in JSON"), "INTERNAL"],
    [undefined, "INTERNAL"],
  ])("%s → %s, in words with no vendor name, no HTTP code, no variable name", (err, code) => {
    const log: string[] = [];
    const body = publicFailure(err, "lane-x", l => log.push(l));
    expect(body).toEqual({ error: PUBLIC_FAILURE_WORDS[code as keyof typeof PUBLIC_FAILURE_WORDS], code });
    expect(body.error).not.toMatch(PUBLIC_FAILURE_PLUMBING);
    expect(Object.keys(body).sort()).toEqual(["code", "error"]);         // nothing else rides along
    // The raw text is in the log line, with the lane and the code — and only there.
    expect(log).toHaveLength(1);
    expect(log[0]).toContain("lane=lane-x");
    expect(log[0]).toContain(`code=${code}`);
    if (err instanceof Error) expect(log[0]).toContain(err.message);
  });

  it("every code has words; the words are fragments (no full stop) so a reader can set them in its own sentence", () => {
    expect(PUBLIC_FAILURE_CODES.length).toBeGreaterThan(4);
    for (const c of PUBLIC_FAILURE_CODES) {
      expect(PUBLIC_FAILURE_WORDS[c].length, c).toBeGreaterThan(10);
      expect(PUBLIC_FAILURE_WORDS[c], c).not.toMatch(/\.$/);
      expect(PUBLIC_FAILURE_WORDS[c], c).not.toMatch(PUBLIC_FAILURE_PLUMBING);
      expect(isPublicFailureCode(c)).toBe(true);
    }
    expect(isPublicFailureCode("Error: Yahoo HTTP 404")).toBe(false);
    expect(classifyFailure("anything else")).toBe("INTERNAL");
  });

  it("a log that throws never becomes the failure", () => {
    expect(publicFailure(new Error("x"), "l", () => { throw new Error("log down"); })).toEqual({ error: PUBLIC_FAILURE_WORDS.INTERNAL, code: "INTERNAL" });
  });
});

describe("the routes hand failures to the one owner", () => {
  const ROUTES = ["yahoo", "exchange", "memecoin", "polymarket", "sentiment", "heatmap", "finnhub", "alpaca", "market", "spaidbot"] as const;

  it("none of the ten still answers with String(err), a variable name or the model provider's own message", () => {
    expect(ROUTES.length).toBeGreaterThan(9);
    for (const r of ROUTES) {
      const src = read(`app/api/${r}/route.ts`);
      expect(src.length, r).toBeGreaterThan(500);
      expect(src, r).toContain('from "@/lib/publicFailure"');
      expect(src, r).toMatch(/publicFailure\(err(?:, | as)|publicFailure\(new Error/);
      expect(src, r).not.toMatch(/error: String\(err\)/);
      expect(src, r).not.toMatch(/JSON\.stringify\(\{ error: String\(err\) \}\)/);
    }
    const bot = read("app/api/spaidbot/route.ts");
    expect(bot).not.toContain("GEMINI_API_KEY not set.");
    expect(bot).not.toContain("No usable Gemini model");
    expect(bot).not.toMatch(/error\?\.message \?\? msg/);
    expect(read("app/api/market/route.ts")).not.toContain("after an OK Finnhub response: ${String(err)}");
  });

  it("the panel still names SpaidBot's failures from the new words (its mapper is unchanged)", () => {
    expect(spaidbotFailureMessage("SpaidBot is not configured on this server.", false)).toMatch(/not switched on/);
    expect(spaidbotFailureMessage("SpaidBot's model is busy — too many requests right now.", false)).toMatch(/busy/);
    expect(spaidbotFailureMessage("SpaidBot's model did not answer.", false)).toMatch(/did not answer in time/);
    expect(spaidbotFailureMessage(PUBLIC_FAILURE_WORDS.INTERNAL, false)).toMatch(/could not answer just now/);
    // The old text is still read correctly for one release.
    expect(spaidbotFailureMessage("GEMINI_API_KEY not set.", false)).toMatch(/not switched on/);
  });
});

describe("readers moved to the code; the old text is accepted for one release", () => {
  const NEW_404 = { error: PUBLIC_FAILURE_WORDS.UPSTREAM_NOT_FOUND, code: "UPSTREAM_NOT_FOUND" };
  const OLD_404 = { error: "Error: Yahoo HTTP 404" };
  const SENTENCE = "No 1D bars could be read for SIVB — it may not be a symbol we can chart, or it has no history at this timeframe.";

  it("upstreamSaysMissing: the code decides; without a code the old text still does", () => {
    expect(upstreamSaysMissing(500, NEW_404)).toBe(true);
    expect(upstreamSaysMissing(500, OLD_404)).toBe(true);
    // A coded failure that is NOT 'not found' is never read as missing from stray words.
    expect(upstreamSaysMissing(500, { error: "no data for this request", code: "UPSTREAM_UNAVAILABLE" })).toBe(false);
    expect(upstreamSaysMissing(500, { error: PUBLIC_FAILURE_WORDS.UPSTREAM_UNAVAILABLE, code: "UPSTREAM_UNAVAILABLE" })).toBe(false);
  });

  it.each([["the new coded body", NEW_404], ["the old text body", OLD_404]])("the trader's sentence is the same from %s", async (_n, body) => {
    clearFvgBarCache();
    const r = await fetchFvgBars({ symbol: "SIVB", timeframe: "1D", bars: 160, nowMs: 1_000_000, fetcher: async () => new Response(JSON.stringify(body), { status: 404 }) });
    expect(r).toEqual({ ok: false, reason: SENTENCE });
    expect(readFvgBarBody({ ...body, ok: false }, { symbol: "SIVB", timeframe: "1D", nowMs: 0 })).toEqual({ ok: false, reason: SENTENCE });
    clearFvgBarCache();
  });

  it("a coded 'did not answer' reads as try-again, never as 'no bars for this symbol' and never as the route's fragment", async () => {
    clearFvgBarCache();
    const r = await fetchFvgBars({ symbol: "SPY", timeframe: "1D", bars: 160, nowMs: 2_000_000, fetcher: async () => new Response(JSON.stringify({ error: PUBLIC_FAILURE_WORDS.UPSTREAM_UNAVAILABLE, code: "UPSTREAM_UNAVAILABLE" }), { status: 500 }) });
    expect(r).toEqual({ ok: false, reason: "The market history did not load just now — try again in a moment." });
    clearFvgBarCache();
  });

  it("Backtest: a coded not-found is BacktestBarsMissing; a coded outage is not", async () => {
    const { fetchBars, BacktestBarsMissing } = await import("@/lib/backtest/engine");
    try {
      vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify(NEW_404), { status: 404 })));
      await expect(fetchBars("SIVB", "1D")).rejects.toBeInstanceOf(BacktestBarsMissing);
      vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({ error: PUBLIC_FAILURE_WORDS.UPSTREAM_UNAVAILABLE, code: "UPSTREAM_UNAVAILABLE" }), { status: 500 })));
      await expect(fetchBars("SIVB", "1D")).rejects.not.toBeInstanceOf(BacktestBarsMissing);
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it("the chart's refusal sentence reads cleanly with the new fragment", () => {
    // MainChart notes `edge: json.error`; compileBarHistoryRefusal prints "<vendor> was asked and refused — <edge>."
    const compile = read("lib/marketData/compileBarHistoryRefusal.ts");
    expect(compile).toContain("`${a.vendor} was asked and refused — ${a.edge}.`");
    expect(`Yahoo was asked and refused — ${PUBLIC_FAILURE_WORDS.UPSTREAM_NOT_FOUND}.`).toBe("Yahoo was asked and refused — no data for this request.");
  });
});

/* ── NAMES FOR THE OPERATOR ONLY (Founder ruling 2026-10-09) ─────────────────────────── */
describe("audienceBody — the same failure, for its audience", () => {
  const FULL = {
    error: "LiveKit is NOT CONFIGURED on this host runtime — missing required variables: LIVEKIT_API_KEY, LIVEKIT_URL. Set them in the host runtime secrets.",
    edge: "NOT CONFIGURED", missing: ["LIVEKIT_API_KEY", "LIVEKIT_URL"], accepted: ["LIVEKIT_API_KEY", "LIVEKIT_KEY"], source: "livekit",
  };

  it("the operator receives the whole body, plus the stable code", async () => {
    const { audienceBody } = await import("./publicFailure");
    expect(audienceBody(true, FULL)).toEqual({ ...FULL, code: "NOT_CONFIGURED" });
  });

  it("a member or guest receives plain words, the SAME edge, the code, and missing: [] — no variable name anywhere", async () => {
    const { audienceBody } = await import("./publicFailure");
    const body = audienceBody(false, FULL);
    expect(body).toEqual({ error: "this lane is not configured on WM Pro's server", edge: "NOT CONFIGURED", code: "NOT_CONFIGURED", missing: [], source: "livekit" });
    expect(JSON.stringify(body).replace(/"code":"NOT_CONFIGURED"/, "")).not.toMatch(/LIVEKIT|host runtime|secrets|[A-Z]{3,}_[A-Z_]{3,}/);
  });

  it.each([
    ["RATE_LIMITED", "UPSTREAM_BUSY", /rate limiting/],
    ["AUTH BLOCKED", "UPSTREAM_UNAVAILABLE", /refused WM Pro's credentials/],
    ["FORBIDDEN", "UPSTREAM_UNAVAILABLE", /does not permit/],
    ["PROVIDER ERROR", "UPSTREAM_UNAVAILABLE", /did not answer/],
    ["SOMETHING NEW", "INTERNAL", /could not be completed/],
  ])("edge %s → code %s; the vendor's own sentence is replaced for a non-operator and kept for the operator", async (edge, code, words) => {
    const { audienceBody } = await import("./publicFailure");
    const raw = { error: "Finnhub HTTP 429: API limit reached. Please try again later. Remaining Limit: 0", edge, source: "finnhub" };
    const member = audienceBody(false, raw);
    expect(member.edge).toBe(edge);
    expect(member.code).toBe(code);
    expect(String(member.error)).toMatch(words);
    expect(String(member.error)).not.toMatch(PUBLIC_FAILURE_PLUMBING);
    expect(audienceBody(true, raw).error).toBe(raw.error);
  });

  it("isOperator: only the deployment's named owner; no owner configured → nobody", async () => {
    const { isOperator } = await import("./publicFailure");
    expect(isOperator("owner-1", { TASTYTRADE_OWNER_USER_ID: "owner-1" })).toBe(true);
    expect(isOperator("member-7", { TASTYTRADE_OWNER_USER_ID: "owner-1" })).toBe(false);
    expect(isOperator("owner-1", {})).toBe(false);
    expect(isOperator(null, { TASTYTRADE_OWNER_USER_ID: "owner-1" })).toBe(false);
    expect(isOperator("", { TASTYTRADE_OWNER_USER_ID: "" })).toBe(false);
  });
});

describe("no route hands a NOT CONFIGURED body to a non-operator unwrapped", () => {
  it("every route that builds one either sits behind an owner / operator gate or passes it through audienceBody", async () => {
    const { readdirSync, statSync } = await import("node:fs");
    const root = path.join(process.cwd(), "src/app/api");
    const files: string[] = [];
    const walk = (d: string) => { for (const n of readdirSync(d)) { const p = path.join(d, n); if (statSync(p).isDirectory()) walk(p); else if (n === "route.ts") files.push(p); } };
    walk(root);
    expect(files.length).toBeGreaterThan(80);                              // the scan found the tree
    const builders = files.filter(f => /edge: "NOT CONFIGURED"|readonly edge = "NOT CONFIGURED"/.test(readFileSync(f, "utf8")));
    expect(builders.length).toBeGreaterThan(8);                            // …and the bodies in question
    const OWNER_GATED = /webullOwnerGate\(|tastytradeOwnerGate\(|isAuthorizedAlpacaOwner\(|operatorOnly\(/;
    const unwrapped = builders
      .filter(f => { const s = readFileSync(f, "utf8"); return !OWNER_GATED.test(s) && !/audienceBody\(/.test(s); })
      .map(f => path.relative(root, f));
    expect(unwrapped).toEqual([]);
    // Wrapped routes wrap EVERY such body: no bare object literal carries the edge.
    for (const f of builders) {
      const s = readFileSync(f, "utf8");
      if (OWNER_GATED.test(s) && !/audienceBody\(/.test(s)) continue;
      const bare = s.match(/NextResponse\.json\(\s*\{[^{}]*edge: "NOT CONFIGURED"/g) ?? [];
      expect(bare, path.relative(root, f)).toEqual([]);
    }
  });
});

