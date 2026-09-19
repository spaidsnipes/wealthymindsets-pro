import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

import { PHONE_SLOT_HREFS, phoneNavDestinations, WM_DESTINATIONS } from "./routing/wmDestinations";

const profile = readFileSync(resolve(__dirname, "../app/profile/page.tsx"), "utf8");

/*
  THIS SENTINEL USED TO SCAN THE WRONG FILE.

  It asserted the literal `{ href: "/profile", icon: User, label: "Profile" }`
  inside MainLayout, back when MainLayout typed its own nav arrays. The rooms
  now have ONE owner (`wmDestinations.ts`) and MainLayout derives from it — so
  that literal is gone, and a Sentinel aimed at a file that no longer owns the
  fact does not fail loudly on the day the fact moves. It passes, silently,
  guarding nothing.

  So the guard is split to follow the fact: the DESTINATION is asserted as data
  in the registry (stronger than a string match — a comment cannot satisfy it),
  and the PHONE SLOT is asserted where the phone bar's slots are chosen.

  AND THEN IT MOVED AGAIN, which is the point. The slot list was still private
  to MainLayout, so the OS frame could not draw a phone bar at all — a trader
  who opened /command-deck on a phone could not leave it. Moving the list to
  the destination owner fixed that and broke THIS assertion, loudly, because
  the assertion had been rewritten to read a source slice. It is now data too:
  no substring of any file can satisfy it.
*/
describe("Academy mobile discoverability", () => {
  it("keeps Profile in the canonical mobile nav and routes from it to Academy", () => {
    const profileDestination = WM_DESTINATIONS.find((d) => d.href === "/profile");
    expect(profileDestination, "/profile left the destination registry").toBeTruthy();
    expect(profileDestination!.label).toBe("Profile");

    expect(PHONE_SLOT_HREFS, "the phone bar dropped its Profile slot").toContain("/profile");
    // Resolved, not just listed — a slot naming a route the registry does not
    // know is a painted door at 390px, and `phoneNavDestinations` throws on it.
    expect(phoneNavDestinations().map((d) => d.label)).toContain("Profile");

    expect(profile).toContain('router.push("/education")');
    expect(profile).toContain("No enrollment · no live execution · no earnings promise");
  });
});
