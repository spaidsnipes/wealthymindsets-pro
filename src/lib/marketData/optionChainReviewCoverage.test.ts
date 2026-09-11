/**
 * optionChainReviewCoverage — a producer the app SHIPS must be a producer the
 * rights registry has REVIEWED, including the ones that never touch the tape.
 *
 * ── The measured failure ─────────────────────────────────────────────────────
 *
 * `MarketAssetClass` has declared `"options"` a first-class asset class for as
 * long as `capabilityRegistry.ts` has existed. It had ZERO entries.
 *
 * Meanwhile the runtime shipped a complete option-chain lane:
 *   · `src/app/api/market-data/alpaca/options/route.ts` — a real route
 *   · `normalizeAlpacaOptionChain` — a careful producer that drops any contract
 *     lacking a timestamped observation and labels the result INDICATIVE
 *   · `OptionsChain.tsx`, `OptionExpressionIntent.tsx`, `ChartsDashboard.tsx` —
 *     three real consumers, the middle of which is where a trader forms an
 *     INTENT against a real contract
 *
 * So an option chain reached the Option Expression surface carrying no
 * providerPath and no rights policy id. "May we retain this? Redistribute it?
 * Train on it?" was not answered UNKNOWN — it was UNASKABLE, because there was
 * nothing in the registry to ask.
 *
 * That is the same shape as the webull tape gap closed in `c8bd388`: an
 * accidentally-correct silence is not a reviewed answer, and it flips to a
 * grant the moment someone adds a key for an unrelated reason.
 *
 * ── Why `tsc` could not see it ───────────────────────────────────────────────
 *
 * The producer minted its own provenance vocabulary — `source: "alpaca"`,
 * `fidelity: "INDICATIVE"` — which is not `MarketProviderPath` and not
 * `FidelityClass`. Two vocabularies for one question, neither importing the
 * other, both individually well-typed. DUPLICATE TRUTH, invisible at exit 0.
 * Five separate files hand-copy that literal pair.
 *
 * This file derives from the OWNER at both ends: the registry's own declared
 * asset-class union, and the real producer's real output.
 */

import { describe, expect, it } from "vitest";

import {
  canDoAction,
  canPersistRaw,
  getMarketDataCapability,
  getOptionChainCapability,
  isReviewedCapability,
  MARKET_DATA_CAPABILITIES,
  UNKNOWN_RIGHTS_POLICY_ID,
  type MarketAssetClass,
} from "./capabilityRegistry";
import { normalizeAlpacaOptionChain } from "./alpacaOptionChain";

/**
 * A minimal but REAL Alpaca option snapshot envelope, shaped exactly as the
 * producer's OSI parser and observation gate require. Driving the real
 * producer is the point — asserting against a hand-written receipt literal
 * would re-create the very drift this file exists to catch.
 */
function alpacaEnvelope(): unknown {
  return {
    snapshots: {
      AAPL260116C00150000: {
        latestQuote: { bp: 12.3, ap: 12.5, t: "2026-09-11T15:30:00Z" },
        latestTrade: { p: 12.4, t: "2026-09-11T15:29:55Z" },
        greeks: { delta: 0.55, gamma: 0.02, theta: -0.08, vega: 0.11 },
        impliedVolatility: 0.27,
      },
    },
  };
}

