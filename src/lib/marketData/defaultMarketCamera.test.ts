/**
 * The default camera must never point at a market WM cannot hear.
 *
 * THE BUG THESE TESTS PIN: `/charts` defaulted to `NQ1!`, a symbol with no
 * tape wire in the build, so every W invention reported UNMEASURED on the
 * product's front door — a guaranteed "conventional candles surrounded by
 * prose" failure that no amount of selector work could fix.
 */
import { describe, it, expect } from "vitest";
import {
  CAMERA_CANDIDATES,
  FALLBACK_CAMERA_SYMBOL,
  resolveDefaultCameraSymbol,
  type MarketCameraCandidate,
} from "./defaultMarketCamera";
import { hasVerifiedAggressorTape } from "./capabilityRegistry";

describe("resolveDefaultCameraSymbol", () => {
  it("THE REGRESSION: never returns a symbol whose tape is uncertified", () => {
    const chosen = resolveDefaultCameraSymbol();
    if (chosen === FALLBACK_CAMERA_SYMBOL) return; // registry certifies nothing
    const candidate = CAMERA_CANDIDATES.find((c) => c.symbol === chosen);
    expect(candidate, "chose a symbol that is not a declared candidate").toBeDefined();
    expect(hasVerifiedAggressorTape(candidate!.tapeSource)).toBe(true);
  });

  it("on the shipping registry, resolves to a certified-tape market", () => {
    // Not asserting the literal string: the point is that the answer is
    // derived. Asserting "BTC" would re-hardcode what this module removed.
    expect(resolveDefaultCameraSymbol()).not.toBe(FALLBACK_CAMERA_SYMBOL);
  });

  it("a futures-shaped candidate (no wire at all) is ineligible", () => {
    const futuresOnly: MarketCameraCandidate[] = [{ symbol: "NQ1!", tapeSource: null }];
    expect(resolveDefaultCameraSymbol(futuresOnly)).toBe(FALLBACK_CAMERA_SYMBOL);
  });

  it("prefers the earlier candidate when both are certified", () => {
    const ordered: MarketCameraCandidate[] = [
      { symbol: "ETH", tapeSource: "coinbase" },
      { symbol: "BTC", tapeSource: "coinbase" },
    ];
    expect(resolveDefaultCameraSymbol(ordered)).toBe("ETH");
  });

  it("skips a deaf candidate to reach a certified one behind it", () => {
    const mixed: MarketCameraCandidate[] = [
      { symbol: "NQ1!", tapeSource: null },
      { symbol: "BTC", tapeSource: "coinbase" },
    ];
    expect(resolveDefaultCameraSymbol(mixed)).toBe("BTC");
  });

  it("an empty candidate list degrades to the historical default, not to nothing", () => {
    expect(resolveDefaultCameraSymbol([])).toBe(FALLBACK_CAMERA_SYMBOL);
  });

  it("every declared candidate uses a symbol spelling the tape map can key on", () => {
    // The candidate list uses COINBASE_PRODUCT key shapes (no hyphen) so the
    // default camera never depends on spelling resolution to hear the tape.
    for (const candidate of CAMERA_CANDIDATES) {
      expect(candidate.symbol, `${candidate.symbol} is not a tape-map key shape`)
        .not.toContain("-");
    }
  });
});
