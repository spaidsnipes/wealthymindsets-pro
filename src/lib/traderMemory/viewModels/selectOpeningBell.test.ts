/**
 * selectOpeningBell — M31 readiness selector truth-lock.
 * Verdict math: READY / MOSTLY_READY / NOT_READY / UNKNOWN with
 * per-item evidence + data-category dynamic verdict from live quality.
 */

import { describe, it, expect } from "vitest";
import {
  selectOpeningBell,
  DEFAULT_PREPARATION_TEMPLATE,
  type PreparationItem,
} from "./selectOpeningBell";

function item(
  id: string,
  category: PreparationItem["category"],
  required: boolean,
  completed: boolean,
  extra: Partial<PreparationItem> = {},
): PreparationItem {
  return {
    id,
    label: id,
    category,
    required,
    completed,
    ...extra,
  };
}

describe("selectOpeningBell — M31 readiness selector", () => {
  it("returns UNKNOWN when no items configured", () => {
    const vm = selectOpeningBell({
      ownerId: "u",
      sessionIdentity: "s",
      items: [],
      minutesUntilOpen: 60,
      nowMs: 1_000,
    });
    expect(vm.verdict).toBe("UNKNOWN");
    expect(vm.reason).toMatch(/No preparation checklist configured/i);
    expect(vm.items).toEqual([]);
    expect(vm.evaluatedAt).toBe(1_000);
  });

  it("returns UNKNOWN when items exist but none required", () => {
    const vm = selectOpeningBell({
      ownerId: "u",
      sessionIdentity: "s",
      items: [item("a", "personal", false, true)],
      minutesUntilOpen: 60,
      nowMs: 1_000,
    });
    expect(vm.verdict).toBe("UNKNOWN");
    expect(vm.reason).toMatch(/no required preparation items/i);
  });

  it("READY when every required item is DONE", () => {
    const vm = selectOpeningBell({
      ownerId: "u",
      sessionIdentity: "s",
      items: [
        item("a", "market", true, true),
        item("b", "risk",   true, true),
      ],
      minutesUntilOpen: 60,
      nowMs: 1_000,
    });
    expect(vm.verdict).toBe("READY");
    expect(vm.advisory).toMatch(/Preparation complete/i);
    expect(vm.requiredOutstanding).toEqual([]);
  });

  it("READY counts SKIPPED as satisfied for required items", () => {
    const vm = selectOpeningBell({
      ownerId: "u",
      sessionIdentity: "s",
      items: [
        item("a", "market", true, false, { skipped: true }),
      ],
      minutesUntilOpen: 60,
      nowMs: 1_000,
    });
    expect(vm.verdict).toBe("READY");
    // SKIPPED items carry evidence.
    expect(vm.items[0].verdict).toBe("SKIPPED");
    expect(vm.items[0].evidence.some((e) => /skipped/i.test(e))).toBe(true);
  });

  it("MOSTLY_READY when >=70% of required items are done (but not all)", () => {
    // 8 required items, 6 done = 75%
    const items = Array.from({ length: 8 }, (_, i) =>
      item(`r${i}`, "market", true, i < 6),
    );
    const vm = selectOpeningBell({
      ownerId: "u",
      sessionIdentity: "s",
      items,
      minutesUntilOpen: 30,
      nowMs: 1_000,
    });
    expect(vm.verdict).toBe("MOSTLY_READY");
    expect(vm.advisory).toMatch(/Most preparation complete/i);
    expect(vm.requiredOutstanding).toHaveLength(2);
  });

  it("NOT_READY when <70% of required items are done", () => {
    // 3 required, 1 done = 33%
    const items = [
      item("a", "market", true, true),
      item("b", "risk",   true, false),
      item("c", "playbook", true, false),
    ];
    const vm = selectOpeningBell({
      ownerId: "u",
      sessionIdentity: "s",
      items,
      minutesUntilOpen: 15,
      nowMs: 1_000,
    });
    expect(vm.verdict).toBe("NOT_READY");
    expect(vm.advisory).toMatch(/Rushing preparation correlates with process failure/i);
  });

  it("data-category verdict is DERIVED from dataQuality regardless of checkbox", () => {
    // Item checked, but data quality UNAVAILABLE → verdict forced NOT_DONE.
    const vm = selectOpeningBell({
      ownerId: "u",
      sessionIdentity: "s",
      items: [item("data", "data", true, true)],
      minutesUntilOpen: 60,
      dataQuality: "UNAVAILABLE",
      nowMs: 1_000,
    });
    const dataItem = vm.items[0];
    expect(dataItem.verdict).toBe("NOT_DONE");
    expect(dataItem.evidence.some((e) => /UNAVAILABLE/.test(e))).toBe(true);
    // Verdict propagates to top-level: 0/1 required done → NOT_READY.
    expect(vm.verdict).toBe("NOT_READY");
  });

  it("data-category verdict is DONE when dataQuality=LIVE (overrides unchecked box)", () => {
    const vm = selectOpeningBell({
      ownerId: "u",
      sessionIdentity: "s",
      items: [item("data", "data", true, false)],
      minutesUntilOpen: 60,
      dataQuality: "LIVE",
      nowMs: 1_000,
    });
    expect(vm.items[0].verdict).toBe("DONE");
    expect(vm.verdict).toBe("READY");
  });

  it("data-category verdict is PARTIAL for any non-LIVE, non-UNAVAILABLE quality", () => {
    const vm = selectOpeningBell({
      ownerId: "u",
      sessionIdentity: "s",
      items: [item("data", "data", true, false)],
      minutesUntilOpen: 60,
      dataQuality: "DELAYED",
      nowMs: 1_000,
    });
    expect(vm.items[0].verdict).toBe("PARTIAL");
  });

  it("byCategory tally counts done + total + required-outstanding per category", () => {
    const vm = selectOpeningBell({
      ownerId: "u",
      sessionIdentity: "s",
      items: [
        item("m1", "market", true, true),
        item("m2", "market", true, false),
        item("r1", "risk",   true, false),
      ],
      minutesUntilOpen: 60,
      nowMs: 1_000,
    });
    expect(vm.byCategory.market).toEqual({ done: 1, total: 2, requiredOutstanding: 1 });
    expect(vm.byCategory.risk).toEqual({ done: 0, total: 1, requiredOutstanding: 1 });
    expect(vm.byCategory.playbook).toEqual({ done: 0, total: 0, requiredOutstanding: 0 });
  });

  it("evaluatedAt is the nowMs the caller supplied (deterministic — never Date.now())", () => {
    const vm = selectOpeningBell({
      ownerId: "u",
      sessionIdentity: "s",
      items: [item("a", "market", true, true)],
      minutesUntilOpen: 60,
      nowMs: 5_555_555,
    });
    expect(vm.evaluatedAt).toBe(5_555_555);
  });
});

describe("DEFAULT_PREPARATION_TEMPLATE", () => {
  it("contains 8 canonical items covering all 5 categories", () => {
    expect(DEFAULT_PREPARATION_TEMPLATE).toHaveLength(8);
    const cats = new Set(DEFAULT_PREPARATION_TEMPLATE.map((i) => i.category));
    expect(cats.has("personal")).toBe(true);
    expect(cats.has("market")).toBe(true);
    expect(cats.has("risk")).toBe(true);
    expect(cats.has("playbook")).toBe(true);
    expect(cats.has("data")).toBe(true);
  });

  it("personal items are OPTIONAL by default (canon: never impose spiritual practice)", () => {
    const personalItems = DEFAULT_PREPARATION_TEMPLATE.filter((i) => i.category === "personal");
    expect(personalItems.every((i) => !i.required)).toBe(true);
  });

  it("market / risk / playbook / data items are REQUIRED by default", () => {
    for (const cat of ["market", "risk", "playbook", "data"] as const) {
      const items = DEFAULT_PREPARATION_TEMPLATE.filter((i) => i.category === cat);
      expect(items.length).toBeGreaterThan(0);
      expect(items.every((i) => i.required)).toBe(true);
    }
  });
});
