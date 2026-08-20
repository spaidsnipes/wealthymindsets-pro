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
    expect(mobileSession).toContain('href="/charts"');
    expect(mobileSession).toContain("Open chart.");
    expect(mobileSession).not.toContain("/nectar/");
    expect(mobileSession).not.toContain("Open Nectar");
  });

  it("preserves private route layout behavior pending its controlled migration", () => {
    expect(layout).toContain('pathname === "/nectar"');
    expect(layout).toContain('pathname.startsWith("/nectar/")');
  });
});
