import { describe, expect, it } from "vitest";

import {
  HOUSE_DOOR_HREFS,
  houseDoorDestinations,
  MARKET_HOME_ROOM_HREFS,
  marketHomeRooms,
  WM_DESTINATIONS,
} from "./wmDestinations";

describe("the HOME Rooms doorway changes the human job without restoring the mall", () => {
  it("resolves every door through the canonical destination registry", () => {
    expect(marketHomeRooms().map((room) => room.href)).toEqual(MARKET_HOME_ROOM_HREFS);
    for (const href of MARKET_HOME_ROOM_HREFS) {
      expect(WM_DESTINATIONS.some((destination) => destination.href === href)).toBe(true);
    }
  });

  /**
   * REMODELLED 2026-09-22, and the list SHRANK — that is the point, not a
   * relaxation. The HOUSE PLAN + EXECUTION BOLT-ON — CURRENT — 2026-09-22
   * (promoted into the ATH Command Center and WM Pro Build Order the same
   * day) commands: "Build/verify compact ROOMS door with ONLY Journal/Review
   * · Backtest Lab · Scanner Deck · Research Heat Archive." The prior fifth
   * tenant, /news, is moved by the same block into the House/Community door,
   * and the block declares itself to OUTRANK the older "News/Research is a
   * Room" taxonomy wording.
   */
  it("contains ONLY the bolt-on's four changed trade jobs, in its order", () => {
    expect(MARKET_HOME_ROOM_HREFS).toEqual([
      "/journal",
      "/backtesting",
      "/scanner",
      "/heatmaps",
    ]);
  });

  it("News belongs behind the House door now, not the Rooms door", () => {
    expect(MARKET_HOME_ROOM_HREFS).not.toContain("/news");
    expect(HOUSE_DOOR_HREFS).toContain("/news");
  });

  it("cannot restore same-decision surfaces or the quarantined second HOME", () => {
    expect(MARKET_HOME_ROOM_HREFS).not.toContain("/charts");
    expect(MARKET_HOME_ROOM_HREFS).not.toContain("/command-deck");
    expect(MARKET_HOME_ROOM_HREFS).not.toContain("/nectar");
    expect(MARKET_HOME_ROOM_HREFS).not.toContain("/paper");
    expect(marketHomeRooms().some((room) => room.authority === "legacy")).toBe(false);
  });
});

describe("the HOME House/Community door carries the bolt-on's families", () => {
  it("resolves every door through the canonical destination registry", () => {
    expect(houseDoorDestinations().map((d) => d.href)).toEqual(HOUSE_DOOR_HREFS);
    for (const href of HOUSE_DOOR_HREFS) {
      expect(WM_DESTINATIONS.some((destination) => destination.href === href)).toBe(true);
    }
  });

  /**
   * The bolt-on's named contents: "Inside House: Academy / Learn · Lounge /
   * Community · Wealthy Mind Radio / Media · News · Settings / Appearance."
   * Academy previously had NO door from HOME at all (TOOL group, no doorway
   * listed it). /profile stands in for Settings/Appearance — the nearest
   * existing owner; there is no /settings route.
   */
  it("names Academy, Lounge, Radio/Media, News and the settings owner", () => {
    expect(HOUSE_DOOR_HREFS).toContain("/education");
    expect(HOUSE_DOOR_HREFS).toContain("/lounge");
    expect(HOUSE_DOOR_HREFS).toContain("/radio");
    expect(HOUSE_DOOR_HREFS).toContain("/news");
    expect(HOUSE_DOOR_HREFS).toContain("/profile");
  });

  it("keeps the COMMUNITY/MEDIA family reachable — the measured 2026-09-22 absence never returns", () => {
    for (const href of ["/lounge", "/tv", "/radio", "/creator", "/partnerships", "/shop", "/profile"]) {
      expect(HOUSE_DOOR_HREFS).toContain(href);
    }
  });

  it("is a door for people/learning/media/settings — not a second market or trade-job door", () => {
    // "Do not put Academy in Rooms" has a mirror: the House door does not
    // absorb changed TRADE jobs or the live market itself.
    for (const href of ["/charts", "/command-deck", "/journal", "/backtesting", "/scanner", "/heatmaps", "/paper", "/nectar"]) {
      expect(HOUSE_DOOR_HREFS).not.toContain(href);
    }
    expect(houseDoorDestinations().some((d) => d.authority === "legacy")).toBe(false);
  });
});
