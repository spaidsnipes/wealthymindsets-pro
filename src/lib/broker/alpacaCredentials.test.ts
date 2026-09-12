import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { stripComments } from "@/lib/sourceScan";
import {
  hasAlpacaLiveCredentials,
  resolveAlpacaLiveCredentials,
  hasAlpacaPaperCredentials,
  resolveAlpacaPaperCredentials,
} from "./alpacaCredentials";

const REPO_ROOT_A = path.resolve(__dirname, "..", "..", "..");

describe("Alpaca live credential resolution", () => {
  it("prefers the canonical complete pair", () => {
    expect(resolveAlpacaLiveCredentials({
      ALPACA_KEY: " canonical-key ",
      ALPACA_SECRET: " canonical-secret ",
      ALPACA_BROKERAGE_KEY: "legacy-key",
      ALPACA_BROKERAGE_KEY_SECRET_: "legacy-secret",
    })).toEqual({ key: "canonical-key", secret: "canonical-secret", source: "canonical" });
  });

  it("accepts the complete legacy Cloudflare pair", () => {
    expect(resolveAlpacaLiveCredentials({
      ALPACA_BROKERAGE_KEY: "legacy-key",
      ALPACA_BROKERAGE_KEY_SECRET_: "legacy-secret",
    })).toEqual({ key: "legacy-key", secret: "legacy-secret", source: "legacy" });
  });

  it("fails closed instead of mixing incomplete pairs", () => {
    const env = { ALPACA_KEY: "canonical-key", ALPACA_BROKERAGE_KEY_SECRET_: "legacy-secret" };
    expect(resolveAlpacaLiveCredentials(env)).toEqual({ key: "", secret: "", source: "missing" });
    expect(hasAlpacaLiveCredentials(env)).toBe(false);
  });
});

/**
 * THE SAME DEFECT THE FINNHUB UNDERSCORE WAS, ONE PROVIDER OVER.
 *
 * Measured on production 2026-09-11: /api/broker/readiness reported
 * alpaca-paper BLOCKED on ALPACA_PAPER_KEY / ALPACA_PAPER_SECRET while the
 * host carried ALPACA_PAPER_TRADE_API_KEY / ALPACA_PAPER_TRADE_SECRET_KEY.
 *
 * `.env.example` had documented this exact row — "ALPACA_PAPER_TRADE_API_KEY
 * → ALPACA_PAPER_KEY — Rename in one place" — as a pre-cutover TODO. The
 * cutover happened; the row was never resolved; paper trading stayed dark. A
 * reconciliation that lives only in a comment is not a reconciliation, which
 * is why the accepted names are now DECLARED in PROVIDER_REQUIREMENTS and
 * read by this resolver.
 *
 * Deliberately a PAIR resolver, not per-name aliasing: half of one pair plus
 * half of the other authenticates nothing, and would reach Alpaca as an
 * opaque 401 rather than an honest NOT CONFIGURED.
 */
describe("Alpaca paper credential resolution", () => {
  it("THE MEASURED FAILURE: accepts the complete pair the host actually carries", () => {
    expect(resolveAlpacaPaperCredentials({
      ALPACA_PAPER_TRADE_API_KEY: "host-key",
      ALPACA_PAPER_TRADE_SECRET_KEY: "host-secret",
    })).toEqual({ key: "host-key", secret: "host-secret", source: "legacy" });
  });

  it("prefers the canonical complete pair and trims it", () => {
    expect(resolveAlpacaPaperCredentials({
      ALPACA_PAPER_KEY: " canonical-key ",
      ALPACA_PAPER_SECRET: " canonical-secret ",
      ALPACA_PAPER_TRADE_API_KEY: "host-key",
      ALPACA_PAPER_TRADE_SECRET_KEY: "host-secret",
    })).toEqual({ key: "canonical-key", secret: "canonical-secret", source: "canonical" });
  });

  it("fails closed instead of mixing incomplete pairs", () => {
    const env = {
      ALPACA_PAPER_KEY: "canonical-key",
      ALPACA_PAPER_TRADE_SECRET_KEY: "host-secret",
    };
    expect(resolveAlpacaPaperCredentials(env)).toEqual({ key: "", secret: "", source: "missing" });
    expect(hasAlpacaPaperCredentials(env)).toBe(false);
  });

  it("never returns an empty-string credential as if it were usable", () => {
    // "" would sign a request with no key and surface as an upstream 401 —
    // a provider failure masking a configuration failure.
    expect(hasAlpacaPaperCredentials({})).toBe(false);
    expect(resolveAlpacaPaperCredentials({ ALPACA_PAPER_KEY: "  " }).source).toBe("missing");
  });

  it("does not read the LIVE pair — paper and live must never cross", () => {
    // Resolving a live key into the paper lane would place real money behind
    // a surface the whole app labels PAPER_ONLY.
    expect(hasAlpacaPaperCredentials({
      ALPACA_KEY: "live-key",
      ALPACA_SECRET: "live-secret",
      ALPACA_BROKERAGE_KEY: "legacy-live",
      ALPACA_BROKERAGE_KEY_SECRET_: "legacy-live-secret",
    })).toBe(false);
  });
});

describe("the paper declaration reaches the wire, not only the receipt", () => {
  it("THE HALF-FIX GUARD: no paper consumer re-derives its own env names", () => {
    for (const rel of [
      "src/app/api/alpaca-trading/route.ts",
      "src/app/api/alpaca/trade/route.ts",
      "src/lib/broker/adapters/alpacaAdapter.ts",
    ]) {
      const src = stripComments(fs.readFileSync(path.join(REPO_ROOT_A, rel), "utf8"));
      expect(
        src,
        `${rel} reads process.env.ALPACA_PAPER_* directly. A hand-written name ` +
          "cannot see the pair declared in PROVIDER_REQUIREMENTS, which is how " +
          "readiness could go READY while this route answered NOT CONFIGURED.",
      ).not.toMatch(/process\.env\.ALPACA_PAPER_(KEY|SECRET)/);
      expect(src, `${rel} must resolve the paper pair through the canonical resolver`)
        .toMatch(/(resolve|has)AlpacaPaperCredentials\(/);
    }
  });

  it("the scan is not vacuous — it can see the defect when it exists", () => {
    const defect = 'const k = process.env.ALPACA_PAPER_KEY ?? "";';
    expect(/process\.env\.ALPACA_PAPER_(KEY|SECRET)/.test(stripComments(defect))).toBe(true);
  });
});
