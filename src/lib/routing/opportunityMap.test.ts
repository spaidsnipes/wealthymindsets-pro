import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

import { legacyAliasTarget } from "@/lib/legacyRouteAliases";
import {
  heatCellCameraHref,
  OPPORTUNITY_MAP_ROUTE,
  RETIRED_HEATMAPS_ROOM_ROUTE,
  SCANNER_DECK_VIEWS,
  SCANNER_SIGNALS_ROUTE,
} from "./opportunityMap";
import { isFounderRoomRoute } from "./founderRoomRoutes";
import {
  HOUSE_DOOR_HREFS,
  MARKET_HOME_ROOM_HREFS,
  PHONE_SLOT_HREFS,
  WM_DESTINATIONS,
} from "./wmDestinations";

/**
 * FINISH THE HEAT FAMILY — the live Heatmaps Room does not come back.
 *
 * Authority (Complete Invention Registry, F14 DISCOVERY / HEAT): "multi-symbol
 * opportunity/discovery heat belongs to scanning/research job, not a live
 * Heatmaps Room"; "Heat cell → existing camera landing". Command Center:
 * "ROOMS BUTTON ≠ HEATMAPS ROOM."
 */

const SRC = resolve(__dirname, "../..");
const code = (rel: string) =>
  readFileSync(resolve(SRC, rel), "utf8")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/^\s*\/\/.*$/gm, "");

describe("× THE HEATMAPS ROOM: retired from every door", () => {
  it("is not a destination, not a Rooms tenant, not a House tenant, not a phone door", () => {
    expect(WM_DESTINATIONS.some((d) => d.href === RETIRED_HEATMAPS_ROOM_ROUTE)).toBe(false);
    // Only the Research Heat Archive (SAVED heat) may wear the word — no live board.
    expect(WM_DESTINATIONS.filter((d) => /heat/i.test(d.label)).map((d) => d.href)).toEqual(["/research-heat"]);
    expect(MARKET_HOME_ROOM_HREFS).not.toContain(RETIRED_HEATMAPS_ROOM_ROUTE);
    expect(HOUSE_DOOR_HREFS).not.toContain(RETIRED_HEATMAPS_ROOM_ROUTE);
    expect(PHONE_SLOT_HREFS).not.toContain(RETIRED_HEATMAPS_ROOM_ROUTE);
  });

  it("the map itself is not a destination either — it is a view of the Scanner Deck", () => {
    expect(WM_DESTINATIONS.some((d) => d.href === OPPORTUNITY_MAP_ROUTE)).toBe(false);
    expect(OPPORTUNITY_MAP_ROUTE.startsWith(`${SCANNER_SIGNALS_ROUTE}/`)).toBe(true);
    // …and it still wears the deck's frame, by prefix inheritance.
    expect(isFounderRoomRoute(OPPORTUNITY_MAP_ROUTE)).toBe(true);
    expect(isFounderRoomRoute(RETIRED_HEATMAPS_ROOM_ROUTE)).toBe(false);
  });
});

describe("× THE 404: old /heatmaps links land on the map's lawful home", () => {
  it("the edge alias sends /heatmaps to the Opportunity Map in one hop", () => {
    expect(legacyAliasTarget(RETIRED_HEATMAPS_ROOM_ROUTE)).toBe(OPPORTUNITY_MAP_ROUTE);
    expect(legacyAliasTarget(`${RETIRED_HEATMAPS_ROOM_ROUTE}/`)).toBe(OPPORTUNITY_MAP_ROUTE);
    expect(legacyAliasTarget(OPPORTUNITY_MAP_ROUTE)).toBeNull();
  });

  it("the fallback stub redirects and renders no map of its own", () => {
    const stub = code("app/heatmaps/page.tsx");
    expect(stub).toContain(`redirect("${OPPORTUNITY_MAP_ROUTE}")`);
    expect(stub).not.toMatch(/usePublishOsStanding|api\/heatmap|<div/);
    expect(stub.split("\n").filter((l) => l.trim()).length).toBeLessThanOrEqual(6);
  });
});

describe("× THE SECOND MARKET APP: a heat cell opens the EXISTING camera", () => {
  it("lands /charts with the symbol and never overwrites the camera timeframe", () => {
    expect(heatCellCameraHref("NVDA")).toBe("/charts?symbol=NVDA");
    expect(heatCellCameraHref(" brk.b ")).toBe("/charts?symbol=BRK.B");
    expect(heatCellCameraHref("ES1!")).toBe("/charts?symbol=ES1!");
    expect(heatCellCameraHref("NVDA")).not.toMatch(/[?&]tf=/);
  });

  it("every cell navigation on the map goes through the one camera href", () => {
    const page = code("app/scanner/map/page.tsx");
    const pushes = page.match(/router\.push\([^)]*\)?\)/g) ?? [];
    expect(pushes.length).toBeGreaterThanOrEqual(2); // stock tile + Markov card
    for (const push of pushes) expect(push).toMatch(/^router\.push\(heatCellCameraHref\(/);
    expect(page).not.toMatch(/\/command-deck|\/heatmaps["'`]/);
  });

  it("keeps the map's truth laws: feed observation, quality badge, observed-change honesty", () => {
    const page = code("app/scanner/map/page.tsx");
    expect(page).toMatch(/usePublishOsStanding\(\{\s*surface: "Opportunity Map",\s*feed: selectHeatmapFeedObservation\(\{ observedAt \}\)/);
    expect(page).toContain("<QualityBadge");
    expect(page).toContain("readObservedChange(pcts, st.sym)");
  });
});

describe("the Scanner Deck carries both views through one switch", () => {
  it("names Signals then Opportunity Map", () => {
    expect(SCANNER_DECK_VIEWS.map((v) => v.href)).toEqual([SCANNER_SIGNALS_ROUTE, OPPORTUNITY_MAP_ROUTE]);
    expect(SCANNER_DECK_VIEWS.map((v) => v.label)).toEqual(["Signals", "Opportunity Map"]);
  });

  it("both deck views render the switch, so the map is reachable and so is the way back", () => {
    for (const rel of ["app/scanner/page.tsx", "app/scanner/map/page.tsx"]) {
      expect(code(rel), rel).toContain("<ScannerDeckViewSwitch />");
    }
  });
});
