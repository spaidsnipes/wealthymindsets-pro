/**
 * ONE OS · no room paints over the sanctuary, whatever it calls the paint.
 *
 * Two halves, deliberately separated:
 *
 *   1. The detector is tested against SYNTHETIC source, including the exact
 *      line that defeated the previous scan. A detector proven only against
 *      the current codebase is proven against a codebase that already passes.
 *
 *   2. The walk is over `OS_FRAMED_ROUTES`, the registry that OWNS which
 *      routes wear the frame. Not a hand-listed set of files. The whole point
 *      is that promoting a route to `frame: "os"` in wmDestinations.ts pulls it
 *      into this gate in the same commit — a room cannot enter the OS without
 *      being asked this question.
 */
import { describe, it, expect } from "vitest";
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

import {
  findOpaqueRoomPlanes,
  roomPageFile,
  stripComments,
  NEAR_BLACK_CHANNEL_MAX,
} from "./osRoomPlane";
import { OS_FRAMED_ROUTES, WM_DESTINATIONS } from "@/lib/routing/wmDestinations";

const REPO = resolve(__dirname, "../../..");

describe("osRoomPlane · the detector", () => {
  it("catches the arbitrary-value fill that the token scan missed", () => {
    // VERBATIM from src/app/proof-lane/page.tsx at the time this was written.
    // This exact line was reported as CLEAN by a scan for bg-wm-black /
    // bg-wm-dark / WM.surface.deep, and #050506 is the same colour
    // /morning-prep was fixed for.
    const line = '<div className="h-full overflow-y-auto bg-[#050506] text-neutral-100">';
    const found = findOpaqueRoomPlanes(line);
    expect(found).toHaveLength(1);
    expect(found[0].found).toBe("bg-[#050506]");
  });

  it("still catches the token spellings it inherited", () => {
    expect(findOpaqueRoomPlanes('<div className="h-full bg-wm-black">')).toHaveLength(1);
    expect(findOpaqueRoomPlanes('<div className="min-h-screen bg-wm-dark">')).toHaveLength(1);
    expect(findOpaqueRoomPlanes('<div className="inset-0" style={{ background: WM.surface.deep }}>'))
      .toHaveLength(1);
  });

  it("catches inline fills and gradients that end in a near-black stop", () => {
    expect(
      findOpaqueRoomPlanes('<div className="h-full" style={{ background: "#0b0b0d" }}>'),
    ).toHaveLength(1);
    expect(
      findOpaqueRoomPlanes(
        '<div className="min-h-screen" style={{ background: "radial-gradient(at top, #111, #050506)" }}>',
      ),
    ).not.toHaveLength(0);
  });

  /**
   * ── THE OVERREACH THAT THIS TEST EXISTS TO PREVENT ────────────────────────
   *
   * The first version of the detector asked only "is there a near-black opaque
   * fill in this file". Run against the seven rooms ALREADY in the OS frame —
   * rooms audited and fixed for precisely this — it produced fifteen offences:
   * a `#161B22` /heatmaps tile, a `bg-wm-dark` /paper card, a `#0D1117`
   * /morning-prep panel.
   *
   * None of those is the defect. The sanctuary is meant to be seen AROUND the
   * furniture, not through it. A gate that calls every dark card a violation
   * teaches the next author to widen it rather than obey it, and then it
   * protects nothing at all.
   */
  it("does NOT report a dark CARD — furniture is not a plane", () => {
    expect(findOpaqueRoomPlanes('<div className="rounded-xl bg-wm-dark p-4">')).toEqual([]);
    expect(
      findOpaqueRoomPlanes('<div className="rounded p-2" style={{ background: "#161B22" }}>'),
    ).toEqual([]);
    expect(findOpaqueRoomPlanes('<td style={{ background: "#0A0E14" }}>')).toEqual([]);
  });

  it("does NOT report translucent fill — a sticky band has an honest reason", () => {
    // rgba(11,11,13,0.8) is the canonical .wm-sticky-glass value. Rows scroll
    // under a pinned band, so it needs fill; opacity is the entire difference
    // between a legible band and an opaque slab, and this reads it.
    expect(
      findOpaqueRoomPlanes('<div className="h-full sticky" style={{ backgroundColor: "rgba(11, 11, 13, 0.8)" }}>'),
    ).toEqual([]);
    expect(findOpaqueRoomPlanes('<div className="h-full bg-[#050506]/40">')).toEqual([]);
  });

  it("does NOT report bright colour — that is brand, and it is visible on sight", () => {
    // /shop's gold and /profile's teal and violet. The harm this gate exists
    // for is a dark fill that LOOKS like the sanctuary while cancelling it. A
    // bright plane is caught by the first person to open the page.
    expect(findOpaqueRoomPlanes('<div className="h-full bg-[#E8B923]">')).toEqual([]);
    expect(findOpaqueRoomPlanes('<div className="h-full bg-[#00D4AA]">')).toEqual([]);
    expect(findOpaqueRoomPlanes('<div className="h-full bg-[#7C3AED]">')).toEqual([]);
  });

  /**
   * ── THE SECOND OVERREACH: A WINDOW DOES NOT KNOW WHAT AN ELEMENT IS ───────
   *
   * Condition 3 was first measured as "a full-extent claim within ±180
   * characters". Over the nine blocked legacy rooms that reported a 224px
   * sidebar, a text input, a toolbar strip and a light-mode CSS rule — each
   * one sitting near an `h-full` that belonged to a DIFFERENT element.
   *
   * The rule says the fill and the extent claim must be on the same element,
   * so the measurement has to be of the same element too. 21 reports → 11.
   */
  it("does NOT report a fill whose h-full belongs to a NEIGHBOUR", () => {
    const source = [
      '<div className="h-full">',
      '  <input className="flex-1 bg-wm-black rounded" />',
      "</div>",
    ].join("\n");
    expect(findOpaqueRoomPlanes(source)).toEqual([]);
  });

  it("still reports when the fill and the claim are on the SAME element", () => {
    expect(findOpaqueRoomPlanes('<div className="h-full w-full bg-wm-black">')).toHaveLength(1);
  });

  it("does not let an arrow function in a prop end the tag early", () => {
    // `onClick={() => x}` contains a `>`. A scanner that stopped at the first
    // `>` would cut the tag before reaching className and report nothing.
    expect(
      findOpaqueRoomPlanes('<div onClick={() => go()} className="h-full bg-wm-black">'),
    ).toHaveLength(1);
  });

  /**
   * ── A PLANE SPANS THE ROOM; A FULL-HEIGHT DRAWER IS FURNITURE ─────────────
   *
   * /shop's cart is `h-full flex flex-col bg-wm-dark` on a spring-animated
   * motion.div — and `w-[400px]`. Height alone was the wrong test, because a
   * room is taller than it is wide, so `h-full` is what gets typed while
   * `w-full` stays implicit. An element that names its own width has declined
   * to be the room.
   */
  it("does NOT report a width-constrained drawer, however tall", () => {
    expect(
      findOpaqueRoomPlanes('<div className="h-full w-[400px] flex flex-col bg-wm-dark border-l">'),
    ).toEqual([]);
    expect(findOpaqueRoomPlanes('<div className="h-full w-56 bg-wm-dark">')).toEqual([]);
    expect(findOpaqueRoomPlanes('<div className="h-full max-w-6xl bg-wm-black">')).toEqual([]);
  });

  it("treats w-full and w-screen as the room's width, not a limit", () => {
    expect(findOpaqueRoomPlanes('<div className="h-full w-full bg-wm-dark">')).toHaveLength(1);
    expect(findOpaqueRoomPlanes('<div className="h-full w-screen bg-wm-dark">')).toHaveLength(1);
  });

  it("reads the threshold from the exported constant, not a copy of it", () => {
    const hex = (n: number) => `#${n.toString(16).padStart(2, "0").repeat(3)}`;
    const inside = `<div className="h-full bg-[${hex(NEAR_BLACK_CHANNEL_MAX)}]">`;
    const outside = `<div className="h-full bg-[${hex(NEAR_BLACK_CHANNEL_MAX + 1)}]">`;
    expect(findOpaqueRoomPlanes(inside)).toHaveLength(1);
    expect(findOpaqueRoomPlanes(outside)).toEqual([]);
  });

  it("does not read comments, in either direction", () => {
    // A repair's own comment quotes the value it replaced. A scan that reads
    // comments reports the FIX as the defect — and the mirror case, a comment
    // satisfying an assertion that an element is mounted, has already cost
    // this shift a test that could not fail.
    expect(findOpaqueRoomPlanes('/* was <div className="h-full bg-wm-black"> */')).toEqual([]);
    expect(findOpaqueRoomPlanes('  // was h-full bg-[#050506], now transparent')).toEqual([]);
    expect(stripComments("a /* b */ c")).toBe("a  c");
  });
});

