/**
 * A PROOF SCENE WRITES NOTHING (coordinator order 2026-10-09).
 *
 * Measured on serving 559884e: a chart load set ten localStorage keys and
 * POSTed the coverage ledger with no user action; under `scene=…` that meant a
 * verification sweep grew the trader's own records. Every on-load writer now
 * asks the ONE hold (`proofSceneHoldsWrites`). This sentinel runs each owner's
 * real write path in a "browser" whose URL is a proof scene and asserts ZERO
 * storage writes and ZERO POSTs — then runs the same paths on a plain URL and
 * asserts they DO write (a plain chart is unchanged, and the test can see a write).
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";

import { MARKET_EVENT_SCHEMA_VERSION, type CanonicalMarketEvent } from "@/lib/marketData/marketEvent";

const read = (p: string) => readFileSync(path.join(process.cwd(), "src", p), "utf8");

function browser(search: string) {
  const m = new Map<string, string>();
  const calls = { set: [] as string[], remove: [] as string[], post: [] as string[], get: [] as string[] };
  const storage = {
    getItem: (k: string) => m.get(k) ?? null,
    setItem: (k: string, v: string) => { calls.set.push(k); m.set(k, String(v)); },
    removeItem: (k: string) => { calls.remove.push(k); m.delete(k); },
    key: (i: number) => [...m.keys()][i] ?? null, get length() { return m.size; }, clear: () => { calls.remove.push("*"); m.clear(); },
  };
  const fetchSpy = vi.fn(async (url: string, init?: RequestInit) => {
    ((init?.method ?? "GET") === "GET" ? calls.get : calls.post).push(String(url));
    return new Response(JSON.stringify({ record: null }), { status: 200 });
  });
  vi.stubGlobal("window", {
    location: { search, pathname: "/charts" }, localStorage: storage, sessionStorage: storage,
    addEventListener: () => {}, removeEventListener: () => {}, dispatchEvent: () => true,
  });
  vi.stubGlobal("localStorage", storage);
  vi.stubGlobal("fetch", fetchSpy);
  return calls;
}

const trade = (): CanonicalMarketEvent => ({
  schemaVersion: MARKET_EVENT_SCHEMA_VERSION, normalizationVersion: "wm-normalizer.v1", eventId: `coinbase:BTC-USD:${Date.now()}`, sourceEventId: "100",
  symbol: "BTC", normalizedSymbol: "BTC", executableIdentity: "BTC-USD", assetClass: "crypto", exchange: "COINBASE", providerClass: "EXCHANGE",
  providerPath: "coinbase-client-ws", eventType: "TRADE", timestampExchange: Date.now(), timestampProvider: Date.now(), timestampReceived: Date.now(),
  timestampProcessed: Date.now(), availableAt: Date.now(), sequenceId: 100, sequenceState: "CONTIGUOUS", price: 65_000, size: 0.25, aggressorSide: "BUY",
  aggressorMethod: "MAKER_SIDE_INVERTED", aggressorConfidence: 1, sourceClass: "PRIMARY", dataMode: "LIVE", fidelityClass: "OBSERVED", rightsPolicyId: "wm.rights.unknown.v1",
} as CanonicalMarketEvent);

/** Run every lib-level on-load writer through its real path, for 20 s of timers. */
async function runOwners() {
  const symbols = await import("@/lib/marketData/sessionSymbolStore");
  symbols.recordSessionTrade("BTC-USD", "coinbase", { side: "buy", size: 1, time: Date.now() }, false);
  symbols.pushCvdSample("BTC-USD", "coinbase");
  const living = await import("@/lib/chart/livingMarket");
  living.writeLivingMarket("STILL");
  const nectar = await import("@/lib/marketData/sessionNectar");
  nectar.ingestSessionNectarEvent(trade());
  const continuity = await import("@/lib/traderMemory/decisionContinuity");
  const minted = (await import("@/lib/traderMemory/decisionIdentity")).mintDecisionId({ cause: "PERMISSION_GRANTED", deviceId: "dev_test", nowMs: 1_700_000_000_000, nonce: "11111111-2222-3333-4444-555555555555" });
  if (!minted.ok) throw new Error("fixture decision could not be minted");
  const saved = continuity.writeSceneDecision({ owner: "member-1", underlying: "NQ1!", identity: minted.identity });
  const owner = await import("@/lib/journal/managementOwner");
  owner.resetManagementOwnerForTests();
  owner.setManagementOwner("member-1", undefined, "member-1");
  owner.setManagementOwner("member-1", undefined, "member-1");
  await vi.advanceTimersByTimeAsync(20_000);
  return { saved };
}

afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); vi.resetModules(); });

// ORDER MATTERS: the coverage collector lives once per realm (a non-configurable
// global, by design), so its checkpoint is wired by whichever case imports it
// first. The plain case runs first and proves the wiring writes; the scene
// cases then prove the SAME wiring holds.
describe("a plain chart is unchanged (and this test can see a write)", () => {
  it("the same owners DO write on a plain URL: the symbol store, the living-market mode, the coverage record + its POST, the decision identity", async () => {
    vi.useFakeTimers();
    const calls = browser("?symbol=NQ1%21&tf=5m");
    await runOwners();
    for (const key of ["wm:session-symbol-store:v1", "wm_livingMarket", "wm:nectar:coverage-continuity:v1"]) expect(calls.set, key).toContain(key);
    expect(calls.set.some(k => k.startsWith("wm:decision-identity:v1:"))).toBe(true);
    expect(calls.post).toContain("/api/market-memory/coverage");
    // Fix A: with no legacy owner stamp present, a sign-in resolution removes nothing.
    expect(calls.remove).toEqual([]);
  });
});

describe("a proof scene writes nothing", () => {
  it.each([
    ["scene=clean", "?symbol=NQ1%21&tf=5m&scene=clean&on=fvg"],
    ["a door (on= / select=)", "?symbol=NQ1%21&tf=5m&on=fvg&select=fvg%3AFVG%7CNQ1%21%7C5m%7C1791478200000%7CBEARISH%7Cv1"],
    ["lens-fixture", "?symbol=NQ1%21&tf=5m&scene=lens-fixture&state=HEAVY"],
  ])("%s → zero storage writes, zero removes, zero POSTs", async (_name, search) => {
    vi.useFakeTimers();
    const calls = browser(search);
    const { saved } = await runOwners();
    expect(calls.set).toEqual([]);
    expect(calls.remove).toEqual([]);
    expect(calls.post).toEqual([]);
    expect(saved).toBe(false); // the caller is told the decision identity was not stored
  });
});

describe("the component-level writers ask the same hold (source pins)", () => {
  it("each on-load setItem sits behind proofSceneHoldsWrites()", () => {
    expect(read("contexts/AuthContext.tsx")).toContain("if (u) { if (!proofSceneHoldsWrites()) localStorage.setItem(SESSION_KEY, JSON.stringify(u)); }");
    // A sign-out is never held.
    expect(read("contexts/AuthContext.tsx")).toContain("else localStorage.removeItem(SESSION_KEY);");
    expect(read("contexts/SymbolContext.tsx").match(/if \(!proofSceneHoldsWrites\(\)\) (window\.)?localStorage\.setItem\(LAST_SYMBOL_KEY/g)?.length).toBe(2);
    expect(read("components/chart/AlertsPanel.tsx")).toContain("if (!proofSceneHoldsWrites()) localStorage.setItem(ALERTS_KEY, JSON.stringify(alerts));");
    expect(read("components/chart/ChartsDashboard.tsx")).toContain('if (!proofSceneHoldsWrites()) localStorage.setItem("wm_price_alerts"');
    expect(read("components/chart/MainChart.tsx")).toContain('if (!proofSceneHoldsWrites()) localStorage.setItem("wm_flow_opacity"');
    // wm_theme and wm_activeInds go through the dashboard's two held writers.
    const dash = read("components/chart/ChartsDashboard.tsx");
    expect(dash).toMatch(/function lsSet\(key: string, val: unknown\) \{\s*if \(typeof window === "undefined"\) return;\s*if \(proofSceneHoldsWrites\(\)\) return;/);
    expect(dash).toMatch(/\/\/ A proof scene never writes back over the trader's saved chart\.\s*if \(proofSceneHoldsWrites\(\)\) return;/);
    expect(dash).toContain('lsSet("wm_theme", theme)');
    expect(dash).toContain('usePersistOnChange("wm_activeInds", activeInds');
  });
});
