/**
 * TWO ROUTES ON ONE PROVIDER MUST NOT DISAGREE ABOUT WHAT HAPPENED.
 *
 * Measured on production 2026-09-11, same upstream 429, one second apart:
 *
 *   /api/finnhub → 429 {"edge":"RATE LIMITED"}
 *   /api/market  → 500 {"error":"SyntaxError: Unexpected token '<' ..."}
 *
 * `/api/market` never checked `res.ok`, so Finnhub's HTML throttle page hit
 * `res.json()` and the thrown SyntaxError became the user-facing truth. The
 * real state was recoverable and had a name the codebase already used.
 *
 * The lasting invariant is not "429 maps to RATE LIMITED" — it is that the
 * mapping has ONE owner and both routes read it. A retyped copy is how the two
 * answers diverged in the first place.
 */

import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { stripComments } from "@/lib/sourceScan";
import { classifyFinnhubStatus, finnhubUpstreamMessage } from "./finnhubUpstreamStatus";

const REPO_ROOT = path.resolve(__dirname, "..", "..", "..");
const PROXIES = ["src/app/api/finnhub/route.ts", "src/app/api/market/route.ts"];
const read = (rel: string) => stripComments(fs.readFileSync(path.join(REPO_ROOT, rel), "utf8"));

describe("classifyFinnhubStatus", () => {
  it("THE MEASURED FAILURE: a throttle is named, not parsed", () => {
    expect(classifyFinnhubStatus(429)).toBe("RATE LIMITED");
    expect(finnhubUpstreamMessage(429)).toBe("Finnhub RATE LIMITED (HTTP 429)");
  });

  it("separates a rejected token from a plan restriction", () => {
    // Collapsing these sends an owner to rotate a key that was never invalid.
    expect(classifyFinnhubStatus(401)).toBe("AUTH BLOCKED");
    expect(classifyFinnhubStatus(403)).toBe("FORBIDDEN");
  });

  it("attributes a provider-side fault to the provider", () => {
    expect(classifyFinnhubStatus(500)).toBe("PROVIDER ERROR");
    expect(classifyFinnhubStatus(503)).toBe("PROVIDER ERROR");
  });

  it("falls back to an honest generic rather than inventing a cause", () => {
    expect(classifyFinnhubStatus(418)).toBe("UPSTREAM ERROR");
  });

  it("never claims an entitlement verdict — no HTTP status is evidence for one", () => {
    for (const status of [400, 401, 403, 404, 418, 429, 500, 502, 503]) {
      expect(classifyFinnhubStatus(status)).not.toMatch(/ENTITLE|DELAYED/i);
    }
  });
});

describe("both Finnhub proxies read the one owner", () => {
  it("neither route retypes the status vocabulary", () => {
    for (const rel of PROXIES) {
      const src = read(rel);
      expect(
        src,
        `${rel} defines its own classifyFinnhubStatus. A retyped vocabulary is ` +
          "exactly how /api/market and /api/finnhub came to give two different " +
          "answers for one upstream 429.",
      ).not.toMatch(/function\s+classifyFinnhubStatus/);
      expect(src, `${rel} must import the shared classifier`)
        .toMatch(/from\s+"@\/lib\/marketData\/finnhubUpstreamStatus"/);
    }
  });

  it("THE MEASURED FAILURE: /api/market checks res.ok before parsing", () => {
    const src = read("src/app/api/market/route.ts");
    expect(
      src,
      "/api/market parses the Finnhub body without checking res.ok. Finnhub " +
        "answers a 429 with an HTML page, so res.json() throws and a " +
        "recoverable RATE LIMITED is reported as a SyntaxError at HTTP 500.",
    ).toMatch(/if\s*\(\s*!res\.ok\s*\)/);
  });

  it("and never surfaces a bare String(err) as the whole truth", () => {
    // The original catch returned `String(err)` alone, which pointed every
    // reader at a JSON parser instead of at the request rate.
    const src = read("src/app/api/market/route.ts");
    expect(src).not.toMatch(/error:\s*String\(err\)\s*\}/);
  });

  it("the scans are not vacuous — they can see each defect when it exists", () => {
    expect(/function\s+classifyFinnhubStatus/.test("function classifyFinnhubStatus(s: number) {}")).toBe(true);
    expect(/if\s*\(\s*!res\.ok\s*\)/.test("const data = await res.json();")).toBe(false);
    expect(/error:\s*String\(err\)\s*\}/.test("{ price: null, error: String(err) }")).toBe(true);
  });
});
