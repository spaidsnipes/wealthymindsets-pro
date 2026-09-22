/**
 * SENTINEL — ONE W DOOR (HOUSE PLAN bolt-on, FIRST CURRENT BUILD ORDER #5).
 *
 * ── THE ORDER THIS ENFORCES ────────────────────────────────────────────────
 *
 * "Build/verify ONE W door / Market Intelligence family (Flow · Liquidity ·
 * Volume/Profile · Structure · Memory/Context). Do not keep Smart Money +
 * Order Flow as separate warehouses."
 *
 * MEASURED 2026-09-22 before the repair: the chart room's rail offered BOTH a
 * `smart-money` direct lens (flipping `smartMoneyOpen` → `SmartMoneyPanel`)
 * and an `order-flow` journey lens (→ `OrderFlowDepthPanel`) — two doors onto
 * readers of the SAME compilation (`useOrderFlowReadings` /
 * `selectAggressorFlow`). The rail was claiming the room holds two
 * intelligences about who is pressing when it holds one.
 *
 * The repair retired the `smart-money` rail entry and routed the read-out
 * panel THROUGH the one door's depth. This file is what makes that
 * retirement stick: nothing else fails if someone re-declares the second
 * door, because a registry entry is a declaration and declarations do not
 * crash.
 *
 * ── WHY SOURCE PINS AND NOT JUST THE REGISTRY ──────────────────────────────
 *
 * The registry half (test 1) would pass even if the dashboard grew a private
 * second door that bypasses the registry — which is exactly how the first
 * warehouse split happened (a toolbar button, not a rail entry). So the
 * dashboard is scanned comment-stripped: the prose above the old branch
 * discussed the id at length, and an unstripped scan could fail on
 * documentation alone.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { stripComments } from "@/lib/sourceScan";
import { allRoomEquipmentIds } from "./roomEquipment";
import { MARKET_INTELLIGENCE_WINGS } from "@/components/experience/OrderFlowDepthPanel";

const read = (rel: string): string =>
  readFileSync(join(process.cwd(), rel), "utf8");

const DASHBOARD = stripComments(
  read("src/components/chart/ChartsDashboard.tsx"),
);
const DEPTH_PANEL = stripComments(
  read("src/components/experience/OrderFlowDepthPanel.tsx"),
);

describe("one W door — the Market Intelligence family has one warehouse", () => {
  it("no room declares a `smart-money` rail entry — the second door stays retired", () => {
    expect(allRoomEquipmentIds()).not.toContain("smart-money");
  });

  it("the dashboard has no smart-money equipment branch and no smart-money stage announce", () => {
    // The retired branch and its announce, by shape. `smartMoneyOpen` itself
    // is NOT banned — the panel survives; only the second DOOR is gone.
    expect(DASHBOARD).not.toMatch(/equipmentId\s*===\s*"smart-money"/);
    expect(DASHBOARD).not.toMatch(/announceEquipmentStage\(\s*"smart-money"/);
  });

  it("the read-out panel is reached THROUGH the one door's depth — same one boolean", () => {
    // The stair inside the door…
    expect(DASHBOARD).toMatch(/onOpenReadout=\{\(\) => setSmartMoneyOpen\(true\)\}/);
    // …to a panel that still exists behind the boolean the toolbar flips.
    expect(DASHBOARD).toMatch(/\{smartMoneyOpen && \(?\s*<SmartMoneyPanel[\s/>]/);
  });

  it("the door's interior names the bolt-on's five family wings, spelled once", () => {
    expect(Object.values(MARKET_INTELLIGENCE_WINGS)).toEqual([
      "Flow",
      "Liquidity",
      "Volume/Profile",
      "Structure",
      "Memory/Context",
    ]);
  });

  it("the wings with no installed instrument are confessed, not faked", () => {
    // The confession line renders from the named constant — an empty-tile
    // "Structure" widget appearing instead would be the painted door.
    expect(DEPTH_PANEL).toMatch(/data-testid="order-flow-unbuilt-wings"/);
    expect(DEPTH_PANEL).toMatch(/MARKET_INTELLIGENCE_WINGS\.STRUCTURE/);
    expect(DEPTH_PANEL).toMatch(/MARKET_INTELLIGENCE_WINGS\.MEMORY_CONTEXT/);
  });

  it("every mounted reading wears a wing tag", () => {
    // Five readings, five <Wing> mounts. A sixth reading landing without a
    // wing would silently fall outside the family this door claims to serve.
    const wingMounts = DEPTH_PANEL.match(/<Wing name=\{MARKET_INTELLIGENCE_WINGS\./g) ?? [];
    expect(wingMounts).toHaveLength(5);
  });

  it("NOT VACUOUS: stripComments did not blank the scanned sources", () => {
    expect(DASHBOARD.length).toBeGreaterThan(1000);
    expect(DEPTH_PANEL.length).toBeGreaterThan(500);
  });
});
