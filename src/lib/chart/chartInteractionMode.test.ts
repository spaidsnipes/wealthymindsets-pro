import { beforeEach, describe, expect, it } from "vitest";

import {
  CHART_INTERACTION_PRIORITY,
  analyticalLayersInert,
  chartInteractionMode,
  claimChartInteraction,
  interactionRank,
  mayRunAnalyticalHandler,
  placementAllowed,
  releaseChartInteraction,
  resetChartInteractionForTest,
  subscribeChartInteraction,
} from "./chartInteractionMode";
import {
  armChartPricePick,
  cancelChartPricePick,
  chartPricePickArmed,
  deliverChartDraftPrice,
  deliverChartPricePick,
  registerChartPricePickHost,
  resetChartOrderLinesForTest,
} from "@/lib/execution/chartOrderLines";

beforeEach(() => { resetChartOrderLinesForTest(); resetChartInteractionForTest(); });

describe("one ranking — execution, placement, navigation, object edit, inspection, decorative", () => {
  it("ranks exactly as the Founder ordered", () => {
    expect(CHART_INTERACTION_PRIORITY).toEqual(["EXECUTION", "PLACEMENT", "NAVIGATION", "OBJECT_EDIT", "INSPECTION", "DECORATIVE"]);
    expect(interactionRank("EXECUTION")).toBe(1);
    expect(interactionRank("DECORATIVE")).toBe(6);
  });
  it("rests in INSPECTION; analytical handlers run", () => {
    expect(chartInteractionMode()).toBe("INSPECTION");
    expect(analyticalLayersInert()).toBe(false);
    expect(mayRunAnalyticalHandler("ZONE")).toBe(true);
  });
  it("the highest claim wins, and releasing restores the next one down", () => {
    const edit = claimChartInteraction("OBJECT_EDIT", "drawing");
    expect(chartInteractionMode()).toBe("OBJECT_EDIT");
    const place = claimChartInteraction("PLACEMENT", "drag");
    const exec = claimChartInteraction("EXECUTION", "confirm");
    expect(chartInteractionMode()).toBe("EXECUTION");
    exec();
    expect(chartInteractionMode()).toBe("PLACEMENT");
    place();
    expect(chartInteractionMode()).toBe("OBJECT_EDIT");
    edit();
    expect(chartInteractionMode()).toBe("INSPECTION");
  });
  it("a release only drops its own claim, and is idempotent", () => {
    const a = claimChartInteraction("PLACEMENT", "pick");
    claimChartInteraction("PLACEMENT", "drag");
    a(); a();
    expect(chartInteractionMode()).toBe("PLACEMENT");
    releaseChartInteraction("drag");
    expect(chartInteractionMode()).toBe("INSPECTION");
  });
  it("every analytical layer is inert under PLACEMENT and EXECUTION, and only then", () => {
    const layers = ["MARKET_OBJECT_PIN", "ZONE", "FVG", "ORDER_BLOCK", "PROFILE", "WALL", "FOOTPRINT", "MEMORY", "BUBBLE", "TAPE", "ANATOMY", "WEATHER", "DRAWING", "NOTE_ANCHOR", "HOVER_CARD", "BAR"] as const;
    const r = claimChartInteraction("PLACEMENT", "pick");
    for (const l of layers) expect(mayRunAnalyticalHandler(l)).toBe(false);
    r();
    const x = claimChartInteraction("EXECUTION", "confirm");
    for (const l of layers) expect(mayRunAnalyticalHandler(l)).toBe(false);
    x();
    const e = claimChartInteraction("OBJECT_EDIT", "drawing");
    for (const l of layers) expect(mayRunAnalyticalHandler(l)).toBe(true);
    e();
  });
  it("tells subscribers only when the mode changes", () => {
    let n = 0;
    const off = subscribeChartInteraction(() => { n++; });
    const a = claimChartInteraction("PLACEMENT", "a");
    claimChartInteraction("PLACEMENT", "b");
    a();
    expect(n).toBe(1);
    releaseChartInteraction("b");
    expect(n).toBe(2);
    off();
  });
});

describe("the price pick holds PLACEMENT for exactly as long as it is armed", () => {
  it("arming claims; a delivered pick releases (inspection is back)", () => {
    const off = registerChartPricePickHost();
    armChartPricePick("STOP");
    expect(chartInteractionMode()).toBe("PLACEMENT");
    expect(mayRunAnalyticalHandler("ZONE")).toBe(false);
    expect(deliverChartPricePick("NQ1!", 31_100)).toBe(true);
    expect(chartInteractionMode()).toBe("INSPECTION");
    off();
  });
  it("cancelling releases; the last chart unmounting releases", () => {
    const off = registerChartPricePickHost();
    armChartPricePick("TARGET");
    cancelChartPricePick();
    expect(chartInteractionMode()).toBe("INSPECTION");
    armChartPricePick("ENTRY");
    off();
    expect(chartPricePickArmed()).toBeNull();
    expect(chartInteractionMode()).toBe("INSPECTION");
  });
  it("an open confirmation (tier 1) refuses a pick and refuses any chart draft price", () => {
    const x = claimChartInteraction("EXECUTION", "ticket-confirmation");
    armChartPricePick("STOP");
    expect(chartPricePickArmed()).toBeNull();
    expect(deliverChartDraftPrice("NQ1!", "STOP", 31_090, "DRAG")).toBe(false);
    expect(deliverChartDraftPrice("NQ1!", "ENTRY", 31_090, "MENU")).toBe(false);
    expect(placementAllowed()).toBe(false);
    x();
    expect(placementAllowed()).toBe(true);
    expect(deliverChartDraftPrice("NQ1!", "STOP", 31_090, "DRAG")).toBe(true);
  });
});
