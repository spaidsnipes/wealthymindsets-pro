import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const layout = readFileSync(resolve(__dirname, "../components/layout/MainLayout.tsx"), "utf8");
const profile = readFileSync(resolve(__dirname, "../app/profile/page.tsx"), "utf8");

describe("Academy mobile discoverability", () => {
  it("keeps Profile in the canonical mobile nav and routes from it to Academy", () => {
    expect(layout).toContain('{ href: "/profile", icon: User, label: "Profile" }');
    expect(profile).toContain('router.push("/education")');
    expect(profile).toContain("No enrollment · no live execution · no earnings promise");
  });
});
