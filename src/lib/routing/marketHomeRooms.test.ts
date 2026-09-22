import { describe, expect, it } from "vitest";

import { MARKET_HOME_ROOM_HREFS, marketHomeRooms, WM_DESTINATIONS } from "./wmDestinations";

describe("the HOME Rooms doorway changes the human job without restoring the mall", () => {
  it("resolves every door through the canonical destination registry", () => {
    expect(marketHomeRooms().map((room) => room.href)).toEqual(MARKET_HOME_ROOM_HREFS);
    for (const href of MARKET_HOME_ROOM_HREFS) {
      expect(WM_DESTINATIONS.some((destination) => destination.href === href)).toBe(true);
    }
  });

  it("contains discovery, comparison, replay, review, and research", () => {
    expect(MARKET_HOME_ROOM_HREFS).toEqual([
      "/scanner",
      "/heatmaps",
      "/backtesting",
      "/journal",
      "/news",
    ]);
  });

  it("cannot restore same-decision surfaces or the quarantined second HOME", () => {
    expect(MARKET_HOME_ROOM_HREFS).not.toContain("/charts");
    expect(MARKET_HOME_ROOM_HREFS).not.toContain("/command-deck");
    expect(MARKET_HOME_ROOM_HREFS).not.toContain("/nectar");
    expect(MARKET_HOME_ROOM_HREFS).not.toContain("/paper");
    expect(marketHomeRooms().some((room) => room.authority === "legacy")).toBe(false);
  });
});
