import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const source = (path: string) => readFileSync(resolve(__dirname, path), "utf8");

describe("global shell public/private vocabulary", () => {
  const layout = source("../components/layout/MainLayout.tsx");
  const mobileSession = source("../components/layout/MobileSessionPill.tsx");

  it("keeps private collection infrastructure out of global navigation", () => {
    expect(layout).not.toContain('label: "Nectar');
    expect(layout).not.toContain("HeaderVaultPill");
    expect(layout).toContain('{ href: "/command-deck", icon: Crosshair, label: "Command Deck" }');
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

  it("preserves private route layout behavior pending its controlled migration", () => {
    expect(layout).toContain('pathname === "/nectar"');
    expect(layout).toContain('pathname.startsWith("/nectar/")');
  });
});
