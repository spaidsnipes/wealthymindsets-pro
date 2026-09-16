/**
 * The Founder-room registry is the ONE decision about the sanctuary family.
 *
 * ── Why this suite exists ────────────────────────────────────────────────────
 *
 * MainLayout used to hard-code `pathname === "/command-deck"` — a string
 * literal in the middle of a 1400-line file. Every additional Founder-family
 * route required rediscovering that check, and drift was inevitable. The
 * registry (founderRoomRoutes.ts) is the single owner now. This suite fences
 * three properties:
 *   1. The named family stays intact (adding or removing a room is a conscious
 *      diff, not a passing accident).
 *   2. Nested routes inherit the family (a trader walking into /nectar/TSLA
 *      does not leave the sanctuary).
 *   3. Look-alike routes DO NOT accidentally join (containing "/journal" as a
 *      substring must not equal being in the Journal room).
 *   4. MainLayout USES the registry — a future refactor that regresses to a
 *      hard-coded pathname check fails this suite before it ships.
 */

import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { FOUNDER_ROOM_ROUTES, isFounderRoomRoute } from "./founderRoomRoutes";

describe("FOUNDER_ROOM_ROUTES — the Asset-10 family registry", () => {
  it("carries every route the Founder audit named a Founder-family room", () => {
    // The literal set. Any addition or removal will show up in the diff
    // for a conversation, not slip in silently.
    //
    // The ORDER moved once, and only the order: this list is now derived from
    // `wmDestinations`, where the rooms are declared along the founder-canon
    // trader loop (PREP → DECIDE → OBSERVE → DISCOVER → LEARN → REVIEW) rather
    // than in the order they happened to graduate. The SET below is identical to
    // the one this Sentinel has always fenced — same seven rooms, no addition,
    // no removal. Asserting the order too is deliberate: the rail renders in
    // this sequence, so a reshuffle is a visible change and should need a diff.
    expect([...FOUNDER_ROOM_ROUTES]).toEqual([
      "/morning-prep",
      "/command-deck",
      "/charts",
      "/heatmaps",
      "/nectar",
      "/paper",
      "/journal",
    ]);
  });

  it("graduates /charts from the July parent while preserving it as the instrument room", () => {
    expect(FOUNDER_ROOM_ROUTES).toContain("/charts");
  });

  it("does not include ungraduated tool routes that must not dictate Founder scene styling", () => {
    // Scanner, readiness, and copy-trading are legitimate tools
    // the audit permits — but they must not force the sanctuary tempo
    // onto themselves or be entered from the family without a route
    // change. Adding them here would be the opposite of the audit's law.
    expect(FOUNDER_ROOM_ROUTES).not.toContain("/scanner");
    expect(FOUNDER_ROOM_ROUTES).toContain("/heatmaps");
    expect(FOUNDER_ROOM_ROUTES).not.toContain("/readiness");
    expect(FOUNDER_ROOM_ROUTES).not.toContain("/copy-trading");
  });
});

describe("isFounderRoomRoute", () => {
  it("recognises every exact family route", () => {
    for (const route of FOUNDER_ROOM_ROUTES) {
      expect(isFounderRoomRoute(route), route).toBe(true);
    }
  });

  it("recognises nested family routes — the trader has not left the room", () => {
    expect(isFounderRoomRoute("/nectar/TSLA")).toBe(true);
    expect(isFounderRoomRoute("/journal/2026-09-13")).toBe(true);
    expect(isFounderRoomRoute("/paper/positions/123")).toBe(true);
  });

  it("rejects routes that only SHARE A PREFIX letter-for-letter, not a boundary", () => {
    // "/journalism" is not "/journal". A prefix without a "/" boundary is
    // coincidence, not membership. If startsWith(route) were the check,
    // "/paperless" would join the Paper room, which would be silent
    // sanctuary leakage.
    expect(isFounderRoomRoute("/journalism")).toBe(false);
    expect(isFounderRoomRoute("/paperless")).toBe(false);
    expect(isFounderRoomRoute("/nectars")).toBe(false);
    expect(isFounderRoomRoute("/command-deck-legacy")).toBe(false);
  });

  it("rejects ungraduated tool routes and the bare domain", () => {
    // The bare domain isn't in the registry — it redirects to /command-deck
    // via founderLanding.ts, which is the single owner. Adding it here
    // would double-owner the landing decision.
    expect(isFounderRoomRoute("/")).toBe(false);
    expect(isFounderRoomRoute("/charts")).toBe(true);
    expect(isFounderRoomRoute("/scanner")).toBe(false);
    expect(isFounderRoomRoute("/heatmaps")).toBe(true);
    expect(isFounderRoomRoute("/copy-trading")).toBe(false);
    expect(isFounderRoomRoute("/profile")).toBe(false);
    expect(isFounderRoomRoute("/login")).toBe(false);
    expect(isFounderRoomRoute("/readiness")).toBe(false);
  });
});

describe("MainLayout uses the registry — not a hard-coded pathname string", () => {
  const MAIN_LAYOUT = () => readFileSync(
    resolve(__dirname, "../../components/layout/MainLayout.tsx"),
    "utf8",
  );

  it("imports isFounderRoomRoute from the routing owner", () => {
    expect(MAIN_LAYOUT()).toContain(
      'import { isFounderRoomRoute } from "@/lib/routing/founderRoomRoutes"',
    );
  });

  it("does not hard-code /command-deck for the shell decision anymore", () => {
    // The hard-coded string was the whole reason this registry exists.
    // A refactor that reintroduces it would silently narrow the sanctuary
    // to /command-deck again, and every OTHER family room would go back
    // to July without one line changing on the visible page.
    expect(MAIN_LAYOUT()).not.toContain('const isFounderOperatingRoom = pathname === "/command-deck"');
  });

  it("lets the sanctuary — not MainLayout — own an OS room's vertical rhythm", () => {
    // THE CLAIM THIS TEST USED TO MAKE, AND WHY IT COULD NOT BE TRUE.
    //
    // It asserted `const documentScroll = isFounderOperatingRoom` and
    // explained that a family room scrolling the shell would show "a July
    // scrollbar around a calm interior". Right worry, wrong file. That
    // expression is computed above the Ticket T cutover and only READ in the
    // July markup below the cutover's early return — a family room never
    // arrives there, so the registry was not deciding anything.
    //
    // Worse, the assertion's implied behaviour is the opposite of the shipped
    // one: WMExperienceShell pins the room at `height: 100dvh` with
    // `overflow: hidden` precisely so it does NOT scroll as a document. A
    // green source scan had been reporting the inverse of the product.
    //
    // So the registry decides MEMBERSHIP (asserted above) and the sanctuary
    // decides RHYTHM. Asserted here at the sanctuary, which is where the fact
    // lives — presence-shaped, at the owner.
    const src = MAIN_LAYOUT();
    expect(src, "the dead disjunct is back").not.toContain(
      "const documentScroll = isFounderOperatingRoom",
    );
    expect(
      readFileSync(
        resolve(__dirname, "../../components/experience/WMExperienceShell.tsx"),
        "utf8",
      ),
      "the sanctuary stopped owning the OS room's frame law",
    ).toContain('overflow: "hidden"');
  });
});