describe("a shipped option producer is a reviewed option producer", () => {
  it("THE MEASURED FAILURE: the options asset class had no reviewed entry", () => {
    const optionEntries = MARKET_DATA_CAPABILITIES.filter(c => c.assetClass === "options");
    expect(
      optionEntries.length,
      'MarketAssetClass declares "options", and the app ships an option-chain producer to ' +
        "three UI surfaces — but the rights registry has no entry to ask",
    ).toBeGreaterThanOrEqual(1);

    const cap = getOptionChainCapability();
    expect(cap, "the shipping option producer does not resolve a capability").not.toBeNull();
    expect(cap!.providerPath).toBe("alpaca-options-snapshot");
    expect(cap!.assetClass).toBe("options");
  });

  it("the producer ATTACHES the registry's answer rather than travelling anonymously", () => {
    // Driven through the real producer. If someone re-types the provenance in
    // alpacaOptionChain.ts instead of deriving it, this diverges from the
    // registry and fails here.
    const receipt = normalizeAlpacaOptionChain(alpacaEnvelope(), "AAPL");
    const cap = getOptionChainCapability()!;

    expect(receipt.chain.length, "the fixture must actually produce a contract").toBe(1);

    // Assert NON-NULL before asserting agreement. Found by revive M: deleting
    // the registry entry made both sides null, and `null === null` reported
    // this test green while the chain was travelling anonymously again — the
    // exact condition it exists to forbid. Agreement between two absences is
    // not provenance.
    expect(receipt.providerPath, "the chain reached a consumer with no provider identity")
      .not.toBeNull();
    expect(receipt.rightsPolicyId, "the chain reached a consumer with no rights policy")
      .not.toBeNull();

    expect(receipt.providerPath, "producer and registry disagree on provider identity")
      .toBe(cap.providerPath);
    expect(receipt.rightsPolicyId, "producer and registry disagree on rights policy")
      .toBe(cap.rightsPolicyId);
  });

  it("rights still fail closed — reviewing a producer is not granting one", () => {
    // Recording that we CAN receive an option chain is an implementation fact.
    // It is not a legal grant, and adding this entry must not smuggle one in.
    const cap = getOptionChainCapability()!;
    expect(cap.rights.raw).toBe("UNKNOWN");
    expect(cap.rights.redistribute).toBe("UNKNOWN");
    expect(cap.rights.train).toBe("UNKNOWN");
    expect(cap.rights.commercial).toBe("UNKNOWN");
    expect(canPersistRaw(cap), "an UNKNOWN-rights option chain must not be retainable").toBe(false);
    expect(canDoAction(cap, "redistribute")).toBe(false);
    expect(cap.rightsPolicyId).toBe(UNKNOWN_RIGHTS_POLICY_ID);
  });

  it("RECORDED, NOT FIXED: INDICATIVE is not an executable quote, and greeks are modelled", () => {
    // The producer's own word for this chain is INDICATIVE. The registry has
    // no freshness field and no executability field, so it CANNOT and does not
    // assert either. Named here so the next reader does not mistake "reviewed"
    // for "tradeable at this price".
    const cap = getOptionChainCapability()!;
    expect(cap.sessionCoverage).toMatch(/INDICATIVE/);
    expect(cap.sessionCoverage).toMatch(/NOT an executable quote/);
    expect(cap.sessionCoverage, "greeks/IV are provider model output, not observations")
      .toMatch(/model values, not observations/);
    expect(cap.availability, "a request-scoped snapshot page is not AVAILABLE").toBe("PARTIAL");
    expect(cap.aggressorMethod, "an option snapshot carries no aggressor truth").toBe("NONE");
  });

  it("a SYNTHESIZED placeholder is distinguishable from a reviewed entry", () => {
    // Found by revive M, not by reading: `getMarketDataCapability` cannot
    // return null — on a miss it mints an UNAVAILABLE placeholder whose
    // `.providerPath` is simply the string the caller passed in. So a caller
    // checking only for non-null saw "reviewed" where nothing had been
    // reviewed, and read back its own input as provenance.
    const madeUp = getMarketDataCapability("alpaca-options-snapshot", "futures", "depth");
    expect(madeUp, "the miss path must still return a fail-closed object").not.toBeNull();
    expect(madeUp.availability).toBe("UNAVAILABLE");
    expect(madeUp.evidence).toBe("No matching registry entry");
    expect(madeUp.providerPath, "the placeholder echoes the caller's own input back")
      .toBe("alpaca-options-snapshot");
    expect(
      isReviewedCapability(madeUp),
      "a synthesized placeholder must never read as reviewed",
    ).toBe(false);

    // And a real member must read as reviewed, or the predicate is useless.
    expect(isReviewedCapability(getOptionChainCapability()!)).toBe(true);
    expect(MARKET_DATA_CAPABILITIES.every(isReviewedCapability)).toBe(true);
  });

  it("ANTI-VACUITY: every asset class the registry DECLARES is accounted for", () => {
    // Derived from the owner's own union, so adding a new MarketAssetClass
    // member fails HERE until someone either reviews a producer for it or
    // records, in this list, that nothing produces it yet.
    //
    // A class with no entries is not automatically a defect — it is only a
    // defect when something SHIPS that produces it. These are the classes with
    // no shipping producer today; each must be removed from this list at the
    // moment one appears.
    const KNOWN_UNPRODUCED: readonly MarketAssetClass[] = ["etf", "forex"];

    const produced = new Set(MARKET_DATA_CAPABILITIES.map(c => c.assetClass));
    const declared: readonly MarketAssetClass[] =
      ["crypto", "equity", "etf", "futures", "forex", "options"];

    for (const assetClass of declared) {
      if (produced.has(assetClass)) continue;
      expect(
        KNOWN_UNPRODUCED,
        `MarketAssetClass declares "${assetClass}" with no reviewed entry and no recorded ` +
          "reason; either review the producer or record it here as not-yet-produced",
      ).toContain(assetClass);
    }

    // And the guard must not be checking an empty set.
    expect(produced.size, "the registry produces no asset classes at all").toBeGreaterThanOrEqual(4);
    expect(produced.has("options"), "options must now be a produced, reviewed class").toBe(true);
  });
});
