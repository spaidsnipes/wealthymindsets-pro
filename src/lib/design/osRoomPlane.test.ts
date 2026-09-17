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
  it("reconciles every room's declared frame with what the walk actually finds", () => {
    const unpromoted = WM_DESTINATIONS.filter((d) => d.frame !== "os");
    expect(unpromoted.length).toBeGreaterThan(0);

    const blocked: string[] = [];
    const cleared: string[] = [];
    for (const d of unpromoted) {
      const file = resolve(REPO, roomPageFile(d.href));
      if (!existsSync(file)) continue;
      (findOpaqueRoomPlanes(readFileSync(file, "utf8")).length > 0 ? blocked : cleared).push(d.href);
    }

    // ── THE LEDGER MOVED TO THE REGISTRY, AND THIS IS WHY ────────────────────
    //
    // This test used to hold two hand-written arrays — the blocked rooms and
    // the cleared ones. That made a TEST FILE the owner of a fact about
    // ROUTES, sitting in a different directory from `wmDestinations.ts`, which
    // every rail, shell and guard in the product actually reads. Whoever went
    // looking for "which rooms are ready" would read the registry, find only
    // `"os" | "legacy"`, and re-derive the answer by hand — which is exactly
    // how /proof-lane came within one commit of being promoted while carrying
    // `bg-[#050506]` on its outer wrapper.
    //
    // So `frame: "cleared"` exists now and the registry holds the answer. What
    // is left here is the part a test is actually good at: RECONCILIATION.
    // The walk is re-run from source on every CI run and must agree, room for
    // room, with what the registry declares. Neither can drift from the other
    // without going red, and the error names which room and which direction.
    for (const href of cleared) {
      expect(
        WM_DESTINATIONS.find((d) => d.href === href)?.frame,
        `${href} carries no opaque plane but is still declared "legacy" — mark it "cleared"`,
      ).toBe("cleared");
    }
    for (const href of blocked) {
      expect(
        WM_DESTINATIONS.find((d) => d.href === href)?.frame,
        `${href} paints an opaque plane but is declared "cleared" — it is not`,
      ).toBe("legacy");
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
    // /news WAS the one left, and the note here said it was "waiting for a
    // human to look at it". Someone did (2026-09-16), and the answer turned out
    // to be better than the standoff this comment described.
    //
    // The note was right that the instrument could not tell a room plane from a
    // full-extent fill inside a 300px video box, and right to refuse to widen
    // the detector to guess. But it framed the choice as "widen the instrument
    // or leave the room dirty", and there was a third option: LOOK AT THE FILLS
    // AND ASK WHETHER THEY SHOULD EXIST. They should not. Both sat directly on
    // a parent that is already `bg-black` — the honest surface for a video well
    // — and both painted `#0D1117`, a GitHub-dark hex that is not a WM token
    // and is one shade off the letterbox it covered. They were a second opinion
    // about a surface that already had an owner.
    //
    // Deleting them made the room CORRECT, not merely detectable-as-clean. That
    // is the outcome to reach for when this instrument reports something it
    // admits it cannot fully see: the report is a prompt to go look, and the
    // looking is allowed to conclude that the code was wrong.
    //
    // Do NOT reintroduce a fill here to "restore" a plane the letterbox draws.
    expect(blocked.sort()).toEqual([]);
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
  it("keeps CLEARED strictly short of PROMOTED", () => {
    const cleared = WM_DESTINATIONS.filter((d) => d.frame === "cleared").map((d) => d.href);
    expect(cleared.length, "nothing has cleared the plane check").toBeGreaterThan(0);

    // A cleared room STILL WEARS JULY. `OS_FRAMED_ROUTES` derives from `"os"`
    // alone, so this is currently true by construction — and it is asserted
    // anyway, because the whole hazard of introducing a third state is that a
    // later refactor "helpfully" folds `"cleared"` into the OS family on the
    // reasoning that it is nearly there. It is not nearly there. The
    // instrument rules out ONE way of failing; a human has not looked.
    for (const href of cleared) expect(OS_FRAMED_ROUTES).not.toContain(href);

    // NO ROOM IS `"legacy"` ANY MORE, and that is worth one sentence of
    // suspicion rather than a victory lap.
    //
    // /news was the last one. It got eyes on 2026-09-16: the two fills the
    // instrument could not classify were deleted outright (they sat on an
    // already-black video letterbox and used an off-canon hex), and a separate,
    // real phone defect was found and fixed in the same pass — its topbar and
    // stream rail lost controls off the right edge at 390px.
    //
    // An EMPTY list here does not mean the work is over. It means this
    // particular instrument has nothing left to say, and every remaining
    // question about a room — does it hold the phone, does it draw a landmark
    // the frame owns, does it re-introduce the company — is asked by a
    // DIFFERENT fence. `"legacy"` becoming unused is a state to notice, not a
    // finish line: the next room added to the product starts there again.
    expect(WM_DESTINATIONS.filter((d) => d.frame === "legacy").map((d) => d.href)).toEqual([]);
  });
});
