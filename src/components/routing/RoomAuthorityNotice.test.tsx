import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { RoomAuthorityNotice } from "./RoomAuthorityNotice";
import { WM_DESTINATIONS } from "@/lib/routing/wmDestinations";

/*
  THE IN-ROOM HALF OF THE M3 QUARANTINE.

  commandDeckQuarantine.test.ts already pins the DOORS. This file pins the
  ROOM, and its load-bearing test is the one that would still pass if the
  component hard-coded the string "/command-deck": so that one is written as a
  DERIVATION test instead — the notice must appear on exactly the set of routes
  the registry marks legacy, computed from the registry at run time, so moving
  the flag moves the notice with no edit here and no edit in the component.
*/
describe("RoomAuthorityNotice — the room says the word its door says", () => {
  it("renders nothing for a room with normal authority", () => {
    const normal = WM_DESTINATIONS.find((d) => d.authority !== "legacy");
    expect(normal, "every destination is quarantined — that is not a product").toBeTruthy();
    const html = renderToStaticMarkup(<RoomAuthorityNotice href={normal!.href} />);
    expect(html).toBe("");
  });

  it("renders nothing for an href the destination owner has never heard of", () => {
    // Silence, not a guess. A room outside the registry is a room this
    // component cannot make a truthful statement about.
    const html = renderToStaticMarkup(<RoomAuthorityNotice href="/not-a-room" />);
    expect(html).toBe("");
  });

  it("renders the word, the sentence and the way home for a legacy room", () => {
    const legacy = WM_DESTINATIONS.find((d) => d.authority === "legacy");
    expect(legacy).toBeTruthy();
    const html = renderToStaticMarkup(<RoomAuthorityNotice href={legacy!.href} />);
    expect(html).toContain('data-testid="room-legacy-notice"');
    expect(html).toContain("LEGACY");
    // Names the room by its ONE registry label, so the room cannot be called
    // one thing in the rail and another thing inside itself.
    expect(html).toContain(legacy!.label);
    expect(html).toContain("no longer part of the normal trading loop");
    // Preserve capability is the Founder's own wording of the order; a notice
    // that read as "this room is broken" would be a different, false claim.
    expect(html).toContain("Capability is preserved");
    expect(html).toContain('href="/charts"');
  });

  it("DERIVES from the registry: notice set == legacy set, both directions", () => {
    // THE FALSIFIER. A component with "/command-deck" written into it passes
    // the test above and fails this one the moment the order moves.
    const withNotice = WM_DESTINATIONS.filter(
      (d) => renderToStaticMarkup(<RoomAuthorityNotice href={d.href} />) !== "",
    ).map((d) => d.href);
    const legacy = WM_DESTINATIONS.filter((d) => d.authority === "legacy").map((d) => d.href);
    expect(withNotice).toEqual(legacy);
  });

  it("keeps ONE owner: the component holds no route list of its own", () => {
    const src = readFileSync(resolve(__dirname, "RoomAuthorityNotice.tsx"), "utf8");
    // It must read the registry…
    expect(src).toContain("WM_DESTINATIONS");
    expect(src).toContain('destination.authority !== "legacy"');
    // …and must not name the quarantined route in its own code. A second list
    // is a second owner, and the two disagree the first time an order moves.
    // Strip comments properly. A line-prefix filter is not enough here: this
    // codebase writes block comments with bare-indented prose rather than a
    // leading `*` on every line, so a prefix heuristic reads documentation as
    // code and fires on the route name in the very paragraph that EXPLAINS the
    // quarantine. That is the stripper being wrong, not the assertion.
    const code = src
      .replace(/\/\*[\s\S]*?\*\//g, "")
      .split("\n")
      .filter((line) => !line.trimStart().startsWith("//"))
      .join("\n");
    expect(code).not.toContain("/command-deck");
  });

  it("is mounted inside the deck room, not only on its doors", () => {
    // The whole point of this atom: a bookmark arrival passes no door. If the
    // deck page stops rendering the notice, the quarantine goes back to being
    // visible only from outside the room it quarantines.
    const deck = readFileSync(
      resolve(__dirname, "../../app/command-deck/page.tsx"),
      "utf8",
    );
    expect(deck).toContain("RoomAuthorityNotice");
    expect(deck).toContain('<RoomAuthorityNotice href="/command-deck" />');
  });
});
