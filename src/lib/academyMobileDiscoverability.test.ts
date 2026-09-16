import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

import { WM_DESTINATIONS } from "./routing/wmDestinations";

const layout = readFileSync(resolve(__dirname, "../components/layout/MainLayout.tsx"), "utf8");
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
  and the PHONE SLOT is asserted where the phone bar's five slots are chosen.
*/
describe("Academy mobile discoverability", () => {
  it("keeps Profile in the canonical mobile nav and routes from it to Academy", () => {
    const profileDestination = WM_DESTINATIONS.find((d) => d.href === "/profile");
    expect(profileDestination, "/profile left the destination registry").toBeTruthy();
    expect(profileDestination!.label).toBe("Profile");

    const slots = layout.slice(
      layout.indexOf("const MOBILE_NAV_HREFS"),
      layout.indexOf("const MOBILE_NAV_ITEMS"),
    );
    expect(slots, "the phone bar dropped its Profile slot").toContain('"/profile"');

    expect(profile).toContain('router.push("/education")');
    expect(profile).toContain("No enrollment · no live execution · no earnings promise");
  });
});
