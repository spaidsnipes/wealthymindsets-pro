import { describe, it, expect } from "vitest";
import { categoryTabsFor, ALL_CATEGORY_TABS } from "./categoryTabsFor";

describe("categoryTabsFor — asset-class-aware category strip", () => {
  it("equity gets the full 8-tab set (baseline)", () => {
    expect(categoryTabsFor("equity")).toEqual(ALL_CATEGORY_TABS);
  });

  it("etf drops Corporate Actions + redundant ETFs tab, keeps holdings via Shareholders", () => {
    const tabs = categoryTabsFor("etf");
    expect(tabs).toContain("Chart");
    expect(tabs).toContain("Financials");
    expect(tabs).toContain("Shareholders");
    expect(tabs).not.toContain("Corporate Actions");
    expect(tabs).not.toContain("ETFs");
  });

  it("options contract shows Chart + Profile only — no Financials on a derivative", () => {
    const tabs = categoryTabsFor("options");
    expect(tabs).toEqual(["Chart", "Profile"]);
    expect(tabs).not.toContain("Options"); // viewing an option; no self-reference
    expect(tabs).not.toContain("Financials");
  });

  it("crypto drops corporate + shareholder tabs", () => {
    const tabs = categoryTabsFor("crypto");
    expect(tabs).toEqual(["Chart", "Profile"]);
    expect(tabs).not.toContain("Corporate Actions");
    expect(tabs).not.toContain("Shareholders");
    expect(tabs).not.toContain("Financials");
    expect(tabs).not.toContain("Valuation");
  });

  it("futures drops corporate + shareholder tabs", () => {
    const tabs = categoryTabsFor("futures");
    expect(tabs).toEqual(["Chart", "Profile"]);
  });

  it("forex drops corporate + shareholder tabs", () => {
    const tabs = categoryTabsFor("forex");
    expect(tabs).toEqual(["Chart", "Profile"]);
  });

  it("Chart is ALWAYS present — every asset class needs the primary surface", () => {
    (["equity", "etf", "options", "crypto", "futures", "forex"] as const).forEach(cls => {
      expect(categoryTabsFor(cls)).toContain("Chart");
    });
  });

  it("Profile is ALWAYS present — every asset class carries at least reference/spec data", () => {
    (["equity", "etf", "options", "crypto", "futures", "forex"] as const).forEach(cls => {
      expect(categoryTabsFor(cls)).toContain("Profile");
    });
  });

  it("returned lists are non-empty and only contain values from ALL_CATEGORY_TABS", () => {
    (["equity", "etf", "options", "crypto", "futures", "forex"] as const).forEach(cls => {
      const tabs = categoryTabsFor(cls);
      expect(tabs.length).toBeGreaterThan(0);
      tabs.forEach(t => expect(ALL_CATEGORY_TABS).toContain(t));
    });
  });

  it("no duplicate tabs in any asset-class list", () => {
    (["equity", "etf", "options", "crypto", "futures", "forex"] as const).forEach(cls => {
      const tabs = categoryTabsFor(cls);
      expect(new Set(tabs).size).toBe(tabs.length);
    });
  });
});
