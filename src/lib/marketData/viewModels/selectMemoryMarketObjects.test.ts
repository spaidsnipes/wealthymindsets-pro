import { describe, expect, it } from "vitest";
import type { CanonicalBarIdentity } from "../canonicalBar";
import type { ProfileMemoryVM } from "./selectProfileMemory";
import { memoryLevelKindOf, selectMemoryMarketObjects } from "./selectMemoryMarketObjects";

const ids: CanonicalBarIdentity[] = [60, 120, 180, 240, 300].map(t => ({
  barId: `ES|5m|${t * 1000}|e0`, symbolId: "ES", sessionId: "RTH_2026-01-13",
  timeframe: "5m", asOf: t * 1000, receivedAt: t * 1000 + 1,
  fidelity: "INDICATIVE", source: "yahoo", provenance: "REST_BACKFILL", truthEpoch: 0,
}));
const memory = (over: Partial<ProfileMemoryVM> = {}): ProfileMemoryVM => ({
  version: 1, drawn: true, reason: "DRAWN", sessionsRemembered: 1,
  levels: [
    { kind: "POC", price: 100, sessionsAgo: 1, formedAt: 120, tests: 2, naked: false, firstTestAt: 180, recentTestTimes: [180, 300] },
    { kind: "VAH", price: 104, sessionsAgo: 1, formedAt: 120, tests: 0, naked: true, firstTestAt: null, recentTestTimes: [] },
  ],
  ...over,
});

describe("Profile Memory levels become LEVEL MarketObjects", () => {
  it("each remembered level is a LEVEL born on the session's last bar, read verbatim", () => {
    const [poc, vah] = selectMemoryMarketObjects({ memory: memory(), identities: ids });
    expect(poc).toMatchObject({
      objectId: "MEMORY:ES|5m|120000|e0:POC", kind: "LEVEL", priceLow: 100, priceHigh: 100,
      birthBarId: "ES|5m|120000|e0", state: "TESTED", fidelityAtBirth: "INDICATIVE", sessionId: "RTH_2026-01-13",
    });
    expect(poc.testBarIds).toEqual(["ES|5m|180000|e0", "ES|5m|300000|e0"]);
    expect(poc.evidenceIds).toEqual(["ES|5m|120000|e0", "ES|5m|180000|e0", "ES|5m|300000|e0"]);
    expect(poc.lastResponseBarId).toBe("ES|5m|300000|e0");
    expect(poc.decay).toBe(3); // bars 180, 240, 300 since birth
    expect(vah.state).toBe("ALIVE");
    expect(vah.testBarIds).toEqual([]);
  });

  it("no admitted identity for the birth bar → no object, never a guessed id", () => {
    const m = memory({ levels: [{ kind: "POC", price: 1, sessionsAgo: 1, formedAt: 999, tests: 0, naked: true, firstTestAt: null, recentTestTimes: [] }] });
    expect(selectMemoryMarketObjects({ memory: m, identities: ids })).toEqual([]);
  });

  it("a refused or empty memory publishes nothing", () => {
    expect(selectMemoryMarketObjects({ memory: memory({ drawn: false, reason: "NO_PRIOR_SESSION", levels: [] }), identities: ids })).toEqual([]);
    expect(selectMemoryMarketObjects({ memory: null, identities: ids })).toEqual([]);
  });

  it("the kind reads back from the id; other objects are not memory", () => {
    expect(memoryLevelKindOf("MEMORY:ES|5m|120000|e0:VAL")).toBe("VAL");
    expect(memoryLevelKindOf("LEVEL:ES|5m|120000|e0:HIGH")).toBeNull();
  });
});
