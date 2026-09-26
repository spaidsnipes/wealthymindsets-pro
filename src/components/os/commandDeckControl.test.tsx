/**
 * THE COMMAND DECK CONTROL AND THE DRAWER IT NAMES — one composed render.
 * 2026-09-26, Garden 16 §11.
 *
 * The masthead control lives in the FRAME; the drawer lives in the ROOM. The
 * `aria-controls` contract between them is the thing most likely to rot
 * silently (a control naming a region that does not exist is FOLLOWED by a
 * screen reader to nowhere — the frame measured that once already). So this
 * renders both, from the real channel state, and checks the reference
 * resolves inside the same markup.
 *
 * HOW THE HELD STATE GETS IN WITHOUT A DOM. The control's FIRST reading is the
 * channel's memory (`heldEquipmentIds()`), which only `announceEquipmentStage`
 * writes, and that function needs a `document` to dispatch on. Node has
 * `EventTarget` and `CustomEvent`, so a bare EventTarget stands in for the
 * document for exactly the duration of these tests and is removed after. The
 * announce is the ROOM's real announce function, not a stub.
 */
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";

import { WMOperatingSystem } from "./WMOperatingSystem";
import { RoomEquipmentLayer, type EquipmentContent } from "@/components/experience/RoomEquipmentLayer";
import { announceEquipmentStage, heldEquipmentIds } from "@/lib/workspace/equipmentChannel";
import { COMMAND_DECK_EQUIPMENT_ID, COMMAND_DECK_REGION_ID } from "@/lib/workspace/roomEquipment";
import { INSTRUMENT_VIEW_ROUTE } from "@/lib/routing/founderLanding";
import { EQUIPMENT_CLOSED, type EquipmentJourney } from "@/lib/workspace/equipmentJourney";

const g = globalThis as unknown as { document?: unknown };
let hadDocument = false;

beforeEach(() => {
  hadDocument = "document" in g;
  if (!hadDocument) g.document = new EventTarget();
});
afterEach(() => {
  announceEquipmentStage(null, "closed");
  if (!hadDocument) delete g.document;
});

const deckContent: EquipmentContent = {
  equipmentId: COMMAND_DECK_EQUIPMENT_ID,
  title: "Your command deck",
  verdict: "NOT_EVALUATED",
  headline: "Watching with no position — the Object DNA leads the study.",
  counts: [],
  renderDepth: () => <div data-testid="deck-depth">depth</div>,
};

function scene(journey: EquipmentJourney): string {
  return renderToStaticMarkup(
    <WMOperatingSystem
      activeHref={INSTRUMENT_VIEW_ROUTE}
      surface="Instrument View"
      openEvidenceItems={null}
      rightOfWay="UNKNOWN"
      rightOfWayResolved={false}
      feed={null}
      destinations="equipment"
      phoneDestinations="door"
      railDefaultOpen={false}
    >
      <canvas data-testid="the-chart" />
      <RoomEquipmentLayer
        journey={journey}
        content={deckContent}
        subject={{ symbol: "TSLA", timeframe: "1D" }}
        placement="market-dock"
        onExpand={() => {}}
        onReturn={() => {}}
        onClose={() => {}}
        regionId={journey.equipmentId === COMMAND_DECK_EQUIPMENT_ID ? COMMAND_DECK_REGION_ID : undefined}
      />
    </WMOperatingSystem>,
  );
}

const control = (html: string) => {
  const m = html.match(/<button[^>]*data-testid="os-command-deck"[^>]*>/);
  expect(m, "no Command Deck control in the /charts masthead").not.toBeNull();
  return m![0];
};

const CLOSED: EquipmentJourney = EQUIPMENT_CLOSED;
const DRAWER: EquipmentJourney = {
  stage: "drawer",
  equipmentId: COMMAND_DECK_EQUIPMENT_ID,
  decisionId: "dec-fixture-1",
  returnTo: null,
};

