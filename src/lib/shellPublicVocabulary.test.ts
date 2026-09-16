import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const source = (path: string) => readFileSync(resolve(__dirname, path), "utf8");

describe("global shell public/private vocabulary", () => {
  const layout = source("../components/layout/MainLayout.tsx");
  const mobileSession = source("../components/layout/MobileSessionPill.tsx");
  // The nav labels moved to their single owner; see wmDestinations.ts. A scan
  // left pointing at MainLayout would now match nothing and pass forever.
  const destinations = source("../lib/routing/wmDestinations.ts");

  it("keeps private collection infrastructure out of global navigation", () => {
    expect(destinations).not.toContain('label: "Nectar');
    expect(layout).not.toContain('label: "Nectar');
    expect(layout).not.toContain("HeaderVaultPill");
    expect(destinations).toContain(
      '{ href: "/command-deck", label: "Command Deck", icon: Crosshair, group: "ROOM"',
    );
  });

  it("routes contextual mobile market health to the public chart workspace", () => {
    // The pill must point at the instrument view by DERIVING it. See
    // founderLanding.ts: a declared owner that consumers retype past is a
    // shadow owner, and reads as centralised while being anything but.
    expect(mobileSession).toContain("href={INSTRUMENT_VIEW_ROUTE}");
    expect(mobileSession).toContain("Open chart.");
    expect(mobileSession).not.toContain("/nectar/");
    expect(mobileSession).not.toContain("Open Nectar");
  });

  it("routes /nectar family membership through the same registry the sanctuary reads", () => {
    // The /nectar family previously had a hard-coded check in MainLayout
    // for its documentScroll semantics. That check is now delegated to
    // the Founder-room registry (founderRoomRoutes.ts) so a single owner
    // decides both "does this route wear the sanctuary?" and "does this
    // route own its own vertical rhythm?" for every family member.
    expect(layout).toContain('import { isFounderRoomRoute } from "@/lib/routing/founderRoomRoutes"');
    expect(layout).toContain('const isFounderOperatingRoom = isFounderRoomRoute(pathname)');
    expect(layout).toContain('const documentScroll = isFounderOperatingRoom');
  });
});
