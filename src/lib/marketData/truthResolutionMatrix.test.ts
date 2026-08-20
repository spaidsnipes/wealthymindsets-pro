import { describe, it, expect } from "vitest";
import {
  evaluateClaim,
  providerToResolution,
  RESOLUTION_LADDER,
} from "./truthResolutionMatrix";

/**
 * Founder canon rejection #3 (ABSORPTION / ICEBERG OVERCLAIM) and
 * rejection #6 (INTENT LANGUAGE) become enforceable-by-test here.
 * Every rendered surface that mentions absorption/iceberg/institutional
 * intent must pass through this matrix; regressions of the guarantee
 * fail here first.
 */

describe("truthResolutionMatrix", () => {
  describe("evaluateClaim", () => {
    it("OHLC_BAR is allowed at OHLC_ONLY source", () => {
      expect(evaluateClaim("OHLC_BAR", "OHLC_ONLY").allowed).toBe(true);
    });

    it("AGGRESSIVE_SIDE requires signed trades — softens to activity phrase at OHLC_ONLY", () => {
      const r = evaluateClaim("AGGRESSIVE_SIDE", "OHLC_ONLY");
      expect(r.allowed).toBe(false);
      expect(r.softened).toContain("trade activity");
      expect(r.reason).toContain("signed trades");
    });

    it("CVD is allowed on coinbase (SIGNED_TRADES); suppressed on yahoo (OHLC_ONLY)", () => {
      expect(evaluateClaim("CVD", providerToResolution("coinbase")).allowed).toBe(true);
      const yahooCvd = evaluateClaim("CVD", providerToResolution("yahoo"));
      expect(yahooCvd.allowed).toBe(false);
      expect(yahooCvd.softened).toContain("unavailable");
    });

    it("ABSORPTION is allowed at SIGNED_TRADES; softened to 'absorption characteristics' below", () => {
      expect(evaluateClaim("ABSORPTION", "SIGNED_TRADES").allowed).toBe(true);
      const quoteAbs = evaluateClaim("ABSORPTION", "QUOTE_SNAPSHOT");
      expect(quoteAbs.allowed).toBe(false);
      expect(quoteAbs.softened).toBe("absorption characteristics");
    });

    it("ABSORPTION_CONFIRMED needs execution queue; SIGNED_TRADES softens", () => {
      expect(evaluateClaim("ABSORPTION_CONFIRMED", "EXECUTION_QUEUE").allowed).toBe(true);
      const signed = evaluateClaim("ABSORPTION_CONFIRMED", "SIGNED_TRADES");
      expect(signed.allowed).toBe(false);
      expect(signed.softened).toBe("absorption characteristics");
    });

    it("ICEBERG needs execution queue; DEPTH_L2 softens", () => {
      expect(evaluateClaim("ICEBERG", "EXECUTION_QUEUE").allowed).toBe(true);
      const l2 = evaluateClaim("ICEBERG", "DEPTH_L2");
      expect(l2.allowed).toBe(false);
      expect(l2.softened).toContain("resting size");
    });

    it("LIQUIDITY_DEFENSE needs L2; SIGNED_TRADES softens", () => {
      const signed = evaluateClaim("LIQUIDITY_DEFENSE", "SIGNED_TRADES");
      expect(signed.allowed).toBe(false);
      expect(signed.softened).toContain("resting size");
    });

    it("SWEEP and REFILL need L2 — softened claims at lower fidelity", () => {
      const sweep = evaluateClaim("SWEEP", "SIGNED_TRADES");
      expect(sweep.allowed).toBe(false);
      expect(sweep.softened).toContain("aggressive move");
      const refill = evaluateClaim("REFILL", "SIGNED_TRADES");
      expect(refill.allowed).toBe(false);
      expect(refill.softened).toContain("returned");
    });

    it("INSTITUTIONAL_INTENT is DISALLOWED at every resolution — canon rejection #6", () => {
      for (const source of RESOLUTION_LADDER) {
        const r = evaluateClaim("INSTITUTIONAL_INTENT", source);
        expect(r.allowed).toBe(false);
        expect(r.softened).toBeNull();
        expect(r.reason).toContain("motive");
      }
    });
  });

  describe("providerToResolution", () => {
    it("maps known providers to their observable resolution class", () => {
      expect(providerToResolution("yahoo")).toBe("OHLC_ONLY");
      expect(providerToResolution("finnhub")).toBe("OHLC_ONLY");
      expect(providerToResolution("alpaca")).toBe("QUOTE_SNAPSHOT");
      expect(providerToResolution("coinbase")).toBe("SIGNED_TRADES");
      expect(providerToResolution("binance")).toBe("SIGNED_TRADES");
      expect(providerToResolution("polygon")).toBe("SIGNED_TRADES");
    });

    it("unavailable / null / empty maps to NONE (safest)", () => {
      expect(providerToResolution("unavailable")).toBe("NONE");
      expect(providerToResolution(null)).toBe("NONE");
      expect(providerToResolution(undefined)).toBe("NONE");
    });

    it("unknown providers default to OHLC_ONLY (safest under-claim)", () => {
      expect(providerToResolution("some-new-provider")).toBe("OHLC_ONLY");
    });
  });
});
