import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

import { WM_DESTINATIONS } from "./wmDestinations";
import { OS_ROOMS } from "@/components/os/WMOperatingSystem";

/*
  M3 QUARANTINE — the Founder's 2026-09-19 order, as assertions.

  "As soon as /charts is legal HOME, Command Deck loses normal-route
  authority → explicit legacy/debug quarantine. Preserve capability. Kill
  competing authority."

  /charts became legal HOME on 2026-09-17 (founderLanding.ts). The phone slot
  fell on 2026-09-19 (ShellAccessParity pins the strip at four doors). This
  file guards the third and final piece: the deck's remaining doors must SAY
  the word LEGACY, and no other room may catch the label by drift.

  Data-first, per the lesson written into academyMobileDiscoverability.test.ts:
  the authority verdict is asserted on the registry objects and on the derived
  OS_ROOMS objects — a comment cannot satisfy either. The two source scans at
  the bottom assert only that each shell's door-drawing code CONSUMES the fact;
  they are breadcrumbs to the renderers, not the verdict itself.
*/
describe("Command Deck legacy quarantine (M3)", () => {
  it("marks exactly one destination legacy, and it is /command-deck", () => {
    const legacy = WM_DESTINATIONS.filter((d) => d.authority === "legacy");
    expect(legacy.map((d) => d.href)).toEqual(["/command-deck"]);
  });

  it("preserves capability: the deck keeps its door, family and tier", () => {
    const deck = WM_DESTINATIONS.find((d) => d.href === "/command-deck");
    expect(deck, "/command-deck left the registry — that is retirement, not quarantine").toBeTruthy();
    expect(deck!.group).toBe("ROOM");
    expect(deck!.tier).toBe(1);
    // frame stays a MEASUREMENT: the deck genuinely wears the OS frame.
    // Bending frame to "legacy" would falsify a fact to express a verdict.
    expect(deck!.frame).toBe("os");
  });

  it("carries the verdict into OS_ROOMS without inventing it for others", () => {
    const deckRoom = OS_ROOMS.find((r) => r.href === "/command-deck");
    expect(deckRoom, "the deck lost its OS rail door — capability regression").toBeTruthy();
    expect(deckRoom!.legacy).toBe(true);
    // Absence, not false: rooms with normal authority carry NO legacy key,
    // so a renderer cannot branch on a fact the owner never stated.
    for (const room of OS_ROOMS) {
      if (room.href === "/command-deck") continue;
      expect(room.legacy, `${room.href} grew a legacy flag without an order`).toBeUndefined();
    }
  });

  it("both shells' door renderers consume the authority fact", () => {
    const os = readFileSync(
      resolve(__dirname, "../../components/os/WMOperatingSystem.tsx"),
      "utf8",
    );
    const july = readFileSync(
      resolve(__dirname, "../../components/layout/MainLayout.tsx"),
      "utf8",
    );
    // The OS rail passes the room's legacy fact into its door primitive…
    expect(os).toContain("legacy={room.legacy}");
    // …and the July 72px rail destructures authority off the registry item.
    expect(july).toContain('authority === "legacy"');
    // The July shell draws ROOM doors in a SECOND place: the Workspace
    // drawer's withheld-while-capital-is-live section. That door must say
    // the word too, or the label disappears exactly when capital is live.
    expect(july).toContain("drawer-legacy-chip");
  });
});
