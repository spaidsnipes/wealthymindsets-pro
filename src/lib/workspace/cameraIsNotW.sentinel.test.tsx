/**
 * SENTINEL — A CAMERA IS NOT THE W (Garden 16 §13/§14).
 *
 * "Workspace owns arrangement. Therefore use unmistakable camera grammar such
 * as CLEAN / ORDER FLOW CAMERA / REGIME CAMERA / REVIEW CAMERA … The W control
 * is WM SMART MONEY / MARKET INTELLIGENCE. Use the actual W/logo identity. W
 * owns intelligence families: FLOW, LIQUIDITY, VOLUME / PROFILE, STRUCTURE,
 * MEMORY / CONTEXT. A guest should immediately understand: CAMERA CHANGES HOW I
 * VIEW THE SAME MARKET. W ACTIVATES WM INTELLIGENCE."
 *
 * MEASURED before the repair on local /charts: the Workspace plate's desk read
 * "Order Flow" and the Tools plate's intelligence door read "Order flow" — two
 * machines, one noun, one letter's case apart. This file pins the split in
 * WORDS, because the two were already separate in the source and that did not
 * stop them reading as one thing on the glass (the oneNamePerDoor lesson).
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { ChartArrangementBar } from "@/components/chart/ChartArrangementBar";
import { equipmentGlyph } from "@/components/os/equipmentGlyphs";
import {
  ARRANGEMENT_SPECS,
  CAMERA_PROMISE,
  arrangementCameraLabel,
} from "@/lib/marketData/viewModels/selectChartArrangement";
import { INSTRUMENT_VIEW_ROUTE } from "@/lib/routing/founderLanding";
import { stripComments } from "@/lib/sourceScan";
import {
  MARKET_INTELLIGENCE_WINGS,
  UNBUILT_WINGS,
  W_DOOR_LABEL,
  wDoorHint,
} from "./marketIntelligence";
import {
  ARRANGEMENT_EQUIPMENT_ID,
  allRoomEquipmentIds,
  roomEquipment,
  roomEquipmentOfKind,
} from "./roomEquipment";

const W_ID = "order-flow";
const ARRANGEMENT_DOOR_IDS = new Set(Object.values(ARRANGEMENT_EQUIPMENT_ID));

/** Every room the registry equips, found through the registry's own ids. */
function equippedRooms(): string[] {
  const src = readFileSync(join(process.cwd(), "src/lib/workspace/roomEquipment.ts"), "utf8");
  const literal = [...src.matchAll(/^\s{2}"(\/[a-z0-9-]+)":\s*\[/gm)].map((m) => m[1]);
  return [...new Set([...literal, INSTRUMENT_VIEW_ROUTE])];
}

describe("CAMERA — the Workspace desks say they are cameras", () => {
  it("every desk door on /charts is labelled by the one camera-grammar owner", () => {
    const hand = roomEquipmentOfKind(INSTRUMENT_VIEW_ROUTE, "workspace");
    for (const spec of ARRANGEMENT_SPECS) {
      const door = hand.find((e) => e.id === ARRANGEMENT_EQUIPMENT_ID[spec.id]);
      expect(door, `/charts lost the ${spec.id} desk door`).toBeDefined();
      expect(door!.label).toBe(arrangementCameraLabel(spec.id));
      // The canon desk word LEADS (the glass tour presses /^Order Flow/ etc.)
      // and the camera word FOLLOWS — "Order Flow camera", never "Camera 2".
      expect(door!.label.startsWith(spec.label)).toBe(true);
      expect(door!.label).toMatch(/ camera$/);
    }
  });

  it("the camera grammar reads as the Founder wrote it", () => {
    expect(ARRANGEMENT_SPECS.map((s) => arrangementCameraLabel(s.id))).toEqual([
      "Clean camera",
      "Order Flow camera",
      "Regime camera",
      "Review camera",
    ]);
  });

  it("the Tools › Chart tools arrangement panel prints the same camera words", () => {
    const html = renderToStaticMarkup(
      <ChartArrangementBar
        barsPresent
        printsPresent={false}
        observedAggressorFlow={false}
        active={{}}
        onApply={() => {}}
      />,
    );
    for (const spec of ARRANGEMENT_SPECS) {
      expect(html).toContain(`>${arrangementCameraLabel(spec.id)}<`);
    }
    expect(html).toContain(`WORKSPACE CAMERAS — ${CAMERA_PROMISE.toUpperCase()}`);
  });

  it("the Workspace hand captions its cameras once, above the first desk", () => {
    const os = stripComments(
      readFileSync(join(process.cwd(), "src/components/os/WMOperatingSystem.tsx"), "utf8"),
    );
    expect(os).toMatch(/const camerasAt = firstArrangementIndex\(equipment\);/);
    expect(os).toMatch(
      /\{index === camerasAt \? \(\s*<div\s+data-testid="os-camera-caption"[\s\S]{0,400}?Cameras — \{CAMERA_PROMISE\}/,
    );
  });
});

describe("W — WM Smart Money / Market Intelligence is not a camera", () => {
  it("NOT VACUOUS: the rooms scan finds the rooms that hand out the W", () => {
    const withW = equippedRooms().filter((r) => roomEquipment(r).some((e) => e.id === W_ID));
    expect(withW).toContain(INSTRUMENT_VIEW_ROUTE);
    expect(withW).toContain("/command-deck");
    expect(allRoomEquipmentIds()).toContain(W_ID);
  });

  it("every room names the W door with the one owner's words", () => {
    for (const room of equippedRooms()) {
      for (const e of roomEquipment(room).filter((x) => x.id === W_ID)) {
        expect(e.label, `${room} names the W door differently`).toBe(W_DOOR_LABEL);
        expect(e.hint).toBe(wDoorHint());
        expect(e.kind).toBe("lens");
      }
    }
    expect(W_DOOR_LABEL).toBe("WM Smart Money");
  });

  it("no equipment but a camera is called 'order flow' — the collision cannot return", () => {
    for (const room of equippedRooms()) {
      for (const e of roomEquipment(room)) {
        if (ARRANGEMENT_DOOR_IDS.has(e.id)) continue;
        expect(
          /order\s*flow/i.test(e.label),
          `${room} → "${e.label}" (${e.id}) reuses the camera's name`,
        ).toBe(false);
      }
    }
  });

  it("the W's hint names the installed families and confesses the rest (§20)", () => {
    const hint = wDoorHint();
    expect(hint.startsWith("Market intelligence — ")).toBe(true);
    for (const wing of Object.values(MARKET_INTELLIGENCE_WINGS)) {
      expect(hint, `the W hint drops the ${wing} family`).toContain(wing);
    }
    for (const wing of UNBUILT_WINGS) {
      // An unbuilt wing appears ONLY inside the confession, never in the
      // installed list — "Flow · Liquidity · Volume/Profile · Structure" would
      // promise a Structure reading the panel does not mount.
      const installedPart = hint.split(" · ").filter((p) => !p.includes("not installed"));
      expect(installedPart.join(" · ")).not.toContain(wing);
    }
    expect(hint).toMatch(/Structure, Memory\/Context not installed yet$/);
  });

  it("the W leads the /charts Tools hand", () => {
    expect(roomEquipmentOfKind(INSTRUMENT_VIEW_ROUTE, "lens")[0]?.id).toBe(W_ID);
  });

  it("the W tile wears the brand's W mark (WMLogo geometry), not flow arrows", () => {
    const svg = renderToStaticMarkup(<>{equipmentGlyph(W_ID)}</>);
    // WMLogo's W stroke M7 12 L11.5 26 L16 17 L20.5 26 L25 12, scaled 0.6 and
    // dropped 1.8 into the 24-unit glyph box.
    expect(svg).toContain('d="M4.2 9l2.7 8.4 2.7-5.4 2.7 5.4L15 9"');
    // …and the rising arrow off the right leg.
    expect(svg).toContain('d="M17.4 6.6l2.4 2.4-2.4 2.4"');
  });
});
