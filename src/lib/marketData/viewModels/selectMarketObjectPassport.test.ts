/**
 * selectMarketObjectPassport tests — the Passport must expose each canonical
 * dimension's DNA verbatim from the sealed state, pick the strongest evidence
 * fidelity, reverse every value to an evidence ref, and degrade honestly when
 * a dimension (or the whole state) is unresolved. It must NEVER fabricate.
 */

import { describe, it, expect } from "vitest";
import {
  sealCanonicalMarketState,
  type CanonicalMarketStateInput,
  type MarketStateDimension,
} from "../canonicalMarketState";
import {
  selectMarketObjectPassport,
  MARKET_OBJECT_PASSPORT_VERSION,
} from "./selectMarketObjectPassport";

const unknown = (reason: string): MarketStateDimension => ({
  resolution: "UNKNOWN",
  value: null,
  confidence: null,
  evidence: [],
  contradictions: [],
  unknowns: [reason],
});

const input = (overrides: Partial<CanonicalMarketStateInput> = {}): CanonicalMarketStateInput => ({
  snapshotId: "ms-btc-001",
  capturedAt: 10_000,
  availableAt: 10_005,
  instrumentId: "BTC-USD",
  normalizedSymbol: "BTC",
  executableIdentity: "BTC-USD",
  assetClass: "crypto",
  exchange: "COINBASE",
  session: "24X7",
  timeframeContext: ["5m", "1h"],
  qualityState: "PARTIAL",
  price: { last: 65_000, bid: null, ask: null, eventAt: 9_990, availableAt: 9_995 },
  coverage: [],
  direction: unknown("Direction engine not resolved."),
  location: unknown("Location engine not resolved."),
  aggression: unknown("Aggression engine not resolved."),
  regime: unknown("Regime engine not resolved."),
  structure: unknown("Structure engine not resolved."),
  volatility: unknown("Volatility engine not resolved."),
  profile: unknown("Profile engine not resolved."),
  orderFlow: unknown("Order-flow evidence unavailable."),
  contradictions: [],
  unknowns: ["Direction", "Location", "Aggression"],
  ...overrides,
});

const resolvedDirection: MarketStateDimension = {
  resolution: "RESOLVED",
  value: "UP",
  confidence: 0.82,
  evidence: [
    {
      eventId: "evt-1",
      observedAt: 9_800,
      availableAt: 9_820,
      source: "polygon",
      fidelity: "DERIVED",
      basis: "higher-high sequence on 5m",
    },
    {
      eventId: "evt-2",
      observedAt: 9_900,
      availableAt: 9_950,
      source: "finnhub",
      fidelity: "OBSERVED",
      basis: "print above prior swing",
    },
  ],
  contradictions: ["5m upper wick rejection"],
  unknowns: [],
};

