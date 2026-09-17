/**
 * THE MALL DOES NOT STAND IN FRONT OF THE MARKET.
 *
 * ── The measured failure this pins ──────────────────────────────────────────
 *
 * The rooms rail is permanent chrome: twenty-one doors, a workspace block and
 * the standing conditions, OS_RAIL_WIDTH_PX wide, on every route at every
 * moment. Measured on the live production build at 1920x840 on 2026-09-17, the
 * chart canvas on the instrument view was 1388x596 — 51.3% of the viewport —
 * and the single largest block of width that was NOT price was the rail.
 *
 * WM Pro is the advanced chart. On the instrument view the doors must not be
 * in front of the trader before the trader has asked for a door.
 *
 * ── What these tests are FOR, stated so they cannot drift ───────────────────
 *
 * Not "the rail is gone" — that would be a burial, and a buried door is a worse
 * defect than a wide one. What has to stay true is BOTH halves:
 *
 *   1. the instrument view does not open with the rail in front of the market
 *   2. every room the rail held is still one labelled, keyboard-reachable,
 *      correctly-announced click away
 *
 * A change that satisfies only the first is the failure these exist to catch.
 *
 * renderToStaticMarkup runs no effects and has no viewport, so it answers
 * exactly the question asked here — what the FIRST frame contains — which is
 * the frame the Founder's five-second look lands on.
 */

import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";

import { OS_RAIL_WIDTH_PX, WMOperatingSystem } from "./WMOperatingSystem";
import { FEEDLESS_SURFACE } from "@/lib/os/osChrome";

function frame(props: { railDefaultOpen?: boolean } = {}): string {
  return renderToStaticMarkup(
    <WMOperatingSystem
      activeHref="/charts"
      surface="Charts"
      openEvidenceItems={null}
      rightOfWay="UNKNOWN"
      rightOfWayResolved={false}
      feed={FEEDLESS_SURFACE}
      {...props}
    >
      <div>room</div>
    </WMOperatingSystem>,
  );
}

const RAIL = 'data-testid="os-rail"';
const TOGGLE = 'data-testid="os-rail-toggle"';

describe("the rooms rail can stand aside for the market", () => {
  it("opens WITH the rail by default — a reflection room keeps its doors", () => {
    // The default has to be the old behaviour. A frame that defaults closed
    // would silently strip navigation from every room that never asked.
    expect(frame()).toContain(RAIL);
  });

  it("a room that asks for the market first gets a first frame with no rail", () => {
    expect(frame({ railDefaultOpen: false })).not.toContain(RAIL);
  });

  it("closed renders NOTHING, not a zero-width column", () => {
    /**
     * The tempting implementation is `flex: 0 0 0` or `width: 0`, which leaves
     * a nav in the tree that a screen reader still walks, still announces as
     * "Rooms, navigation", and still lets a Tab land inside — twenty-one
     * invisible focus stops between the masthead and the chart. Visually
     * identical, and worse than what it replaced.
     */
    const closed = frame({ railDefaultOpen: false });
    expect(closed).not.toContain('aria-label="Rooms" data-testid="os-rail"');
    expect(closed, "a collapsed rail left a zero-width column in the tree")
      .not.toMatch(/flex:\s*0 0 0(px)?/);
  });
});

describe("closed is not buried — every door is one announced click away", () => {
  it("the toggle is present whether the rail is open or closed", () => {
    // Especially when CLOSED. A control that only exists once the panel is
    // already open cannot be the way back to it.
    for (const railDefaultOpen of [true, false]) {
      expect(frame({ railDefaultOpen }), `no toggle when railDefaultOpen=${railDefaultOpen}`)
        .toContain(TOGGLE);
    }
  });

  it("the toggle reports the rail's real state through aria-expanded", () => {
    expect(frame({ railDefaultOpen: true })).toMatch(/aria-expanded="true"[^>]*os-rail-toggle|os-rail-toggle[^>]*aria-expanded="true"/);
    expect(frame({ railDefaultOpen: false })).toMatch(/aria-expanded="false"[^>]*os-rail-toggle|os-rail-toggle[^>]*aria-expanded="false"/);
  });

  it("aria-controls names an element the OPEN rail actually has", () => {
    // aria-controls pointing at an id that appears nowhere is the shape of an
    // accessibility annotation added to satisfy a reviewer rather than a user.
    const open = frame({ railDefaultOpen: true });
    const controls = open.match(/aria-controls="([^"]+)"/);
    expect(controls, "the toggle declares no aria-controls").not.toBeNull();
    expect(open, "aria-controls names an id that is not in the document")
      .toContain(`id="${controls?.[1]}"`);
  });

  it("the toggle is a real button with a name that survives the icon", () => {
    const closed = frame({ railDefaultOpen: false });
    const el = closed.match(/<button[^>]*os-rail-toggle[^>]*>/)?.[0] ?? "";
    expect(el, "the rail control is not a button").toContain("<button");
    expect(el, "the rail control has no accessible name").toMatch(/aria-label="[^"]+"/);
    // The glyph is decoration. If it ever loses aria-hidden it becomes part of
    // the announced name and a screen reader reads a box-drawing character.
    expect(closed).toMatch(/aria-hidden[^>]*>[◧▤]</);
  });
});

describe("the width the rail costs has one owner", () => {
  it("the open rail is sized from OS_RAIL_WIDTH_PX, not a retyped literal", () => {
    // The prose in railDefaultOpen's doc quotes this number as the thing
    // closing the rail gives back. A second literal is how that receipt goes
    // stale without anyone editing the sentence.
    expect(frame({ railDefaultOpen: true })).toContain(`0 0 ${OS_RAIL_WIDTH_PX}px`);
  });
});
