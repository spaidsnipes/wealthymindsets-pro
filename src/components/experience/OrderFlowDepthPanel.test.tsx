/**
 * OrderFlowDepthPanel — what the trader can actually reach at each depth.
 *
 * THE DEFECT THIS FILE WAS BORN FROM (2026-09-22, serving worker 0653c066)
 * -----------------------------------------------------------------------
 * The ONE W DOOR slice routed the legacy Smart Money read-out through this
 * panel's `onOpenReadout` stair — and gated the stair (and the unbuilt-wing
 * confession) on `unabridged`. But the chart room, the ONLY room that hands
 * the stair down, refuses `stage=full` by canon (Last Mile 2026-09-18 —
 * "chart stays"; no `onEnter`). So `unabridged` was ALWAYS false there and
 * the stair was a door that tested green in the source-pin sentinel and
 * never appeared on screen. The oneWDoor sentinel could not see this: it
 * pins that the dashboard PASSES the prop, not that the panel RENDERS the
 * button at a depth the room can reach.
 *
 * These tests render the panel at the chart room's deepest real stage
 * (drawer → `unabridged={false}`) and assert reachability. Source pins ask
 * where things are wired; this file asks what the trader sees.
 */

import { describe, expect, it } from "vitest";
import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";

import { OrderFlowDepthPanel } from "./OrderFlowDepthPanel";
import { compileOrderFlowReadings } from "@/lib/marketData/useOrderFlowReadings";

/**
 * A real compilation, not a hand-built object — the "no tape" state every
 * selector owns is exactly what prod serves when the feed states no
 * aggressor side, so the fixture cannot drift from the shape.
 */
const readings = compileOrderFlowReadings([], null);

const drawer = renderToStaticMarkup(
  <OrderFlowDepthPanel
    readings={readings}
    symbol="TSLA"
    unabridged={false}
    onOpenReadout={() => {}}
  />,
);

const full = renderToStaticMarkup(
  <OrderFlowDepthPanel
    readings={readings}
    symbol="TSLA"
    unabridged
    onOpenReadout={() => {}}
  />,
);

const fullNoStair = renderToStaticMarkup(
  <OrderFlowDepthPanel readings={readings} symbol="TSLA" unabridged />,
);

describe("OrderFlowDepthPanel — the stair and the confession stand at every depth", () => {
  it("DRAWER reaches the Smart money read-out stair — the chart room's deepest stage", () => {
    expect(drawer).toContain('data-testid="order-flow-open-readout"');
    expect(drawer).toContain("Full read-out — Smart money panel");
  });

  it("DRAWER confesses the unbuilt wings by name", () => {
    expect(drawer).toContain('data-testid="order-flow-unbuilt-wings"');
    expect(drawer).toContain("Structure or Memory/Context");
  });

  it("FULL still renders both — depth adds readings, never removes the stair", () => {
    expect(full).toContain('data-testid="order-flow-open-readout"');
    expect(full).toContain('data-testid="order-flow-unbuilt-wings"');
  });

  it("no handler, no door — a room without the panel gets no stair at any depth", () => {
    expect(fullNoStair).not.toContain("order-flow-open-readout");
    // The confession is the door's own truth and survives without the stair.
    expect(fullNoStair).toContain('data-testid="order-flow-unbuilt-wings"');
  });

  it("depth changes length, never content order: drawer's two wings lead full's five", () => {
    const wingsAt = (html: string): string[] =>
      [...html.matchAll(/data-of-wing="([^"]+)"/g)].map((m) => m[1]);
    const drawerWings = wingsAt(drawer);
    const fullWings = wingsAt(full);
    expect(drawerWings).toEqual(["Volume/Profile", "Liquidity"]);
    expect(fullWings.slice(0, 2)).toEqual(drawerWings);
    expect(fullWings).toHaveLength(5);
  });
});
