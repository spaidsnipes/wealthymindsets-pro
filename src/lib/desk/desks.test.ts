import { describe, expect, it } from "vitest";

import { MORNING_DESK, deleteDesk, gridFor, readDesks, renameDesk, screensFor, setScreen, upsertDesk } from "./desks";

describe("desks: one OS, several cameras, preferences only", () => {
  it("defaults to the Founder's Morning Desk: TSLA · NQ · BTC · SPY, 4-up", () => {
    expect(readDesks(null)).toEqual([MORNING_DESK]);
    expect(MORNING_DESK.screens.map(s => s.symbol)).toEqual(["TSLA", "NQ1!", "BTC", "SPY"]);
    expect(gridFor(4).areas).toHaveLength(4);
    expect(gridFor(3).areas).toHaveLength(3);
  });

  it("stores no market truth and refuses what /charts would not open", () => {
    const desks = readDesks(JSON.stringify([
      { name: "Futures Desk", layout: 2, screens: [{ symbol: "es1!", timeframe: "5s", price: 7700 }, { symbol: "<script>", timeframe: "1m" }, { symbol: "GC1!", timeframe: "banana" }] },
      { name: "futures desk", layout: 1, screens: [{ symbol: "TSLA", timeframe: "1m" }] },
      { name: "", layout: 1, screens: [{ symbol: "TSLA", timeframe: "1m" }] },
      { name: "Bad layout", layout: 6, screens: [{ symbol: "TSLA", timeframe: "1m" }] },
    ]));
    expect(desks).toEqual([{ name: "Futures Desk", layout: 2, screens: [{ symbol: "ES1!", timeframe: "5s" }] }]);
    expect(JSON.stringify(desks)).not.toContain("7700");
    expect(readDesks("not json")).toEqual([MORNING_DESK]);
  });

  it("a layout always has exactly its screen count", () => {
    expect(screensFor({ name: "x", layout: 3, screens: [{ symbol: "TSLA", timeframe: "1m" }] }).map(s => s.symbol)).toEqual(["TSLA", "TSLA", "TSLA"]);
    expect(screensFor({ ...MORNING_DESK, layout: 2 })).toHaveLength(2);
  });

  it("save, rename, delete — names unique, never zero desks", () => {
    const saved = upsertDesk([MORNING_DESK], { ...MORNING_DESK, name: "Options Desk", layout: 1 });
    expect(saved.map(d => d.name)).toEqual(["Morning Desk", "Options Desk"]);
    expect(upsertDesk(saved, { ...MORNING_DESK, layout: 2 })[0].layout).toBe(2);
    expect(renameDesk(saved, "Options Desk", "morning desk")).toBeNull();
    expect(renameDesk(saved, "Options Desk", "SPY Options")?.map(d => d.name)).toEqual(["Morning Desk", "SPY Options"]);
    expect(deleteDesk([MORNING_DESK], "Morning Desk")).toEqual([MORNING_DESK]);
  });

  it("a screen change goes through the same symbol/timeframe owners", () => {
    const d = setScreen(MORNING_DESK, 1, { symbol: "mnq1!", timeframe: "15s" });
    expect(d.screens[1]).toEqual({ symbol: "MNQ1!", timeframe: "15s" });
    expect(setScreen(MORNING_DESK, 0, { symbol: "<bad>" }).screens[0].symbol).toBe("TSLA");
    expect(setScreen(MORNING_DESK, 9, { symbol: "AAPL" })).toBe(MORNING_DESK);
  });
});