describe("osRoomPlane · every OS room lets the sanctuary through", () => {
  it("has rooms to check", () => {
    // Vacuity guard. If the registry ever returns [] every assertion below
    // passes by iterating nothing.
    expect(OS_FRAMED_ROUTES.length).toBeGreaterThanOrEqual(7);
  });

  it("resolves every OS-framed route to a page file that exists", () => {
    // A route promoted to frame:"os" with no page behind it is a door the OS
    // rail opens onto nothing.
    const missing = OS_FRAMED_ROUTES.filter(
      (href) => !existsSync(resolve(REPO, roomPageFile(href))),
    );
    expect(missing).toEqual([]);
  });

  it("finds no opaque plane in any room the OS frame holds", () => {
    const report: string[] = [];
    for (const href of OS_FRAMED_ROUTES) {
      const file = roomPageFile(href);
      const offences = findOpaqueRoomPlanes(readFileSync(resolve(REPO, file), "utf8"));
      for (const o of offences) report.push(`${file}: ${o.found} — ${o.reason}`);
    }
    expect(report).toEqual([]);
  });

  /**
   * THE PROMOTION LEDGER.
   *
   * `frame: "os"` is documented in wmDestinations.ts as a MEASUREMENT — "a
   * route is promoted by looking at it". Most of the product is behind a
   * client-side auth gate, so "looking at it" has been the bottleneck on
   * collapsing the two shells into one.
   *
   * This is the half of that measurement which does not need a session. It
   * does not promote anything and it does not claim a route is ready; it
   * records which legacy rooms would carry an opaque plane INTO the sanctuary
   * if promoted today. A clean route here still needs eyes. A dirty one is
   * known-not-ready without spending them.
   */
  it("records which legacy rooms would carry a plane into the sanctuary", () => {
    const legacy = WM_DESTINATIONS.filter((d) => d.frame === "legacy");
    expect(legacy.length).toBeGreaterThan(0);

    const blocked: string[] = [];
    for (const d of legacy) {
      const file = resolve(REPO, roomPageFile(d.href));
      if (!existsSync(file)) continue;
      if (findOpaqueRoomPlanes(readFileSync(file, "utf8")).length > 0) blocked.push(d.href);
    }

    // The measured state. This is a LEDGER, not a target: it goes red both
    // when a room is cleaned (good — promote it and update this list) and when
    // a clean room acquires a plane (bad). Either way the next author is told
    // which, rather than finding out at promotion.
    //
    // It was nine. Eight were one line each — an outer wrapper carrying
    // `bg-wm-black` or `bg-wm-dark`, redundant under the July shell (which
    // paints the same black behind it) and fatal under the OS frame. That is
    // why they survived: nothing looks wrong today, so there is no pressure to
    // remove them, and the damage only appears on the commit that promotes the
    // route — where the promotion gets blamed for it.
    //
    // /news is the one left, and it is left HONESTLY. Its two remaining fills
    // are `w-full h-full` on the offline-state and no-stream views INSIDE a
    // video player box whose own height is set to 300px. `h-full` there means
    // the player, not the room. The instrument cannot see an ancestor, so it
    // cannot tell those from a room plane — see `enclosingOpenTag`. Rather
    // than add a third heuristic that guesses, the blindness is named and
    // /news waits for a human to look at it, which is what the register is
    // for. Do NOT "fix" /news by widening the detector.
    expect(blocked.sort()).toEqual(["/news"]);
  });

  /**
   * THE COMPLEMENT OF THE LEDGER ABOVE, STATED SO IT CANNOT BE LOST.
   *
   * Thirteen of the fourteen legacy rooms carry no opaque plane — five that
   * never did, and eight cleaned in the commit that wrote this list down.
   * That is NOT a promotion certificate.
   * `frame: "os"` is a measurement made by LOOKING at the route inside the
   * frame, and this instrument cannot look; it can only rule out one specific
   * way of failing.
   *
   * It is written down because "which rooms already cleared the plane check"
   * is the exact fact that gets re-derived, badly, by the next person trying
   * to collapse the two shells — and re-deriving it with a scan aimed at token
   * names is how /proof-lane came within one commit of being promoted while
   * carrying `bg-[#050506]` on its outer wrapper.
   */
  it("names the legacy rooms that have cleared the plane check, without promoting them", () => {
    const legacy = WM_DESTINATIONS.filter((d) => d.frame === "legacy");
    const clear = legacy
      .filter((d) => existsSync(resolve(REPO, roomPageFile(d.href))))
      .filter(
        (d) =>
          findOpaqueRoomPlanes(readFileSync(resolve(REPO, roomPageFile(d.href)), "utf8"))
            .length === 0,
      )
      .map((d) => d.href);

    expect(clear.sort()).toEqual(
      [
        "/ai-bot",
        "/backtesting",
        "/copy-trading",
        "/creator",
        "/education",
        "/lounge",
        "/partnerships",
        "/profile",
        "/proof-lane",
        "/radio",
        "/scanner",
        "/shop",
        "/tv",
      ].sort(),
    );

    // And they are still legacy. If one is promoted, this goes red and the
    // author has to move it deliberately rather than by drift.
    for (const href of clear) expect(OS_FRAMED_ROUTES).not.toContain(href);
  });
});
