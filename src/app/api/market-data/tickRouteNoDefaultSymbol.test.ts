/**
 * A TICK ROUTE MAY NOT ANSWER A QUESTION IT WAS NOT ASKED.
 *
 * ── The measured failure (2026-09-11) ───────────────────────────────────────
 *
 * All three shipping tick routes opened with the same line:
 *
 *   const symbol = (request.nextUrl.searchParams.get("symbol") || "TSLA")
 *
 * So a caller that asked about NOTHING received a confident, authenticated
 * receipt about a US common stock it never named — `label: "RECEIVING"`,
 * real executed prints, `symbol: "TSLA"` — and nothing in the response
 * announced that the instrument had been chosen by the server.
 *
 * `"" || "TSLA"` is reachable, not theoretical: `fetchProviderTickSelection`
 * builds the query from `encodeURIComponent(symbol.toUpperCase())`, so any
 * empty symbol reaching that helper silently became a TSLA probe against
 * three providers.
 *
 * ── What saved us, and why it is not a defence ──────────────────────────────
 *
 * The browser-side selectors do filter: `selectFreshMoomooTapeEvents` and its
 * siblings require `event.normalizedSymbol === normalized`, so substituted
 * TSLA prints were dropped before reaching the tape. The trader was not shown
 * a wrong price.
 *
 * That is containment downstream of the lie, not absence of the lie. What
 * actually happened was three authenticated provider requests per round,
 * spent on an instrument nobody asked for, whose results were then thrown
 * away. This repo has already been burned by manufactured provider load — a
 * Finnhub 429 self-storm starved the stock tape — and `RATE LIMITED` is a
 * state these very receipts can return. A fix that keeps the wasted probe
 * because "the selector catches it" is trading a quiet lie for a quiet cost.
 *
 * ── Why it is DERIVED from the directory ────────────────────────────────────
 *
 * Membership comes from the filesystem, exactly as in
 * `providerWireProofDepth.test.ts`. A list retyped here would go stale on the
 * day a fourth tick route lands, which is the day it needs to speak.
 */

import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { stripComments } from "@/lib/sourceScan";

const REPO_ROOT = path.resolve(__dirname, "..", "..", "..", "..");
const TICK_ROUTE_DIR = path.join(REPO_ROOT, "src/app/api/market-data");

function tickRoutes(): { provider: string; src: string }[] {
  return fs
    .readdirSync(TICK_ROUTE_DIR, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => ({
      provider: entry.name,
      file: path.join(TICK_ROUTE_DIR, entry.name, "ticks", "route.ts"),
    }))
    .filter((entry) => fs.existsSync(entry.file))
    .map(({ provider, file }) => ({ provider, src: stripComments(fs.readFileSync(file, "utf8")) }));
}

describe("no tick route substitutes an instrument the caller did not name", () => {
  it("the scan finds the routes it is meant to police", () => {
    const routes = tickRoutes();
    expect(routes.length, "no tick routes found — this Sentinel has rotted").toBeGreaterThan(2);
  });

  it("THE MEASURED FAILURE: no route falls back to a hardcoded symbol", () => {
    for (const { provider, src } of tickRoutes()) {
      const reads = src.match(/searchParams\.get\(\s*"symbol"\s*\)\s*\|\|\s*"[^"]+"/g) ?? [];
      expect(
        reads,
        `${provider}/ticks defaults the symbol when none is passed. An unasked ` +
          "question must be answered with a refusal, not with a US equity the " +
          "caller never named and cannot tell was chosen for them.",
      ).toEqual([]);
    }
  });

  it("and every route reads the parameter without coercing empty to truthy", () => {
    // `?? ""` preserves "asked for nothing" as its own state; `|| <literal>`
    // destroys it. Asserted positively so a future rewrite must keep the shape.
    for (const { provider, src } of tickRoutes()) {
      expect(src, `${provider}/ticks must preserve an empty request as empty`)
        .toMatch(/searchParams\.get\(\s*"symbol"\s*\)/);
      expect(src, `${provider}/ticks must refuse rather than substitute`)
        .toMatch(/symbol === ""/);
    }
  });

  it("every route names the missing-symbol edge in words, not just a status", () => {
    // A bare 400 tells the caller they are wrong, not what would be right.
    for (const { provider, src } of tickRoutes()) {
      expect(src, `${provider}/ticks must say that no symbol was requested`)
        .toMatch(/No symbol was requested/);
      expect(src, `${provider}/ticks must state the refusal to substitute`)
        .toMatch(/will not substitute a default/);
    }
  });

  it("the scan is not vacuous — it can see the defect when it exists", () => {
    const defect = 'const symbol = (request.nextUrl.searchParams.get("symbol") || "TSLA").trim();';
    expect(/searchParams\.get\(\s*"symbol"\s*\)\s*\|\|\s*"[^"]+"/.test(stripComments(defect))).toBe(true);
  });

  it("no tick route retypes the probe symbol as a bare literal", () => {
    // `wireProofScope.ts` owns it. The moomoo route's guidance copy named
    // TSLA twice on its own authority, so the owner and the example a caller
    // is told to copy could drift apart without anything noticing.
    for (const { provider, src } of tickRoutes()) {
      expect(
        src.includes('"TSLA"') || /\bTSLA\b/.test(src.replace(/WIRE_PROOF_SYMBOL/g, "")),
        `${provider}/ticks hardcodes TSLA. Import WIRE_PROOF_SYMBOL from ` +
          "@/lib/marketData/wireProofScope instead.",
      ).toBe(false);
    }
  });
});
