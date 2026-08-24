import { describe, it, expect } from "vitest";
import { aggregateSourceCertifications } from "./sourceCertificationRegistry";
import { certifySource } from "./sourceCapabilityCertification";

describe("aggregateSourceCertifications — honest fleet roll-up", () => {
  it("empty fleet → zero certified, no full cert, CVD UNAVAILABLE", () => {
    const fleet = aggregateSourceCertifications([]);
    expect(fleet.totalCertified).toBe(0);
    expect(fleet.anyFullyCertified).toBe(false);
    expect(fleet.bestCvd).toBe("UNAVAILABLE");
    expect(fleet.summaries).toEqual([]);
  });

  it("sums certified capabilities across sources without rounding up", () => {
    const a = certifySource("moomoo", [{ capability: "PRICE", status: "ACTIVE_CERTIFIED" }]);
    const b = certifySource("webull", [
      { capability: "PRICE", status: "ACTIVE_CERTIFIED" },
      { capability: "BARS", status: "ACTIVE_CERTIFIED" },
    ]);
    const fleet = aggregateSourceCertifications([a, b]);
    expect(fleet.totalCertified).toBe(3);
    expect(fleet.anyFullyCertified).toBe(false);
    expect(fleet.summaries).toHaveLength(2);
  });

  it("bestCvd is the MAX any single source earned — never a cross-source blend", () => {
    // moomoo has executed volume only; webull has aggressor side only.
    // Neither source alone earns DIRECT, so the fleet must NOT fabricate it.
    const moomoo = certifySource("moomoo", [{ capability: "EXECUTED_VOLUME", status: "ACTIVE_CERTIFIED" }]);
    const webull = certifySource("webull", [{ capability: "AGGRESSOR_SIDE", status: "ACTIVE_CERTIFIED" }]);
    const fleet = aggregateSourceCertifications([moomoo, webull]);
    expect(moomoo.cvd).toBe("UNAVAILABLE");
    expect(webull.cvd).toBe("UNAVAILABLE");
    expect(fleet.bestCvd).toBe("UNAVAILABLE"); // legs across feeds never combine
  });

  it("bestCvd = DIRECT only when ONE source legitimately earned it", () => {
    const strong = certifySource("moomoo", [
      { capability: "EXECUTED_VOLUME", status: "ACTIVE_CERTIFIED" },
      { capability: "AGGRESSOR_SIDE", status: "ACTIVE_CERTIFIED" },
    ]);
    const weak = certifySource("webull", [{ capability: "PRICE", status: "ACTIVE_CERTIFIED" }]);
    const fleet = aggregateSourceCertifications([strong, weak]);
    expect(strong.cvd).toBe("DIRECT");
    expect(fleet.bestCvd).toBe("DIRECT");
  });

  it("PROXY outranks UNAVAILABLE but never masquerades as DIRECT", () => {
    const proxy = certifySource("moomoo", [
      { capability: "EXECUTED_VOLUME", status: "ACTIVE_CERTIFIED" },
      { capability: "AGGRESSOR_SIDE", status: "ACTIVE_DEGRADED" },
    ]);
    const nothing = certifySource("webull", []);
    const fleet = aggregateSourceCertifications([proxy, nothing]);
    expect(proxy.cvd).toBe("PROXY");
    expect(fleet.bestCvd).toBe("PROXY");
  });
});