describe("selectMarketObjectPassport", () => {
  it("exposes a stable version", () => {
    expect(MARKET_OBJECT_PASSPORT_VERSION).toBe("wm.market-object-passport.v1");
  });

  it("returns an empty, honest passport set for a null state", () => {
    const vm = selectMarketObjectPassport(null);
    expect(vm.objects).toHaveLength(0);
    expect(vm.snapshotId).toBeNull();
    expect(vm.qualityState).toBe("UNKNOWN");
    expect(vm.resolvedCount).toBe(0);
    expect(vm.totalCount).toBe(0);
  });

  it("issues a passport for all eight canonical dimensions", () => {
    const vm = selectMarketObjectPassport(sealCanonicalMarketState(input()));
    expect(vm.totalCount).toBe(8);
    expect(vm.objects.map((o) => o.id)).toEqual([
      "direction",
      "location",
      "structure",
      "aggression",
      "orderFlow",
      "regime",
      "profile",
      "volatility",
    ]);
  });

  it("carries snapshot provenance from the sealed state", () => {
    const vm = selectMarketObjectPassport(sealCanonicalMarketState(input()));
    expect(vm.snapshotId).toBe("ms-btc-001");
    expect(vm.capturedAt).toBe(10_000);
    expect(vm.qualityState).toBe("PARTIAL");
  });

  it("marks an unresolved dimension UNRESOLVED with its exact unknown", () => {
    const vm = selectMarketObjectPassport(sealCanonicalMarketState(input()));
    const dir = vm.objects.find((o) => o.id === "direction")!;
    expect(dir.lifecycle).toBe("UNRESOLVED");
    expect(dir.value).toBeNull();
    expect(dir.fidelity).toBeNull();
    expect(dir.unknowns).toContain("Direction engine not resolved.");
    expect(dir.summary).toMatch(/unresolved/i);
  });

  it("marks a FORMING dimension when resolution is PARTIAL", () => {
    const vm = selectMarketObjectPassport(
      sealCanonicalMarketState(
        input({
          location: {
            resolution: "PARTIAL",
            value: null,
            confidence: 0.4,
            evidence: [],
            contradictions: [],
            unknowns: ["awaiting acceptance confirmation"],
          },
        }),
      ),
    );
    const loc = vm.objects.find((o) => o.id === "location")!;
    expect(loc.lifecycle).toBe("FORMING");
    expect(loc.value).toBeNull();
    expect(loc.summary).toMatch(/forming/i);
    expect(loc.summary).toMatch(/awaiting acceptance confirmation/i);
  });

  it("resolves a dimension with value, confidence, lineage and contradiction", () => {
    const vm = selectMarketObjectPassport(
      sealCanonicalMarketState(input({ direction: resolvedDirection })),
    );
    const dir = vm.objects.find((o) => o.id === "direction")!;
    expect(dir.lifecycle).toBe("RESOLVED");
    expect(dir.value).toBe("UP");
    expect(dir.confidence).toBe(0.82);
    expect(dir.evidence).toHaveLength(2);
    expect(dir.contradictions).toContain("5m upper wick rejection");
    expect(vm.resolvedCount).toBe(1);
  });

  it("picks the STRONGEST evidence fidelity (OBSERVED over DERIVED)", () => {
    const vm = selectMarketObjectPassport(
      sealCanonicalMarketState(input({ direction: resolvedDirection })),
    );
    const dir = vm.objects.find((o) => o.id === "direction")!;
    expect(dir.fidelity).toBe("OBSERVED");
  });

  it("lists distinct evidence sources in first-seen order", () => {
    const vm = selectMarketObjectPassport(
      sealCanonicalMarketState(input({ direction: resolvedDirection })),
    );
    const dir = vm.objects.find((o) => o.id === "direction")!;
    expect(dir.sources).toEqual(["polygon", "finnhub"]);
  });

  it("every resolved value reverses to at least one evidence ref (reversibility moat)", () => {
    const vm = selectMarketObjectPassport(
      sealCanonicalMarketState(input({ direction: resolvedDirection })),
    );
    for (const obj of vm.objects) {
      if (obj.lifecycle === "RESOLVED") {
        expect(obj.evidence.length).toBeGreaterThan(0);
        expect(obj.value).not.toBeNull();
      }
    }
  });

  it("summary of a resolved object names the value and its fidelity", () => {
    const vm = selectMarketObjectPassport(
      sealCanonicalMarketState(input({ direction: resolvedDirection })),
    );
    const dir = vm.objects.find((o) => o.id === "direction")!;
    expect(dir.summary).toContain("UP");
    expect(dir.summary).toMatch(/observed evidence/i);
  });

  /* Real from-USE defect (2026-09-03): every UNRESOLVED Passport row on prod
   * /charts ended with ".." because producers supply `unknowns` as complete
   * sentences and summarise() appended another period. */
  describe("summary punctuation", () => {
    it("never emits a double period on an unresolved row", () => {
      const vm = selectMarketObjectPassport(sealCanonicalMarketState(input()));
      for (const o of vm.objects) {
        expect(o.summary).not.toMatch(/\.\./);
        expect(o.summary.endsWith(".")).toBe(true);
      }
    });

    it("handles an unknown reason that has no trailing period", () => {
      const vm = selectMarketObjectPassport(
        sealCanonicalMarketState(input({ direction: unknown("tape offline") })),
      );
      const dir = vm.objects.find(o => o.id === "direction")!;
      expect(dir.summary).toBe("Direction unresolved — tape offline.");
    });

    it("never emits a double period on a resolved row whose value ends in a period", () => {
      const vm = selectMarketObjectPassport(
        sealCanonicalMarketState(
          input({ direction: { ...resolvedDirection, value: "UP." } }),
        ),
      );
      const dir = vm.objects.find(o => o.id === "direction")!;
      expect(dir.summary).not.toMatch(/\.\./);
    });
  });
});
