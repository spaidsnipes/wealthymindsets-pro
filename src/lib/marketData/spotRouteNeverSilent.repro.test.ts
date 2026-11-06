/**
 * FOREX · THE CME FUTURE NEVER SILENTLY STANDS IN FOR A SPOT PAIR (shift 1106;
 * Codex 01a19aea "Forex: the code substitutes CME futures for spot pairs —
 * traced, not fixed"; Drive FX canon: spot FX and CME 6E "cannot be treated as
 * equivalent", the future is RELATED-MARKET evidence with provenance).
 *
 * Reproduced first against 696d4aa8: after a reload (route kept only in module
 * memory while the chart symbol was saved as 6E1!) nothing remembered that the
 * chart stood in for EURUSD, and the only words were an 8-second notice.
 */
import { readFileSync } from "node:fs";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { selectProfileMenu } from "./viewModels/selectProfileMenu";

const store = new Map<string, string>();
beforeEach(() => {
  store.clear();
  vi.stubGlobal("window", {
    localStorage: { getItem: (k: string) => store.get(k) ?? null, setItem: (k: string, v: string) => void store.set(k, v), removeItem: (k: string) => void store.delete(k) },
    dispatchEvent: () => true,
  });
  vi.stubGlobal("CustomEvent", class { constructor(public type: string) {} });
  vi.resetModules();
});
afterEach(() => { vi.unstubAllGlobals(); });

describe("the route survives a reload and is always named RELATED MARKET", () => {
  it("EURUSD → 6E1!: after a reload the chart still knows it stands in for spot EURUSD", async () => {
    const a = await import("./spotFuturesRoute");
    a.noteSpotRoute("EUR/USD", "6E1!");
    vi.resetModules(); // the page reloads: module memory is gone, localStorage is not
    const b = await import("./spotFuturesRoute");
    const r = b.lastSpotRoute();
    expect(r?.from).toBe("EURUSD");
    expect(r?.to).toBe("6E1!");
    const tagOf = (b as Record<string, unknown>).relatedMarketTag as ((f: string, x: unknown) => string) | undefined;
    expect(tagOf?.("EURUSD", b.spotRouteFor("EURUSD"))).toBe("RELATED MARKET · NOT SPOT EURUSD");
  });
  it("an inverse route says both facts", async () => {
    const m = await import("./spotFuturesRoute");
    expect(m.relatedMarketTag("USDJPY", m.spotRouteFor("USDJPY")!)).toBe("RELATED MARKET · INVERSE OF USDJPY");
    expect(m.spotRouteNotice("USDJPY", m.spotRouteFor("USDJPY")!)).toMatch(/RELATED MARKET[\s\S]*not spot USDJPY's/);
    expect(m.spotRouteNotice("EURUSD", m.spotRouteFor("EURUSD")!)).toBe(
      "EURUSD has no live spot source here — showing 6E1!, the CME euro future: a RELATED MARKET with its own price, session and volume, not spot EURUSD.");
  });
  it("choosing another market ends the provenance; a tampered record is refused", async () => {
    const m = await import("./spotFuturesRoute");
    m.noteSpotRoute("EURUSD", "6E1!");
    m.clearSpotRoute();
    expect(m.lastSpotRoute()).toBeNull();
    store.set(m.SPOT_ROUTE_KEY, JSON.stringify({ from: "EURUSD", to: "NQ1!", at: 1 }));
    vi.resetModules();
    expect((await import("./spotFuturesRoute")).lastSpotRoute()).toBeNull();
    store.set(m.SPOT_ROUTE_KEY, "{oops");
    vi.resetModules();
    expect((await import("./spotFuturesRoute")).lastSpotRoute()).toBeNull();
  });
});

describe("wiring", () => {
  const dash = readFileSync("src/components/chart/ChartsDashboard.tsx", "utf8");
  const ctx = readFileSync("src/contexts/SymbolContext.tsx", "utf8");
  it("the tag rides the chart legend (identityNote) and the phone header for EVERY routed pair, not only inverse ones", () => {
    expect(dash).toContain("setSpotRelatedTag(routedHere ? relatedMarketTag(r!.from, route!) : null);");
    expect(dash).toContain("identityNote={spotRelatedTag}");
    expect(dash).toContain('data-testid="spot-route-related-tag"');
    expect(dash).not.toMatch(/spotInverseOf/);
  });
  it("SymbolContext clears the provenance when the trader picks a different market", () => {
    expect(ctx).toMatch(/if \(lastSpotRoute\(\)\?\.to !== sym\) clearSpotRoute\(\);/);
  });
});

describe("spot FX left on its own (a cross with no single future) is UNSUPPORTED for volume, never 'waiting'", () => {
  it("GBPJPY: volume readers refuse with the market fact; price tools stay", () => {
    const vm = selectProfileMenu({ barsPresent: true, printsPresent: false, observedAggressorFlow: false, active: {}, symbol: "GBPJPY" });
    const living = vm.entries.find(e => e.id === "LIVING_PROFILE")!;
    expect(living.availability).toBe("REFUSED_BY_DATA");
    expect(living.stateWords).toMatch(/NEEDS TRADED VOLUME/);
    expect(vm.entries.find(e => e.id === "MARKET_STRUCTURE")!.availability).toBe("READY");
  });
});
