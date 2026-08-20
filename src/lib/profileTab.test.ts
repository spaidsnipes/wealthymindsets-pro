import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { parseProfileTab, profileTabHref, PROFILE_TABS } from "./profileTab";

const profilePage = readFileSync(resolve(__dirname, "../app/profile/page.tsx"), "utf8");

describe("profile tab URL contract", () => {
  it.each(PROFILE_TABS)("accepts the canonical %s deep link", (tab) => {
    expect(parseProfileTab(tab)).toBe(tab);
  });

  it("fails closed to Trades for missing or unknown values", () => {
    expect(parseProfileTab(null)).toBe("trades");
    expect(parseProfileTab("")).toBe("trades");
    expect(parseProfileTab("settings")).toBe("trades");
    expect(parseProfileTab("GROWTH")).toBe("trades");
    expect(parseProfileTab("nectar")).toBe("trades");
  });

  it("replaces only tab while preserving other Profile query state", () => {
    expect(profileTabHref("setup=1&tab=trades", "growth")).toBe(
      "/profile?setup=1&tab=growth",
    );
    expect(profileTabHref("", "coins")).toBe("/profile?tab=coins");
  });

  it("wires Profile selection and tab clicks to the canonical URL owner", () => {
    expect(profilePage).toContain('const tab = parseProfileTab(searchParams.get("tab"));');
    expect(profilePage).toContain(
      "router.replace(profileTabHref(searchParams.toString(), t.id as ProfileTab))",
    );
    expect(profilePage).not.toContain('useState<"trades" | "music" | "posts" | "coins" | "growth">');
    expect(profilePage).not.toContain('id: "nectar"');
    expect(profilePage).not.toContain("/nectar");
  });
});