describe("the Command Deck control is told its state by the room, and names a region that exists", () => {
  it("closed: aria-expanded false, NO aria-controls, and no drawer in the room", () => {
    const html = scene(CLOSED);
    const tag = control(html);
    expect(tag).toContain('aria-expanded="false"');
    expect(tag).not.toContain("aria-controls=");
    expect(html).not.toContain(`id="${COMMAND_DECK_REGION_ID}"`);
    expect(html).not.toContain('data-testid="room-equipment"');
  });

  it("held (the room announced the drawer): aria-expanded true, and aria-controls RESOLVES in the same markup", () => {
    announceEquipmentStage(COMMAND_DECK_EQUIPMENT_ID, "drawer");
    expect(heldEquipmentIds().has(COMMAND_DECK_EQUIPMENT_ID)).toBe(true);
    const html = scene(DRAWER);
    const tag = control(html);
    expect(tag).toContain('aria-expanded="true"');
    const controls = /aria-controls="([^"]+)"/.exec(tag)?.[1];
    expect(controls).toBe(COMMAND_DECK_REGION_ID);
    // The region is the room's drawer — the deck, at drawer depth, carrying the
    // decision identity captured at open.
    const aside = html.match(new RegExp(`<aside[^>]*id="${controls}"[^>]*>`))?.[0] ?? "";
    expect(aside, "aria-controls names a region that is not in the scene").not.toBe("");
    expect(aside).toContain('data-equipment="command-deck"');
    expect(aside).toContain('data-equipment-stage="drawer"');
    expect(aside).toContain('data-equipment-placement="market-dock"');
    expect(aside).toContain('data-decision-id="dec-fixture-1"');
    // The chart is still in the room beside it — the drawer is over it, not instead of it.
    expect(html).toContain('data-testid="the-chart"');
    // And the drawer offers no FULL stage on the market camera.
    expect(html).not.toContain('data-testid="equipment-enter"');
    expect(html).toContain('data-testid="equipment-close"');
  });

  it("the region id is worn ONLY while the deck is the equipment held", () => {
    const other: EquipmentJourney = { ...DRAWER, equipmentId: "market-reality" };
    const html = renderToStaticMarkup(
      <RoomEquipmentLayer
        journey={other}
        content={{ ...deckContent, equipmentId: "market-reality", title: "Market reality" }}
        subject={{ symbol: "TSLA", timeframe: "1D" }}
        placement="market-dock"
        onExpand={() => {}}
        onReturn={() => {}}
        onClose={() => {}}
        regionId={other.equipmentId === COMMAND_DECK_EQUIPMENT_ID ? COMMAND_DECK_REGION_ID : undefined}
      />,
    );
    expect(html).toContain('data-equipment="market-reality"');
    expect(html).not.toContain(`id="${COMMAND_DECK_REGION_ID}"`);
  });

  it("the drawer header reads the verdict as words, never as an enum", () => {
    announceEquipmentStage(COMMAND_DECK_EQUIPMENT_ID, "drawer");
    const html = scene(DRAWER);
    expect(html).toMatch(/data-testid="equipment-verdict"[^>]*>NOT EVALUATED</);
    expect(html).not.toContain(">NOT_EVALUATED<");
    expect(html).toContain("Your command deck");
  });

  it("the deck is never a Workspace tile — not even in the full-map rail", () => {
    // Rail mode lists EVERYTHING a room hands you under one Workspace heading.
    // The deck has its own control; listing it here too would be two doors to
    // one drawer, and the second one would be a list item, not the control.
    const html = renderToStaticMarkup(
      <WMOperatingSystem
        activeHref={INSTRUMENT_VIEW_ROUTE}
        surface="Instrument View"
        openEvidenceItems={null}
        rightOfWay="UNKNOWN"
        rightOfWayResolved={false}
        feed={null}
        destinations="rail"
        railDefaultOpen
      >
        <div />
      </WMOperatingSystem>,
    );
    expect(html).toContain('data-testid="os-rail-workspace"');
    expect(html).toContain('data-equipment="market-reality"');
    expect(html).not.toContain('data-equipment="command-deck"');
    expect(html).not.toContain("Your command deck");
  });

  it("the plate: a button with the canon's two words, the crosshair, no arrow, no LEGACY, no verdict", () => {
    const html = scene(CLOSED);
    const at = html.indexOf('data-testid="os-command-deck"');
    const button = html.slice(html.lastIndexOf("<button", at), html.indexOf("</button>", at));
    expect(button).toContain('aria-label="Command Deck"');
    expect(button).toContain(">Command Deck<");
    expect(button).toContain("<svg");
    expect(button).not.toMatch(/href=|→|LEGACY|\bWAIT\b|OPTIMAL/);
    // After the two hands, behind the hairline — a distinct third control.
    const workspace = html.indexOf('data-testid="os-equipment-workspace"');
    const tools = html.indexOf('data-testid="os-equipment-tools"');
    const rule = html.indexOf("wm-os-command-deck-rule");
    expect(workspace).toBeGreaterThan(-1);
    expect(tools).toBeGreaterThan(workspace);
    expect(rule).toBeGreaterThan(tools);
    expect(at).toBeGreaterThan(rule);
  });
});
