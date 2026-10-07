import { describe, expect, it } from "vitest";
import { inspectEvidence } from "./inspectEvidence";

describe("Garden 19 §28 — one evidence class per selected object", () => {
  it("prints: stamped side FULL, inferred PARTIAL, no side DEGRADED", () => {
    expect(inspectEvidence({ kind: "PRINT", aggressorMethod: "PROVIDER", timeMs: 1, source: "coinbase" }).klass).toBe("FULL");
    expect(inspectEvidence({ kind: "PRINT", aggressorMethod: "TICK_RULE", timeMs: 1, source: null }).klass).toBe("PARTIAL");
    expect(inspectEvidence({ kind: "PRINT", aggressorMethod: "NONE", timeMs: 1, source: null }).klass).toBe("DEGRADED");
  });
  it("profile slice, anatomy, weather, derivatives, object, bar map their owners' facts", () => {
    expect(inspectEvidence({ kind: "SLICE", found: false, estimated: false, asOfSec: null, source: null }).klass).toBe("SILENT");
    expect(inspectEvidence({ kind: "SLICE", found: true, estimated: true, asOfSec: 10, source: null }).asOfMs).toBe(10_000);
    expect(inspectEvidence({ kind: "ANATOMY", basis: "VOLUME", asOfSec: null, source: null }).klass).toBe("PARTIAL");
    expect(inspectEvidence({ kind: "ANATOMY", basis: "UNMEASURED", asOfSec: null, source: null }).klass).toBe("SILENT");
    expect(inspectEvidence({ kind: "WEATHER", measured: true, derived: false, asOfMs: null, source: null }).klass).toBe("FULL");
    expect(inspectEvidence({ kind: "DERIVATIVES", drawn: true, fidelity: "DELAYED", sourceName: "Cboe", asOfMs: null }).klass).toBe("DEGRADED");
    expect(inspectEvidence({ kind: "DERIVATIVES", drawn: false, fidelity: null, sourceName: "x", asOfMs: null }).klass).toBe("SILENT");
    expect(inspectEvidence({ kind: "OBJECT", birthRead: false, asOfMs: null, source: null }).klass).toBe("PARTIAL");
    expect(inspectEvidence({ kind: "BAR", barRead: true, signedTapeReaches: true, asOfMs: null, source: null }).klass).toBe("FULL");
  });
  it("DEGRADED behaviour: a delayed / stale / replay feed lowers FULL and PARTIAL and says why", () => {
    for (const feed of ["DELAYED", "STALE", "REPLAY", "PROXY"] as const) {
      const e = inspectEvidence({ kind: "BAR", barRead: true, signedTapeReaches: true, asOfMs: null, source: null }, feed);
      expect(e.klass, feed).toBe("DEGRADED");
      expect(e.why).toContain(`the feed is ${feed}`);
      expect(e.feedNote).toMatch(new RegExp(feed));
    }
    // LIVE and PARTIAL feeds never lower a reading whose own sense is present
    expect(inspectEvidence({ kind: "BAR", barRead: true, signedTapeReaches: true, asOfMs: null, source: null }, "LIVE").klass).toBe("FULL");
    expect(inspectEvidence({ kind: "BAR", barRead: true, signedTapeReaches: true, asOfMs: null, source: null }, "PARTIAL").klass).toBe("FULL");
    // SILENT stays SILENT — a feed state never invents a reading
    expect(inspectEvidence({ kind: "SLICE", found: false, estimated: false, asOfSec: null, source: null }, "DELAYED").klass).toBe("SILENT");
  });
});
