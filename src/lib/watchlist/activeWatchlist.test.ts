import { describe, expect, it } from "vitest";
import { DEFAULT_WATCHLIST_SYMBOLS, readActiveWatchlist, toggleOnActiveWatchlist } from "./activeWatchlist";

function mem(init: Record<string, string> = {}) {
  const m = new Map(Object.entries(init));
  return { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => void m.set(k, v), m };
}

describe("active watchlist — one list across rooms", () => {
  it("starts from the panel's default seed when nothing is stored", () => {
    const s = mem();
    expect(readActiveWatchlist(s)).toEqual({ name: "My Watchlist", symbols: [...DEFAULT_WATCHLIST_SYMBOLS] });
    expect(toggleOnActiveWatchlist(s, "qbts")).toBe(true);
    const stored = JSON.parse(s.m.get("wm_watchlists")!);
    expect(stored["My Watchlist"].slice(-1)).toEqual(["QBTS"]);
    expect(stored["My Watchlist"]).toHaveLength(DEFAULT_WATCHLIST_SYMBOLS.length + 1);
  });
  it("adds to the ACTIVE named list and leaves the others alone", () => {
    const s = mem({ wm_watchlists: JSON.stringify({ A: ["SPY"], B: ["AAPL"] }), wm_active_watchlist: "B" });
    expect(toggleOnActiveWatchlist(s, "NVDA")).toBe(true);
    expect(JSON.parse(s.m.get("wm_watchlists")!)).toEqual({ A: ["SPY"], B: ["AAPL", "NVDA"] });
  });
  it("removes a symbol already on the list", () => {
    const s = mem({ wm_watchlists: JSON.stringify({ A: ["SPY", "QQQ"] }), wm_active_watchlist: "A" });
    expect(toggleOnActiveWatchlist(s, "SPY")).toBe(false);
    expect(readActiveWatchlist(s).symbols).toEqual(["QQQ"]);
  });
});
