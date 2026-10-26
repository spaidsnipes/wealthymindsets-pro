import React from "react";
import { describe, expect, it } from "vitest";
import { propsEqual, routeCallbacks, smallDataEqual } from "./stableMemo";

describe("stableMemo: MainChart renders only when what it is handed changes", () => {
  it("rebuilt small plain data with equal values is equal; a changed value is not", () => {
    expect(smallDataEqual({ health: "OK", reason: "r" }, { health: "OK", reason: "r" })).toBe(true);
    expect(smallDataEqual({ health: "OK", reason: "r" }, { health: "WEAK", reason: "r" })).toBe(false);
    expect(smallDataEqual({ debt: { missing: ["a", "b"] } }, { debt: { missing: ["a", "b"] } })).toBe(true);
    expect(smallDataEqual({ debt: { missing: ["a", "b"] } }, { debt: { missing: ["a"] } })).toBe(false);
    expect(smallDataEqual(null, {})).toBe(false);
  });
  it("a rebuilt element with the same text is equal; a new number is not", () => {
    const badge = (pct: number) => React.createElement("span", { role: "group" },
      React.createElement("span", null, "UP"), React.createElement("span", null, `${pct.toFixed(2)}%`));
    expect(smallDataEqual(badge(1.25), badge(1.25))).toBe(true);
    expect(smallDataEqual(badge(1.25), badge(1.26))).toBe(false);
  });
  it("large arrays and class instances compare by identity only", () => {
    const bars = Array.from({ length: 500 }, (_, i) => [i, 1, 2, 0, 1, 5]);
    expect(smallDataEqual(bars, bars.slice())).toBe(false);
    expect(smallDataEqual(bars, bars)).toBe(true);
    expect(smallDataEqual(new Map(), new Map())).toBe(false);
  });
  it("a nested callback is equal only by identity", () => {
    const f = () => 1;
    expect(smallDataEqual({ f }, { f })).toBe(true);
    expect(smallDataEqual({ f }, { f: () => 1 })).toBe(false);
  });
  it("props equality: same keys, each equal; a missing or added prop is a change", () => {
    expect(propsEqual({ a: 1, o: { x: 1 } }, { a: 1, o: { x: 1 } })).toBe(true);
    expect(propsEqual({ a: 1 }, { a: 1, b: undefined })).toBe(false);
    expect(propsEqual({ a: 1, b: 2 }, { a: 1, c: 2 })).toBe(false);
  });
  it("callbacks become one stable proxy per name that always calls the latest function", () => {
    const heard: string[] = [];
    const proxies = new Map();
    const latest = { current: { symbol: "BTC", onPick: (x: unknown) => heard.push(`BTC:${x}`) } as Record<string, unknown> };
    const first = routeCallbacks(latest.current, latest, proxies);
    latest.current = { symbol: "ETH", onPick: (x: unknown) => heard.push(`ETH:${x}`) };
    const second = routeCallbacks(latest.current, latest, proxies);
    expect(second.onPick).toBe(first.onPick);
    expect(second.symbol).toBe("ETH");
    (first.onPick as (x: unknown) => void)(7);
    expect(heard).toEqual(["ETH:7"]);
    expect(propsEqual(first, { ...first })).toBe(true);
  });
  it("a callback that goes away is absent, not a dangling proxy", () => {
    const proxies = new Map();
    const latest = { current: { onPick: () => 1 } as Record<string, unknown> };
    routeCallbacks(latest.current, latest, proxies);
    latest.current = { onPick: undefined };
    expect(routeCallbacks(latest.current, latest, proxies).onPick).toBeUndefined();
  });
});
